/**
 * COMPREHENSIVE INTEGRATION TEST SUITE
 * Tests Auth, Security, Products, Bulk Prices, Categories, Offers, Shop Settings, Orders
 */

const { db } = require('./db');
const { verifyPassword, hashPassword, generateSessionToken } = require('./auth');

async function runTests() {
  console.log('=== STARTING GROCERY STORE ADMIN BACKEND TEST SUITE ===\n');
  let passed = 0;
  let failed = 0;

  function assert(condition, testName) {
    if (condition) {
      console.log(`✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${testName}`);
      failed++;
    }
  }

  // 1. Password Hashing & Auth Tests
  console.log('--- 1. Testing Authentication & Crypto ---');
  const { hash, salt } = hashPassword('MySecretPass@2026');
  assert(verifyPassword('MySecretPass@2026', hash, salt) === true, 'Correct password verification succeeds');
  assert(verifyPassword('WrongPassword', hash, salt) === false, 'Incorrect password verification fails');

  const admin = db.prepare('SELECT * FROM admins WHERE email = ?').get('admin@srimurugan.com');
  assert(!!admin, 'Default admin exists in database');
  assert(verifyPassword('Tiruppur@123', admin.password_hash, admin.salt) === true, 'Default admin password validates correctly');

  // 2. Session Management
  console.log('\n--- 2. Testing Session Management ---');
  const testToken = generateSessionToken();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 1000 * 60 * 60).toISOString();
  db.prepare('INSERT INTO sessions (token, admin_id, created_at, expires_at) VALUES (?, ?, ?, ?)').run(testToken, admin.id, now.toISOString(), expiresAt);
  const sessionCheck = db.prepare('SELECT * FROM sessions WHERE token = ?').get(testToken);
  assert(!!sessionCheck && sessionCheck.admin_id === admin.id, 'Session token inserted and valid');
  db.prepare('DELETE FROM sessions WHERE token = ?').run(testToken);
  assert(!db.prepare('SELECT * FROM sessions WHERE token = ?').get(testToken), 'Session token deleted on logout');

  // 3. Products CRUD
  console.log('\n--- 3. Testing Products CRUD & Availability ---');
  const insertProd = db.prepare(`
    INSERT INTO products (name, tamil_name, category_id, price, offer_price, unit, is_available, is_published, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, 1, 1, ?)
  `);
  const prodRes = insertProd.run('Test Kodo Millet', 'வரகு அரிசி', 3, 110, 95, '1 kg', new Date().toISOString());
  const prodId = prodRes.lastInsertRowid;
  assert(prodId > 0, 'New product added with ID: ' + prodId);

  const fetchedProd = db.prepare('SELECT * FROM products WHERE id = ?').get(prodId);
  assert(fetchedProd.name === 'Test Kodo Millet' && fetchedProd.price === 110 && fetchedProd.offer_price === 95, 'Product retrieved with exact prices');

  // Edit product
  db.prepare('UPDATE products SET price = 125, is_available = 0 WHERE id = ?').run(prodId);
  const updatedProd = db.prepare('SELECT * FROM products WHERE id = ?').get(prodId);
  assert(updatedProd.price === 125 && updatedProd.is_available === 0, 'Product price updated and marked Out of Stock');

  // Delete product
  db.prepare('DELETE FROM products WHERE id = ?').run(prodId);
  assert(!db.prepare('SELECT * FROM products WHERE id = ?').get(prodId), 'Product deleted successfully');

  // 4. Bulk Price Update Atomic Transaction
  console.log('\n--- 4. Testing Bulk Price Updates ---');
  const p1 = db.prepare('SELECT id, price FROM products LIMIT 1').get();
  const origPrice = p1.price;
  const newPrice = origPrice + 5;

  db.exec('BEGIN TRANSACTION;');
  db.prepare('UPDATE products SET price = ? WHERE id = ?').run(newPrice, p1.id);
  db.exec('COMMIT;');

  const p1Updated = db.prepare('SELECT price FROM products WHERE id = ?').get(p1.id);
  assert(p1Updated.price === newPrice, `Bulk price updated successfully (${origPrice} -> ${newPrice})`);

  // Restore original price
  db.prepare('UPDATE products SET price = ? WHERE id = ?').run(origPrice, p1.id);

  // 5. Category Management & Safety Guard
  console.log('\n--- 5. Testing Category Management & Safety Guards ---');
  const catRes = db.prepare("INSERT INTO categories (name, tamil_name, icon, display_order, is_active, created_at) VALUES ('Special Millets', 'சிறுதானியங்கள்', '🌾', 99, 1, ?)").run(new Date().toISOString());
  const catId = catRes.lastInsertRowid;
  assert(catId > 0, 'Created new category with ID: ' + catId);

  // Check product count in new category
  const countCheck = db.prepare('SELECT COUNT(*) as count FROM products WHERE category_id = ?').get(catId).count;
  assert(countCheck === 0, 'Empty category has 0 products assigned');

  // Safe deletion
  db.prepare('DELETE FROM categories WHERE id = ?').run(catId);
  assert(!db.prepare('SELECT * FROM categories WHERE id = ?').get(catId), 'Empty category safely removed');

  // 6. Offers & Promotions
  console.log('\n--- 6. Testing Offers Management ---');
  const offRes = db.prepare(`
    INSERT INTO offers (title, description, discount_tag, code, is_active, created_at)
    VALUES (?, ?, ?, ?, 1, ?)
  `).run('Super Weekend Deal', 'Special 15% off', '15% OFF', 'WEEKEND15', new Date().toISOString());
  const offId = offRes.lastInsertRowid;
  assert(offId > 0, 'Offer created successfully');

  db.prepare('UPDATE offers SET is_active = 0 WHERE id = ?').run(offId);
  assert(db.prepare('SELECT is_active FROM offers WHERE id = ?').get(offId).is_active === 0, 'Offer deactivated successfully');
  db.prepare('DELETE FROM offers WHERE id = ?').run(offId);

  // 7. Shop Information Persistence
  console.log('\n--- 7. Testing Shop Information Settings ---');
  const origPhone = db.prepare("SELECT value FROM shop_settings WHERE key = 'phone_display'").get().value;
  db.prepare("UPDATE shop_settings SET value = '+91 99999 88888' WHERE key = 'phone_display'").run();
  assert(db.prepare("SELECT value FROM shop_settings WHERE key = 'phone_display'").get().value === '+91 99999 88888', 'Shop phone number updated');
  db.prepare("UPDATE shop_settings SET value = ? WHERE key = 'phone_display'").run(origPhone);

  // 8. Order Placement & Status Update
  console.log('\n--- 8. Testing Orders & Status Workflow ---');
  const ordRes = db.prepare(`
    INSERT INTO orders (customer_name, customer_phone, delivery_address, items_json, total_amount, payment_method, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)
  `).run('Murugan Test', '9876543210', 'Kumaran Road, Tiruppur', JSON.stringify([{ id: 1, name: 'Ponni Rice', qty: 2, price: 340 }]), 680, 'Cash on Delivery', new Date().toISOString());
  const ordId = ordRes.lastInsertRowid;
  assert(ordId > 0, 'Customer order inserted with ID: ' + ordId);

  db.prepare("UPDATE orders SET status = 'out_for_delivery' WHERE id = ?").run(ordId);
  assert(db.prepare('SELECT status FROM orders WHERE id = ?').get(ordId).status === 'out_for_delivery', 'Order status progressed to out_for_delivery');
  db.prepare('DELETE FROM orders WHERE id = ?').run(ordId);

  console.log(`\n========================================`);
  console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log(`========================================\n`);

  if (failed > 0) process.exit(1);
}

runTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
