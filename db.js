const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
const fs = require('node:fs');
const { hashPassword } = require('./auth');

// Ensure data folder exists
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'grocery.db');
const db = new DatabaseSync(dbPath);

// Enable foreign keys
db.exec('PRAGMA foreign_keys = ON;');

function initDatabase() {
  // 1. Admins Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      salt TEXT NOT NULL,
      created_at TEXT NOT NULL,
      last_login TEXT,
      reset_token TEXT,
      reset_token_expiry TEXT
    );
  `);

  // 2. Sessions Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      admin_id INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE CASCADE
    );
  `);

  // 3. Categories Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      tamil_name TEXT,
      icon TEXT,
      image_url TEXT,
      display_order INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at TEXT NOT NULL
    );
  `);

  // 4. Products Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      tamil_name TEXT,
      category_id INTEGER,
      price REAL NOT NULL,
      offer_price REAL,
      unit TEXT DEFAULT '1 kg',
      image_url TEXT,
      description TEXT,
      is_available INTEGER DEFAULT 1,
      is_published INTEGER DEFAULT 1,
      is_featured INTEGER DEFAULT 0,
      badge_text TEXT,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
    );
  `);

  // 5. Offers Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS offers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      banner_url TEXT,
      discount_tag TEXT,
      code TEXT,
      start_date TEXT,
      end_date TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT NOT NULL
    );
  `);

  // 6. Shop Settings Table (Key-Value)
  db.exec(`
    CREATE TABLE IF NOT EXISTS shop_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  // 7. Homepage Settings Table (Key-Value)
  db.exec(`
    CREATE TABLE IF NOT EXISTS homepage_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  // 8. Orders Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_name TEXT NOT NULL,
      customer_phone TEXT NOT NULL,
      delivery_address TEXT,
      items_json TEXT NOT NULL,
      total_amount REAL NOT NULL,
      payment_method TEXT DEFAULT 'Cash on Delivery',
      status TEXT DEFAULT 'pending',
      notes TEXT,
      created_at TEXT NOT NULL
    );
  `);

  seedDefaultData();
}

