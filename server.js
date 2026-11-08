const express = require('express');
const cors = require('cors');
const path = require('node:path');
const fs = require('node:fs');
const multer = require('multer');
const { db } = require('./db');
const {
  verifyPassword,
  hashPassword,
  generateSessionToken,
  generateResetToken
} = require('./auth');

const app = express();
const PORT = process.env.PORT || 3000;

// Ensure uploads folder exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer Storage Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueName = `grocery_${Date.now()}_${Math.round(Math.random() * 1e6)}${ext}`;
    cb(null, uniqueName);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPG, PNG and WebP images are allowed.'));
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB limit
  fileFilter
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve Uploaded Files
app.use('/uploads', express.static(uploadsDir));

// Serve Admin Dashboard Files
app.use('/admin', express.static(path.join(__dirname, 'admin')));

// Serve Public Website Assets
app.use(express.static(__dirname));

// ==============================================================================
// AUTHENTICATION MIDDLEWARE
// ==============================================================================
function requireAdmin(req, res, next) {
  const authHeader = req.headers['authorization'];
  let token = null;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else if (req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({ success: false, error: 'Unauthorized. No session token provided.' });
  }

  const session = db.prepare(`
    SELECT s.token, s.admin_id, s.expires_at, a.username, a.email
    FROM sessions s
    JOIN admins a ON s.admin_id = a.id
    WHERE s.token = ?
  `).get(token);

  if (!session) {
    return res.status(401).json({ success: false, error: 'Invalid session token. Please log in again.' });
  }

  if (new Date(session.expires_at) < new Date()) {
    db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
    return res.status(401).json({ success: false, error: 'Session expired. Please log in again.' });
  }

  req.admin = {
    id: session.admin_id,
    username: session.username,
    email: session.email
  };
  req.token = token;

  next();
}

// ==============================================================================
// PUBLIC API ENDPOINTS (For Public Landing Page)
// ==============================================================================

// Aggregate public data for fast loading & zero layout shift
app.get('/api/public/data', (req, res) => {
  try {
    // 1. Shop Settings (as key-value object)
    const settingsRows = db.prepare('SELECT key, value FROM shop_settings').all();
    const shopSettings = {};
    settingsRows.forEach(row => { shopSettings[row.key] = row.value; });

    // 2. Homepage Settings
    const homeRows = db.prepare('SELECT key, value FROM homepage_settings').all();
    const homepageSettings = {};
    homeRows.forEach(row => { homepageSettings[row.key] = row.value; });

    // 3. Active Categories ordered by display_order
    const categories = db.prepare(`
      SELECT id, name, tamil_name, icon, image_url, display_order
      FROM categories
      WHERE is_active = 1
      ORDER BY display_order ASC, name ASC
    `).all();

    // 4. Published Products with category names
    const products = db.prepare(`
      SELECT p.id, p.name, p.tamil_name, p.category_id, c.name as category_name,
             p.price, p.offer_price, p.unit, p.image_url, p.description,
             p.is_available, p.is_featured, p.badge_text, p.updated_at
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.is_published = 1
      ORDER BY p.is_featured DESC, p.id DESC
    `).all();

    // 5. Active Offers
    const offers = db.prepare(`
      SELECT id, title, description, banner_url, discount_tag, code, start_date, end_date
      FROM offers
      WHERE is_active = 1
      ORDER BY id DESC
    `).all();

    res.json({
      success: true,
      data: {
        shop: shopSettings,
        homepage: homepageSettings,
        categories,
        products,
        offers
      }
    });
  } catch (err) {
    console.error('Error fetching public data:', err);
    res.status(500).json({ success: false, error: 'Failed to load store data.' });
  }
});

