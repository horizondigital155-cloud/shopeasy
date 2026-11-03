# ShopEasy — Merta Road, Rajasthan

ShopEasy is a React 18 + Vite storefront and Express + SQLite API. Product catalogue is managed directly in the hidden admin dashboard; Google Sheet is not used. Existing `client/src/styles.css` from the supplied ZIP is preserved.

## Requirements
- Node.js 20+ (Node 22 recommended)
- Windows PowerShell / macOS / Linux
- WhatsApp Cloud API credentials for real OTP/messages
- Razorpay account keys for online payments (COD works without it)

## Run locally (Windows PowerShell)

### 1. Backend
```powershell
cd server
Copy-Item .env.example .env
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```
Paste generated value into `JWT_SECRET` in `.env`. Generate the admin password hash:
```powershell
node -e "console.log(require('bcryptjs').hashSync('CHOOSE_YOUR_OWN_LONG_PASSWORD',12))"
```
Replace `CHOOSE_YOUR_OWN_LONG_PASSWORD` locally with your own secret, paste only the output into `ADMIN_PASS_HASH`, and set `ADMIN_PHONE`, `ADMIN_WHATSAPP`. Do not commit `.env`.
```powershell
npm install
npm start
```
The API runs at `http://localhost:4000`. For local development set `NODE_ENV=development`; OTP is printed to the server terminal when WhatsApp credentials are absent.

### 2. Frontend
Open a second terminal:
```powershell
cd client
npm install
npm run dev
```
Open the Vite URL shown (usually `http://localhost:5173`). The production server serves both API and built frontend:
```powershell
npm run build
```
Stop the development server, then open `http://localhost:4000`.

## Add products
1. In the storefront search field, type your admin password. There is intentionally no public admin-login button. The server checks the secret against `ADMIN_PASS_HASH` using bcrypt and limits failed unlock attempts.
2. Admin dashboard → **Products** → **Add product**.
3. Enter name, category, unit, whole-number price and an original HTTPS image URL. A default grocery image is prefilled; after saving, click **📷 Photo** to upload your own product image. A fresh database automatically starts with 40 sample grocery products and HD image URLs. These are editable/deletable from Admin; existing databases are not overwritten or reseeded.
4. To change a product photo, click **📷 Photo** and choose a local image. The browser downsizes it to a JPEG no wider/taller than 700 px and <=700 KB; the server validates JPEG magic bytes and saves it under `server/uploads`. **↺ Original** restores the URL image.
5. Product rows, orders and riders persist in `server/data.db`. Back up that database and `server/uploads` folder.

## WhatsApp Cloud API
Set:
- `WA_TOKEN`: Meta permanent/system-user access token
- `WA_PHONE_ID`: WhatsApp phone-number ID (not the displayed phone number)
- `ADMIN_WHATSAPP`: recipient number with country code, e.g. `91...`
- `WA_OTP_TEMPLATE`: approved Authentication template name with one body variable for OTP
- `WA_DELIVERY_TEMPLATE`: approved utility template with one body variable (delivery OTP / rider message)
- `WA_CONFIRM_TEMPLATE`: reserved for a confirmation template if you extend messaging

In Meta WhatsApp Manager, create and get approval for an **Authentication** template for sign-in OTP. For delivery verification, create an approved **Utility** template with a code variable. Template names and component layouts must match the payload sent by this app. Test with a Meta test recipient first. The server logs WhatsApp API errors; production OTP fails closed if WhatsApp cannot send. Never expose WA_TOKEN in frontend code.

## Rider workflow
Admin → Delivery partners → create rider with name, Indian mobile and initial password. Admin → Orders → assign the rider. Rider portal: open `http://localhost:4000/rider` in production, or `http://localhost:5173/rider` in Vite development. A rider can log in using credentials created by admin. Rider sees assigned orders, pickup action, delivery OTP and completion form. GPS can be shared while rider is logged in. Customer order-location API is available at `/api/orders/:id/location`; this starter UI does not yet render a live map for the customer.

## Payments
COD is enabled. Online payment uses Razorpay Orders API and signature verification endpoints; set `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`. Before production, add Razorpay Checkout.js on the client, call `/api/payments/razorpay/order`, then submit Checkout response to `/api/payments/razorpay/verify`. Do not mark payments paid based only on a client callback; for robust operations configure a Razorpay webhook with signature verification and reconcile captured payments server-side. The requested UPI number is not itself a verified UPI ID; do not assume a mobile number is a valid VPA. Obtain the exact VPA from your bank/provider.

## Security and production checklist
- Serve behind HTTPS and set `NODE_ENV=production` so session cookies are Secure.
- Use a strong private `JWT_SECRET` (32+ chars) and bcrypt hash for admin password.
- Restrict server filesystem permissions; persistent volume required for SQLite/uploads.
- Set up daily encrypted backups of `data.db` and `uploads/`.
- Configure WhatsApp Cloud API and approved templates before live OTP.
- Add monitoring, database migrations, delivery zone validation, consent/privacy policy, customer support, and Razorpay webhook before real launch.
- For multiple server instances, move SQLite to a managed database and uploads to object storage; local SQLite/files are best for a single persistent server.
- The current starter does not yet include production-ready customer live-map UI, distance/ETA calculation, a complete online checkout UI, Razorpay webhook endpoint, rider photo upload (URL only), or signed Android/iOS binaries. These require credentials, maps/provider choices, signing keys and platform build tools.

## Capacitor
```powershell
cd client
npm install
npm run build
npx cap add android
npx cap sync android
npx cap open android
```
Android Studio: configure signing under **Build > Generate Signed Bundle / APK**. Keep keystore and passwords private. iOS requires macOS and Xcode:
```bash
npx cap add ios
npx cap sync ios
npx cap open ios
```

## API overview
- `GET /api/products`
- `POST /api/admin/products`, `PUT/DELETE /api/admin/products/:id`
- `POST /api/admin/products/:id/photo`, `DELETE /api/admin/products/:id/photo`
- `POST /api/auth/otp`, `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/me`
- `POST /api/orders`, `GET /api/orders`, `DELETE /api/orders/:id` (admin only)
- `GET/POST/DELETE /api/admin/riders`, `POST /api/rider/login`
- `GET /api/rider/orders`, pickup/location/delivery-code/complete endpoints
- Razorpay create/verify endpoints under `/api/payments/razorpay`


### Customer signup/login
- Customer signup uses name, unique 10-digit mobile number, and password (minimum 8 characters).
- No signup/login OTP is used. A phone number can register only once because `users.phone` is the primary key. Existing accounts must log in with their password.
- Rider delivery OTP (if enabled in the rider delivery flow) is separate from signup/login.
