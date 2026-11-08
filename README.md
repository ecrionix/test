# Sri Murugan Daily Fresh - Grocery Store & Admin Dashboard (Tiruppur, Tamil Nadu)

A complete, modern, lightweight, and fully responsive web application for a neighbourhood grocery store and mini-supermarket in **Tiruppur, Tamil Nadu**, equipped with a full-stack **Admin Management Dashboard**.

---

## 🌟 Quick Start

### 1. Install & Run
```bash
# Install dependencies (already installed)
npm install

# Start the full-stack production server
npm start
```

### 2. Access Links
- **Public Website (Landing Page)**: [http://localhost:3000/](http://localhost:3000/)
- **Store Admin Dashboard**: [http://localhost:3000/admin](http://localhost:3000/admin)
- **Direct Admin Login Page**: [http://localhost:3000/admin/login.html](http://localhost:3000/admin/login.html)

### 3. Default Admin Credentials
- **Email / Username**: `admin@srimurugan.com`
- **Password**: `Tiruppur@123`
*(Can be changed or reset anytime via the admin dashboard or reset password tab)*

---

## 🚀 Key Modules & Architecture

### 1. Security & Authentication (`auth.js`)
- PBKDF2 cryptographic password hashing (100,000 iterations, SHA-512, 16-byte random salt).
- Cryptographically secure 32-byte session tokens with automatic 7-day expiration.
- Password reset token generation and verification.
- Protected `/api/admin/*` routes requiring bearer session authentication.

### 2. Real-Time Public Website Synchronization (`index.html`)
- Any price update, category change, image upload, out-of-stock toggle, or WhatsApp number change made in the admin dashboard immediately updates on the live public website via `/api/public/data`.
- Zero layout shift: Falls back gracefully to static defaults if accessed offline.

### 3. Dashboard Overview (`admin/index.html`)
- Live summary counters: Total Products, Active In-Stock, Out of Stock, Categories, Active Offers, and Customer Orders.
- Quick-action shortcuts for rapid day-to-day kirana management.
- Recently updated items table.

### 4. Product Management
- Add, Edit, and Delete products with confirmation modals.
- Name (English & Tamil transliteration), Regular price (₹), Offer price (₹), Unit (kg, bag, litre, etc.).
- Image upload (JPG, PNG, WebP &bull; 5MB limit) or direct URL.
- One-click toggles: In Stock / Out of Stock, Visible / Hidden, Featured on Homepage.
- Instant search, category filters, and sorting.

### 5. Bulk Price Editor (Mandi Daily Rate Updates)
- Dedicated table to edit prices across multiple grocery items simultaneously.
- Inline inputs for regular price and offer price.
- Diff confirmation modal before publishing changes live to the Tiruppur store.

### 6. Category Management
- Manage the 11 grocery categories (Vegetables, Fruits, Rice & Grains, Dals, Cooking Oils, Spices, Dairy, etc.).
- Re-order categories, set custom icons, and toggle visibility.
- **Safety Guard**: Prevents accidental deletion of categories with assigned products.

### 7. Offers & Promotions
- Create festive banners, discount tags (e.g. `FLAT 10% OFF`), and coupon codes.
- Start and expiry dates.
- Active offers automatically appear in the top banner on the public landing page with a *"Claim on WhatsApp"* button.

### 8. Shop Information & Local SEO
- Update store name, Tiruppur address, telephone, WhatsApp order number, store hours (6:30 AM – 10:00 PM), and Google Maps link.
- JSON-LD `GroceryStore` and `FAQPage` schemas for Google local search ranking in Tiruppur.

### 9. Orders & WhatsApp Log
- Captures orders placed through the website.
- Shows customer name, phone number, item breakdown, and total.
- One-click **"WhatsApp Customer"** button opens WhatsApp pre-filled with order confirmation.

---

## 🗄️ Database Options

### Option A: Built-in Native SQLite (`data/grocery.db`)
- Uses Node.js 22+ built-in `node:sqlite` module.
- Zero external database installation or setup required. Completely self-contained and transactional.

### Option B: Supabase PostgreSQL (`supabase_schema.sql`)
- Ready-to-deploy SQL schema included in `supabase_schema.sql`.
- Full Row Level Security (RLS) policies configured:
  - Public read access for published products, active categories, and active offers.
  - Authenticated admin write access.
  - Storage bucket definitions for image hosting.

---

## 🧪 Automated Integration Tests

Run the test suite:
```bash
npm test
# or
node test-suite.js
```
Runs 19 automated tests verifying password hashing, session expiration, CRUD operations, bulk price atomic transactions, category safety guards, and order workflows.
