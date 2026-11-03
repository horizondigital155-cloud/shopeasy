import 'dotenv/config';

import express from 'express';

import helmet from 'helmet';

import rateLimit from 'express-rate-limit';

import cookieParser from 'cookie-parser';

import jwt from 'jsonwebtoken';

import bcrypt from 'bcryptjs';

import Database from 'better-sqlite3';

import crypto from 'node:crypto';

import path from 'node:path';

import fs from 'node:fs';

import { fileURLToPath } from 'node:url';

import multer from 'multer';

import nodemailer from 'nodemailer';



const __dirname = path.dirname(fileURLToPath(import.meta.url));

const { JWT_SECRET, ADMIN_PHONE, ADMIN_PASS_HASH, ADMIN_WHATSAPP, WA_TOKEN, WA_PHONE_ID,

  WA_DELIVERY_TEMPLATE, WA_CONFIRM_TEMPLATE, RAZORPAY_KEY_ID,

  RAZORPAY_KEY_SECRET } = process.env;

if (!JWT_SECRET || JWT_SECRET.length < 32) throw new Error('JWT_SECRET must be at least 32 characters.');

const production = process.env.NODE_ENV === 'production';

const app = express();

app.disable('x-powered-by');

app.set('trust proxy', 1);

app.use(helmet({

  contentSecurityPolicy: { directives: {

    defaultSrc: ["'self'"], scriptSrc: ["'self'", "'unsafe-inline'", "https://checkout.razorpay.com"],

    styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],

    fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],

    imgSrc: ["'self'", "data:", "blob:", "https:"],

    connectSrc: ["'self'", "https://api.razorpay.com"],

    frameSrc: ["'self'", "https://api.razorpay.com", "https://checkout.razorpay.com"]

  } }

}));

app.use(express.json({ limit: '100kb' }));

app.use(cookieParser());



const dataDir = path.resolve(process.env.DATA_DIR || __dirname);
fs.mkdirSync(dataDir, { recursive: true });
const db = new Database(path.join(dataDir, 'data.db'));

db.pragma('journal_mode = WAL');

db.pragma('foreign_keys = ON');

db.exec(`

CREATE TABLE IF NOT EXISTS users(phone TEXT PRIMARY KEY, name TEXT NOT NULL, hash TEXT NOT NULL, created INTEGER NOT NULL);

CREATE TABLE IF NOT EXISTS products(id TEXT PRIMARY KEY, category TEXT NOT NULL, name TEXT NOT NULL, unit TEXT NOT NULL DEFAULT '', price INTEGER NOT NULL, image TEXT NOT NULL DEFAULT '', created INTEGER NOT NULL, updated INTEGER NOT NULL);

CREATE TABLE IF NOT EXISTS product_images(product_id TEXT PRIMARY KEY, filename TEXT NOT NULL, FOREIGN KEY(product_id) REFERENCES products(id) ON DELETE CASCADE);

CREATE TABLE IF NOT EXISTS orders(id INTEGER PRIMARY KEY AUTOINCREMENT, phone TEXT NOT NULL, name TEXT NOT NULL, address TEXT NOT NULL, items TEXT NOT NULL, subtotal INTEGER NOT NULL, fee INTEGER NOT NULL, total INTEGER NOT NULL, payment TEXT NOT NULL, payment_status TEXT NOT NULL DEFAULT 'pending', status TEXT NOT NULL DEFAULT 'placed', rider_id INTEGER, delivery_code_hash TEXT, delivery_code_exp INTEGER, created INTEGER NOT NULL, updated INTEGER NOT NULL);

CREATE TABLE IF NOT EXISTS riders(id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, phone TEXT UNIQUE NOT NULL, hash TEXT NOT NULL, photo TEXT NOT NULL DEFAULT '', active INTEGER NOT NULL DEFAULT 1, created INTEGER NOT NULL);

CREATE TABLE IF NOT EXISTS rider_locations(rider_id INTEGER PRIMARY KEY, lat REAL, lng REAL, updated INTEGER, FOREIGN KEY(rider_id) REFERENCES riders(id) ON DELETE CASCADE);

`);





db.exec(`

CREATE TABLE IF NOT EXISTS rider_earnings (

  id INTEGER PRIMARY KEY AUTOINCREMENT,

  order_id INTEGER NOT NULL UNIQUE,

  rider_id INTEGER NOT NULL,

  amount INTEGER NOT NULL DEFAULT 5 CHECK(amount = 5),

  created INTEGER NOT NULL,

  FOREIGN KEY(order_id) REFERENCES orders(id),

  FOREIGN KEY(rider_id) REFERENCES riders(id)

);

`);



// ShopEasy cancellation metadata migration.

const orderColumns = db.prepare('PRAGMA table_info(orders)').all().map(c => c.name);

if (!orderColumns.includes('cancellation_reason')) {

  db.exec('ALTER TABLE orders ADD COLUMN cancellation_reason TEXT');

}

if (!orderColumns.includes('cancelled_at')) {

  db.exec('ALTER TABLE orders ADD COLUMN cancelled_at INTEGER');

}

const productColumnsForMrp = db.prepare('PRAGMA table_info(products)').all().map(c => c.name);

if (!productColumnsForMrp.includes('mrp')) {

  db.exec('ALTER TABLE products ADD COLUMN mrp INTEGER NOT NULL DEFAULT 0');

}

// Starter catalogue: editable from Admin; inserted only when the database is empty.

const starterProducts = [

 ['Fruits','Fresh Red Apples','1 kg',149,'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?auto=format&fit=crop&w=900&q=85'],

 ['Fruits','Sweet Bananas','1 dozen',59,'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?auto=format&fit=crop&w=900&q=85'],

 ['Fruits','Fresh Oranges','1 kg',89,'https://images.unsplash.com/photo-1547514701-42782101795e?auto=format&fit=crop&w=900&q=85'],

 ['Fruits','Green Grapes','500 g',79,'https://images.unsplash.com/photo-1537640538966-79f369143f8f?auto=format&fit=crop&w=900&q=85'],

 ['Fruits','Fresh Strawberries','250 g',129,'https://images.unsplash.com/photo-1464965911861-746a04b4bca6?auto=format&fit=crop&w=900&q=85'],

 ['Vegetables','Fresh Tomatoes','1 kg',40,'https://images.unsplash.com/photo-1546094096-0df4bcaaa337?auto=format&fit=crop&w=900&q=85'],

 ['Vegetables','Farm Potatoes','1 kg',32,'https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&w=900&q=85'],

 ['Vegetables','Fresh Broccoli','1 pc',65,'https://images.unsplash.com/photo-1459411621453-7b03977f4bfc?auto=format&fit=crop&w=900&q=85'],

 ['Vegetables','Red Capsicum','500 g',55,'https://images.unsplash.com/photo-1563565375-f3fdfdbefa83?auto=format&fit=crop&w=900&q=85'],

 ['Vegetables','Fresh Carrots','500 g',35,'https://images.unsplash.com/photo-1445282768818-728615cc910a?auto=format&fit=crop&w=900&q=85'],

 ['Dairy & Eggs','Full Cream Milk','1 litre',68,'https://images.unsplash.com/photo-1563636619-e9143da7973b?auto=format&fit=crop&w=900&q=85'],

 ['Dairy & Eggs','Farm Fresh Eggs','6 pcs',54,'https://images.unsplash.com/photo-1506976785307-8732e854ad03?auto=format&fit=crop&w=900&q=85'],

 ['Dairy & Eggs','Cheddar Cheese','200 g',125,'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?auto=format&fit=crop&w=900&q=85'],

 ['Dairy & Eggs','Creamy Butter','100 g',58,'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?auto=format&fit=crop&w=900&q=85'],

 ['Bakery','Whole Wheat Bread','400 g',45,'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=900&q=85'],

 ['Bakery','Butter Croissants','2 pcs',89,'https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=900&q=85'],

 ['Bakery','Chocolate Muffins','2 pcs',75,'https://images.unsplash.com/photo-1607958996333-41aef7caefaa?auto=format&fit=crop&w=900&q=85'],

 ['Staples','Basmati Rice','1 kg',119,'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=900&q=85'],

 ['Staples','Whole Wheat Atta','5 kg',249,'https://images.unsplash.com/photo-1627485937980-221c88ac04f9?auto=format&fit=crop&w=900&q=85'],

 ['Staples','Toor Dal','1 kg',159,'https://images.unsplash.com/photo-1515543904379-3d757afe72e4?auto=format&fit=crop&w=900&q=85'],

 ['Staples','Chickpeas','500 g',69,'https://images.unsplash.com/photo-1515543904379-3d757afe72e4?auto=format&fit=crop&w=900&q=85'],

 ['Snacks','Classic Potato Chips','1 pack',20,'https://images.unsplash.com/photo-1566478989037-eec170784d0b?auto=format&fit=crop&w=900&q=85'],

 ['Snacks','Salted Almonds','200 g',179,'https://images.unsplash.com/photo-1508061253366-f7da158b6d46?auto=format&fit=crop&w=900&q=85'],

 ['Snacks','Dark Chocolate','100 g',99,'https://images.unsplash.com/photo-1548907040-4d42cfcf8c90?auto=format&fit=crop&w=900&q=85'],

 ['Beverages','Orange Juice','1 litre',110,'https://images.unsplash.com/photo-1600271886742-f049cd451bba?auto=format&fit=crop&w=900&q=85'],

 ['Beverages','Mineral Water','1 litre',20,'https://images.unsplash.com/photo-1564419320461-6870880221ad?auto=format&fit=crop&w=900&q=85'],

 ['Beverages','Ground Coffee','200 g',229,'https://images.unsplash.com/photo-1559525839-b184a4d698c7?auto=format&fit=crop&w=900&q=85'],

 ['Beverages','Green Tea','25 bags',149,'https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=900&q=85'],

 ['Personal Care','Herbal Shampoo','340 ml',189,'https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?auto=format&fit=crop&w=900&q=85'],

 ['Personal Care','Hand Wash','250 ml',79,'https://images.unsplash.com/photo-1600857544200-b2f666a9a2ec?auto=format&fit=crop&w=900&q=85'],

 ['Household','Laundry Detergent','1 kg',139,'https://images.unsplash.com/photo-1585421514284-efb74c2b69ba?auto=format&fit=crop&w=900&q=85'],

 ['Household','Dishwashing Liquid','500 ml',85,'https://images.unsplash.com/photo-1622560480654-d96214fdc887?auto=format&fit=crop&w=900&q=85'],

 ['Frozen Foods','Vanilla Ice Cream','500 ml',165,'https://images.unsplash.com/photo-1563805042-7684c019e1cb?auto=format&fit=crop&w=900&q=85'],

 ['Frozen Foods','Frozen Green Peas','500 g',79,'https://images.unsplash.com/photo-1587735243615-c03f25aaff15?auto=format&fit=crop&w=900&q=85'],

 ['Baby Care','Baby Lotion','200 ml',199,'https://images.unsplash.com/photo-1604917877934-07d8d248d396?auto=format&fit=crop&w=900&q=85'],

 ['Pet Supplies','Pet Food','1 kg',299,'https://images.unsplash.com/photo-1589924691995-400dc9ecc119?auto=format&fit=crop&w=900&q=85'],

 ['Spices','Turmeric Powder','200 g',49,'https://images.unsplash.com/photo-1615485500704-8e990f9900f5?auto=format&fit=crop&w=900&q=85'],

 ['Spices','Red Chilli Powder','200 g',59,'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=900&q=85'],

 ['Oils','Sunflower Oil','1 litre',149,'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=900&q=85'],

 ['Dry Fruits','Premium Cashews','200 g',229,'http://localhost:5173/premium-cashews.jpg']

];

