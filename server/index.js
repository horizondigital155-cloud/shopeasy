import { google } from 'googleapis';
import 'dotenv/config';

import express from 'express';

import cookieParser from 'cookie-parser';

import helmet from 'helmet';

import rateLimit from 'express-rate-limit';

import jwt from 'jsonwebtoken';

import crypto from 'node:crypto';
import multer from 'multer';


import { createAuthRouter } from './auth-routes.js';

import { supabase } from './supabase.js';


const app = express();
const PORT = Number(process.env.PORT || 4000);
const JWT_SECRET = process.env.JWT_SECRET || '';
if (JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET must be at least 32 characters. Set it in server/.env.');
}

app.set('trust proxy', 1);
app.disable('x-powered-by');
app.disable('etag');

// Never cache authenticated API responses or session information.
app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
});
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

const allowedOrigins = String(process.env.CLIENT_ORIGIN || process.env.CORS_ORIGIN || '')
  .split(',').map(x => x.trim()).filter(Boolean);
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && (allowedOrigins.includes(origin) || (!allowedOrigins.length && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  }
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

const limit = (max, mins) => rateLimit({
  windowMs: mins * 60 * 1000, limit: max,
  standardHeaders: true, legacyHeaders: false
});
const cleanPhone = value => String(value ?? '').replace(/\D/g, '').slice(-10);
const validPhone = value => /^[6-9]\d{9}$/.test(value);
const normalizeEmail = value => String(value || '').trim().toLowerCase();
const validEmail = value => value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const sha = value => crypto.createHash('sha256').update(String(value)).digest('hex');
const otpHash = (email, otp) => sha(`${email}:${otp}:${JWT_SECRET}`);
const setSession = (res, payload) => {
  // Expire any previous host-only sid cookie before issuing a fresh session.
  res.clearCookie('sid', { path: '/' });

  return res.cookie('sid', jwt.sign(payload, JWT_SECRET, { expiresIn: '30d' }), {
    httpOnly: true, sameSite: 'none', secure: true,
    maxAge: 30 * 24 * 60 * 60 * 1000, path: '/'
  });
};
async function setCustomerSession(req, res, user) {
  const phone = cleanPhone(user?.phone);
  if (!validPhone(phone)) throw new Error('Cannot create customer session: invalid phone.');

  // Revoke the previous browser session before issuing a new one.
  const previousToken = req.cookies?.csid;
  if (previousToken) {
    const { error: revokeError } = await supabase
      .from('customer_sessions')
      .update({ revoked_at: new Date().toISOString() })
      .eq('token_hash', sha(previousToken))
      .is('revoked_at', null);
    if (revokeError) throw revokeError;
  }

  const token = crypto.randomBytes(32).toString('hex');
  const { error } = await supabase.from('customer_sessions').insert({
    token_hash: sha(token),
    user_phone: phone
  });

  if (error) throw error;

  const cookieOptions = {
    httpOnly: true,
    sameSite: 'none',
    secure: true,
    maxAge: 10 * 365 * 24 * 60 * 60 * 1000,
    path: '/'
  };

  res.clearCookie('sid', cookieOptions);
  res.cookie('csid', token, cookieOptions);
}

async function sendOtpEmail({ to, subject, text, html }) {
  const clientId = process.env.GMAIL_CLIENT_ID || '';
  const clientSecret = process.env.GMAIL_CLIENT_SECRET || '';
  const refreshToken = process.env.GMAIL_REFRESH_TOKEN || '';
  const from = process.env.GMAIL_SENDER || '';

  if (!clientId || !clientSecret || !refreshToken || !from) {
    throw new Error('Gmail API configuration incomplete. Check GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN and GMAIL_SENDER.');
  }

  const safeTo = String(to || '').trim();
  const safeSubject = String(subject || 'ShopEasy verification')
    .replace(/[\r\n]+/g, ' ')
    .trim();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(safeTo)) {
    throw new Error('Invalid OTP recipient email address.');
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(from)) {
    throw new Error('Invalid GMAIL_SENDER email address.');
  }

  const oauth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret
  );

  oauth2Client.setCredentials({
    refresh_token: refreshToken
  });

  const gmail = google.gmail({
    version: 'v1',
    auth: oauth2Client
  });

  const boundary = `shopeasy_${crypto.randomBytes(16).toString('hex')}`;

  const mimeMessage = [
    `From: ShopEasy <${from}>`,
    `To: ${safeTo}`,
    `Subject: ${safeSubject}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: base64',
    '',
    Buffer.from(String(text || ''), 'utf8').toString('base64'),
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    'Content-Transfer-Encoding: base64',
    '',
    Buffer.from(String(html || text || ''), 'utf8').toString('base64'),
    `--${boundary}--`,
    ''
  ].join('\r\n');

  const raw = Buffer.from(mimeMessage, 'utf8').toString('base64url');

  try {
    const response = await gmail.users.messages.send({
      userId: 'me',
      requestBody: { raw }
    });

    console.log('[ShopEasy] Gmail API accepted OTP email:', {
      messageId: response.data?.id || null,
      threadId: response.data?.threadId || null
    });

    if (!response.data?.id) {
      throw new Error('Gmail API did not return a message ID.');
    }

    return response.data;
  } catch (error) {
    console.error('[ShopEasy] Gmail API send failed:', {
      message: error?.message || 'Unknown Gmail API error',
      code: error?.code || null,
      status: error?.response?.status || null
    });
    throw error;
  }
}

app.use(async (req, _res, next) => {
  req.user = null;

  try {
    const customerToken = req.cookies?.csid;

    if (customerToken) {
      const { data: session, error: sessionError } = await supabase
        .from('customer_sessions')
        .select('user_phone')
        .eq('token_hash', sha(customerToken))
        .is('revoked_at', null)
        .maybeSingle();

      if (sessionError) throw sessionError;

      if (session?.user_phone) {
        const { data: customer, error: customerError } = await supabase
          .from('users')
          .select('phone,name,email')
          .eq('phone', session.user_phone)
          .maybeSingle();

        if (customerError) throw customerError;

        if (customer) {
          req.user = {
            role: 'customer',
            phone: customer.phone,
            name: customer.name,
            email: customer.email || ''
          };
        }
      }
    }

    // Legacy JWT cookie is reserved for Admin only; Rider authentication is retired.
    if (!req.user && req.cookies?.sid) {
      try {
        const oldSession = jwt.verify(req.cookies.sid, JWT_SECRET);
        if (oldSession?.role === 'admin') {
          req.user = oldSession;
        }
      } catch {
        req.user = null;
      }
    }
  } catch (error) {
    console.error('[ShopEasy] Session verification failed:', error?.message || error);
    req.user = null;
  }

  next();
});
const needUser = (req, res, next) => req.user?.role === 'customer'
  ? next() : res.status(401).json({ error: 'Pehle customer login karein.' });
const needAdmin = (req, res, next) => req.user?.role === 'admin'
  ? next() : res.status(403).json({ error: 'Admin permission required.' });
const needCustomerOrAdmin = (req, res, next) => ['customer', 'admin'].includes(req.user?.role)
  ? next() : res.status(401).json({ error: 'Pehle login karein.' });
const safeItems = value => {
  if (Array.isArray(value)) return value;
  try { const parsed = JSON.parse(value || '[]'); return Array.isArray(parsed) ? parsed : []; }
  catch { return []; }
};

app.get('/api/health', (_req, res) => res.json({ ok: true, app: 'ShopEasy', database: 'supabase' }));
app.use(createAuthRouter({
  supabase, limit, cleanPhone, validPhone, normalizeEmail, validEmail,
  otpHash, setSession, setCustomerSession, sendOtpEmail, JWT_SECRET,
  ADMIN_PHONE: process.env.ADMIN_PHONE || '',
  ADMIN_PASS_HASH: process.env.ADMIN_PASS_HASH || ''
}));

// Public catalogue: preserve all 317 existing Supabase product rows and image URLs.
const PRODUCT_IMAGE_BUCKET = 'shopeasy-images';
const productPhotoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (/^image\/(jpeg|png|webp)$/.test(file.mimetype)) return cb(null, true);
    cb(new Error('Sirf JPG, PNG ya WebP image upload karein.'));
  }
});

app.get('/api/products', async (_req, res) => {
  try {
    const pageSize = 1000;
    let allProducts = [];
    let from = 0;

    // Fetch all product pages
    while (true) {
      const { data, error } = await supabase
        .from('products')
        .select('id,category,name,unit,price,image,created,updated,mrp')
        .order('category', { ascending: true })
        .order('name', { ascending: true })
        .order('id', { ascending: true })
        .range(from, from + pageSize - 1);

      if (error) throw error;

      const batch = data || [];
      allProducts.push(...batch);

      if (batch.length < pageSize) break;
      from += pageSize;
    }

    // Fetch all custom image records
    let allImages = [];
    from = 0;

    while (true) {
      const { data, error } = await supabase
        .from('product_images')
        .select('product_id,filename')
        .order('product_id', { ascending: true })
        .range(from, from + pageSize - 1);

      if (error) throw error;

      const batch = data || [];
      allImages.push(...batch);

      if (batch.length < pageSize) break;
      from += pageSize;
    }

    const custom = new Map(
      allImages.map(row => {
        const { data } = supabase.storage
          .from(PRODUCT_IMAGE_BUCKET)
          .getPublicUrl(row.filename);

        return [String(row.product_id), data.publicUrl];
      })
    );

    const result = allProducts.map(p => ({
      ...p,
      originalImage: p.image || '',
      image: p.image || custom.get(String(p.id)) || '',
      hasCustomImage: !p.image && custom.has(String(p.id))
    }));

    console.log('[Products API] Loaded ' + result.length + ' products');

    return res.json(result);
  } catch (error) {
    console.error('Products API failed:', error?.message || error);

    return res.status(503).json({
      error: 'Products load nahi ho paaye. Database connection check karein.'
    });
  }
});

// Admin product CRUD. Images are stored privately from the browser via the server service-role client.
app.post('/api/admin/products', needAdmin, async (req, res) => {
  const name = String(req.body?.name || '').trim();
  const category = String(req.body?.category || '').trim();
  const unit = String(req.body?.unit || '').trim();
  const image = String(req.body?.image || '').trim();
  const price = Number(req.body?.price);
  const mrp = Number(req.body?.mrp ?? 0);
  if (!name || !category || !Number.isSafeInteger(price) || price < 1 || !Number.isSafeInteger(mrp) || mrp < 0) {
    return res.status(400).json({ error: 'Product name, category aur valid whole-number price zaroori hain.' });
  }
  if (image && !/^https?:\/\//i.test(image)) return res.status(400).json({ error: 'Image URL valid HTTPS/HTTP URL honi chahiye.' });
  const now = Date.now();
  const row = { id: crypto.randomUUID(), name, category, unit, price, image, mrp, created: now, updated: now };
  try {
    const { data, error } = await supabase.from('products').insert(row).select('*').single();
    if (error) throw error;
    return res.status(201).json({ ...data, originalImage: data.image || '', hasCustomImage: false });
  } catch (error) {
    console.error('Admin product create failed:', error?.message || error);
    return res.status(503).json({ error: 'Product save nahi hua. Supabase table/permissions check karein.' });
  }
});

app.put('/api/admin/products/:id', needAdmin, async (req, res) => {
  const id = String(req.params.id || '').trim();
  const name = String(req.body?.name || '').trim();
  const category = String(req.body?.category || '').trim();
  const unit = String(req.body?.unit || '').trim();
  const image = String(req.body?.image || '').trim();
  const price = Number(req.body?.price);
  const mrp = Number(req.body?.mrp ?? 0);
  if (!id || !name || !category || !Number.isSafeInteger(price) || price < 1 || !Number.isSafeInteger(mrp) || mrp < 0) {
    return res.status(400).json({ error: 'Product details ya price invalid hain.' });
  }
  if (image && !/^https?:\/\//i.test(image)) return res.status(400).json({ error: 'Image URL valid HTTP/HTTPS honi chahiye.' });
  try {
    const { data, error } = await supabase.from('products').update({ name, category, unit, price, image, mrp, updated: Date.now() }).eq('id', id).select('*').maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Product nahi mila.' });
    return res.json({ ...data, originalImage: data.image || '', hasCustomImage: false });
  } catch (error) {
    console.error('Admin product update failed:', error?.message || error);
    return res.status(503).json({ error: 'Product update nahi hua.' });
  }
});

app.delete('/api/admin/products/:id', needAdmin, async (req, res) => {
  const id = String(req.params.id || '').trim();
  if (!id) return res.status(400).json({ error: 'Product ID invalid hai.' });
  try {
    const { data: imageRow, error: imageReadError } = await supabase.from('product_images').select('filename').eq('product_id', id).maybeSingle();
    if (imageReadError) throw imageReadError;
    const { data, error } = await supabase.from('products').delete().eq('id', id).select('id').maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Product nahi mila.' });
    await supabase.from('product_images').delete().eq('product_id', id);
    if (imageRow?.filename) await supabase.storage.from(PRODUCT_IMAGE_BUCKET).remove([imageRow.filename]);
    return res.json({ ok: true, id });
  } catch (error) {
    console.error('Admin product delete failed:', error?.message || error);
    return res.status(503).json({ error: 'Product delete nahi hua.' });
  }
});

app.post('/api/admin/products/:id/photo', needAdmin, (req, res, next) => {
  productPhotoUpload.single('photo')(req, res, error => error ? res.status(400).json({ error: error.message }) : next());
}, async (req, res) => {
  const id = String(req.params.id || '').trim();
  if (!req.file) return res.status(400).json({ error: 'Product photo select karein.' });
  const extension = req.file.mimetype === 'image/png' ? 'png' : req.file.mimetype === 'image/webp' ? 'webp' : 'jpg';
  const filename = `products/${id}/${crypto.randomUUID()}.${extension}`;
  try {
    const { data: product, error: productError } = await supabase.from('products').select('id').eq('id', id).maybeSingle();
    if (productError) throw productError;
    if (!product) return res.status(404).json({ error: 'Product nahi mila.' });
    const { error: uploadError } = await supabase.storage.from(PRODUCT_IMAGE_BUCKET).upload(filename, req.file.buffer, { contentType: req.file.mimetype, upsert: false });
    if (uploadError) throw uploadError;
    const { data: oldImage, error: oldReadError } = await supabase.from('product_images').select('filename').eq('product_id', id).maybeSingle();
    if (oldReadError) throw oldReadError;
    await supabase.from('product_images').delete().eq('product_id', id);
    const { error: insertError } = await supabase.from('product_images').insert({ product_id: id, filename });
    if (insertError) {
      await supabase.storage.from(PRODUCT_IMAGE_BUCKET).remove([filename]);
      throw insertError;
    }
    if (oldImage?.filename) await supabase.storage.from(PRODUCT_IMAGE_BUCKET).remove([oldImage.filename]);
    const { data: publicData } = supabase.storage.from(PRODUCT_IMAGE_BUCKET).getPublicUrl(filename);
    return res.json({ ok: true, image: publicData.publicUrl, filename });
  } catch (error) {
    console.error('Admin product photo upload failed:', error?.message || error);
    return res.status(503).json({ error: 'Photo upload nahi hui. Supabase shopeasy-images bucket check karein.' });
  }
});

app.delete('/api/admin/products/:id/photo', needAdmin, async (req, res) => {
  const id = String(req.params.id || '').trim();
  try {
    const { data: oldImage, error: readError } = await supabase.from('product_images').select('filename').eq('product_id', id).maybeSingle();
    if (readError) throw readError;
    const { error } = await supabase.from('product_images').delete().eq('product_id', id);
    if (error) throw error;
    if (oldImage?.filename) {
      const { error: removeError } = await supabase.storage.from(PRODUCT_IMAGE_BUCKET).remove([oldImage.filename]);
      if (removeError) throw removeError;
    }
    return res.json({ ok: true });
  } catch (error) {
    console.error('Admin product photo reset failed:', error?.message || error);
    return res.status(503).json({ error: 'Custom photo remove nahi hui.' });
  }
});

function deliveryFee(lines, address, previousOrders) {
  if (previousOrders === 0) return 0;
  const weight = lines.reduce((sum, item) => {
    const unit = String(item.unit || '').toLowerCase().replace(/,/g, '.');
    const m = unit.match(/(\d+(?:\.\d+)?)\s*(kg|kgs|kilograms?|g|gm|gms|grams?)\b/);
    if (!m) return sum;
    const n = Number(m[1]);
    return sum + n * (/^(g|gm|gms|gram|grams)$/.test(m[2]) ? 0.001 : 1) * item.qty;
  }, 0);
  const count = lines.reduce((s, x) => s + x.qty, 0);
  const fastFood = lines.length > 0 && lines.every(x => /fast\s*food/i.test(x.category || ''));
  const fastFoodTotal = lines.reduce((s, x) => s + x.price * x.qty, 0);
  const addressText = String(address || '').toLowerCase();
  if (weight > 10) return 40;
  if (/mataji ka mandir|mata ji ka mandir|market|aen colony|temple|colony/i.test(addressText)) return 10;
  if (fastFood) return fastFoodTotal > 250 ? 20 : 5;
  if (lines.some(x => x.price < 198) && count > 4) return 20;
  if (count === 1 && lines.length === 1 && [5, 10, 20].includes(lines[0].price)) return 3;
  return 20;
}

async function buildOrderLines(items) {
  if (!Array.isArray(items) || !items.length || items.length > 60) {
    const error = new Error('Cart items sahi bharein.'); error.status = 400; throw error;
  }
  const quantities = new Map();
  for (const item of items) {
    const id = String(item?.id || '').trim();
    const qty = Number(item?.qty);
    if (!id || !Number.isInteger(qty) || qty < 1 || qty > 50) {
      const error = new Error('Product ID ya quantity invalid hai.'); error.status = 400; throw error;
    }
    quantities.set(id, (quantities.get(id) || 0) + qty);
  }
  if ([...quantities.values()].some(qty => qty > 50)) {
    const error = new Error('Ek product ki maximum quantity 50 hai.'); error.status = 400; throw error;
  }
  const ids = [...quantities.keys()];
  const { data, error } = await supabase.from('products')
    .select('id,category,name,unit,price,image').in('id', ids);
  if (error) throw error;
  const byId = new Map((data || []).map(p => [p.id, p]));
  if (byId.size !== ids.length) {
    const error = new Error('Cart ka ek product ab available nahi hai. Refresh karein.'); error.status = 400; throw error;
  }
  return ids.map(id => ({ ...byId.get(id), qty: quantities.get(id) }));
}

app.post('/api/orders/quote', needUser, async (req, res) => {
  try {
    const lines = await buildOrderLines(req.body?.items);
    const { count, error } = await supabase.from('orders').select('id', { count: 'exact', head: true }).eq('phone', req.user.phone);
    if (error) throw error;
    const subtotal = lines.reduce((sum, item) => sum + Number(item.price) * item.qty, 0);
    const fee = deliveryFee(lines, req.body?.address || req.body?.deliveryAddress, count || 0);
    return res.json({ subtotal, fee, total: subtotal + fee, items: lines });
  } catch (error) {
    console.error('Order quote failed:', error?.message || error);
    return res.status(error.status || 503).json({ error: error.status ? error.message : 'Order quote calculate nahi ho saka.' });
  }
});

app.post('/api/orders', needUser, limit(10, 10), async (req, res) => {
  try {
    const address = String(req.body?.address || '').trim();
    const payment = String(req.body?.paymentMethod || 'COD').toUpperCase();
    if (address.length < 5 || address.length > 500) return res.status(400).json({ error: 'Complete delivery address bharein.' });
    if (!['COD', 'CASH', 'CASH ON DELIVERY'].includes(payment)) return res.status(400).json({ error: 'Abhi sirf Cash on Delivery available hai.' });
    const lines = await buildOrderLines(req.body?.items);
    const { count, error: countError } = await supabase.from('orders').select('id', { count: 'exact', head: true }).eq('phone', req.user.phone);
    if (countError) throw countError;
    const subtotal = lines.reduce((sum, item) => sum + Number(item.price) * item.qty, 0);
    const fee = deliveryFee(lines, address, count || 0);
    const now = Date.now();
    const payload = {
      phone: cleanPhone(req.user.phone), name: String(req.user.name || 'Customer').slice(0, 100),
      address, items: JSON.stringify(lines), subtotal, fee, total: subtotal + fee,
      payment: 'COD', payment_status: 'pending', status: 'placed', created: now, updated: now
    };
    const { data, error } = await supabase.from('orders').insert(payload)
      .select('id,phone,name,address,items,subtotal,fee,total,payment,payment_status,status,created,updated').single();
    if (error) throw error;
    const order = { ...data, items: safeItems(data.items) };
    return res.status(201).json(order);
  } catch (error) {
    console.error('Create order failed:', error?.message || error);
    return res.status(error.status || 503).json({ error: error.status ? error.message : 'Order save nahi ho saka. Dobara try karein.' });
  }
});

app.get('/api/orders', needCustomerOrAdmin, async (req, res) => {
  try {
    let query = supabase.from('orders').select('*').order('id', { ascending: false }).limit(500);
    if (req.user.role !== 'admin') query = query.eq('phone', cleanPhone(req.user.phone));
    const { data, error } = await query;
    if (error) throw error;
    return res.json((data || []).map(row => ({ ...row, items: safeItems(row.items) })));
  } catch (error) {
    console.error('List orders failed:', error?.message || error);
    return res.status(503).json({ error: 'Orders load nahi ho paaye.' });
  }
});

app.post('/api/orders/:id/cancel', needUser, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id < 1) return res.status(400).json({ error: 'Order ID invalid hai.' });
  try {
    const { data: order, error: readError } = await supabase.from('orders').select('id,phone,status').eq('id', id).maybeSingle();
    if (readError) throw readError;
    if (!order || order.phone !== cleanPhone(req.user.phone)) return res.status(404).json({ error: 'Order nahi mila.' });
    if (!['placed', 'pending'].includes(String(order.status).toLowerCase())) return res.status(409).json({ error: 'Is order ko ab cancel nahi kar sakte.' });
    const now = Date.now();
    const { data, error } = await supabase.from('orders').update({ status: 'cancelled', cancellation_reason: String(req.body?.reason || 'Customer cancelled').slice(0, 300), cancelled_at: now, updated: now }).eq('id', id).select('*').single();
    if (error) throw error;
    return res.json({ ...data, items: safeItems(data.items) });
  } catch (error) {
    console.error('Cancel order failed:', error?.message || error);
    return res.status(503).json({ error: 'Order cancel nahi ho saka.' });
  }
});


// Special Services API (Gas, Train Food, Train Parcel) backed by existing Supabase tables.
const serviceSchedule = {
  Monday: 'Holiday', Tuesday: '100 Gate', Wednesday: 'Near Baiyansa Temple',
  Thursday: 'Senior Secondary School', Friday: 'Near Baiyansa Temple',
  Saturday: 'Senior Secondary School', Sunday: 'Badaliya Bera'
};
const servicePhone = value => String(value || '').replace(/\D/g, '').slice(-10);
const validServicePhone = value => /^[6-9]\d{9}$/.test(servicePhone(value));
const servicePayload = value => {
  if (value && typeof value === 'object') return value;
  try { return JSON.parse(value || '{}'); } catch { return {}; }
};
const serviceView = row => {
  const payload = servicePayload(row.payload);
  return { ...row, serviceId: `S-${row.id}`, payload,
    summary: String(payload.items || payload.parcelDescription || payload.gasAddress || '').slice(0, 180) };
};
const getServiceFee = async key => {
  const { data, error } = await supabase.from('service_settings').select('value').eq('key', key).maybeSingle();
  if (error) throw error;
  return Number(data?.value || 30);
};
const insertService = async (req, res, type, fee, payload) => {
  const now = Date.now();
  const record = { type, phone: cleanPhone(req.user.phone), name: String(payload.name || req.user.name || 'Customer').trim().slice(0, 80), payload: JSON.stringify(payload), fee, status: 'pending', created: now, updated: now };
  const { data, error } = await supabase.from('service_requests').insert(record).select('*').single();
  if (error) throw error;
  return res.status(201).json({ ok: true, id: data.id, serviceId: `S-${data.id}`, fee, message: 'Service request submit ho gayi.' });
};

app.get('/api/services/mine', needUser, async (req, res) => {
  try {
    const { data, error } = await supabase.from('service_requests').select('*').eq('phone', cleanPhone(req.user.phone)).order('id', { ascending: false }).limit(100);
    if (error) throw error;
    return res.json((data || []).map(serviceView));
  } catch (error) {
    console.error('My services failed:', error?.message || error);
    return res.status(503).json({ error: 'Service requests load nahi ho paaye.' });
  }
});

app.post('/api/services/gas', needUser, limit(10, 10), async (req, res) => {
  const p = req.body || {};
  const scheduledLocation = serviceSchedule[p.gasDay];
  if (!validServicePhone(p.phone) || !String(p.name || '').trim() || !String(p.gasAddress || '').trim() || !scheduledLocation || scheduledLocation === 'Holiday' || p.gasLocation !== scheduledLocation) {
    return res.status(400).json({ error: 'Gas delivery day/location schedule valid nahi hai. Monday holiday hai.' });
  }
  if (!['route', 'agency'].includes(String(p.gasService || 'route'))) return res.status(400).json({ error: 'Gas service type invalid hai.' });
  try {
    const fee = p.gasService === 'agency' ? 50 : 30;
    return await insertService(req, res, 'gas', fee, { ...p, station: 'Merta Road', scheduleLocation: scheduledLocation });
  } catch (error) {
    console.error('Gas service create failed:', error?.message || error);
    return res.status(503).json({ error: 'Gas service request save nahi ho payi.' });
  }
});

app.post('/api/services/train-food', needUser, limit(10, 10), async (req, res) => {
  const p = req.body || {}, dep = new Date(p.departure).getTime(), lead = Number(p.leadMinutes);
  if (!String(p.trainNo || '').trim() || !String(p.coach || '').trim() || !String(p.seat || '').trim() || !String(p.items || '').trim() || !validServicePhone(p.phone)) return res.status(400).json({ error: 'Train, seat, food aur valid mobile details zaroori hain.' });
  if (![30, 60].includes(lead) || !Number.isFinite(dep) || dep < Date.now() + lead * 60000) return res.status(400).json({ error: 'Selected lead time ke hisaab se booking deadline cross ho gayi hai.' });
  try { return await insertService(req, res, 'train-food', 30, { ...p, station: 'Merta Road Railway Station' }); }
  catch (error) { console.error('Train food create failed:', error?.message || error); return res.status(503).json({ error: 'Train food request save nahi ho payi.' }); }
});

app.post('/api/services/train-parcel', needUser, limit(10, 10), async (req, res) => {
  const p = req.body || {};
  if (!String(p.trainNo || '').trim() || !String(p.senderName || '').trim() || !String(p.receiverName || '').trim() || !String(p.parcelDescription || '').trim() || !validServicePhone(p.senderPhone) || !validServicePhone(p.receiverPhone)) return res.status(400).json({ error: 'Train, parcel, sender aur receiver ki valid details zaroori hain.' });
  try { const fee = await getServiceFee('train_parcel_fee'); return await insertService(req, res, 'train-parcel', fee, { ...p, station: 'Merta Road Railway Station' }); }
  catch (error) { console.error('Train parcel create failed:', error?.message || error); return res.status(503).json({ error: 'Train parcel request save nahi ho payi.' }); }
});

app.get('/api/admin/services', needAdmin, async (_req, res) => {
  try {
    const { data, error } = await supabase.from('service_requests').select('*').order('id', { ascending: false }).limit(500);
    if (error) throw error;
    return res.json((data || []).map(serviceView));
  } catch (error) { console.error('Admin services failed:', error?.message || error); return res.status(503).json({ error: 'Service requests load nahi ho paaye.' }); }
});
app.patch('/api/admin/services/:id', needAdmin, async (req, res) => {
  const id = Number(req.params.id), allowed = ['pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'completed', 'cancelled'];
  const status = String(req.body?.status || '');
  if (!Number.isSafeInteger(id) || id < 1 || !allowed.includes(status)) return res.status(400).json({ error: 'Service ID ya status invalid hai.' });
  try {
    const { data, error } = await supabase.from('service_requests').update({ status, updated: Date.now() }).eq('id', id).select('id').maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Service request nahi mili.' });
    return res.json({ ok: true });
  } catch (error) { console.error('Service status update failed:', error?.message || error); return res.status(503).json({ error: 'Service status update nahi hua.' }); }
});
app.get('/api/admin/service-settings', needAdmin, async (_req, res) => {
  try { return res.json({ trainParcelFee: await getServiceFee('train_parcel_fee') }); }
  catch (error) { console.error('Service settings read failed:', error?.message || error); return res.status(503).json({ error: 'Service settings load nahi hui.' }); }
});
app.put('/api/admin/service-settings', needAdmin, async (req, res) => {
  const fee = Number(req.body?.trainParcelFee);
  if (!Number.isSafeInteger(fee) || fee < 0 || fee > 10000) return res.status(400).json({ error: 'Parcel fee 0 se 10000 ke beech whole number honi chahiye.' });
  try {
    const { error } = await supabase.from('service_settings').upsert({ key: 'train_parcel_fee', value: String(fee) }, { onConflict: 'key' });
    if (error) throw error;
    return res.json({ ok: true, trainParcelFee: fee });
  } catch (error) { console.error('Service settings update failed:', error?.message || error); return res.status(503).json({ error: 'Service fee save nahi hui.' }); }
});

app.use((error, _req, res, _next) => {
  console.error('Unhandled API error:', error?.message || error);
  res.status(500).json({ error: 'Server error. Dobara try karein.' });
});

if (process.env.VERCEL !== '1') {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[ShopEasy] API listening on http://0.0.0.0:${PORT}`);
  });
}
export default app;
