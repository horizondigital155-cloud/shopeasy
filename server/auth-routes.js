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

    setSession(res, user);
    return res.json(user);
  });

  // Send email OTP for login or registration.
  router.post('/api/auth/send-otp', limit(100, 15), async (req, res) => {
    const email = normalizeEmail(req.body?.email);
    const purpose = String(req.body?.purpose || 'login');
    const name = String(req.body?.name || '').trim();
    const phone = cleanPhone(req.body?.phone);

    if (!validEmail(email)) {
      return res.status(400).json({ error: 'Valid email address enter karein.' });
    }

    if (!['login', 'register'].includes(purpose)) {
      return res.status(400).json({ error: 'Invalid request.' });
    }

    if (purpose === 'register' &&
        (!name || name.length > 60 || !validPhone(phone))) {
      return res.status(400).json({
        error: 'Signup ke liye naam aur valid 10-digit mobile number zaroori hai.'
      });
    }

    if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL) {
      return res.status(503).json({
        error: 'Resend email service configure nahi hai. Render Environment check karein.'
      });
    }

    try {
      const { data: existingEmail, error: emailError } = await supabase
        .from('users')
        .select('phone')
        .eq('email', email)
        .maybeSingle();

      if (emailError) throw emailError;

      let existingPhone = null;
      if (purpose === 'register') {
        const result = await supabase
          .from('users')
          .select('phone')
          .eq('phone', phone)
          .maybeSingle();

        if (result.error) throw result.error;
        existingPhone = result.data;
      }

      if (purpose === 'register' && existingEmail) {
        return res.status(409).json({
          error: 'Is email par account pehle se hai. Login karein.'
        });
      }

      if (purpose === 'register' && existingPhone) {
        return res.status(409).json({
          error: 'Is mobile number par account pehle se hai. Existing account ko securely link karna hoga.'
        });
      }

      if (purpose === 'login' && !existingEmail) {
        return res.status(404).json({
          error: 'Is email se account nahi mila. Sign up karein.'
        });
      }

      const { data: prior, error: priorError } = await supabase
        .from('email_otps')
        .select('last_sent')
        .eq('email', email)
        .maybeSingle();

      if (priorError) throw priorError;

      if (prior) {
        const elapsed = Date.now() - Number(prior.last_sent || 0);
        const remaining = Math.ceil((30000 - elapsed) / 1000);

        if (remaining > 0) {
          res.set('Retry-After', String(remaining));
          return res.status(429).json({
            error: `OTP abhi bheja gaya hai. ${remaining} seconds baad dobara try karein.`
          });
        }
      }

      const otp = String(crypto.randomInt(100000, 1000000));
      const now = Date.now();
      const expires = now + 5 * 60 * 1000;

      await sendOtpEmail({
        to: email,
        subject: 'ShopEasy email verification code',
        text: `Your ShopEasy verification code is ${otp}. It expires in 5 minutes. If you did not request it, ignore this email.`,
        html: `<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:24px"><h2>ShopEasy verification</h2><p>Your one-time verification code is:</p><div style="font-size:32px;font-weight:bold;letter-spacing:8px;padding:16px;background:#f2f7f3;border-radius:8px">${otp}</div><p>This code expires in 5 minutes. Do not share it with anyone.</p></div>`
      });

      const { error: saveError } = await supabase
        .from('email_otps')
        .upsert({
          email,
          otp_hash: otpHash(email, otp),
          purpose,
          phone: purpose === 'register' ? phone : null,
          name: purpose === 'register' ? name : null,
          expires,
          attempts: 0,
          last_sent: now
        }, { onConflict: 'email' });

      if (saveError) throw saveError;

      return res.json({
        ok: true,
        message: 'OTP aapke email par bhej diya gaya hai. Inbox aur Spam folder check karein.'
      });
    } catch (error) {
      console.error('OTP send failed:', error?.message || error);
      return res.status(502).json({
        error: 'Email par OTP nahi bhej saka. SMTP settings check karke dobara try karein.'
      });
    }
  });

  // Verify OTP and create/login customer.
  router.post('/api/auth/verify-otp', limit(10, 15), async (req, res) => {
    const email = normalizeEmail(req.body?.email);
    const otp = String(req.body?.otp || '').trim();
    const purpose = String(req.body?.purpose || 'login');

    if (!validEmail(email) || !/^\d{6}$/.test(otp) ||
        !['login', 'register'].includes(purpose)) {
      return res.status(400).json({
        error: 'Email aur 6-digit OTP sahi enter karein.'
      });
    }

    try {
      const { data: record, error: readError } = await supabase
        .from('email_otps')
        .select('*')
        .eq('email', email)
        .maybeSingle();

      if (readError) throw readError;

      if (!record || record.purpose !== purpose) {
        return res.status(400).json({
          error: 'OTP nahi mila ya request badal gayi. Naya OTP lein.'
        });
      }

      if (Date.now() > Number(record.expires)) {
        const { error } = await supabase.from('email_otps').delete().eq('email', email);
        if (error) throw error;
        return res.status(400).json({ error: 'OTP expire ho gaya. Naya OTP lein.' });
      }

      if (Number(record.attempts) >= 5) {
        const { error } = await supabase.from('email_otps').delete().eq('email', email);
        if (error) throw error;
        return res.status(429).json({
          error: 'Bahut galat attempts hue. Naya OTP lein.'
        });
      }

      if (otpHash(email, otp) !== record.otp_hash) {
        const { error } = await supabase
          .from('email_otps')
          .update({ attempts: Number(record.attempts) + 1 })
          .eq('email', email);

        if (error) throw error;
        return res.status(400).json({ error: 'OTP galat hai. Dobara check karein.' });
      }

      let user;

      if (purpose === 'register') {
        const phone = cleanPhone(record.phone);
        const name = String(record.name || '').trim();

        if (!name || !validPhone(phone)) {
          return res.status(400).json({
            error: 'Signup details valid nahi hain. Dobara signup karein.'
          });
        }

        const generatedPassword = crypto.randomBytes(32).toString('hex');
        const hash = bcrypt.hashSync(generatedPassword, 12);

        const { data: created, error: insertError } = await supabase
          .from('users')
          .insert({
            phone,
            name,
            hash,
            created: Date.now(),
            email
          })
          .select('phone,name,email')
          .single();

        if (insertError) {
          if (insertError.code === '23505') {
            return res.status(409).json({
              error: 'Account details pehle se use ho rahe hain.'
            });
          }
          throw insertError;
        }

        user = {
          role: 'customer',
          phone: created.phone,
          name: created.name,
          email: created.email
        };
      } else {
        const { data: row, error: userError } = await supabase
          .from('users')
          .select('phone,name,email')
          .eq('email', email)
          .maybeSingle();

        if (userError) throw userError;

        if (!row) {
          return res.status(404).json({
            error: 'Is email se account nahi mila. Sign up karein.'
          });
        }

        user = {
          role: 'customer',
          phone: row.phone,
          name: row.name,
          email: row.email
        };
      }

      const { error: deleteError } = await supabase
        .from('email_otps')
        .delete()
        .eq('email', email);

      if (deleteError) throw deleteError;

      setSession(res, user);
      return res.json(user);
    } catch (error) {
      console.error('OTP verification failed:', error?.message || error);
      return res.status(500).json({
        error: 'OTP verify nahi ho saka. Dobara try karein.'
      });
    }
  });

  // Legacy phone + password customer registration.
  router.post('/api/auth/register', limit(5, 15), async (req, res) => {
    const phone = cleanPhone(req.body?.phone);
    const name = String(req.body?.name || '').trim();
    const password = String(req.body?.password || '');

    if (!validPhone(phone) || !name || name.length > 60 ||
        password.length < 8 || password.length > 72) {
      return res.status(400).json({
        error: 'Naam, valid 10-digit mobile number aur 8-72 character password zaroori hai.'
      });
    }

    try {
      const hash = bcrypt.hashSync(password, 12);
      const { error } = await supabase.from('users').insert({
        phone,
        name,
        hash,
        created: Date.now()
      });

      if (error) {
        if (error.code === '23505') {
          return res.status(409).json({
            error: 'Is mobile number par account pehle se bana hua hai. Login karein.'
          });
        }
        throw error;
      }

      const user = { role: 'customer', phone, name };
      setSession(res, user);
      return res.status(201).json(user);
    } catch (error) {
      console.error('Registration failed:', error?.message || error);
      return res.status(500).json({
        error: 'Account create nahi ho saka. Dobara try karein.'
      });
    }
  });

  // Legacy phone + password customer login.
  router.post('/api/auth/login', limit(10, 15), async (req, res) => {
    const phone = cleanPhone(req.body?.phone);
    const password = String(req.body?.password || '');

    try {
      const { data: user, error } = await supabase
        .from('users')
        .select('phone,name,hash,email')
        .eq('phone', phone)
        .maybeSingle();

      if (error) throw error;

      if (!user || !bcrypt.compareSync(password.slice(0, 72), user.hash)) {
        return res.status(401).json({
          error: 'Number ya password galat hai.'
        });
      }

      const session = {
        role: 'customer',
        phone: user.phone,
        name: user.name
      };

      setSession(res, session);
      return res.json(session);
    } catch (error) {
      console.error('Login failed:', error?.message || error);
      return res.status(500).json({ error: 'Login nahi ho saka. Dobara try karein.' });
    }
  });

  // Rider phone + password login.
  router.post('/api/rider/login', limit(10, 15), async (req, res) => {
    const phone = cleanPhone(req.body?.phone);
    const password = String(req.body?.password || '');

    try {
      const { data: rider, error } = await supabase
        .from('riders')
        .select('id,name,phone,hash,active')
        .eq('phone', phone)
        .eq('active', 1)
        .maybeSingle();

      if (error) throw error;

      if (!rider || !bcrypt.compareSync(password.slice(0, 72), rider.hash)) {
        return res.status(401).json({
          error: 'Rider number ya password galat hai.'
        });
      }

      const session = {
        role: 'rider',
        riderId: rider.id,
        phone: rider.phone,
        name: rider.name
      };

      setSession(res, session);
      return res.json({
        role: 'rider',
        riderId: rider.id,
        phone: rider.phone,
        name: rider.name
      });
    } catch (error) {
      console.error('Rider login failed:', error?.message || error);
      return res.status(500).json({
        error: 'Rider login nahi ho saka. Dobara try karein.'
      });
    }
  });

  router.post('/api/auth/logout', (req, res) => {
    return res.clearCookie('sid', {
      httpOnly: true,
      sameSite: 'lax',
      secure: Boolean(req.secure),
      path: '/'
    }).json({ ok: true });
  });

  router.get('/api/me', (req, res) => res.json(req.user || null));

  return router;
}