// Submit customer order / enquiry
app.post('/api/public/orders', (req, res) => {
  try {
    const { customer_name, customer_phone, delivery_address, items, total_amount, payment_method, notes } = req.body;

    if (!customer_name || !customer_phone || !items || !total_amount) {
      return res.status(400).json({ success: false, error: 'Missing required customer order details.' });
    }

    const itemsJson = typeof items === 'string' ? items : JSON.stringify(items);
    const now = new Date().toISOString();

    const insert = db.prepare(`
      INSERT INTO orders (customer_name, customer_phone, delivery_address, items_json, total_amount, payment_method, notes, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?)
    `);

    const result = insert.run(
      customer_name,
      customer_phone,
      delivery_address || '',
      itemsJson,
      Number(total_amount),
      payment_method || 'Cash on Delivery',
      notes || '',
      now
    );

    res.json({
      success: true,
      message: 'Order placed successfully!',
      orderId: result.lastInsertRowid
    });
  } catch (err) {
    console.error('Error creating order:', err);
    res.status(500).json({ success: false, error: 'Could not record order.' });
  }
});

// ==============================================================================
// ADMIN AUTHENTICATION ENDPOINTS
// ==============================================================================

// Admin Login
app.post('/api/auth/login', (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, error: 'Username/email and password are required.' });
    }

    const admin = db.prepare(`
      SELECT * FROM admins
      WHERE username = ? OR email = ?
    `).get(username.trim(), username.trim().toLowerCase());

    if (!admin) {
      return res.status(401).json({ success: false, error: 'Invalid login credentials.' });
    }

    const isValid = verifyPassword(password, admin.password_hash, admin.salt);
    if (!isValid) {
      return res.status(401).json({ success: false, error: 'Invalid login credentials.' });
    }

    // Generate Session Token (Valid for 7 days)
    const token = generateSessionToken();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

    db.prepare(`
      INSERT INTO sessions (token, admin_id, created_at, expires_at)
      VALUES (?, ?, ?, ?)
    `).run(token, admin.id, now.toISOString(), expiresAt);

    // Update last login
    db.prepare('UPDATE admins SET last_login = ? WHERE id = ?').run(now.toISOString(), admin.id);

    res.json({
      success: true,
      message: 'Login successful',
      token,
      admin: {
        id: admin.id,
        username: admin.username,
        email: admin.email
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, error: 'An error occurred during authentication.' });
  }
});

// Admin Logout
app.post('/api/auth/logout', requireAdmin, (req, res) => {
  try {
    db.prepare('DELETE FROM sessions WHERE token = ?').run(req.token);
    res.json({ success: true, message: 'Logged out successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Logout failed.' });
  }
});

// Verify Current Session
app.get('/api/auth/me', requireAdmin, (req, res) => {
  res.json({
    success: true,
    admin: req.admin
  });
});

// Request Password Reset
app.post('/api/auth/forgot-password', (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, error: 'Email is required.' });
    }

    const admin = db.prepare('SELECT id, email FROM admins WHERE email = ?').get(email.trim().toLowerCase());
    if (!admin) {
      // Don't leak user existence
      return res.json({
        success: true,
        message: 'If the email exists in our system, a password reset link has been created.'
      });
    }

    const resetToken = generateResetToken();
    const expiry = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour

    db.prepare('UPDATE admins SET reset_token = ?, reset_token_expiry = ? WHERE id = ?')
      .run(resetToken, expiry, admin.id);

    res.json({
      success: true,
      message: 'Password reset token generated.',
      resetToken, // Returned for convenient local recovery
      instructions: `Use this token to set a new password on the Reset Password tab.`
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Password reset request failed.' });
  }
});

// Perform Password Reset
app.post('/api/auth/reset-password', (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword || newPassword.length < 6) {
      return res.status(400).json({ success: false, error: 'Valid token and minimum 6 character password required.' });
    }

    const admin = db.prepare(`
      SELECT id, reset_token_expiry FROM admins WHERE reset_token = ?
    `).get(token);

    if (!admin || !admin.reset_token_expiry || new Date(admin.reset_token_expiry) < new Date()) {
      return res.status(400).json({ success: false, error: 'Reset token is invalid or has expired.' });
    }

    const { hash, salt } = hashPassword(newPassword);
    db.prepare(`
      UPDATE admins
      SET password_hash = ?, salt = ?, reset_token = NULL, reset_token_expiry = NULL
      WHERE id = ?
    `).run(hash, salt, admin.id);

    // Invalidate all old sessions
    db.prepare('DELETE FROM sessions WHERE admin_id = ?').run(admin.id);

    res.json({ success: true, message: 'Password has been successfully updated. Please log in.' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Password update failed.' });
  }
});

