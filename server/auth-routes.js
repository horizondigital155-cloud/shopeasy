import express from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';

/**
 * Supabase-backed authentication routes for ShopEasy.
 * Mount this router AFTER cookie/JWT authentication middleware and BEFORE
 * the legacy SQLite authentication route declarations.
 */
export function createAuthRouter({
  supabase,
  limit,
  cleanPhone,
  validPhone,
  normalizeEmail,
  validEmail,
  otpHash,
  setSession,
  setCustomerSession,
  sendOtpEmail,
  JWT_SECRET,
  ADMIN_PHONE,
  ADMIN_PASS_HASH
}) {
  if (!supabase) throw new Error('createAuthRouter requires Supabase client.');

  const router = express.Router();

  // Hidden admin unlock. Admin password remains server-side as a bcrypt hash.
  router.post('/api/admin/unlock', limit(5, 15), async (req, res) => {
    const secret = String(req.body?.secret || '');

    if (!ADMIN_PASS_HASH || !bcrypt.compareSync(secret.slice(0, 72), ADMIN_PASS_HASH)) {
      return res.status(404).json({ error: 'Not found' });
    }

    const user = {
      role: 'admin',
      phone: cleanPhone(ADMIN_PHONE),
      name: 'Admin',
      admin: true
    };

    // Remove the previous customer session cookie before issuing admin session.
    res.clearCookie('csid', {
      httpOnly: true,
      sameSite: 'none',
      secure: true,
      path: '/'
    });

    setSession(res, user);
    return res.json(user);
  });

  // Send OTP only for first-time registration or password recovery.
  router.post('/api/auth/send-otp', limit(5, 15), async (req, res) => {
    const purpose = String(req.body?.purpose || '');
    const phone = cleanPhone(req.body?.phone);
    const name = String(req.body?.name || '').trim();
    let email = normalizeEmail(req.body?.email);

    if (!['register', 'reset'].includes(purpose)) {
      return res.status(400).json({ error: 'OTP sirf signup ya forgot password ke liye available hai.' });
    }
    if (!validPhone(phone)) return res.status(400).json({ error: 'Valid 10-digit mobile number enter karein.' });
    if (purpose === 'register' && (!name || name.length > 60 || !validEmail(email))) {
      return res.status(400).json({ error: 'Signup ke liye naam aur valid email zaroori hai.' });
    }
    if (!process.env.GMAIL_CLIENT_ID || !process.env.GMAIL_CLIENT_SECRET || !process.env.GMAIL_REFRESH_TOKEN || !process.env.GMAIL_SENDER) {
      return res.status(503).json({ error: 'Gmail API configure nahi hai. Render Environment check karein.' });
    }

    try {
      if (purpose === 'register') {
        const [{ data: byPhone, error: phoneError }, { data: byEmail, error: emailError }] = await Promise.all([
          supabase.from('users').select('phone').eq('phone', phone).maybeSingle(),
          supabase.from('users').select('phone').eq('email', email).maybeSingle()
        ]);
        if (phoneError) throw phoneError;
        if (emailError) throw emailError;
        if (byPhone) return res.status(409).json({ error: 'Is mobile number par account pehle se hai. Forgot Password use karein.' });
        if (byEmail) return res.status(409).json({ error: 'Is email par account pehle se hai.' });
      } else {
        const { data: existing, error } = await supabase.from('users')
          .select('phone,email').eq('phone', phone).maybeSingle();
        if (error) throw error;
        if (!existing || !validEmail(normalizeEmail(existing.email))) {
          return res.status(404).json({ error: 'Is number par registered email wala account nahi mila. Support se sampark karein.' });
        }
        email = normalizeEmail(existing.email);
      }

      const { data: prior, error: priorError } = await supabase.from('email_otps')
        .select('last_sent').eq('email', email).maybeSingle();
      if (priorError) throw priorError;
      if (prior) {
        const remaining = Math.ceil((30000 - (Date.now() - Number(prior.last_sent || 0))) / 1000);
        if (remaining > 0) {
          res.set('Retry-After', String(remaining));
          return res.status(429).json({ error: `OTP abhi bheja gaya hai. ${remaining} seconds baad try karein.` });
        }
      }

      const otp = String(crypto.randomInt(100000, 1000000));
      const now = Date.now();
      await sendOtpEmail({
        to: email,
        subject: purpose === 'register' ? 'ShopEasy signup verification code' : 'ShopEasy password reset code',
        text: `Your ShopEasy ${purpose === 'register' ? 'signup verification' : 'password reset'} code is ${otp}. It expires in 5 minutes. Do not share it.`,
        html: `<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:24px"><h2>ShopEasy ${purpose === 'register' ? 'signup verification' : 'password reset'}</h2><p>Your one-time code is:</p><div style="font-size:32px;font-weight:bold;letter-spacing:8px;padding:16px;background:#f2f7f3;border-radius:8px">${otp}</div><p>This code expires in 5 minutes. Do not share it with anyone.</p></div>`
      });
      const { error: saveError } = await supabase.from('email_otps').upsert({
        email, otp_hash: otpHash(email, otp), purpose, phone,
        name: purpose === 'register' ? name : null,
        expires: now + 5 * 60 * 1000, attempts: 0, last_sent: now
      }, { onConflict: 'email' });
      if (saveError) throw saveError;
      return res.json({ ok: true, message: purpose === 'register'
        ? 'OTP aapke registered email par bhej diya gaya hai.'
        : 'Agar is number par account registered hai, to uske email par OTP bhej diya gaya hai.' });
    } catch (error) {
      console.error('[OTP_DIAGNOSTIC] Send OTP failed:', { name: error?.name || 'Error', message: error?.message || 'Unknown error', code: error?.code || null });
      return res.status(502).json({ error: 'OTP send failed. Please try again later.' });
    }
  });

  // Verify signup OTP and save the customer's chosen password, or reset an existing password.
  router.post('/api/auth/verify-otp', limit(10, 15), async (req, res) => {
    const purpose = String(req.body?.purpose || '');
    const otp = String(req.body?.otp || '').trim();
    const phone = cleanPhone(req.body?.phone);
    const emailInput = normalizeEmail(req.body?.email);
    const password = String(req.body?.password || '');
    if (!['register', 'reset'].includes(purpose) || !/^\d{6}$/.test(otp) || !validPhone(phone) ||
        password.length < 8 || Buffer.byteLength(password, 'utf8') > 72) {
      return res.status(400).json({ error: 'Mobile number, 6-digit OTP aur 8-72 byte password sahi enter karein.' });
    }
    try {
      let email = emailInput;
      if (purpose === 'reset') {
        const { data: account, error } = await supabase.from('users').select('email,phone').eq('phone', phone).maybeSingle();
        if (error) throw error;
        if (!account || !validEmail(normalizeEmail(account.email))) return res.status(400).json({ error: 'Password reset account verify nahi hua.' });
        email = normalizeEmail(account.email);
      }
      if (!validEmail(email)) return res.status(400).json({ error: 'Valid email address required.' });
      const { data: record, error: readError } = await supabase.from('email_otps').select('*').eq('email', email).maybeSingle();
      if (readError) throw readError;
      if (!record || record.purpose !== purpose || cleanPhone(record.phone) !== phone) {
        return res.status(400).json({ error: 'OTP nahi mila ya request badal gayi. Naya OTP lein.' });
      }
      if (Date.now() > Number(record.expires)) {
        const { error } = await supabase.from('email_otps').delete().eq('email', email);
        if (error) throw error;
        return res.status(400).json({ error: 'OTP expire ho gaya. Naya OTP lein.' });
      }
      if (Number(record.attempts) >= 5) {
        const { error } = await supabase.from('email_otps').delete().eq('email', email);
        if (error) throw error;
        return res.status(429).json({ error: 'Bahut galat attempts hue. Naya OTP lein.' });
      }
      if (otpHash(email, otp) !== record.otp_hash) {
        const { error } = await supabase.from('email_otps').update({ attempts: Number(record.attempts) + 1 }).eq('email', email);
        if (error) throw error;
        return res.status(400).json({ error: 'OTP galat hai. Dobara check karein.' });
      }

      const hash = bcrypt.hashSync(password, 12);
      let user;
      if (purpose === 'register') {
        const name = String(record.name || '').trim();
        if (!name || name.length > 60) return res.status(400).json({ error: 'Signup name valid nahi hai.' });
        const { data: created, error: insertError } = await supabase.from('users').insert({
          phone, name, hash, created: Date.now(), email
        }).select('phone,name,email').single();
        if (insertError) {
          if (insertError.code === '23505') return res.status(409).json({ error: 'Mobile number ya email pehle se registered hai. Forgot Password use karein.' });
          throw insertError;
        }
        user = { role: 'customer', phone: created.phone, name: created.name, email: created.email };
      } else {
        const { data: updated, error: updateError } = await supabase.from('users')
          .update({ hash }).eq('phone', phone).select('phone,name,email').single();
        if (updateError) throw updateError;
        user = { role: 'customer', phone: updated.phone, name: updated.name, email: updated.email || '' };
        const { error: revokeError } = await supabase.from('customer_sessions')
          .update({ revoked_at: new Date().toISOString() }).eq('user_phone', phone).is('revoked_at', null);
        if (revokeError) throw revokeError;
      }
      const { error: deleteError } = await supabase.from('email_otps').delete().eq('email', email);
      if (deleteError) throw deleteError;
      if (purpose === 'register') {
        await setCustomerSession(req, res, user);
        return res.status(201).json(user);
      }
      return res.json({ ok: true, message: 'Password successfully update ho gaya. Ab mobile number aur naye password se login karein.' });
    } catch (error) {
      console.error('OTP verification failed:', error?.message || error);
      return res.status(500).json({ error: 'OTP verify nahi ho saka. Dobara try karein.' });
    }
  });

  // Direct password-only registration is intentionally disabled; signup requires verified email OTP.
  router.post('/api/auth/register', (_req, res) => res.status(410).json({ error: 'Signup ke liye email OTP verification zaroori hai.' }));

  // Legacy phone + password customer login.
  router.post('/api/auth/login', limit(10, 15), async (req, res) => {
    const phone = cleanPhone(req.body?.phone);
    const password = String(req.body?.password || '');

    if (!validPhone(phone) || !password || Buffer.byteLength(password, 'utf8') > 72) {
      return res.status(400).json({ error: 'Valid mobile number aur password enter karein.' });
    }

    try {
      const { data: user, error } = await supabase
        .from('users')
        .select('phone,name,hash,email')
        .eq('phone', phone)
        .maybeSingle();

      if (error) throw error;

      if (!user || typeof user.hash !== 'string' || !user.hash || !bcrypt.compareSync(password, user.hash)) {
        return res.status(401).json({
          error: 'Number ya password galat hai.'
        });
      }

      const session = {
        role: 'customer',
        phone: user.phone,
        name: user.name
      };

      await setCustomerSession(req, res, session);
      return res.json(session);
    } catch (error) {
      console.error('Login failed:', error?.message || error);
      return res.status(500).json({ error: 'Login nahi ho saka. Dobara try karein.' });
    }
  });

  // Rider authentication has been retired.
  router.all('/api/rider/*', (_req, res) => res.status(410).json({ error: 'Rider system ShopEasy se remove kar diya gaya hai.' }));
  router.all('/api/admin/riders*', (_req, res) => res.status(410).json({ error: 'Rider management ShopEasy se remove kar diya gaya hai.' }));
  router.all('/api/admin/orders/:id/assign', (_req, res) => res.status(410).json({ error: 'Rider order assignment ShopEasy se remove kar diya gaya hai.' }));

  router.post('/api/auth/logout', async (req, res) => {
    try {
      const customerToken = req.cookies?.csid;

      if (customerToken) {
        const { error } = await supabase
          .from('customer_sessions')
          .update({ revoked_at: new Date().toISOString() })
          .eq('token_hash', crypto.createHash('sha256').update(String(customerToken)).digest('hex'))
          .is('revoked_at', null);

        if (error) throw error;
      }

      const cookieOptions = {
        httpOnly: true,
        sameSite: 'none',
        secure: true,
        path: '/'
      };

      res.clearCookie('csid', cookieOptions);
      res.clearCookie('sid', cookieOptions);
      return res.json({ ok: true });
    } catch (error) {
      console.error('Logout session revoke failed:', error?.message || error);
      return res.status(503).json({
        error: 'Logout complete nahi ho saka. Dobara try karein.'
      });
    }
  });

  router.get('/api/me', (req, res) => res.json(req.user || null));

  return router;
}