const countProducts = db.prepare('SELECT COUNT(*) AS n FROM products').get().n;

if (countProducts === 0) {

 const insertStarter = db.prepare('INSERT INTO products(id,category,name,unit,price,image,created,updated) VALUES(?,?,?,?,?,?,?,?)');

 const seed = db.transaction(() => starterProducts.forEach(([category,name,unit,price,image]) => insertStarter.run(crypto.randomUUID(),category,name,unit,price,image,Date.now(),Date.now())));

 seed();

 console.log(`[ShopEasy] Added ${starterProducts.length} editable starter products.`);

}



try {

  const userColumns = db.prepare("PRAGMA table_info(users)").all().map(c => c.name);

  if (!userColumns.includes('email')) db.exec("ALTER TABLE users ADD COLUMN email TEXT");

  db.exec("CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique ON users(email) WHERE email IS NOT NULL AND email <> ''");

} catch (e) {

  console.error('Email column migration failed:', e.message);

  throw e;

}

db.exec(`

CREATE TABLE IF NOT EXISTS email_otps(

  email TEXT PRIMARY KEY,

  otp_hash TEXT NOT NULL,

  purpose TEXT NOT NULL,

  phone TEXT,

  name TEXT,

  expires INTEGER NOT NULL,

  attempts INTEGER NOT NULL DEFAULT 0,

  last_sent INTEGER NOT NULL

);

`);


// Special service bookings are stored separately; existing grocery orders remain untouched.
db.exec(`
CREATE TABLE IF NOT EXISTS service_requests (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 type TEXT NOT NULL,
 phone TEXT NOT NULL,
 name TEXT NOT NULL,
 payload TEXT NOT NULL,
 fee INTEGER NOT NULL DEFAULT 0,
 status TEXT NOT NULL DEFAULT 'pending',
 created INTEGER NOT NULL,
 updated INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS service_requests_phone_idx
ON service_requests(phone, id DESC);

CREATE TABLE IF NOT EXISTS service_settings (
 key TEXT PRIMARY KEY,
 value TEXT NOT NULL
);

INSERT OR IGNORE INTO service_settings(key,value)
VALUES ('train_parcel_fee','30');
`);

// Special service rider workflow migrations - JavaScript outside SQL
const specialServiceColumns = db.prepare(
  'PRAGMA table_info(service_requests)'
).all().map(c => c.name);

if (!specialServiceColumns.includes('rider_id')) {
  db.exec('ALTER TABLE service_requests ADD COLUMN rider_id INTEGER');
}

if (!specialServiceColumns.includes('delivery_code_hash')) {
  db.exec('ALTER TABLE service_requests ADD COLUMN delivery_code_hash TEXT');
}

if (!specialServiceColumns.includes('delivery_code_exp')) {
  db.exec('ALTER TABLE service_requests ADD COLUMN delivery_code_exp INTEGER');
}

db.exec(
  'CREATE INDEX IF NOT EXISTS service_requests_rider_idx ON service_requests(rider_id, status, id DESC)'
);
const limit = (max, mins) => rateLimit({ windowMs: mins * 60000, limit: max, standardHeaders: true, legacyHeaders: false });





const cleanPhone = v => String(v ?? '').replace(/\D/g, '').slice(-10);

const validPhone = p => /^[6-9]\d{9}$/.test(p);

const sha = s => crypto.createHash('sha256').update(String(s)).digest('hex');

const setSession = (res, payload) => res.cookie('sid', jwt.sign(payload, JWT_SECRET, { expiresIn: '30d' }), {

  httpOnly: true, sameSite: 'lax', secure: Boolean(res.req?.secure), maxAge: 30 * 86400000, path: '/'

});

const emailTransporter = nodemailer.createTransport({

  host: process.env.SMTP_HOST,

  port: Number(process.env.SMTP_PORT || 465),

  secure: Number(process.env.SMTP_PORT || 465) === 465,

  auth: {

    user: process.env.SMTP_USER,

    pass: process.env.SMTP_PASS,

  },

});

const normalizeEmail = value => String(value || '').trim().toLowerCase();

const validEmail = value => value.length <= 254 && /^[^\s@]+@[^\s@]+.[^\s@]+$/.test(value);

const otpHash = (email, otp) => sha(`${email}:${otp}:${JWT_SECRET}`);

app.use((req, _res, next) => {

  try { req.user = jwt.verify(req.cookies.sid || '', JWT_SECRET); } catch { req.user = null; }

  next();

});

const needUser = (req, res, next) => req.user?.role === 'customer' ? next() : res.status(401).json({ error: 'Pehle login karein.' });

const needAdmin = (req, res, next) => req.user?.role === 'admin' ? next() : res.status(403).json({ error: 'Admin permission required.' });

const needRider = (req, res, next) => req.user?.role === 'rider' ? next() : res.status(403).json({ error: 'Rider login required.' });


const safeJson = s => { try { return JSON.parse(s); } catch { return []; } };