// ==============================================================================
// ADMIN DASHBOARD OVERVIEW METRICS
// ==============================================================================
app.get('/api/admin/overview', requireAdmin, (req, res) => {
  try {
    const totalProducts = db.prepare('SELECT COUNT(*) as count FROM products').get().count;
    const activeProducts = db.prepare('SELECT COUNT(*) as count FROM products WHERE is_published = 1 AND is_available = 1').get().count;
    const outOfStock = db.prepare('SELECT COUNT(*) as count FROM products WHERE is_available = 0').get().count;
    const totalCategories = db.prepare('SELECT COUNT(*) as count FROM categories WHERE is_active = 1').get().count;
    const activeOffers = db.prepare('SELECT COUNT(*) as count FROM offers WHERE is_active = 1').get().count;
    const totalOrders = db.prepare('SELECT COUNT(*) as count FROM orders').get().count;
    const pendingOrders = db.prepare("SELECT COUNT(*) as count FROM orders WHERE status = 'pending'").get().count;

    const recentProducts = db.prepare(`
      SELECT p.id, p.name, p.price, p.offer_price, p.unit, p.is_available, p.is_published, p.updated_at, c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      ORDER BY p.updated_at DESC
      LIMIT 6
    `).all();

    res.json({
      success: true,
      stats: {
        totalProducts,
        activeProducts,
        outOfStock,
        totalCategories,
        activeOffers,
        totalOrders,
        pendingOrders
      },
      recentProducts
    });
  } catch (err) {
    console.error('Overview error:', err);
    res.status(500).json({ success: false, error: 'Failed to load dashboard metrics.' });
  }
});

// ==============================================================================
// PRODUCT MANAGEMENT ENDPOINTS
// ==============================================================================

// Get all products (with optional search, category, status filters)
app.get('/api/admin/products', requireAdmin, (req, res) => {
  try {
    const { search, category_id, status, sort } = req.query;
    let sql = `
      SELECT p.*, c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (search && search.trim()) {
      sql += ` AND (p.name LIKE ? OR p.tamil_name LIKE ? OR p.description LIKE ?)`;
      const q = `%${search.trim()}%`;
      params.push(q, q, q);
    }

    if (category_id) {
      sql += ` AND p.category_id = ?`;
      params.push(category_id);
    }

    if (status === 'available') {
      sql += ` AND p.is_available = 1`;
    } else if (status === 'out_of_stock') {
      sql += ` AND p.is_available = 0`;
    } else if (status === 'unpublished') {
      sql += ` AND p.is_published = 0`;
    }

    if (sort === 'price_asc') {
      sql += ` ORDER BY p.price ASC`;
    } else if (sort === 'price_desc') {
      sql += ` ORDER BY p.price DESC`;
    } else if (sort === 'name_asc') {
      sql += ` ORDER BY p.name ASC`;
    } else {
      sql += ` ORDER BY p.id DESC`;
    }

    const products = db.prepare(sql).all(...params);
    res.json({ success: true, products });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch products.' });
  }
});

// Add new product
app.post('/api/admin/products', requireAdmin, (req, res) => {
  try {
    const {
      name, tamil_name, category_id, price, offer_price, unit,
      image_url, description, is_available, is_published, is_featured, badge_text
    } = req.body;

    if (!name || price === undefined || price === null || price === '') {
      return res.status(400).json({ success: false, error: 'Product name and price are required.' });
    }

    const now = new Date().toISOString();
    const insert = db.prepare(`
      INSERT INTO products (
        name, tamil_name, category_id, price, offer_price, unit,
        image_url, description, is_available, is_published, is_featured, badge_text, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = insert.run(
      name.trim(),
      tamil_name ? tamil_name.trim() : '',
      category_id ? Number(category_id) : null,
      Number(price),
      offer_price ? Number(offer_price) : null,
      unit ? unit.trim() : '1 kg',
      image_url || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&q=80',
      description ? description.trim() : '',
      is_available !== undefined ? (is_available ? 1 : 0) : 1,
      is_published !== undefined ? (is_published ? 1 : 0) : 1,
      is_featured ? 1 : 0,
      badge_text ? badge_text.trim() : '',
      now
    );

    res.json({
      success: true,
      message: 'Product added successfully!',
      productId: result.lastInsertRowid
    });
  } catch (err) {
    console.error('Error adding product:', err);
    res.status(500).json({ success: false, error: 'Could not create product.' });
  }
});

// Update product
app.put('/api/admin/products/:id', requireAdmin, (req, res) => {
  try {
    const id = req.params.id;
    const {
      name, tamil_name, category_id, price, offer_price, unit,
      image_url, description, is_available, is_published, is_featured, badge_text
    } = req.body;

    const existing = db.prepare('SELECT id FROM products WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Product not found.' });
    }

    const now = new Date().toISOString();
    db.prepare(`
      UPDATE products SET
        name = ?,
        tamil_name = ?,
        category_id = ?,
        price = ?,
        offer_price = ?,
        unit = ?,
        image_url = ?,
        description = ?,
        is_available = ?,
        is_published = ?,
        is_featured = ?,
        badge_text = ?,
        updated_at = ?
      WHERE id = ?
    `).run(
      name.trim(),
      tamil_name ? tamil_name.trim() : '',
      category_id ? Number(category_id) : null,
      Number(price),
      offer_price !== undefined && offer_price !== '' && offer_price !== null ? Number(offer_price) : null,
      unit ? unit.trim() : '1 kg',
      image_url || '',
      description ? description.trim() : '',
      is_available ? 1 : 0,
      is_published ? 1 : 0,
      is_featured ? 1 : 0,
      badge_text ? badge_text.trim() : '',
      now,
      id
    );

    res.json({ success: true, message: 'Product updated successfully!' });
  } catch (err) {
    console.error('Error updating product:', err);
    res.status(500).json({ success: false, error: 'Product update failed.' });
  }
});