function seedDefaultData() {
  // Check if admin exists
  const checkAdmin = db.prepare('SELECT COUNT(*) as count FROM admins').get();
  if (checkAdmin.count === 0) {
    // Default admin: admin@srimurugan.com / Tiruppur@123
    const { hash, salt } = hashPassword('Tiruppur@123');
    const now = new Date().toISOString();
    const insertAdmin = db.prepare(`
      INSERT INTO admins (username, email, password_hash, salt, created_at)
      VALUES (?, ?, ?, ?, ?)
    `);
    insertAdmin.run('owner', 'admin@srimurugan.com', hash, salt, now);
    console.log('[DB] Seeded initial admin account (admin@srimurugan.com / Tiruppur@123)');
  }

  // Check if categories exist
  const checkCat = db.prepare('SELECT COUNT(*) as count FROM categories').get();
  if (checkCat.count === 0) {
    const defaultCategories = [
      { name: 'Fresh Vegetables', tamil: 'நாட்டு காய்கறிகள்', icon: '🥦', order: 1 },
      { name: 'Fresh Fruits', tamil: 'புதிய பழங்கள்', icon: '🍎', order: 2 },
      { name: 'Rice & Grains', tamil: 'அரிசி & தானியங்கள்', icon: '🌾', order: 3 },
      { name: 'Dals & Pulses', tamil: 'பருப்பு வகைகள்', icon: '🥣', order: 4 },
      { name: 'Cooking Oil', tamil: 'மரச்செக்கு எண்ணெய்', icon: '🛢️', order: 5 },
      { name: 'Spices & Masalas', tamil: 'மசாலா & மளிகை', icon: '🌶️', order: 6 },
      { name: 'Snacks & Biscuits', tamil: 'சிற்றுண்டிகள்', icon: '🍪', order: 7 },
      { name: 'Dairy Products', tamil: 'பால் & தயிர்', icon: '🥛', order: 8 },
      { name: 'Beverages', tamil: 'டீ, காபி & பானங்கள்', icon: '☕', order: 9 },
      { name: 'Household Essentials', tamil: 'வீட்டு உபயோக பொருட்கள்', icon: '🧼', order: 10 },
      { name: 'Personal Care', tamil: 'சுய பராமரிப்பு', icon: '🧴', order: 11 }
    ];

    const insertCat = db.prepare(`
      INSERT INTO categories (name, tamil_name, icon, display_order, is_active, created_at)
      VALUES (?, ?, ?, ?, 1, ?)
    `);

    const now = new Date().toISOString();
    for (const cat of defaultCategories) {
      insertCat.run(cat.name, cat.tamil, cat.icon, cat.order, now);
    }
    console.log('[DB] Seeded 11 default grocery categories');
  }

  // Check if products exist
  const checkProd = db.prepare('SELECT COUNT(*) as count FROM products').get();
  if (checkProd.count === 0) {
    const now = new Date().toISOString();
    const insertProd = db.prepare(`
      INSERT INTO products (
        name, tamil_name, category_id, price, offer_price, unit,
        image_url, description, is_available, is_published, is_featured, badge_text, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const defaultProducts = [
      {
        name: 'BPT Deluxe Ponni Rice',
        tamil: 'முதல் தரம் பொன்னி புழுங்கல் அரிசி',
        catId: 3,
        price: 360,
        offerPrice: 340,
        unit: '5 kg bag',
        image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=600&q=80',
        desc: 'Aged, well-milled deluxe Ponni boiled rice, soft texture for daily meals.',
        badge: 'Best Seller',
        featured: 1
      },
      {
        name: 'Country Tomatoes',
        tamil: 'நாட்டு தக்காளி (பண்ணை வரத்து)',
        catId: 1,
        price: 45,
        offerPrice: 38,
        unit: '1 kg',
        image: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=600&q=80',
        desc: 'Direct harvest farm fresh sour-sweet country tomatoes.',
        badge: 'Farm Fresh',
        featured: 1
      },
      {
        name: 'First Quality Toor Dal',
        tamil: 'முதல் தரம் துவரம் பருப்பு',
        catId: 4,
        price: 170,
        offerPrice: 155,
        unit: '1 kg',
        image: 'https://images.unsplash.com/photo-1585994192701-f1a505c817ea?auto=format&fit=crop&w=600&q=80',
        desc: 'Unpolished, pesticide-free yellow split toor dal with rich aroma.',
        badge: 'Unpolished',
        featured: 1
      },
      {
        name: 'Cold-Pressed Groundnut Oil',
        tamil: 'மரச்செக்கு கடலை எண்ணெய்',
        catId: 5,
        price: 230,
        offerPrice: 210,
        unit: '1 Litre',
        image: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=600&q=80',
        desc: 'Authentic wooden-churned (Marachekku) cold pressed Kadalai Ennai.',
        badge: 'Traditional',
        featured: 1
      },
      {
        name: 'Small Sambar Onions',
        tamil: 'நாட்டு சின்ன வெங்காயம்',
        catId: 1,
        price: 75,
        offerPrice: 65,
        unit: '1 kg',
        image: 'https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?auto=format&fit=crop&w=600&q=80',
        desc: 'Fresh pink small shallots essential for Tamil Nadu sambar & rasam.',
        badge: 'Daily Staple',
        featured: 1
      },
      {
        name: 'Aavin Fresh Milk (Blue)',
        tamil: 'ஆவின் பசும்பால் (பாக்கெட்)',
        catId: 8,
        price: 22,
        offerPrice: 22,
        unit: '500 ml',
        image: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=600&q=80',
        desc: 'Pasteurized homogenized toned milk delivered fresh every morning.',
        badge: 'Daily 6:30 AM',
        featured: 1
      },
      {
        name: 'Traditional Sambar Masala',
        tamil: 'நாட்டு சாம்பார் பொடி (200g)',
        catId: 6,
        price: 58,
        offerPrice: 52,
        unit: '200g pack',
        image: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=600&q=80',
        desc: 'Authentic village style slow roasted coriander, cumin and red chilli blend.',
        badge: 'Pure Spices',
        featured: 0
      },
      {
        name: 'Degree Filter Coffee Powder',
        tamil: 'கும்பகோணம் டிகிரி காபி தூள் (80:20)',
        catId: 9,
        price: 145,
        offerPrice: 130,
        unit: '250g pack',
        image: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=600&q=80',
        desc: '80% Plantation A coffee and 20% high grade chicory for golden decoction.',
        badge: 'South Indian Classic',
        featured: 0
      }
    ];

    for (const p of defaultProducts) {
      insertProd.run(
        p.name, p.tamil, p.catId, p.price, p.offerPrice, p.unit,
        p.image, p.desc, 1, 1, p.featured, p.badge, now
      );
    }
    console.log('[DB] Seeded default sample products');
  }

  // Check Shop Settings
  const checkSettings = db.prepare('SELECT COUNT(*) as count FROM shop_settings').get();
  if (checkSettings.count === 0) {
    const settings = [
      ['shop_name', 'Sri Murugan Daily Fresh'],
      ['tagline', "Tiruppur's Favourite Neighbourhood Grocery Store"],
      ['phone_display', '+91 98765 43210'],
      ['phone_raw', '+919876543210'],
      ['whatsapp_number', '919876543210'],
      ['address_line1', '142, Kumaran Road, Near Railway Station'],
      ['address_line2', 'Old Bus Stand Area, Tiruppur, Tamil Nadu - 641 601'],
      ['city', 'Tiruppur'],
      ['state', 'Tamil Nadu'],
      ['pincode', '641601'],
      ['timings', 'Open Every Day: 6:30 AM – 10:00 PM'],
      ['gmaps_url', 'https://maps.google.com/?q=Tiruppur+Tamil+Nadu+Kumaran+Road'],
      ['delivery_radius', 'Fast 30-45 Mins Delivery across PN Road, Avinashi Road, College Road & Kumaran Road'],
      ['min_order_amount', '200'],
      ['delivery_enabled', '1'],
      ['shop_description', 'Your trusted local neighbourhood grocery store and mini-supermarket in Tiruppur. Farm fresh vegetables, authentic Ponni rice, unpolished dals, and cold-pressed cooking oils with WhatsApp order delivery.']
    ];

    const insertSetting = db.prepare('INSERT INTO shop_settings (key, value) VALUES (?, ?)');
    for (const [k, v] of settings) {
      insertSetting.run(k, v);
    }
  }

  // Check Homepage Settings
  const checkHomepage = db.prepare('SELECT COUNT(*) as count FROM homepage_settings').get();
  if (checkHomepage.count === 0) {
    const home = [
      ['hero_headline', 'Your Neighbourhood Grocery Store in Tiruppur'],
      ['hero_subtitle', 'Fresh groceries, everyday essentials, and quality products at affordable prices. Everything you need, just around the corner!'],
      ['hero_image_url', 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=80'],
      ['trust_indicator', 'Serving Your Neighbourhood in Tiruppur'],
      ['announcement_text', 'Free doorstep delivery in Tiruppur on orders above ₹500! Order via WhatsApp.'],
      ['announcement_active', '1']
    ];

    const insertHome = db.prepare('INSERT INTO homepage_settings (key, value) VALUES (?, ?)');
    for (const [k, v] of home) {
      insertHome.run(k, v);
    }
  }

  // Check Offers
  const checkOffers = db.prepare('SELECT COUNT(*) as count FROM offers').get();
  if (checkOffers.count === 0) {
    const insertOffer = db.prepare(`
      INSERT INTO offers (title, description, banner_url, discount_tag, code, start_date, end_date, is_active, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)
    `);
    const now = new Date().toISOString();
    insertOffer.run(
      'Special Monthly Grocery Festival',
      'Flat 10% off on all Marachekku Cold-Pressed Cooking Oils and 25kg Ponni Rice bags this week in Tiruppur!',
      'https://images.unsplash.com/photo-1607349913338-fca6f7fc42d0?auto=format&fit=crop&w=1000&q=80',
      'FLAT 10% OFF',
      'TIRUPPUR10',
      '2026-11-01',
      '2026-11-30',
      now
    );
  }
}

// Initialise upon load
initDatabase();

module.exports = {
  db
};