// Special services routes registered after authentication middleware.
// Special services: customer bookings and admin fulfilment.
const serviceFee = key => Number(db.prepare('SELECT value FROM service_settings WHERE key=?').get(key)?.value || 0);
const servicePhone = v => String(v || '').replace(/\D/g, '').slice(-10);
const validServicePhone = v => /^[6-9]\d{9}$/.test(servicePhone(v));
const createServiceRequest = db.prepare(`INSERT INTO service_requests(type,phone,name,payload,fee,status,created,updated) VALUES(?,?,?,?,?,'pending',?,?)`);
app.get('/api/services/mine', needUser, (req,res) => {
 const rows=db.prepare('SELECT * FROM service_requests WHERE phone=? ORDER BY id DESC LIMIT 100').all(req.user.phone);
 res.json(rows.map(x=>({...x,payload:safeJson(x.payload),summary:String(safeJson(x.payload).items||safeJson(x.payload).parcelDescription||safeJson(x.payload).gasAddress||'').slice(0,180)})));
});
app.post('/api/services/train-food', needUser, limit(10,10), (req,res) => {
 const p=req.body||{}, now=Date.now(), dep=new Date(p.departure).getTime(), lead=Number(p.leadMinutes);
 if(!String(p.trainNo||'').trim()||!String(p.coach||'').trim()||!String(p.seat||'').trim()||!String(p.items||'').trim()||!validServicePhone(p.phone)) return res.status(400).json({error:'Train, seat, food aur valid mobile details zaroori hain.'});
 if(![30,60].includes(lead)||!Number.isFinite(dep)||dep<now+lead*60000) return res.status(400).json({error:'Selected lead time ke hisaab se booking deadline cross ho gayi hai.'});
 const payload={...p,station:'Merta Road Railway Station'};
 const info=createServiceRequest.run('train-food',req.user.phone,String(p.name||req.user.name||'Customer').slice(0,80),JSON.stringify(payload),30,now,now);
 res.status(201).json({ok:true,id:info.lastInsertRowid,fee:30,message:'Train food booking request submit ho gayi. Delivery fee ₹30.'});
});
app.post('/api/services/train-parcel', needUser, limit(10,10), (req,res) => {
 const p=req.body||{};
 if(!String(p.trainNo||'').trim()||!String(p.senderName||'').trim()||!String(p.receiverName||'').trim()||!String(p.parcelDescription||'').trim()||!validServicePhone(p.senderPhone)||!validServicePhone(p.receiverPhone)) return res.status(400).json({error:'Train, parcel, sender aur receiver ki valid details zaroori hain.'});
 const fee=serviceFee('train_parcel_fee'),now=Date.now(),payload={...p,station:'Merta Road Railway Station'};
 const info=createServiceRequest.run('train-parcel',req.user.phone,String(p.name||req.user.name||'Customer').slice(0,80),JSON.stringify(payload),fee,now,now);
 res.status(201).json({ok:true,id:info.lastInsertRowid,fee,message:'Train parcel request submit ho gayi.'});
});
app.post('/api/services/gas', needUser, limit(10,10), (req,res) => {
 const p=req.body||{}, schedule={Monday:'Holiday',Tuesday:'100 Gate',Wednesday:'Near Baiyansa Temple',Thursday:'Senior Secondary School',Friday:'Near Baiyansa Temple',Saturday:'Senior Secondary School',Sunday:'Badaliya Bera'};
 if(!validServicePhone(p.phone)||!String(p.name||'').trim()||!String(p.gasAddress||'').trim()||!schedule[p.gasDay]||schedule[p.gasDay]==='Holiday'||p.gasLocation!==schedule[p.gasDay]) return res.status(400).json({error:'Gas delivery day/location schedule valid nahi hai. Monday holiday hai.'});
 const fee=p.gasService==='agency'?50:30,now=Date.now(),payload={...p,scheduleLocation:schedule[p.gasDay]};
 const info=createServiceRequest.run('gas',req.user.phone,String(p.name).slice(0,80),JSON.stringify(payload),fee,now,now);
 res.status(201).json({ok:true,id:info.lastInsertRowid,fee,message:`Gas cylinder request submit ho gayi. Delivery fee ₹${fee}.`});
});
app.get('/api/admin/services', needAdmin, (_req,res) => {
 const rows=db.prepare('SELECT * FROM service_requests ORDER BY id DESC LIMIT 500').all();
 res.json(rows.map(x=>({...x,payload:safeJson(x.payload)})));
});
app.patch('/api/admin/services/:id', needAdmin, (req,res) => {
 const allowed=['pending','confirmed','preparing','ready','out_for_delivery','completed','cancelled'];
 const status=String(req.body?.status||'');
 if(!allowed.includes(status))return res.status(400).json({error:'Invalid service status.'});
 const r=db.prepare('UPDATE service_requests SET status=?,updated=? WHERE id=?').run(status,Date.now(),Number(req.params.id));
 if(!r.changes)return res.status(404).json({error:'Service request nahi mili.'});
 res.json({ok:true});
});
app.get('/api/admin/service-settings', needAdmin, (_req,res) => res.json({trainParcelFee:serviceFee('train_parcel_fee')}));
app.put('/api/admin/service-settings', needAdmin, (req,res) => {
 const fee=Number(req.body?.trainParcelFee);
 if(!Number.isSafeInteger(fee)||fee<0||fee>10000)return res.status(400).json({error:'Parcel fee 0 se 10000 ke beech whole number honi chahiye.'});
 db.prepare("INSERT INTO service_settings(key,value) VALUES('train_parcel_fee',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").run(String(fee));
 res.json({ok:true,trainParcelFee:fee});
});




async function sendWhatsApp(to, payload) {

  if (!WA_TOKEN || !WA_PHONE_ID) {

    if (!production) console.log('[WhatsApp dev: not sent]', to, JSON.stringify(payload));

    return false;

  }

  const r = await fetch(`https://graph.facebook.com/v21.0/${WA_PHONE_ID}/messages`, {

    method: 'POST', headers: { Authorization: `Bearer ${WA_TOKEN}`, 'Content-Type': 'application/json' },

    body: JSON.stringify({ messaging_product: 'whatsapp', to: String(to).replace(/\D/g, ''), ...payload })

  });

  if (!r.ok) console.error('WhatsApp API error:', r.status, (await r.text()).slice(0, 500));

  return r.ok;

}

function sendTemplate(to, templateName, code) {

  if (!templateName) return Promise.resolve(false);

  return sendWhatsApp(to, { type: 'template', template: { name: templateName, language: { code: 'en' },

    components: [{ type: 'body', parameters: [{ type: 'text', text: String(code) }] }] } });

}

const waText = (to, body) => sendWhatsApp(to, { type: 'text', text: { body: String(body).slice(0, 4000) } });



const uploads = path.join(dataDir, 'uploads');

fs.mkdirSync(uploads, { recursive: true });

app.use('/uploads', express.static(uploads, { maxAge: production ? '7d' : 0, immutable: production }));



// Product images are stored locally. Client must downscale to JPEG <=700 KB; server verifies JPEG magic bytes.

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 700 * 1024, files: 1 } });

function validJpeg(buf) { return Buffer.isBuffer(buf) && buf.length >= 4 && buf[0] === 0xff && buf[1] === 0xd8 && buf[buf.length-2] === 0xff && buf[buf.length-1] === 0xd9; }

function saveJpeg(buf) {

  if (!validJpeg(buf) || buf.length > 700 * 1024) throw new Error('Asli JPEG file 700KB se chhoti honi chahiye.');

  const filename = `${crypto.randomUUID()}.jpg`;

  fs.writeFileSync(path.join(uploads, filename), buf, { flag: 'wx' });

  return filename;

}

function deleteUpload(filename) { if (filename) { try { fs.unlinkSync(path.join(uploads, path.basename(filename))); } catch {} } }



app.get('/api/health', (_req, res) => res.json({ ok: true, app: 'ShopEasy', payments: !!(RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET) }));



// Products are managed by admin in SQLite. Starter catalogue seeds only on a brand-new database.

app.get('/api/products', (_req, res) => {

  const rows = db.prepare(`SELECT p.*, pi.filename AS custom_image FROM products p LEFT JOIN product_images pi ON pi.product_id=p.id ORDER BY p.category COLLATE NOCASE,p.name COLLATE NOCASE`).all();

  res.json(rows.map(p => ({ id:p.id, category:p.category, name:p.name, unit:p.unit, price:p.price, mrp:p.mrp || 0,

    image:p.custom_image ? `/uploads/${p.custom_image}` : p.image, originalImage:p.image, hasCustomImage:!!p.custom_image })));

});

app.post('/api/admin/products', needAdmin, (req,res) => {

  const { category, name, unit='', price, mrp=0, image='' } = req.body || {};

  const n = String(name || '').trim(), c = String(category || '').trim(), im = String(image || '').trim(), pr = Number(price), mr = Number(mrp || 0);

  if (!n || n.length > 120 || !c || c.length > 80 || !Number.isSafeInteger(pr) || pr <= 0 || !Number.isSafeInteger(mr) || mr < 0 || (mr > 0 && mr < pr) || !/^https?:\/\/\S+$/i.test(im)) {

    return res.status(400).json({ error:'Name, category, positive whole-number price aur valid image URL zaroori hai.' });

  }

  const id = crypto.randomUUID();

  db.prepare('INSERT INTO products(id,category,name,unit,price,mrp,image,created,updated) VALUES(?,?,?,?,?,?,?,?,?)')

    .run(id,c,n,String(unit).slice(0,60),pr,mr,im,Date.now(),Date.now());

  res.status(201).json({ id });

});

app.put('/api/admin/products/:id', needAdmin, (req,res) => {

  const { category, name, unit='', price, mrp=0, image='' } = req.body || {};

  const n=String(name||'').trim(), c=String(category||'').trim(), im=String(image||'').trim(), pr=Number(price), mr=Number(mrp||0);

  if (!db.prepare('SELECT id FROM products WHERE id=?').get(req.params.id)) return res.status(404).json({error:'Product nahi mila.'});

  if (!n || n.length>120 || !c || c.length>80 || !Number.isSafeInteger(pr) || pr<=0 || !Number.isSafeInteger(mr) || mr<0 || (mr>0 && mr<pr) || !/^https?:\/\/\S+$/i.test(im)) return res.status(400).json({error:'Product details check karein.'});

  db.prepare('UPDATE products SET category=?,name=?,unit=?,price=?,mrp=?,image=?,updated=? WHERE id=?').run(c,n,String(unit).slice(0,60),pr,mr,im,Date.now(),req.params.id);

  res.json({ok:true});

});

app.delete('/api/admin/products/:id', needAdmin, (req,res) => {

  const p=db.prepare('SELECT pi.filename FROM products p LEFT JOIN product_images pi ON pi.product_id=p.id WHERE p.id=?').get(req.params.id);

  if (!p) return res.status(404).json({error:'Product nahi mila.'});

  db.prepare('DELETE FROM products WHERE id=?').run(req.params.id); deleteUpload(p.filename); res.json({ok:true});

});

app.post('/api/admin/products/:id/photo', needAdmin, upload.single('photo'), (req,res) => {

  if (!req.file) return res.status(400).json({error:'JPEG photo select karein (max 700KB).'});

  let filename;

  try { filename=saveJpeg(req.file.buffer); } catch(e) { return res.status(400).json({error:e.message}); }

  if (!db.prepare('SELECT id FROM products WHERE id=?').get(req.params.id)) { deleteUpload(filename); return res.status(404).json({error:'Product nahi mila.'}); }

  const old=db.prepare('SELECT filename FROM product_images WHERE product_id=?').get(req.params.id);

  db.prepare('INSERT INTO product_images(product_id,filename) VALUES(?,?) ON CONFLICT(product_id) DO UPDATE SET filename=excluded.filename').run(req.params.id,filename);

  deleteUpload(old?.filename); res.json({ok:true,image:`/uploads/${filename}`});

});