// Delete product
app.delete('/api/admin/products/:id', requireAdmin, (req, res) => {
  try {
    const id = req.params.id;
    db.prepare('DELETE FROM products WHERE id = ?').run(id);
    res.json({ success: true, message: 'Product deleted successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Could not delete product.' });
  }
});

// ==============================================================================
// BULK PRICE UPDATE (Section 4)
// ==============================================================================
app.post('/api/admin/products/bulk-prices', requireAdmin, (req, res) => {
  try {
    const { updates } = req.body;
    if (!Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({ success: false, error: 'No price updates provided.' });
    }

    const now = new Date().toISOString();
    const updateStmt = db.prepare(`
      UPDATE products
      SET price = ?, offer_price = ?, updated_at = ?
      WHERE id = ?
    `);

    // Run batch update
    db.exec('BEGIN TRANSACTION;');
    try {
      for (const item of updates) {
        if (!item.id || item.price === undefined) continue;
        const regPrice = Number(item.price);
        const offerPrice = item.offer_price !== undefined && item.offer_price !== '' && item.offer_price !== null
          ? Number(item.offer_price)
          : null;

        updateStmt.run(regPrice, offerPrice, now, item.id);
      }
      db.exec('COMMIT;');
    } catch (txErr) {
      db.exec('ROLLBACK;');
      throw txErr;
    }

    res.json({
      success: true,
      message: `Successfully updated prices for ${updates.length} products.`
    });
  } catch (err) {
    console.error('Bulk price error:', err);
    res.status(500).json({ success: false, error: 'Bulk price update failed.' });
  }
});

// ==============================================================================
// CATEGORY MANAGEMENT ENDPOINTS
// ==============================================================================
app.get('/api/admin/categories', requireAdmin, (req, res) => {
  try {
    const categories = db.prepare(`
      SELECT c.*, COUNT(p.id) as product_count
      FROM categories c
      LEFT JOIN products p ON c.id = p.category_id
      GROUP BY c.id
      ORDER BY c.display_order ASC, c.name ASC
    `).all();

    res.json({ success: true, categories });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch categories.' });
  }
});