app.delete('/api/admin/products/:id/photo', needAdmin, (req,res) => {

  const old=db.prepare('SELECT filename FROM product_images WHERE product_id=?').get(req.params.id);

  db.prepare('DELETE FROM product_images WHERE product_id=?').run(req.params.id); deleteUpload(old?.filename); res.json({ok:true});

});



// Hidden admin unlock: no admin button. Admin password is only in .env as bcrypt hash.

app.post('/api/admin/unlock', limit(5,15), (req,res) => {

  const secret=String(req.body?.secret || '');

  if (!ADMIN_PASS_HASH || !bcrypt.compareSync(secret.slice(0,72), ADMIN_PASS_HASH)) return res.status(404).json({error:'Not found'});

  setSession(res,{role:'admin',phone:cleanPhone(ADMIN_PHONE),name:'Admin',admin:true}); res.json({role:'admin',phone:cleanPhone(ADMIN_PHONE),name:'Admin',admin:true});

});



// EMAIL OTP AUTH START

app.post('/api/auth/send-otp', limit(100, 15), async (req, res) => {

  const email = normalizeEmail(req.body?.email);

  const purpose = String(req.body?.purpose || 'login');

  const name = String(req.body?.name || '').trim();

  const phone = cleanPhone(req.body?.phone);

  if (!validEmail(email)) return res.status(400).json({error:'Valid email address enter karein.'});

  if (!['login','register'].includes(purpose)) return res.status(400).json({error:'Invalid request.'});

  if (purpose === 'register' && (!name || name.length > 60 || !validPhone(phone))) {

    return res.status(400).json({error:'Signup ke liye naam aur valid 10-digit mobile number zaroori hai.'});

  }

  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {

    return res.status(503).json({error:'Email service configure nahi hai. Server .env check karein.'});

  }

  const existingEmail = db.prepare('SELECT phone FROM users WHERE email=?').get(email);

  const existingPhone = purpose === 'register' ? db.prepare('SELECT phone FROM users WHERE phone=?').get(phone) : null;

  if (purpose === 'register' && existingEmail) return res.status(409).json({error:'Is email par account pehle se hai. Login karein.'});

  if (purpose === 'register' && existingPhone) return res.status(409).json({error:'Is mobile number par account pehle se hai. Existing account ko securely link karna hoga.'});

  if (purpose === 'login' && !existingEmail) return res.status(404).json({error:'Is email se account nahi mila. Sign up karein.'});

  const prior = db.prepare('SELECT last_sent FROM email_otps WHERE email=?').get(email);

  if (prior) {
    const elapsed = Date.now() - Number(prior.last_sent || 0);
    const remaining = Math.ceil((30000 - elapsed) / 1000);
    if (remaining > 0) {
      res.set('Retry-After', String(remaining));
      return res.status(429).json({error:`OTP abhi bheja gaya hai. ${remaining} seconds baad dobara try karein.`});
    }
  }

  const otp = String(crypto.randomInt(100000, 1000000));

  const expires = Date.now() + 5 * 60 * 1000;

  try {

    await emailTransporter.sendMail({

      from: process.env.SMTP_FROM || process.env.SMTP_USER,

      to: email,

      subject: 'ShopEasy email verification code',

      text: `Your ShopEasy verification code is ${otp}. It expires in 5 minutes. If you did not request it, ignore this email.`,

      html: `<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:24px"><h2>ShopEasy verification</h2><p>Your one-time verification code is:</p><div style="font-size:32px;font-weight:bold;letter-spacing:8px;padding:16px;background:#f2f7f3;border-radius:8px">${otp}</div><p>This code expires in 5 minutes. Do not share it with anyone.</p></div>`

    });

    db.prepare(`INSERT INTO email_otps(email,otp_hash,purpose,phone,name,expires,attempts,last_sent)

      VALUES(?,?,?,?,?,?,0,?) ON CONFLICT(email) DO UPDATE SET otp_hash=excluded.otp_hash,purpose=excluded.purpose,phone=excluded.phone,name=excluded.name,expires=excluded.expires,attempts=0,last_sent=excluded.last_sent`)

      .run(email, otpHash(email,otp), purpose, purpose === 'register' ? phone : null, purpose === 'register' ? name : null, expires, Date.now());

    return res.json({ok:true,message:'OTP aapke email par bhej diya gaya hai. Inbox aur Spam folder check karein.'});

  } catch (e) {

    console.error('OTP email send failed:', e?.message || e);

    return res.status(502).json({error:'Email par OTP nahi bhej saka. SMTP settings check karke dobara try karein.'});

  }

});



app.post('/api/auth/verify-otp', limit(10, 15), (req,res) => {

  const email = normalizeEmail(req.body?.email);

  const otp = String(req.body?.otp || '').trim();

  const purpose = String(req.body?.purpose || 'login');

  if (!validEmail(email) || !/^\d{6}$/.test(otp) || !['login','register'].includes(purpose)) {

    return res.status(400).json({error:'Email aur 6-digit OTP sahi enter karein.'});

  }

  const record = db.prepare('SELECT * FROM email_otps WHERE email=?').get(email);

  if (!record || record.purpose !== purpose) return res.status(400).json({error:'OTP nahi mila ya request badal gayi. Naya OTP lein.'});

  if (Date.now() > record.expires) {

    db.prepare('DELETE FROM email_otps WHERE email=?').run(email);

    return res.status(400).json({error:'OTP expire ho gaya. Naya OTP lein.'});

  }

  if (record.attempts >= 5) {

    db.prepare('DELETE FROM email_otps WHERE email=?').run(email);

    return res.status(429).json({error:'Bahut galat attempts hue. Naya OTP lein.'});

  }

  if (otpHash(email,otp) !== record.otp_hash) {

    db.prepare('UPDATE email_otps SET attempts=attempts+1 WHERE email=?').run(email);

    return res.status(400).json({error:'OTP galat hai. Dobara check karein.'});

  }

  try {

    let user;

    if (purpose === 'register') {

      const phone = cleanPhone(record.phone);

      const name = String(record.name || '').trim();

      if (!name || !validPhone(phone)) return res.status(400).json({error:'Signup details valid nahi hain. Dobara signup karein.'});

      if (db.prepare('SELECT phone FROM users WHERE phone=?').get(phone)) return res.status(409).json({error:'Is mobile number par account pehle se hai. Existing account ko securely link karna hoga.'});

      if (db.prepare('SELECT phone FROM users WHERE email=?').get(email)) return res.status(409).json({error:'Is email par account pehle se hai. Login karein.'});

      const generatedPassword = crypto.randomBytes(32).toString('hex');

      const hash = bcrypt.hashSync(generatedPassword,12);

      db.prepare('INSERT INTO users(phone,name,hash,created,email) VALUES(?,?,?,?,?)').run(phone,name,hash,Date.now(),email);

      user = {role:'customer',phone,name,email};

    } else {

      const row = db.prepare('SELECT phone,name,email FROM users WHERE email=?').get(email);

      if (!row) return res.status(404).json({error:'Is email se account nahi mila. Sign up karein.'});

      user = {role:'customer',phone:row.phone,name:row.name,email:row.email};

    }

    db.prepare('DELETE FROM email_otps WHERE email=?').run(email);

    setSession(res,user);

    return res.json(user);

  } catch (e) {

    if (String(e?.code || '').includes('SQLITE_CONSTRAINT')) return res.status(409).json({error:'Account details pehle se use ho rahe hain.'});

    console.error('OTP verification failed:',e?.message || e);

    return res.status(500).json({error:'OTP verify nahi ho saka. Dobara try karein.'});

  }

});

// EMAIL OTP AUTH END

app.post('/api/auth/register', limit(5,15), (req,res) => {

  const phone=cleanPhone(req.body?.phone), name=String(req.body?.name||'').trim(), password=String(req.body?.password||'');

  if (!validPhone(phone)||!name||name.length>60||password.length<8||password.length>72) {

    return res.status(400).json({error:'Naam, valid 10-digit mobile number aur 8-72 character password zaroori hai.'});

  }

  if (db.prepare('SELECT phone FROM users WHERE phone=?').get(phone)) {

    return res.status(409).json({error:'Is mobile number par account pehle se bana hua hai. Login karein.'});

  }

  try {

    db.prepare('INSERT INTO users(phone,name,hash,created) VALUES(?,?,?,?)').run(phone,name,bcrypt.hashSync(password,12),Date.now());

  } catch (e) {

    if (String(e?.code||'').includes('SQLITE_CONSTRAINT')) return res.status(409).json({error:'Is mobile number par account pehle se bana hua hai. Login karein.'});

    console.error('Registration failed:', e.message);

    return res.status(500).json({error:'Account create nahi ho saka. Dobara try karein.'});

  }

  setSession(res,{role:'customer',phone,name});

  res.status(201).json({role:'customer',phone,name});

});

app.post('/api/auth/login', limit(10,15), (req,res) => {

  const phone=cleanPhone(req.body?.phone), password=String(req.body?.password||'');

  const u=db.prepare('SELECT * FROM users WHERE phone=?').get(phone);

  if (!u || !bcrypt.compareSync(password.slice(0,72),u.hash)) return res.status(401).json({error:'Number ya password galat hai.'});

  setSession(res,{role:'customer',phone:u.phone,name:u.name}); res.json({role:'customer',phone:u.phone,name:u.name});

});

app.post('/api/auth/logout', (req,res)=>res.clearCookie('sid',{httpOnly:true,sameSite:'lax',secure:Boolean(req.secure),path:'/'}).json({ok:true}));

app.get('/api/me',(req,res)=>res.json(req.user || null));



// Calculate the current customer's delivery fee without creating an order.

function shopEasyOrderHours() {

  const parts = new Intl.DateTimeFormat('en-GB', {

    timeZone: 'Asia/Kolkata',

    hour: '2-digit',

    minute: '2-digit',

    hourCycle: 'h23'

  }).formatToParts(new Date());



  const hour = Number(parts.find(p => p.type === 'hour').value);

  const minute = Number(parts.find(p => p.type === 'minute').value);

  const currentMinutes = hour * 60 + minute;



  return {

    open: currentMinutes >= 540 && currentMinutes < 1260,

    message: 'Order Available Morning 9 AM to 9 PM'

  };

}



// SHOP EASY ORDER HOURS IST

app.post('/api/orders/quote', needUser, (req, res) => {

  const hours = shopEasyOrderHours();

  if (!hours.open) {

    return res.status(403).json({ error: hours.message, code: 'ORDERS_CLOSED' });

  }

  const items = req.body?.items;

  if (!Array.isArray(items) || !items.length || items.length > 60) {

    return res.status(400).json({ error: 'Cart items sahi bharein.' });

  }



  const lines = [];

  const seen = new Set();



  for (const item of items) {

    const id = String(item?.id || '');

    const qty = Number(item?.qty);

    if (seen.has(id)) continue;

    seen.add(id);



    if (!Number.isInteger(qty) || qty < 1 || qty > 50) {

      return res.status(400).json({ error: 'Quantity invalid hai.' });

    }



    const product = db.prepare(

      'SELECT id, name, unit FROM products WHERE id=?'

    ).get(id);



    if (!product) {

      return res.status(400).json({ error: 'Cart ka ek product available nahi hai.' });

    }

    lines.push({ ...product, qty });

  }



  const previousOrders = db.prepare(

    'SELECT COUNT(*) AS count FROM orders WHERE phone=?'

  ).get(req.user.phone).count;



  const totalWeightKg = lines.reduce((sum, item) => {

    const unit = String(item.unit || '').toLowerCase().replace(/,/g, '.');

    const match = unit.match(/(\d+(?:.\d+)?)\s*(kg|kgs|kilograms?|g|gm|gms|grams?)\b/);

    if (!match) return sum;

    const amount = Number(match[1]);

    const kg = /^(g|gm|gms|gram|grams)$/.test(match[2]) ? amount / 1000 : amount;

    return sum + kg * item.qty;

  }, 0);



  const deliveryAddress = String(req.body?.address || req.body?.deliveryAddress || '').toLowerCase();

  const itemCount = lines.reduce((sum, item) => sum + Number(item.qty || 0), 0);

  const fastFood = lines.length > 0 && lines.every(item =>

    /fast\s*food/i.test(String(item.category || ''))

  );

  const fastFoodTotal = lines.reduce((sum, item) =>

    sum + Number(item.price || 0) * Number(item.qty || 0), 0

  );

  const singleLowPriceItem = itemCount === 1 && lines.length === 1 &&

    [5, 10, 20].includes(Number(lines[0].price || 0));

  const cheapItemsOverFour = lines.some(item => Number(item.price || 0) < 198) &&

    itemCount > 4;

  const specialArea = /mataji ka mandir|mata ji ka mandir|market|aen colony/i.test(deliveryAddress);



  let fee = 20;

  if (totalWeightKg > 10) fee = 40;

  else if (specialArea) fee = 10;

  else if (fastFood) fee = fastFoodTotal > 250 ? 20 : 5;

  else if (cheapItemsOverFour) fee = 20;

  else if (singleLowPriceItem) fee = 3;

  res.json({

    fee,

    firstOrder: previousOrders === 0,

    totalWeightKg,

    weightKnownForAllItems: lines.every(item =>

      /(\d+(?:.\d+)?)\s*(kg|kgs|kilograms?|g|gm|gms|grams?)\b/i.test(String(item.unit || ''))

    )

  });

});



// Orders: all prices are read from current DB products on server; client prices ignored.

app.post('/api/orders', needUser, limit(10,10), async (req,res) => {

  const hours = shopEasyOrderHours();

  if (!hours.open) {

    return res.status(403).json({ error: hours.message, code: 'ORDERS_CLOSED' });

  }

  const address=String(req.body?.address||'').trim(), items=req.body?.items;

  if (address.length<5||address.length>500||!Array.isArray(items)||!items.length||items.length>60) return res.status(400).json({error:'Delivery address aur cart items sahi bharein.'});

  const lines=[]; let subtotal=0; const seen=new Set();

  for (const item of items) {

    const id=String(item?.id||''), qty=Number(item?.qty);

    if (seen.has(id)) continue; seen.add(id);

    if (!Number.isInteger(qty)||qty<1||qty>50) return res.status(400).json({error:'Quantity invalid hai.'});

    const p=db.prepare('SELECT id,name,category,unit,price FROM products WHERE id=?').get(id);

    if (!p) return res.status(400).json({error:'Cart ka ek product ab available nahi hai. Refresh karein.'});

    subtotal += p.price*qty; lines.push({...p,qty});

  }

  // First-ever order by this customer is free.

  // Later orders: up to 10 kg = Rs 20; above 10 kg = Rs 40.

  // Count all previous orders, including cancelled ones.

  const previousOrders = db.prepare(

    'SELECT COUNT(*) AS count FROM orders WHERE phone=?'

  ).get(req.user.phone).count;



  // Read weights only from units that explicitly state kg or g.

  // Units like "1 pc" or "1 dozen" need a separate product weight value.

  const totalWeightKg = lines.reduce((sum, item) => {

    const unit = String(item.unit || '').toLowerCase().replace(/,/g, '.');

    const match = unit.match(/(\d+(?:.\d+)?)\s*(kg|kgs|kilograms?|g|gm|gms|grams?)\b/);

    if (!match) return sum;

    const amount = Number(match[1]);

    const kg = /^(g|gm|gms|gram|grams)$/.test(match[2]) ? amount / 1000 : amount;

    return sum + kg * item.qty;

  }, 0);



  const deliveryAddress = String(req.body?.address || req.body?.deliveryAddress || '').toLowerCase();

  const itemCount = lines.reduce((sum, item) => sum + Number(item.qty || 0), 0);

  const fastFood = lines.length > 0 && lines.every(item =>

    /fast\s*food/i.test(String(item.category || ''))

  );

  const fastFoodTotal = lines.reduce((sum, item) =>

    sum + Number(item.price || 0) * Number(item.qty || 0), 0

  );

  const singleLowPriceItem = itemCount === 1 && lines.length === 1 &&

    [5, 10, 20].includes(Number(lines[0].price || 0));

  const cheapItemsOverFour = lines.some(item => Number(item.price || 0) < 198) &&

    itemCount > 4;

  const specialArea = /mataji ka mandir|mata ji ka mandir|market|aen colony/i.test(deliveryAddress);



  let fee = 20;

  if (totalWeightKg > 10) fee = 40;

  else if (specialArea) fee = 10;

  else if (fastFood) fee = fastFoodTotal > 250 ? 20 : 5;

  else if (cheapItemsOverFour) fee = 20;

  else if (singleLowPriceItem) fee = 3;

  const total = subtotal + fee;

  const result=db.prepare(`INSERT INTO orders(phone,name,address,items,subtotal,fee,total,payment,payment_status,status,created,updated)

    VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`).run(req.user.phone,req.user.name,address,JSON.stringify(lines),subtotal,fee,total,'COD','pending','placed',Date.now(),Date.now());

  const id=Number(result.lastInsertRowid);

  const msg=`ShopEasy order #${id}\n${req.user.name} (${req.user.phone})\nAddress: ${address}\n${lines.map(x=>`${x.name} x${x.qty} Rs. ${x.price*x.qty}`).join('\n')}\nTotal Rs. ${total} (COD)`;

  if (ADMIN_WHATSAPP) waText(ADMIN_WHATSAPP,msg).catch(()=>{});

  res.status(201).json({id,total,fee,status:'placed'});

});

app.get('/api/orders', needUser, (req,res) => {

  const rows=req.user.role==='admin'

    ? db.prepare('SELECT o.*,u.name AS account_name,r.phone AS rider_phone,r.name AS rider_name FROM orders o LEFT JOIN users u ON u.phone=o.phone LEFT JOIN riders r ON r.id=o.rider_id ORDER BY o.id DESC LIMIT 500').all()

    : db.prepare('SELECT o.*,r.phone AS rider_phone,r.name AS rider_name FROM orders o LEFT JOIN riders r ON r.id=o.rider_id WHERE o.phone=? ORDER BY o.id DESC').all(req.user.phone);

  res.json(rows.map(o=>({...o,items:safeJson(o.items)})));

});



// Customer cancels their own order before rider pickup.