app.post('/api/admin/categories', requireAdmin, (req, res) => {
  try {
    const { name, tamil_name, icon, image_url, display_order, is_active } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, error: 'Category name is required.' });
    }

    const now = new Date().toISOString();
    const insert = db.prepare(`
      INSERT INTO categories (name, tamil_name, icon, image_url, display_order, is_active, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const result = insert.run(
      name.trim(),
      tamil_name ? tamil_name.trim() : '',
      icon ? icon.trim() : '📦',
      image_url || '',
      display_order ? Number(display_order) : 0,
      is_active !== undefined ? (is_active ? 1 : 0) : 1,
      now
    );

    res.json({
      success: true,
      message: 'Category created successfully!',
      categoryId: result.lastInsertRowid
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to create category.' });
  }
});

app.put('/api/admin/categories/:id', requireAdmin, (req, res) => {
  try {
    const id = req.params.id;
    const { name, tamil_name, icon, image_url, display_order, is_active } = req.body;

    db.prepare(`
      UPDATE categories SET
        name = ?,
        tamil_name = ?,
        icon = ?,
        image_url = ?,
        display_order = ?,
        is_active = ?
      WHERE id = ?
    `).run(
      name.trim(),
      tamil_name ? tamil_name.trim() : '',
      icon ? icon.trim() : '📦',
      image_url || '',
      display_order ? Number(display_order) : 0,
      is_active ? 1 : 0,
      id
    );

    res.json({ success: true, message: 'Category updated successfully!' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Category update failed.' });
  }
});

// Delete category with assigned products guard
app.delete('/api/admin/categories/:id', requireAdmin, (req, res) => {
  try {
    const id = req.params.id;

    // Check if products are currently assigned to this category
    const countCheck = db.prepare('SELECT COUNT(*) as count FROM products WHERE category_id = ?').get(id);
    if (countCheck.count > 0) {
      return res.status(400).json({
        success: false,
        error: `Cannot delete category. There are ${countCheck.count} products currently assigned to it. Reassign or remove the products first.`
      });
    }

    db.prepare('DELETE FROM categories WHERE id = ?').run(id);
    res.json({ success: true, message: 'Category removed successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to delete category.' });
  }
});

// ==============================================================================
// OFFERS & PROMOTIONS MANAGEMENT
// ==============================================================================
app.get('/api/admin/offers', requireAdmin, (req, res) => {
  try {
    const offers = db.prepare('SELECT * FROM offers ORDER BY id DESC').all();
    res.json({ success: true, offers });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch offers.' });
  }
});

app.post('/api/admin/offers', requireAdmin, (req, res) => {
  try {
    const { title, description, banner_url, discount_tag, code, start_date, end_date, is_active } = req.body;
    if (!title) {
      return res.status(400).json({ success: false, error: 'Offer title is required.' });
    }

    const now = new Date().toISOString();
    const insert = db.prepare(`
      INSERT INTO offers (title, description, banner_url, discount_tag, code, start_date, end_date, is_active, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = insert.run(
      title.trim(),
      description ? description.trim() : '',
      banner_url || '',
      discount_tag ? discount_tag.trim() : '',
      code ? code.trim() : '',
      start_date || '',
      end_date || '',
      is_active !== undefined ? (is_active ? 1 : 0) : 1,
      now
    );

    res.json({ success: true, message: 'Offer created successfully!', offerId: result.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to create offer.' });
  }
});

app.put('/api/admin/offers/:id', requireAdmin, (req, res) => {
  try {
    const id = req.params.id;
    const { title, description, banner_url, discount_tag, code, start_date, end_date, is_active } = req.body;

    db.prepare(`
      UPDATE offers SET
        title = ?,
        description = ?,
        banner_url = ?,
        discount_tag = ?,
        code = ?,
        start_date = ?,
        end_date = ?,
        is_active = ?
      WHERE id = ?
    `).run(
      title.trim(),
      description ? description.trim() : '',
      banner_url || '',
      discount_tag ? discount_tag.trim() : '',
      code ? code.trim() : '',
      start_date || '',
      end_date || '',
      is_active ? 1 : 0,
      id
    );

    res.json({ success: true, message: 'Offer updated successfully!' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to update offer.' });
  }
});

app.delete('/api/admin/offers/:id', requireAdmin, (req, res) => {
  try {
    db.prepare('DELETE FROM offers WHERE id = ?').run(req.params.id);
    res.json({ success: true, message: 'Offer deleted successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to delete offer.' });
  }
});

// ==============================================================================
// SHOP INFORMATION SETTINGS
// ==============================================================================
app.get('/api/admin/shop-settings', requireAdmin, (req, res) => {
  try {
    const rows = db.prepare('SELECT key, value FROM shop_settings').all();
    const settings = {};
    rows.forEach(r => { settings[r.key] = r.value; });
    res.json({ success: true, settings });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to load shop settings.' });
  }
});

app.put('/api/admin/shop-settings', requireAdmin, (req, res) => {
  try {
    const updates = req.body;
    const upsert = db.prepare(`
      INSERT INTO shop_settings (key, value) VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `);

    db.exec('BEGIN TRANSACTION;');
    try {
      for (const [key, value] of Object.entries(updates)) {
        upsert.run(key, String(value));
      }
      db.exec('COMMIT;');
    } catch (txErr) {
      db.exec('ROLLBACK;');
      throw txErr;
    }

    res.json({ success: true, message: 'Shop information updated successfully!' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to save shop settings.' });
  }
});

// ==============================================================================
// HOMEPAGE CONTENT SETTINGS
// ==============================================================================
app.get('/api/admin/homepage', requireAdmin, (req, res) => {
  try {
    const rows = db.prepare('SELECT key, value FROM homepage_settings').all();
    const settings = {};
    rows.forEach(r => { settings[r.key] = r.value; });
    res.json({ success: true, settings });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to load homepage settings.' });
  }
});

app.put('/api/admin/homepage', requireAdmin, (req, res) => {
  try {
    const updates = req.body;
    const upsert = db.prepare(`
      INSERT INTO homepage_settings (key, value) VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `);

    db.exec('BEGIN TRANSACTION;');
    try {
      for (const [key, value] of Object.entries(updates)) {
        upsert.run(key, String(value));
      }
      db.exec('COMMIT;');
    } catch (txErr) {
      db.exec('ROLLBACK;');
      throw txErr;
    }

    res.json({ success: true, message: 'Homepage content updated successfully!' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to save homepage settings.' });
  }
});

// ==============================================================================
// ORDERS MANAGEMENT
// ==============================================================================
app.get('/api/admin/orders', requireAdmin, (req, res) => {
  try {
    const orders = db.prepare('SELECT * FROM orders ORDER BY id DESC').all();
    const parsedOrders = orders.map(o => {
      try {
        return { ...o, items: JSON.parse(o.items_json) };
      } catch (e) {
        return { ...o, items: [] };
      }
    });
    res.json({ success: true, orders: parsedOrders });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch orders.' });
  }
});

app.put('/api/admin/orders/:id/status', requireAdmin, (req, res) => {
  try {
    const { status } = req.body;
    const allowed = ['pending', 'confirmed', 'out_for_delivery', 'delivered', 'cancelled'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid order status.' });
    }

    db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, req.params.id);
    res.json({ success: true, message: `Order status changed to ${status}.` });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to update order status.' });
  }
});

// ==============================================================================
// IMAGE UPLOAD (Section 5)
// ==============================================================================
app.post('/api/admin/upload', requireAdmin, upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No image file uploaded.' });
    }

    const fileUrl = `/uploads/${req.file.filename}`;
    res.json({
      success: true,
      message: 'Image uploaded successfully!',
      url: fileUrl,
      filename: req.file.filename,
      size: req.file.size
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message || 'Image upload failed.' });
  }
});

// Delete uploaded image
app.delete('/api/admin/upload/:filename', requireAdmin, (req, res) => {
  try {
    const filename = path.basename(req.params.filename);
    const filePath = path.join(uploadsDir, filename);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      res.json({ success: true, message: 'Image deleted from server.' });
    } else {
      res.status(404).json({ success: false, error: 'File not found.' });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to delete file.' });
  }
});

// Admin redirect fallback
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin', 'index.html'));
});

// Start Server
app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(` Grocery Store & Admin Dashboard Server is Running!    `);
  console.log(` Public Website:  http://localhost:${PORT}/            `);
  console.log(` Admin Dashboard: http://localhost:${PORT}/admin       `);
  console.log(`=======================================================`);
});