app.post('/api/orders/:id/cancel', needUser, limit(10,10), async (req,res) => {

  const id = Number(req.params.id);

  if (!Number.isSafeInteger(id) || id < 1) {

    return res.status(400).json({error:'Order ID invalid hai.'});

  }



  const allowedReasons = ['Ordered by mistake', 'Want to change the order', 'Other reason'];

  const reason = String(req.body?.reason || '').trim();

  if (!allowedReasons.includes(reason)) {

    return res.status(400).json({error:'Cancellation ka valid reason select karein.'});

  }



  const order = db.prepare(

    'SELECT o.id,o.phone,o.name,o.address,o.total,o.status,o.rider_id,r.phone AS rider_phone,r.name AS rider_name FROM orders o LEFT JOIN riders r ON r.id=o.rider_id WHERE o.id=? AND o.phone=?'

  ).get(id, req.user.phone);

  if (!order) return res.status(404).json({error:'Order nahi mila.'});



  if (!['placed','assigned'].includes(String(order.status).toLowerCase())) {

    return res.status(409).json({error:'Order pickup ho chuka hai ya cancel nahi kiya ja sakta.'});

  }



  const now = Date.now();

  const result = db.prepare(`

    UPDATE orders SET status='Cancelled', cancellation_reason=?, cancelled_at=?, updated=?

    WHERE id=? AND phone=? AND lower(status) IN ('placed','assigned')

  `).run(reason, now, now, id, req.user.phone);



  if (!result.changes) {

    return res.status(409).json({error:'Order status badal gaya hai. Orders refresh karein.'});

  }



  const message = `ShopEasy cancellation alert\nOrder #${id} has been cancelled by customer.\nCustomer: ${order.name}\nPhone: ${order.phone}\nReason: ${reason}\nTotal: Rs. ${order.total}`;

  if (order.rider_phone) waText('91' + cleanPhone(order.rider_phone), message).catch(() => {});

  if (ADMIN_WHATSAPP) waText(ADMIN_WHATSAPP, message).catch(() => {});



  res.json({

    ok:true, status:'Cancelled', reason, cancelledAt:now,

    riderPhone:order.rider_phone || null,

    riderName:order.rider_name || null,

    message:`Order #${id} cancellation record ho gaya.`

  });

});



app.get('/api/rider/cancelled-orders', needRider, (req,res) => {

  const rows = db.prepare(`

    SELECT o.*, r.name AS rider_name

    FROM orders o

    LEFT JOIN riders r ON r.id=o.rider_id

    WHERE o.rider_id=? AND lower(o.status)='cancelled'

    ORDER BY o.cancelled_at DESC, o.id DESC

    LIMIT 200

  `).all(req.user.riderId);

  res.json(rows.map(o=>({...o,items:safeJson(o.items)})));

});

app.delete('/api/orders/:id', needAdmin, (req,res) => {

  const r=db.prepare('DELETE FROM orders WHERE id=?').run(Number(req.params.id)); if(!r.changes) return res.status(404).json({error:'Order nahi mila.'}); res.json({ok:true});

});



// Admin creates/removes rider accounts; rider credentials never appear in customer UI.

app.get('/api/admin/orders',needAdmin,(_req,res)=>res.json(db.prepare('SELECT * FROM orders ORDER BY id DESC').all()));

app.get('/api/admin/riders',needAdmin,(_req,res)=>res.json(db.prepare('SELECT id,name,phone,photo,active,created FROM riders ORDER BY id DESC').all()));

app.post('/api/admin/riders',needAdmin,(req,res)=>{

  const name=String(req.body?.name||'').trim(),phone=cleanPhone(req.body?.phone),password=String(req.body?.password||''),photo=String(req.body?.photo||'');

  if(!name||name.length>60||!validPhone(phone)||password.length<8||password.length>72|| (photo && !/^https?:\/\//i.test(photo))) return res.status(400).json({error:'Rider name, valid phone, 8+ character password aur optional photo URL chahiye.'});

  try { const r=db.prepare('INSERT INTO riders(name,phone,hash,photo,created) VALUES(?,?,?,?,?)').run(name,phone,bcrypt.hashSync(password,12),photo,Date.now()); res.status(201).json({id:r.lastInsertRowid}); }

  catch { res.status(409).json({error:'Is number ka rider pehle se hai.'}); }

});

app.delete('/api/admin/riders/:id',needAdmin,(req,res)=>{db.prepare('DELETE FROM riders WHERE id=?').run(Number(req.params.id));res.json({ok:true});});

app.post('/api/rider/login',limit(10,15),(req,res)=>{

  const phone=cleanPhone(req.body?.phone),password=String(req.body?.password||''),r=db.prepare('SELECT * FROM riders WHERE phone=? AND active=1').get(phone);

  if(!r||!bcrypt.compareSync(password.slice(0,72),r.hash)) return res.status(401).json({error:'Rider number ya password galat hai.'});

  setSession(res,{role:'rider',riderId:r.id,phone:r.phone,name:r.name});res.json({role:'rider',riderId:r.id,phone:r.phone,name:r.name});

});

// Riders see every new unassigned order plus orders already accepted by them.

app.get('/api/rider/orders',needRider,(req,res)=>{

  const rows=db.prepare("SELECT * FROM orders WHERE lower(status) NOT IN ('delivered','cancelled') AND (rider_id IS NULL OR rider_id=?) ORDER BY CASE WHEN rider_id IS NULL THEN 0 ELSE 1 END, id DESC").all(req.user.riderId);

  res.json(rows.map(o=>({...o,items:safeJson(o.items),available:o.rider_id===null})));

});

// First rider to accept wins; atomic WHERE prevents two riders accepting the same order.

app.post('/api/rider/orders/:id/accept',needRider,(req,res)=>{

  const id=Number(req.params.id);

  const result=db.prepare("UPDATE orders SET rider_id=?,status='assigned',updated=? WHERE id=? AND rider_id IS NULL AND status='placed'").run(req.user.riderId,Date.now(),id);

  if(!result.changes){

    const existing=db.prepare('SELECT rider_id,status FROM orders WHERE id=?').get(id);

    if(!existing)return res.status(404).json({error:'Order nahi mila.'});

    return res.status(409).json({error:'Ye order kisi aur delivery partner ne accept kar liya hai ya available nahi hai.'});

  }

  const o=db.prepare('SELECT phone,name FROM orders WHERE id=?').get(id);

  // Without a configured messaging provider, customer sees this status in My Orders.

  if(o) sendTemplate('91'+o.phone,WA_CONFIRM_TEMPLATE,`Order #${id} accepted. Your delivery partner ${req.user.name} will call you soon.`).catch(()=>{});

  res.json({ok:true,status:'assigned',message:'Order accept ho gaya. Customer ko status update dikh jayega.'});

});

app.post('/api/admin/orders/:id/assign',needAdmin,(req,res)=>{

  const rid=Number(req.body?.riderId),r=db.prepare('SELECT id FROM riders WHERE id=? AND active=1').get(rid);if(!r)return res.status(400).json({error:'Active rider select karein.'});

  const result=db.prepare("UPDATE orders SET rider_id=?,status=CASE WHEN status='placed' THEN 'assigned' ELSE status END,updated=? WHERE id=?").run(rid,Date.now(),Number(req.params.id));

  if(!result.changes)return res.status(404).json({error:'Order nahi mila.'});res.json({ok:true});

});

app.post('/api/rider/orders/:id/pickup',needRider,(req,res)=>{

  const r=db.prepare("UPDATE orders SET status='picked_up',updated=? WHERE id=? AND rider_id=? AND status IN ('assigned','placed')").run(Date.now(),Number(req.params.id),req.user.riderId);

  if(!r.changes)return res.status(400).json({error:'Order assigned nahi hai ya pehle pickup ho chuka hai.'});

  const o=db.prepare('SELECT phone FROM orders WHERE id=?').get(Number(req.params.id));sendTemplate('91'+o.phone,WA_DELIVERY_TEMPLATE,'Your rider has picked up order #'+req.params.id).catch(()=>{});

  res.json({ok:true});

});

/* SPECIAL_SERVICE_RIDER_WORKFLOW_V1 */

// Rider gets only unassigned special services and services assigned to this rider.
app.get('/api/rider/services', needRider, (req, res) => {
  const rows = db.prepare(`
    SELECT * FROM service_requests
    WHERE lower(status) NOT IN ('completed','cancelled')
      AND (rider_id IS NULL OR rider_id=?)
    ORDER BY CASE WHEN rider_id IS NULL THEN 0 ELSE 1 END, id DESC
    LIMIT 200
  `).all(req.user.riderId);

  res.json(rows.map(x => ({
    ...x,
    serviceId: 'S-' + x.id,
    payload: safeJson(x.payload),
    available: x.rider_id === null
  })));
});

// First rider to accept wins.
app.post('/api/rider/services/:id/accept', needRider, (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id < 1) {
    return res.status(400).json({error:'Service ID invalid hai.'});
  }

  const result = db.prepare(`
    UPDATE service_requests
    SET rider_id=?, status='confirmed', updated=?
    WHERE id=? AND rider_id IS NULL AND status='pending'
  `).run(req.user.riderId, Date.now(), id);

  if (!result.changes) {
    const existing = db.prepare(
      'SELECT rider_id,status FROM service_requests WHERE id=?'
    ).get(id);

    if (!existing) return res.status(404).json({error:'Service request nahi mili.'});
    return res.status(409).json({error:'Ye service kisi aur rider ne accept kar li hai ya available nahi hai.'});
  }

  res.json({ok:true, serviceId:'S-'+id, status:'confirmed'});
});

// Rider marks the assigned service as out for delivery.
app.post('/api/rider/services/:id/pickup', needRider, (req, res) => {
  const id = Number(req.params.id);
  const result = db.prepare(`
    UPDATE service_requests
    SET status='out_for_delivery', updated=?
    WHERE id=? AND rider_id=?
      AND status IN ('confirmed','preparing','ready')
  `).run(Date.now(), id, req.user.riderId);

  if (!result.changes) {
    return res.status(409).json({error:'Service assigned nahi hai ya pickup status valid nahi hai.'});
  }

  res.json({ok:true, status:'out_for_delivery'});
});

// Send service-specific OTP to customer's registered account email.
app.post('/api/rider/services/:id/send-delivery-otp', needRider, limit(5, 15), async (req, res) => {
  const id = Number(req.params.id);

  try {
    const service = db.prepare(
      'SELECT * FROM service_requests WHERE id=? AND rider_id=?'
    ).get(id, req.user.riderId);

    if (!service) {
      return res.status(404).json({error:'Service nahi mili ya aapko assign nahi hai.'});
    }

    if (service.status !== 'out_for_delivery') {
      return res.status(409).json({error:'Pehle service ko Out for delivery mark karein.'});
    }

    const customer = db.prepare(
      'SELECT email FROM users WHERE phone=?'
    ).get(service.phone);

    const email = normalizeEmail(customer?.email);

    if (!email || !validEmail(email)) {
      return res.status(400).json({error:'Customer ka registered email nahi mila.'});
    }

    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
      return res.status(503).json({error:'Email SMTP configure nahi hai.'});
    }

    const typeNames = {
      gas: 'Gas Cylinder Delivery',
      'train-food': 'Train Food Delivery',
      'train-parcel': 'Train Parcel Delivery'
    };
    const serviceName = typeNames[service.type] || 'Special Service';
    const serviceCode = 'S-' + id;
    const otp = String(crypto.randomInt(100000, 1000000));
    const expires = Date.now() + 5 * 60 * 1000;
    const codeHash = sha(`service:${id}:${otp}:${JWT_SECRET}`);

    db.prepare(`
      UPDATE service_requests
      SET delivery_code_hash=?, delivery_code_exp=?, updated=?
      WHERE id=? AND rider_id=? AND status='out_for_delivery'
    `).run(codeHash, expires, Date.now(), id, req.user.riderId);

    const payload = safeJson(service.payload) || {};
    const details = service.type === 'gas'
      ? `Delivery day: ${payload.gasDay || '-'}\nLocation: ${payload.gasLocation || '-'}\nAddress: ${payload.gasAddress || '-'}`
      : service.type === 'train-food'
      ? `Train: ${payload.trainNo || '-'} ${payload.trainName || ''}\nCoach: ${payload.coach || '-'}\nSeat: ${payload.seat || '-'}\nFood: ${payload.items || '-'}\nStation: ${payload.station || 'Merta Road Railway Station'}`
      : `Train: ${payload.trainNo || '-'} ${payload.trainName || ''}\nSender: ${payload.senderName || '-'} (${payload.senderPhone || '-'})\nReceiver: ${payload.receiverName || '-'} (${payload.receiverPhone || '-'})\nParcel: ${payload.parcelDescription || '-'}`;

    try {
      await emailTransporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: email,
        subject: `ShopEasy ${serviceName} OTP - ${serviceCode}`,
        text:
          `Your ShopEasy ${serviceName} confirmation OTP is ${otp}.\n\n` +
          `Service ID: ${serviceCode}\nService: ${serviceName}\n${details}\n\n` +
          'Share this OTP with the delivery partner only when receiving the service. ' +
          'This OTP expires in 5 minutes.',
        html:
          `<h2>ShopEasy ${serviceName}</h2>` +
          `<p>Service ID: <b>${serviceCode}</b></p>` +
          `<p>${serviceName} confirmation OTP:</p>` +
          `<h1 style="letter-spacing:6px">${otp}</h1>` +
          `<pre style="white-space:pre-wrap">${details}</pre>` +
          '<p>Share this OTP only when receiving the service. Valid for 5 minutes.</p>'
      });
    } catch (mailError) {
      db.prepare(`
        UPDATE service_requests
        SET delivery_code_hash=NULL, delivery_code_exp=NULL, updated=?
        WHERE id=? AND rider_id=?
      `).run(Date.now(), id, req.user.riderId);

      console.error('Special service OTP email failed:', mailError.message);
      return res.status(502).json({error:'Email send nahi hua. SMTP settings check karein.'});
    }

    res.json({
      ok:true,
      message:`${serviceName} OTP registered email par bhej diya gaya hai.`
    });
  } catch (e) {
    console.error('Special service OTP error:', e);
    res.status(500).json({error:'Special service OTP send nahi ho paya.'});
  }
});

// Verify OTP and complete only this special service.
app.post('/api/rider/services/:id/complete', needRider, limit(10, 15), (req, res) => {
  const id = Number(req.params.id);
  const otp = String(req.body?.otp || '').trim();

  if (!/^\d{6}$/.test(otp)) {
    return res.status(400).json({error:'Customer ka 6-digit service OTP enter karein.'});
  }

  try {
    const now = Date.now();
    const result = db.transaction(() => {
      const service = db.prepare(
        'SELECT * FROM service_requests WHERE id=? AND rider_id=?'
      ).get(id, req.user.riderId);

      if (!service) throw new Error('NOT_FOUND');
      if (service.status !== 'out_for_delivery') throw new Error('NOT_OUT');
      if (!service.delivery_code_hash || !service.delivery_code_exp) throw new Error('OTP_NOT_SENT');

      if (Number(service.delivery_code_exp) < now) {
        db.prepare(`
          UPDATE service_requests
          SET delivery_code_hash=NULL, delivery_code_exp=NULL
          WHERE id=? AND rider_id=?
        `).run(id, req.user.riderId);
        throw new Error('OTP_EXPIRED');
      }

      const expected = Buffer.from(sha(`service:${id}:${otp}:${JWT_SECRET}`), 'hex');
      const actual = Buffer.from(String(service.delivery_code_hash), 'hex');

      if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) {
        throw new Error('OTP_INVALID');
      }

      const update = db.prepare(`
        UPDATE service_requests
        SET status='completed', delivery_code_hash=NULL, delivery_code_exp=NULL, updated=?
        WHERE id=? AND rider_id=? AND status='out_for_delivery'
      `).run(now, id, req.user.riderId);

      if (!update.changes) throw new Error('STATUS_CHANGED');
      return service;
    })();

    const msg = `ShopEasy ${result.type} service S-${id} successfully delivered. Thank you!`;
    const customerPhone = servicePhone(result.phone);
    if (validServicePhone(customerPhone)) {
      waText('91' + customerPhone, msg).catch(() => {});
    }
    if (ADMIN_WHATSAPP) waText(ADMIN_WHATSAPP, msg).catch(() => {});

    res.json({ok:true, status:'completed', serviceId:'S-'+id, message:'Service OTP verified. Special delivery complete.'});
  } catch (e) {
    if (e.message === 'NOT_FOUND') return res.status(404).json({error:'Service nahi mili.'});
    if (e.message === 'NOT_OUT') return res.status(409).json({error:'Service Out for delivery nahi hai.'});
    if (e.message === 'OTP_NOT_SENT') return res.status(400).json({error:'Pehle customer ko service OTP bhejein.'});
    if (e.message === 'OTP_EXPIRED') return res.status(400).json({error:'OTP expire ho gaya. Naya OTP bhejein.'});
    if (e.message === 'OTP_INVALID') return res.status(400).json({error:'Service OTP galat hai.'});
    if (e.message === 'STATUS_CHANGED') return res.status(409).json({error:'Service status change ho chuka hai.'});
    console.error('Special service completion error:', e);
    res.status(500).json({error:'Special service complete nahi ho payi.'});
  }
});

app.post('/api/rider/location',needRider,(req,res)=>{

  const lat=Number(req.body?.lat),lng=Number(req.body?.lng);

  if(!Number.isFinite(lat)||!Number.isFinite(lng)||lat < -90||lat>90||lng < -180||lng>180)return res.status(400).json({error:'GPS coordinates invalid.'});

  db.prepare('INSERT INTO rider_locations(rider_id,lat,lng,updated) VALUES(?,?,?,?) ON CONFLICT(rider_id) DO UPDATE SET lat=excluded.lat,lng=excluded.lng,updated=excluded.updated').run(req.user.riderId,lat,lng,Date.now());res.json({ok:true});

});

app.get('/api/orders/:id/location',needUser,(req,res)=>{

  const o=db.prepare('SELECT phone,rider_id,status FROM orders WHERE id=?').get(Number(req.params.id));

  if(!o || (req.user.role!=='admin' && o.phone!==req.user.phone))return res.status(404).json({error:'Order nahi mila.'});

  if(!o.rider_id)return res.json({location:null,status:o.status});

  const l=db.prepare('SELECT lat,lng,updated FROM rider_locations WHERE rider_id=?').get(o.rider_id);res.json({location:l||null,status:o.status});

});

// Complete delivery directly: no OTP, GPS, or map required.



app.get('/api/rider/earnings', needRider, (req, res) => {

  const row = db.prepare(

    'SELECT COUNT(*) AS deliveries, COALESCE(SUM(amount),0) AS total FROM rider_earnings WHERE rider_id=?'

  ).get(req.user.riderId);

  res.json({ deliveries: row.deliveries, total: row.total, rate: 5 });

});



app.post('/api/rider/orders/:id/send-delivery-otp', needRider, limit(5, 15), async (req, res) => {

  const id = Number(req.params.id);



  try {

    const order = db.prepare(

      'SELECT * FROM orders WHERE id=? AND rider_id=?'

    ).get(id, req.user.riderId);



    if (!order) {

      return res.status(404).json({ error: 'Order nahi mila ya aapko assign nahi hai.' });

    }



    if (String(order.status).toLowerCase() !== 'picked_up') {

      return res.status(409).json({ error: 'Pehle order ko Picked Up mark karein.' });

    }



    const customer = db.prepare(

      'SELECT email FROM users WHERE phone=?'

    ).get(order.phone);



    const email = normalizeEmail(customer?.email);



    if (!email || !validEmail(email)) {

      return res.status(400).json({

        error: 'Customer ka registered email nahi mila. Customer se account email update karwayein.'

      });

    }



    if (!process.env.SMTP_HOST || !process.env.SMTP_USER ||

        !process.env.SMTP_PASS || !process.env.SMTP_FROM && !process.env.SMTP_USER) {

      return res.status(503).json({ error: 'Email SMTP configure nahi hai.' });

    }



    const otp = String(crypto.randomInt(100000, 1000000));

    const expires = Date.now() + 5 * 60 * 1000;

    const codeHash = sha(`${id}:${otp}:${JWT_SECRET}`);



    db.prepare(

      'UPDATE orders SET delivery_code_hash=?, delivery_code_exp=?, updated=? WHERE id=? AND rider_id=? AND status=?'

    ).run(codeHash, expires, Date.now(), id, req.user.riderId, 'picked_up');



    try {

      await emailTransporter.sendMail({

        from: process.env.SMTP_FROM || process.env.SMTP_USER,

        to: email,

        subject: `ShopEasy Delivery Confirmation OTP - Order #${id}`,

        text:

          `Your ShopEasy order #${id} delivery confirmation OTP is ${otp}.\n\n` +

          'Share this code with your delivery partner only when receiving your order. ' +

          'This OTP expires in 5 minutes. If you did not request this, ignore this email.',

        html:

          `<p>Your ShopEasy order <b>#${id}</b> delivery confirmation OTP is:</p>` +

          `<h2 style="letter-spacing:5px">${otp}</h2>` +

          '<p>Share this code with your delivery partner only when receiving your order.</p>' +

          '<p>This OTP expires in 5 minutes.</p>'

      });

    } catch (mailError) {

      db.prepare(

        'UPDATE orders SET delivery_code_hash=NULL, delivery_code_exp=NULL, updated=? WHERE id=? AND rider_id=? AND status=?'

      ).run(Date.now(), id, req.user.riderId, 'picked_up');



      console.error('Delivery OTP email failed:', mailError.message);

      return res.status(502).json({ error: 'Email send nahi hua. SMTP settings check karein.' });

    }



    return res.json({

      ok: true,

      message: `Order #${id} ka confirmation OTP customer ke registered email par bhej diya gaya hai.`

    });

  } catch (e) {

    console.error('Send delivery OTP error:', e);

    return res.status(500).json({ error: 'Delivery OTP send nahi ho paya.' });

  }

});



app.post('/api/rider/orders/:id/complete', needRider, limit(10, 15), async (req, res) => {

  const id = Number(req.params.id);

  const otp = String(req.body?.otp || '').trim();

  const now = Date.now();



  if (!/^\d{6}$/.test(otp)) {

    return res.status(400).json({ error: 'Customer ka 6-digit OTP enter karein.' });

  }



  try {

    const result = db.transaction(() => {

      const order = db.prepare(

        'SELECT * FROM orders WHERE id=? AND rider_id=?'

      ).get(id, req.user.riderId);



      if (!order) throw new Error('NOT_FOUND');



      if (String(order.status).toLowerCase() !== 'picked_up') {

        throw new Error('NOT_PICKED_UP');

      }



      if (!order.delivery_code_hash || !order.delivery_code_exp) {

        throw new Error('OTP_NOT_SENT');

      }



      if (Number(order.delivery_code_exp) < now) {

        db.prepare(

          'UPDATE orders SET delivery_code_hash=NULL, delivery_code_exp=NULL WHERE id=? AND rider_id=?'

        ).run(id, req.user.riderId);

        throw new Error('OTP_EXPIRED');

      }



      const expectedHash = sha(`${id}:${otp}:${JWT_SECRET}`);

      const actual = Buffer.from(String(order.delivery_code_hash), 'hex');

      const expected = Buffer.from(expectedHash, 'hex');



      if (actual.length !== expected.length ||

          !crypto.timingSafeEqual(actual, expected)) {

        throw new Error('OTP_INVALID');

      }



      const updated = db.prepare(

        "UPDATE orders SET status='Delivered', delivery_code_hash=NULL, delivery_code_exp=NULL, updated=? WHERE id=? AND rider_id=? AND status='picked_up'"

      ).run(now, id, req.user.riderId);



      if (!updated.changes) throw new Error('STATUS_CHANGED');



      db.prepare(

        'INSERT INTO rider_earnings (order_id, rider_id, amount, created) VALUES (?, ?, 5, ?)'

      ).run(id, req.user.riderId, now);



      const totals = db.prepare(

        'SELECT COUNT(*) AS deliveries, COALESCE(SUM(amount),0) AS total FROM rider_earnings WHERE rider_id=?'

      ).get(req.user.riderId);



      return { order, totals };

    })();



    const message = 'ShopEasy order #' + id +

      ' delivered successfully. Thank you, ' + result.order.name +

      '! Delivery partner earning: Rs. 5.';



    Promise.all([

      waText('91' + result.order.phone, message).catch(() => {}),

      ADMIN_WHATSAPP ? waText(ADMIN_WHATSAPP, message).catch(() => {}) : Promise.resolve()

    ]).catch(() => {});



    return res.json({

      ok: true,

      status: 'Delivered',

      message: 'OTP verified! Delivery complete hui aur Rs. 5 earning add hui.',

      deliveries: result.totals.deliveries,

      total: result.totals.total

    });

  } catch (e) {

    if (e.message === 'NOT_FOUND') return res.status(404).json({ error: 'Order nahi mila ya aapko assign nahi hai.' });

    if (e.message === 'NOT_PICKED_UP') return res.status(409).json({ error: 'Pehle order ko Picked Up mark karein.' });

    if (e.message === 'OTP_NOT_SENT') return res.status(400).json({ error: 'Pehle customer ko confirmation OTP bhejein.' });

    if (e.message === 'OTP_EXPIRED') return res.status(400).json({ error: 'OTP expire ho gaya. Naya OTP bhejein.' });

    if (e.message === 'OTP_INVALID') return res.status(400).json({ error: 'OTP galat hai. Customer se code dobara check karein.' });

    if (e.message === 'STATUS_CHANGED') return res.status(409).json({ error: 'Order ka status change ho chuka hai.' });

    if (e.code === 'SQLITE_CONSTRAINT_UNIQUE') return res.status(409).json({ error: 'Is order ki earning pehle hi add ho chuki hai.' });



    console.error('Delivery completion error:', e);

    return res.status(500).json({ error: 'Delivery complete nahi ho payi.' });

  }

});

// Razorpay orders and webhook verification; never mark paid from a client-only claim.

app.post('/api/payments/razorpay/order',needUser,limit(10,10),async(req,res)=>{

  if(!RAZORPAY_KEY_ID||!RAZORPAY_KEY_SECRET)return res.status(503).json({error:'Online payment configure nahi hai; abhi COD use karein.'});

  const id=Number(req.body?.orderId),o=db.prepare('SELECT * FROM orders WHERE id=? AND phone=?').get(id,req.user.phone);

  if(!o)return res.status(404).json({error:'Order nahi mila.'});

  try {

    const r=await fetch('https://api.razorpay.com/v1/orders',{method:'POST',headers:{Authorization:'Basic '+Buffer.from(RAZORPAY_KEY_ID+':'+RAZORPAY_KEY_SECRET).toString('base64'),'Content-Type':'application/json'},body:JSON.stringify({amount:o.total*100,currency:'INR',receipt:'shopeasy_'+o.id,notes:{shopeasy_order_id:String(o.id)}})});

    const d=await r.json();if(!r.ok)throw new Error(d.error?.description||'Payment gateway error');

    db.prepare('UPDATE orders SET payment="ONLINE",payment_status="created",updated=? WHERE id=?').run(Date.now(),id);

    res.json({keyId:RAZORPAY_KEY_ID,razorpayOrderId:d.id,amount:d.amount,currency:d.currency,orderId:id});

  }catch(e){res.status(502).json({error:e.message});}

});

app.post('/api/payments/razorpay/verify',needUser,async(req,res)=>{

  const {orderId,razorpay_order_id,razorpay_payment_id,razorpay_signature}=req.body||{};

  const o=db.prepare('SELECT * FROM orders WHERE id=? AND phone=?').get(Number(orderId),req.user.phone);

  if(!o||!RAZORPAY_KEY_SECRET)return res.status(400).json({error:'Payment order invalid.'});

  const expected=crypto.createHmac('sha256',RAZORPAY_KEY_SECRET).update(`${razorpay_order_id}|${razorpay_payment_id}`).digest('hex');

  if(!crypto.timingSafeEqual(Buffer.from(expected),Buffer.from(String(razorpay_signature||''))))return res.status(400).json({error:'Payment signature invalid.'});

  db.prepare('UPDATE orders SET payment_status="paid",updated=? WHERE id=?').run(Date.now(),o.id);

  const msg=`ShopEasy payment received for order #${o.id}. Amount Rs. ${o.total}. Payment ID ${razorpay_payment_id}.`;

  await Promise.all([waText('91'+o.phone,msg),ADMIN_WHATSAPP?waText(ADMIN_WHATSAPP,msg):Promise.resolve()]);

  res.json({ok:true});

});



const dist=path.join(__dirname,'../client/dist');

app.use(express.static(dist));

app.get('*',(req,res)=>{

  if(req.path.startsWith('/api/'))return res.status(404).json({error:'API route nahi mila.'});

  res.sendFile(path.join(dist,'index.html'),err=>{if(err)res.status(404).send('Frontend build nahi mila. README ke steps follow karein.');});

});

const port=Number(process.env.PORT||4000);

app.listen(port,()=>console.log(`ShopEasy ready on http://localhost:${port}`));
