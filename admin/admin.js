/**
 * ADMIN DASHBOARD JAVASCRIPT CONTROLLER
 * Sri Murugan Daily Fresh Grocery Store - Tiruppur
 * Mode: Open Access (Full Administrative Privileges for All Visitors)
 * Compatible with GitHub Pages (Static LocalStorage) & Node.js Backend Server
 */

const API_BASE = window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1')
  ? '/api'
  : (window.location.pathname.includes('/test/') ? '/test/api' : '/api');

let isServerAvailable = false;
let currentAdmin = {
  username: 'Store Owner',
  email: 'admin@srimurugan.com',
  role: 'Administrator'
};

// ==============================================================================
// DEFAULT STORE DATA (Used as base & GitHub Pages fallback)
// ==============================================================================
const DEFAULT_DATA = {
  shop: {
    shop_name: 'Sri Murugan Daily Fresh',
    tagline: "Tiruppur's Favourite Neighbourhood Grocery Store",
    phone_display: '+91 98765 43210',
    phone_raw: '+919876543210',
    whatsapp_number: '919876543210',
    address_line1: '142, Kumaran Road, Near Railway Station',
    address_line2: 'Old Bus Stand Area, Tiruppur, Tamil Nadu - 641 601',
    city: 'Tiruppur',
    state: 'Tamil Nadu',
    pincode: '641601',
    timings: 'Open Every Day: 6:30 AM – 10:00 PM',
    gmaps_url: 'https://maps.google.com/?q=Tiruppur+Tamil+Nadu+Kumaran+Road',
    delivery_radius: 'Fast 30-45 Mins Delivery across PN Road, Avinashi Road, College Road & Kumaran Road',
    min_order_amount: '200',
    shop_description: 'Your trusted local neighbourhood grocery store and mini-supermarket in Tiruppur. Farm fresh vegetables, authentic Ponni rice, unpolished dals, and cold-pressed cooking oils with WhatsApp order delivery.'
  },
  homepage: {
    hero_headline: 'Your Neighbourhood Grocery Store in Tiruppur',
    hero_subtitle: 'Fresh groceries, everyday essentials, and quality products at affordable prices. Everything you need, just around the corner!',
    hero_image_url: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=80',
    trust_indicator: 'Serving Your Neighbourhood in Tiruppur',
    announcement_text: 'Free doorstep delivery in Tiruppur on orders above ₹500! Order via WhatsApp.',
    announcement_active: '1'
  },
  categories: [
    { id: 1, name: 'Fresh Vegetables', tamil_name: 'நாட்டு காய்கறிகள்', icon: '🥦', display_order: 1, is_active: 1 },
    { id: 2, name: 'Fresh Fruits', tamil_name: 'புதிய பழங்கள்', icon: '🍎', display_order: 2, is_active: 1 },
    { id: 3, name: 'Rice & Grains', tamil_name: 'அரிசி & தானியங்கள்', icon: '🌾', display_order: 3, is_active: 1 },
    { id: 4, name: 'Dals & Pulses', tamil_name: 'பருப்பு வகைகள்', icon: '🥣', display_order: 4, is_active: 1 },
    { id: 5, name: 'Cooking Oil', tamil_name: 'மரச்செக்கு எண்ணெய்', icon: '🛢️', display_order: 5, is_active: 1 },
    { id: 6, name: 'Spices & Masalas', tamil_name: 'மசாலா & மளிகை', icon: '🌶️', display_order: 6, is_active: 1 },
    { id: 7, name: 'Snacks & Biscuits', tamil_name: 'சிற்றுண்டிகள்', icon: '🍪', display_order: 7, is_active: 1 },
    { id: 8, name: 'Dairy Products', tamil_name: 'பால் & தயிர்', icon: '🥛', display_order: 8, is_active: 1 },
    { id: 9, name: 'Beverages', tamil_name: 'டீ, காபி & பானங்கள்', icon: '☕', display_order: 9, is_active: 1 },
    { id: 10, name: 'Household Essentials', tamil_name: 'வீட்டு உபயோக பொருட்கள்', icon: '🧼', display_order: 10, is_active: 1 },
    { id: 11, name: 'Personal Care', tamil_name: 'சுய பராமரிப்பு', icon: '🧴', display_order: 11, is_active: 1 }
  ],
  products: [
    {
      id: 1,
      name: 'BPT Deluxe Ponni Rice',
      tamil_name: 'முதல் தரம் பொன்னி புழுங்கல் அரிசி',
      category_id: 3,
      price: 360,
      offer_price: 340,
      unit: '5 kg bag',
      image_url: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=600&q=80',
      description: 'Aged, well-milled deluxe Ponni boiled rice, soft texture for daily meals.',
      badge_text: 'Best Seller',
      is_available: 1,
      is_published: 1,
      is_featured: 1
    },
    {
      id: 2,
      name: 'Country Tomatoes',
      tamil_name: 'நாட்டு தக்காளி (பண்ணை வரத்து)',
      category_id: 1,
      price: 45,
      offer_price: 38,
      unit: '1 kg',
      image_url: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=600&q=80',
      description: 'Direct harvest farm fresh sour-sweet country tomatoes.',
      badge_text: 'Farm Fresh',
      is_available: 1,
      is_published: 1,
      is_featured: 1
    },
    {
      id: 3,
      name: 'First Quality Toor Dal',
      tamil_name: 'முதல் தரம் துவரம் பருப்பு',
      category_id: 4,
      price: 170,
      offer_price: 155,
      unit: '1 kg',
      image_url: 'https://images.unsplash.com/photo-1585994192701-f1a505c817ea?auto=format&fit=crop&w=600&q=80',
      description: 'Unpolished, pesticide-free yellow split toor dal with rich aroma.',
      badge_text: 'Unpolished',
      is_available: 1,
      is_published: 1,
      is_featured: 1
    },
    {
      id: 4,
      name: 'Cold-Pressed Groundnut Oil',
      tamil_name: 'மரச்செக்கு கடலை எண்ணெய்',
      category_id: 5,
      price: 230,
      offer_price: 210,
      unit: '1 Litre',
      image_url: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=600&q=80',
      description: 'Authentic wooden-churned (Marachekku) cold pressed Kadalai Ennai.',
      badge_text: 'Traditional',
      is_available: 1,
      is_published: 1,
      is_featured: 1
    },
    {
      id: 5,
      name: 'Small Sambar Onions',
      tamil_name: 'நாட்டு சின்ன வெங்காயம்',
      category_id: 1,
      price: 75,
      offer_price: 65,
      unit: '1 kg',
      image_url: 'https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?auto=format&fit=crop&w=600&q=80',
      description: 'Fresh pink small shallots essential for Tamil Nadu sambar & rasam.',
      badge_text: 'Daily Staple',
      is_available: 1,
      is_published: 1,
      is_featured: 1
    },
    {
      id: 6,
      name: 'Aavin Fresh Milk (Blue)',
      tamil_name: 'ஆவின் பசும்பால் (பாக்கெட்)',
      category_id: 8,
      price: 22,
      offer_price: 22,
      unit: '500 ml',
      image_url: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=600&q=80',
      description: 'Pasteurized homogenized toned milk delivered fresh every morning.',
      badge_text: 'Daily 6:30 AM',
      is_available: 1,
      is_published: 1,
      is_featured: 1
    },
    {
      id: 7,
      name: 'Traditional Sambar Masala',
      tamil_name: 'நாட்டு சாம்பார் பொடி (200g)',
      category_id: 6,
      price: 58,
      offer_price: 52,
      unit: '200g pack',
      image_url: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=600&q=80',
      description: 'Authentic village style slow roasted coriander, cumin and red chilli blend.',
      badge_text: 'Pure Spices',
      is_available: 1,
      is_published: 1,
      is_featured: 0
    },
    {
      id: 8,
      name: 'Degree Filter Coffee Powder',
      tamil_name: 'கும்பகோணம் டிகிரி காபி தூள் (80:20)',
      category_id: 9,
      price: 145,
      offer_price: 130,
      unit: '250g pack',
      image_url: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=600&q=80',
      description: '80% Plantation A coffee and 20% high grade chicory for golden decoction.',
      badge_text: 'South Indian Classic',
      is_available: 1,
      is_published: 1,
      is_featured: 0
    }
  ],
  offers: [
    {
      id: 1,
      title: 'Special Monthly Grocery Festival',
      description: 'Flat 10% off on all Marachekku Cold-Pressed Cooking Oils and 25kg Ponni Rice bags this week in Tiruppur!',
      banner_url: 'https://images.unsplash.com/photo-1607349913338-fca6f7fc42d0?auto=format&fit=crop&w=1000&q=80',
      discount_tag: 'FLAT 10% OFF',
      code: 'TIRUPPUR10',
      start_date: '2026-11-01',
      end_date: '2026-11-30',
      is_active: 1
    }
  ],
  orders: [
    {
      id: 101,
      customer_name: 'Venkatesh R.',
      customer_phone: '9876543210',
      delivery_address: 'PN Road, Tiruppur',
      items: [
        { name: 'BPT Deluxe Ponni Rice (5 kg)', qty: 1, price: 340 },
        { name: 'Country Tomatoes (1 kg)', qty: 2, price: 38 }
      ],
      total_amount: 416,
      payment_method: 'Google Pay',
      status: 'confirmed',
      created_at: new Date().toISOString()
    }
  ]
};

// ==============================================================================
// LOCAL STORAGE DATA LAYER
// ==============================================================================
function getLocalData() {
  const raw = localStorage.getItem('sri_murugan_grocery_data');
  if (!raw) {
    saveLocalData(DEFAULT_DATA);
    return JSON.parse(JSON.stringify(DEFAULT_DATA));
  }
  try {
    return JSON.parse(raw);
  } catch (e) {
    saveLocalData(DEFAULT_DATA);
    return JSON.parse(JSON.stringify(DEFAULT_DATA));
  }
}

function saveLocalData(data) {
  localStorage.setItem('sri_murugan_grocery_data', JSON.stringify(data));
  // Broadcast update event so index.html syncs immediately in other tabs
  window.dispatchEvent(new Event('storage'));
}

// Global In-Memory Working State
let storeData = getLocalData();
let allProducts = storeData.products || [];
let allCategories = storeData.categories || [];
let allOffers = storeData.offers || [];
let allOrders = storeData.orders || [];

// ==============================================================================
// 1. INITIALIZATION & OPEN ACCESS
// ==============================================================================
document.addEventListener('DOMContentLoaded', async () => {
  // Check if live server is reachable
  try {
    const res = await fetch(`${API_BASE}/public/data`);
    if (res.ok) {
      const serverData = await res.json();
      if (serverData.success && serverData.data) {
        isServerAvailable = true;
        // Merge server data with local working state
        if (serverData.data.products && serverData.data.products.length > 0) {
          storeData.products = serverData.data.products;
          storeData.categories = serverData.data.categories;
          storeData.offers = serverData.data.offers;
          storeData.shop = { ...storeData.shop, ...serverData.data.shop };
          storeData.homepage = { ...storeData.homepage, ...serverData.data.homepage };
          saveLocalData(storeData);
        }
      }
    }
  } catch (err) {
    isServerAvailable = false;
  }

  // Reload working state
  storeData = getLocalData();
  allProducts = storeData.products || [];
  allCategories = storeData.categories || [];
  allOffers = storeData.offers || [];
  allOrders = storeData.orders || [];

  // Update Admin Info Badge in Sidebar (Open Access)
  const nameEl = document.getElementById('adminUserNameDisplay');
  const emailEl = document.getElementById('adminUserEmailDisplay');
  const avatarEl = document.getElementById('adminAvatarInitial');

  if (nameEl) nameEl.textContent = 'Store Owner (Open Access)';
  if (emailEl) emailEl.textContent = isServerAvailable ? '⚡ Connected to Live Server' : '🟢 Active on GitHub Pages (Instant Sync)';
  if (avatarEl) avatarEl.textContent = '👑';

  // Add Open Access status pill in topbar
  const topbarRight = document.querySelector('.topbar-right');
  if (topbarRight && !document.getElementById('openAccessBadge')) {
    const badge = document.createElement('span');
    badge.id = 'openAccessBadge';
    badge.className = 'status-pill success';
    badge.style.fontSize = '0.78rem';
    badge.style.padding = '5px 12px';
    badge.innerHTML = '🔓 <strong>Full Access Enabled</strong>';
    topbarRight.insertBefore(badge, topbarRight.firstChild);
  }

  initNavigation();
  loadOverviewData();
});

// ==============================================================================
// 2. NAVIGATION & TABS
// ==============================================================================
function initNavigation() {
  const navButtons = document.querySelectorAll('.nav-item-btn[data-view]');
  navButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetView = btn.getAttribute('data-view');
      switchView(targetView);
    });
  });

  const toggleBtn = document.getElementById('sidebarToggleBtn');
  const sidebar = document.getElementById('adminSidebar');
  if (toggleBtn && sidebar) {
    toggleBtn.addEventListener('click', () => {
      sidebar.classList.toggle('is-open');
    });
  }
}

function switchView(viewName) {
  document.querySelectorAll('.nav-item-btn[data-view]').forEach(btn => {
    if (btn.getAttribute('data-view') === viewName) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  document.querySelectorAll('.view-section').forEach(sec => {
    sec.classList.remove('is-active');
  });

  const activeSec = document.getElementById(`view-${viewName}`);
  if (activeSec) {
    activeSec.classList.add('is-active');
  }

  const titles = {
    overview: 'Dashboard Overview',
    products: 'Product Management',
    'bulk-prices': 'Bulk Price Editor',
    categories: 'Category Management',
    offers: 'Offers & Promotions',
    'shop-info': 'Shop Information & Timings',
    homepage: 'Website Homepage Editor',
    orders: 'Customer Orders & WhatsApp'
  };
  const titleEl = document.getElementById('currentPageTitle');
  if (titleEl) titleEl.textContent = titles[viewName] || 'Dashboard';

  const sidebar = document.getElementById('adminSidebar');
  if (sidebar) sidebar.classList.remove('is-open');

  if (viewName === 'overview') loadOverviewData();
  else if (viewName === 'products') loadProducts();
  else if (viewName === 'bulk-prices') loadBulkPriceTable();
  else if (viewName === 'categories') loadCategories();
  else if (viewName === 'offers') loadOffers();
  else if (viewName === 'shop-info') loadShopSettings();
  else if (viewName === 'homepage') loadHomepageSettings();
  else if (viewName === 'orders') loadOrders();
}

function logout() {
  showToast('Logged out. Re-authorizing open access...', 'info');
  setTimeout(() => {
    window.location.reload();
  }, 600);
}

// ==============================================================================
// 3. OVERVIEW VIEW
// ==============================================================================
function loadOverviewData() {
  storeData = getLocalData();
  allProducts = storeData.products || [];
  allCategories = storeData.categories || [];
  allOffers = storeData.offers || [];
  allOrders = storeData.orders || [];

  const totalProducts = allProducts.length;
  const activeProducts = allProducts.filter(p => p.is_available && p.is_published).length;
  const outOfStock = allProducts.filter(p => !p.is_available).length;
  const totalCategories = allCategories.filter(c => c.is_active).length;
  const activeOffers = allOffers.filter(o => o.is_active).length;
  const totalOrders = allOrders.length;

  document.getElementById('statTotalProducts').textContent = totalProducts;
  document.getElementById('statActiveProducts').textContent = activeProducts;
  document.getElementById('statOutOfStock').textContent = outOfStock;
  document.getElementById('statCategories').textContent = totalCategories;
  document.getElementById('statActiveOffers').textContent = activeOffers;
  document.getElementById('statTotalOrders').textContent = totalOrders;

  const tbody = document.getElementById('recentProductsTableBody');
  if (tbody) {
    const recent = allProducts.slice(0, 6);
    if (recent.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 20px; color: #94a3b8;">No products found.</td></tr>';
    } else {
      tbody.innerHTML = recent.map(p => {
        const cat = allCategories.find(c => c.id == p.category_id);
        return `
          <tr>
            <td><strong>${escapeHtml(p.name)}</strong></td>
            <td>${escapeHtml(cat ? cat.name : 'Staples')}</td>
            <td>
              ${p.offer_price ? `<span style="text-decoration:line-through; color:#94a3b8; font-size:0.8rem;">₹${p.price}</span> ₹${p.offer_price}` : `₹${p.price}`}
              <span style="font-size:0.75rem; color:#64748b;">/${escapeHtml(p.unit || '1 kg')}</span>
            </td>
            <td>
              ${p.is_available ? '<span class="status-pill success">In Stock</span>' : '<span class="status-pill danger">Out of Stock</span>'}
            </td>
            <td>
              <button class="btn btn-sm btn-secondary" onclick="editProductById(${p.id})">Edit</button>
            </td>
          </tr>
        `;
      }).join('');
    }
  }
}

// ==============================================================================
// 4. PRODUCT MANAGEMENT VIEW
// ==============================================================================
function loadProducts() {
  populateCategoryDropdowns();
  storeData = getLocalData();
  allProducts = storeData.products || [];

  const search = (document.getElementById('prodSearchInput')?.value || '').toLowerCase().trim();
  const cat = document.getElementById('prodCategoryFilter')?.value || '';
  const status = document.getElementById('prodStatusFilter')?.value || '';
  const sort = document.getElementById('prodSortSelect')?.value || '';

  let filtered = [...allProducts];

  if (search) {
    filtered = filtered.filter(p =>
      (p.name && p.name.toLowerCase().includes(search)) ||
      (p.tamil_name && p.tamil_name.toLowerCase().includes(search)) ||
      (p.description && p.description.toLowerCase().includes(search))
    );
  }

  if (cat) {
    filtered = filtered.filter(p => String(p.category_id) === String(cat));
  }

  if (status === 'available') {
    filtered = filtered.filter(p => p.is_available);
  } else if (status === 'out_of_stock') {
    filtered = filtered.filter(p => !p.is_available);
  } else if (status === 'unpublished') {
    filtered = filtered.filter(p => !p.is_published);
  }

  if (sort === 'price_asc') {
    filtered.sort((a, b) => Number(a.price) - Number(b.price));
  } else if (sort === 'price_desc') {
    filtered.sort((a, b) => Number(b.price) - Number(a.price));
  } else if (sort === 'name_asc') {
    filtered.sort((a, b) => a.name.localeCompare(b.name));
  } else {
    filtered.reverse();
  }

  renderProductsTable(filtered);
}

function renderProductsTable(products) {
  const tbody = document.getElementById('productsTableBody');
  if (!tbody) return;

  if (products.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding: 30px; color:#94a3b8;">No products match your search or filter.</td></tr>';
    return;
  }

  tbody.innerHTML = products.map(p => {
    const cat = allCategories.find(c => String(c.id) === String(p.category_id));
    return `
      <tr>
        <td>
          <img
            src="${escapeHtml(p.image_url || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=100&q=80')}"
            alt="${escapeHtml(p.name)}"
            class="table-thumbnail"
            onerror="this.src='https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=100&q=80'"
          />
        </td>
        <td>
          <strong>${escapeHtml(p.name)}</strong>
          ${p.tamil_name ? `<div style="font-size:0.75rem; color:#64748b;">${escapeHtml(p.tamil_name)}</div>` : ''}
          ${p.badge_text ? `<span style="font-size:0.7rem; background:#fef3c7; color:#92400e; padding:1px 6px; border-radius:4px; font-weight:700;">${escapeHtml(p.badge_text)}</span>` : ''}
        </td>
        <td><span style="font-size:0.85rem; color:#334155; font-weight:600;">${escapeHtml(cat ? cat.name : 'Staples')}</span></td>
        <td>
          <div style="font-weight:700; color:#0f172a;">
            ${p.offer_price ? `₹${p.offer_price} <span style="text-decoration:line-through; color:#94a3b8; font-size:0.75rem;">₹${p.price}</span>` : `₹${p.price}`}
          </div>
          <div style="font-size:0.75rem; color:#64748b;">per ${escapeHtml(p.unit || '1 kg')}</div>
        </td>
        <td>
          ${p.is_available ? '<span class="status-pill success">In Stock</span>' : '<span class="status-pill danger">Out of Stock</span>'}
        </td>
        <td>
          ${p.is_published ? '<span class="status-pill success">Visible</span>' : '<span class="status-pill neutral">Hidden</span>'}
          ${p.is_featured ? '<span class="status-pill warning" style="margin-left:4px;">★ Featured</span>' : ''}
        </td>
        <td>
          <div style="display:flex; gap:6px;">
            <button class="action-icon-btn" onclick="editProductById(${p.id})" title="Edit Product">✏️</button>
            <button class="action-icon-btn danger" onclick="confirmDeleteProduct(${p.id}, '${escapeJsString(p.name)}')" title="Delete Product">🗑️</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function populateCategoryDropdowns() {
  storeData = getLocalData();
  allCategories = storeData.categories || [];

  const filterSelect = document.getElementById('prodCategoryFilter');
  if (filterSelect) {
    const currentVal = filterSelect.value;
    filterSelect.innerHTML = '<option value="">All Categories</option>' +
      allCategories.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('');
    filterSelect.value = currentVal;
  }

  const modalSelect = document.getElementById('modalProdCategory');
  if (modalSelect) {
    modalSelect.innerHTML = '<option value="">Select a Category</option>' +
      allCategories.map(c => `<option value="${c.id}">${c.icon || '📦'} ${escapeHtml(c.name)}</option>`).join('');
  }
}

function openAddProductModal() {
  document.getElementById('productModalTitle').textContent = 'Add New Grocery Product';
  document.getElementById('modalProductId').value = '';
  document.getElementById('modalProdName').value = '';
  document.getElementById('modalProdTamilName').value = '';
  document.getElementById('modalProdCategory').value = allCategories[0] ? allCategories[0].id : '';
  document.getElementById('modalProdPrice').value = '';
  document.getElementById('modalProdOfferPrice').value = '';
  document.getElementById('modalProdUnit').value = '1 kg';
  document.getElementById('modalProdImage').value = '';
  document.getElementById('modalProdDescription').value = '';
  document.getElementById('modalProdBadge').value = '';
  document.getElementById('modalProdAvailable').checked = true;
  document.getElementById('modalProdPublished').checked = true;
  document.getElementById('modalProdFeatured').checked = false;
  document.getElementById('modalProdImagePreview').style.display = 'none';

  openModal('productModal');
}

function editProductById(id) {
  storeData = getLocalData();
  const p = (storeData.products || []).find(item => String(item.id) === String(id));
  if (!p) return;

  document.getElementById('productModalTitle').textContent = 'Edit Product';
  document.getElementById('modalProductId').value = p.id;
  document.getElementById('modalProdName').value = p.name || '';
  document.getElementById('modalProdTamilName').value = p.tamil_name || '';
  document.getElementById('modalProdCategory').value = p.category_id || '';
  document.getElementById('modalProdPrice').value = p.price || '';
  document.getElementById('modalProdOfferPrice').value = p.offer_price || '';
  document.getElementById('modalProdUnit').value = p.unit || '1 kg';
  document.getElementById('modalProdImage').value = p.image_url || '';
  document.getElementById('modalProdDescription').value = p.description || '';
  document.getElementById('modalProdBadge').value = p.badge_text || '';
  document.getElementById('modalProdAvailable').checked = !!p.is_available;
  document.getElementById('modalProdPublished').checked = !!p.is_published;
  document.getElementById('modalProdFeatured').checked = !!p.is_featured;

  const preview = document.getElementById('modalProdImagePreview');
  if (p.image_url) {
    preview.src = p.image_url;
    preview.style.display = 'block';
  } else {
    preview.style.display = 'none';
  }

  openModal('productModal');
}

function saveProductForm(e) {
  e.preventDefault();
  storeData = getLocalData();
  const id = document.getElementById('modalProductId').value;

  const productData = {
    id: id ? Number(id) : Date.now(),
    name: document.getElementById('modalProdName').value.trim(),
    tamil_name: document.getElementById('modalProdTamilName').value.trim(),
    category_id: Number(document.getElementById('modalProdCategory').value) || 1,
    price: Number(document.getElementById('modalProdPrice').value),
    offer_price: document.getElementById('modalProdOfferPrice').value ? Number(document.getElementById('modalProdOfferPrice').value) : null,
    unit: document.getElementById('modalProdUnit').value.trim(),
    image_url: document.getElementById('modalProdImage').value.trim() || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&q=80',
    description: document.getElementById('modalProdDescription').value.trim(),
    badge_text: document.getElementById('modalProdBadge').value.trim(),
    is_available: document.getElementById('modalProdAvailable').checked ? 1 : 0,
    is_published: document.getElementById('modalProdPublished').checked ? 1 : 0,
    is_featured: document.getElementById('modalProdFeatured').checked ? 1 : 0,
    updated_at: new Date().toISOString()
  };

  if (id) {
    const idx = storeData.products.findIndex(p => String(p.id) === String(id));
    if (idx !== -1) {
      storeData.products[idx] = productData;
    }
  } else {
    storeData.products.unshift(productData);
  }

  saveLocalData(storeData);
  showToast(id ? 'Product updated successfully!' : 'Product added successfully!', 'success');
  closeModal('productModal');
  loadProducts();

  // Also sync to backend if online
  if (isServerAvailable) {
    const method = id ? 'PUT' : 'POST';
    const path = id ? `${API_BASE}/admin/products/${id}` : `${API_BASE}/admin/products`;
    fetch(path, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(productData)
    }).catch(() => {});
  }
}

function confirmDeleteProduct(id, name) {
  showConfirm(
    'Delete Product',
    `Are you sure you want to delete <strong>${escapeHtml(name)}</strong>? This will remove it from the store.`,
    () => {
      storeData = getLocalData();
      storeData.products = (storeData.products || []).filter(p => String(p.id) !== String(id));
      saveLocalData(storeData);
      showToast('Product deleted.', 'info');
      loadProducts();

      if (isServerAvailable) {
        fetch(`${API_BASE}/admin/products/${id}`, { method: 'DELETE' }).catch(() => {});
      }
    }
  );
}

// ==============================================================================
// 5. BULK PRICE UPDATE (Section 4)
// ==============================================================================
let bulkOriginalPrices = {};

function loadBulkPriceTable() {
  storeData = getLocalData();
  allProducts = storeData.products || [];
  bulkOriginalPrices = {};

  allProducts.forEach(p => {
    bulkOriginalPrices[p.id] = {
      price: Number(p.price),
      offer_price: p.offer_price !== null && p.offer_price !== undefined ? Number(p.offer_price) : null
    };
  });

  const tbody = document.getElementById('bulkPriceTableBody');
  if (!tbody) return;

  tbody.innerHTML = allProducts.map(p => `
    <tr data-bulk-id="${p.id}">
      <td>
        <img
          src="${escapeHtml(p.image_url || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=80&q=80')}"
          alt=""
          style="width:36px; height:36px; border-radius:6px; object-fit:cover;"
          onerror="this.src='https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=80&q=80'"
        />
      </td>
      <td>
        <strong>${escapeHtml(p.name)}</strong>
      </td>
      <td><span style="font-size:0.82rem; font-weight:600;">per ${escapeHtml(p.unit || '1 kg')}</span></td>
      <td>
        <span style="font-weight:700;">₹${p.price}</span>
      </td>
      <td>
        <div style="display:flex; align-items:center; gap:4px;">
          <span>₹</span>
          <input
            type="number"
            step="0.5"
            min="0"
            class="inline-price-input bulk-reg-price"
            data-id="${p.id}"
            value="${p.price}"
          />
        </div>
      </td>
      <td>
        <div style="display:flex; align-items:center; gap:4px;">
          <span>₹</span>
          <input
            type="number"
            step="0.5"
            min="0"
            class="inline-price-input bulk-offer-price"
            data-id="${p.id}"
            placeholder="None"
            value="${p.offer_price !== null && p.offer_price !== undefined ? p.offer_price : ''}"
          />
        </div>
      </td>
    </tr>
  `).join('');
}

function handleSaveBulkPrices() {
  const rows = document.querySelectorAll('#bulkPriceTableBody tr[data-bulk-id]');
  const updates = [];
  const changedList = [];

  rows.forEach(r => {
    const id = r.getAttribute('data-bulk-id');
    const p = allProducts.find(item => String(item.id) === String(id));
    const regInp = r.querySelector('.bulk-reg-price');
    const offerInp = r.querySelector('.bulk-offer-price');

    const newReg = parseFloat(regInp.value);
    const newOffer = offerInp.value.trim() !== '' ? parseFloat(offerInp.value) : null;
    const orig = bulkOriginalPrices[id];

    if (orig && (newReg !== orig.price || newOffer !== orig.offer_price)) {
      updates.push({ id, price: newReg, offer_price: newOffer });
      changedList.push(`• <strong>${escapeHtml(p.name)}</strong>: Reg ₹${orig.price} → ₹${newReg}${newOffer !== orig.offer_price ? ` | Offer: ${newOffer ? '₹' + newOffer : 'None'}` : ''}`);
    }
  });

  if (updates.length === 0) {
    showToast('No price changes detected.', 'info');
    return;
  }

  showConfirm(
    `Confirm Price Updates (${updates.length} products)`,
    `You are about to publish the following price changes live to the Tiruppur store:<br/><br/>
     <div style="max-height:180px; overflow-y:auto; font-size:0.84rem; background:#f8fafc; padding:10px 14px; border-radius:6px; border:1px solid #e2e8f0; line-height:1.6;">
       ${changedList.join('<br/>')}
     </div><br/>
     These prices will immediately show on the public landing page. Proceed?`,
    () => {
      storeData = getLocalData();
      updates.forEach(u => {
        const prod = storeData.products.find(p => String(p.id) === String(u.id));
        if (prod) {
          prod.price = u.price;
          prod.offer_price = u.offer_price;
          prod.updated_at = new Date().toISOString();
        }
      });

      saveLocalData(storeData);
      showToast('Prices published live to the website!', 'success');
      loadBulkPriceTable();

      if (isServerAvailable) {
        fetch(`${API_BASE}/admin/products/bulk-prices`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ updates })
        }).catch(() => {});
      }
    }
  );
}

// ==============================================================================
// 6. CATEGORY MANAGEMENT
// ==============================================================================
function loadCategories() {
  storeData = getLocalData();
  allCategories = storeData.categories || [];
  allProducts = storeData.products || [];

  const tbody = document.getElementById('categoriesTableBody');
  if (!tbody) return;

  tbody.innerHTML = allCategories.map(c => {
    const productCount = allProducts.filter(p => String(p.category_id) === String(c.id)).length;
    return `
      <tr>
        <td style="font-size:1.4rem;">${c.icon || '📦'}</td>
        <td>
          <strong>${escapeHtml(c.name)}</strong>
          ${c.tamil_name ? `<div style="font-size:0.75rem; color:#64748b;">${escapeHtml(c.tamil_name)}</div>` : ''}
        </td>
        <td><span style="font-weight:700; color:#0f172a;">${productCount} items</span></td>
        <td><span style="font-size:0.85rem; color:#64748b;">${c.display_order || 0}</span></td>
        <td>
          ${c.is_active ? '<span class="status-pill success">Active</span>' : '<span class="status-pill neutral">Disabled</span>'}
        </td>
        <td>
          <div style="display:flex; gap:6px;">
            <button class="action-icon-btn" onclick="editCategoryById(${c.id})" title="Edit Category">✏️</button>
            <button class="action-icon-btn danger" onclick="confirmDeleteCategory(${c.id}, '${escapeJsString(c.name)}', ${productCount})" title="Delete Category">🗑️</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function openAddCategoryModal() {
  document.getElementById('categoryModalTitle').textContent = 'Add Category';
  document.getElementById('modalCatId').value = '';
  document.getElementById('modalCatName').value = '';
  document.getElementById('modalCatTamil').value = '';
  document.getElementById('modalCatIcon').value = '📦';
  document.getElementById('modalCatOrder').value = allCategories.length + 1;
  document.getElementById('modalCatActive').checked = true;

  openModal('categoryModal');
}

function editCategoryById(id) {
  storeData = getLocalData();
  const c = (storeData.categories || []).find(item => String(item.id) === String(id));
  if (!c) return;

  document.getElementById('categoryModalTitle').textContent = 'Edit Category';
  document.getElementById('modalCatId').value = c.id;
  document.getElementById('modalCatName').value = c.name || '';
  document.getElementById('modalCatTamil').value = c.tamil_name || '';
  document.getElementById('modalCatIcon').value = c.icon || '📦';
  document.getElementById('modalCatOrder').value = c.display_order || 0;
  document.getElementById('modalCatActive').checked = !!c.is_active;

  openModal('categoryModal');
}

function saveCategoryForm(e) {
  e.preventDefault();
  storeData = getLocalData();
  const id = document.getElementById('modalCatId').value;

  const catData = {
    id: id ? Number(id) : Date.now(),
    name: document.getElementById('modalCatName').value.trim(),
    tamil_name: document.getElementById('modalCatTamil').value.trim(),
    icon: document.getElementById('modalCatIcon').value.trim() || '📦',
    display_order: parseInt(document.getElementById('modalCatOrder').value) || 0,
    is_active: document.getElementById('modalCatActive').checked ? 1 : 0
  };

  if (id) {
    const idx = storeData.categories.findIndex(c => String(c.id) === String(id));
    if (idx !== -1) storeData.categories[idx] = catData;
  } else {
    storeData.categories.push(catData);
  }

  saveLocalData(storeData);
  showToast(id ? 'Category updated!' : 'Category created!', 'success');
  closeModal('categoryModal');
  loadCategories();
}

function confirmDeleteCategory(id, name, productCount) {
  if (productCount > 0) {
    showToast(`Cannot delete "${name}". It has ${productCount} assigned products. Reassign them first.`, 'error');
    return;
  }

  showConfirm(
    'Delete Category',
    `Are you sure you want to delete category <strong>${escapeHtml(name)}</strong>?`,
    () => {
      storeData = getLocalData();
      storeData.categories = (storeData.categories || []).filter(c => String(c.id) !== String(id));
      saveLocalData(storeData);
      showToast('Category deleted.', 'info');
      loadCategories();
    }
  );
}

// ==============================================================================
// 7. OFFERS & PROMOTIONS
// ==============================================================================
function loadOffers() {
  storeData = getLocalData();
  allOffers = storeData.offers || [];

  const tbody = document.getElementById('offersTableBody');
  if (!tbody) return;

  if (allOffers.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 24px; color:#94a3b8;">No offers created yet.</td></tr>';
    return;
  }

  tbody.innerHTML = allOffers.map(o => `
    <tr>
      <td><strong>${escapeHtml(o.title)}</strong></td>
      <td><span style="font-weight:700; color:#b45309; background:#fef3c7; padding:2px 8px; border-radius:4px;">${escapeHtml(o.discount_tag || '')}</span></td>
      <td><code>${escapeHtml(o.code || '-')}</code></td>
      <td><span style="font-size:0.8rem; color:#64748b;">${o.start_date || 'Start'} to ${o.end_date || 'Ongoing'}</span></td>
      <td>${o.is_active ? '<span class="status-pill success">Active</span>' : '<span class="status-pill neutral">Inactive</span>'}</td>
      <td>
        <div style="display:flex; gap:6px;">
          <button class="action-icon-btn" onclick="editOfferById(${o.id})" title="Edit Offer">✏️</button>
          <button class="action-icon-btn danger" onclick="confirmDeleteOffer(${o.id}, '${escapeJsString(o.title)}')" title="Delete Offer">🗑️</button>
        </div>
      </td>
    </tr>
  `).join('');
}

function openAddOfferModal() {
  document.getElementById('offerModalTitle').textContent = 'Create New Offer';
  document.getElementById('modalOfferId').value = '';
  document.getElementById('modalOfferTitle').value = '';
  document.getElementById('modalOfferDesc').value = '';
  document.getElementById('modalOfferTag').value = 'FLAT 10% OFF';
  document.getElementById('modalOfferCode').value = 'TIRUPPUR10';
  document.getElementById('modalOfferBanner').value = '';
  document.getElementById('modalOfferStart').value = '';
  document.getElementById('modalOfferEnd').value = '';
  document.getElementById('modalOfferActive').checked = true;

  openModal('offerModal');
}

function editOfferById(id) {
  storeData = getLocalData();
  const o = (storeData.offers || []).find(item => String(item.id) === String(id));
  if (!o) return;

  document.getElementById('offerModalTitle').textContent = 'Edit Offer';
  document.getElementById('modalOfferId').value = o.id;
  document.getElementById('modalOfferTitle').value = o.title || '';
  document.getElementById('modalOfferDesc').value = o.description || '';
  document.getElementById('modalOfferTag').value = o.discount_tag || '';
  document.getElementById('modalOfferCode').value = o.code || '';
  document.getElementById('modalOfferBanner').value = o.banner_url || '';
  document.getElementById('modalOfferStart').value = o.start_date || '';
  document.getElementById('modalOfferEnd').value = o.end_date || '';
  document.getElementById('modalOfferActive').checked = !!o.is_active;

  openModal('offerModal');
}

function saveOfferForm(e) {
  e.preventDefault();
  storeData = getLocalData();
  const id = document.getElementById('modalOfferId').value;

  const offerData = {
    id: id ? Number(id) : Date.now(),
    title: document.getElementById('modalOfferTitle').value.trim(),
    description: document.getElementById('modalOfferDesc').value.trim(),
    discount_tag: document.getElementById('modalOfferTag').value.trim(),
    code: document.getElementById('modalOfferCode').value.trim(),
    banner_url: document.getElementById('modalOfferBanner').value.trim(),
    start_date: document.getElementById('modalOfferStart').value,
    end_date: document.getElementById('modalOfferEnd').value,
    is_active: document.getElementById('modalOfferActive').checked ? 1 : 0
  };

  if (id) {
    const idx = storeData.offers.findIndex(o => String(o.id) === String(id));
    if (idx !== -1) storeData.offers[idx] = offerData;
  } else {
    storeData.offers.unshift(offerData);
  }

  saveLocalData(storeData);
  showToast(id ? 'Offer updated!' : 'Offer published live!', 'success');
  closeModal('offerModal');
  loadOffers();
}

function confirmDeleteOffer(id, title) {
  showConfirm(
    'Delete Offer',
    `Delete offer <strong>${escapeHtml(title)}</strong>?`,
    () => {
      storeData = getLocalData();
      storeData.offers = (storeData.offers || []).filter(o => String(o.id) !== String(id));
      saveLocalData(storeData);
      showToast('Offer deleted.', 'info');
      loadOffers();
    }
  );
}

// ==============================================================================
// 8. SHOP INFORMATION SETTINGS
// ==============================================================================
function loadShopSettings() {
  storeData = getLocalData();
  const shop = storeData.shop || DEFAULT_DATA.shop;

  document.getElementById('shopNameInput').value = shop.shop_name || '';
  document.getElementById('shopTaglineInput').value = shop.tagline || '';
  document.getElementById('shopPhoneDisplayInput').value = shop.phone_display || '';
  document.getElementById('shopWhatsappInput').value = shop.whatsapp_number || '';
  document.getElementById('shopAddress1Input').value = shop.address_line1 || '';
  document.getElementById('shopAddress2Input').value = shop.address_line2 || '';
  document.getElementById('shopCityInput').value = shop.city || 'Tiruppur';
  document.getElementById('shopPincodeInput').value = shop.pincode || '641601';
  document.getElementById('shopTimingsInput').value = shop.timings || '';
  document.getElementById('shopGmapsInput').value = shop.gmaps_url || '';
  document.getElementById('shopDeliveryRadiusInput').value = shop.delivery_radius || '';
  document.getElementById('shopMinOrderInput').value = shop.min_order_amount || '200';
  document.getElementById('shopDescriptionInput').value = shop.shop_description || '';
}

function handleSaveShopSettings(e) {
  e.preventDefault();
  storeData = getLocalData();

  storeData.shop = {
    ...storeData.shop,
    shop_name: document.getElementById('shopNameInput').value.trim(),
    tagline: document.getElementById('shopTaglineInput').value.trim(),
    phone_display: document.getElementById('shopPhoneDisplayInput').value.trim(),
    whatsapp_number: document.getElementById('shopWhatsappInput').value.trim(),
    address_line1: document.getElementById('shopAddress1Input').value.trim(),
    address_line2: document.getElementById('shopAddress2Input').value.trim(),
    city: document.getElementById('shopCityInput').value.trim(),
    pincode: document.getElementById('shopPincodeInput').value.trim(),
    timings: document.getElementById('shopTimingsInput').value.trim(),
    gmaps_url: document.getElementById('shopGmapsInput').value.trim(),
    delivery_radius: document.getElementById('shopDeliveryRadiusInput').value.trim(),
    min_order_amount: document.getElementById('shopMinOrderInput').value.trim(),
    shop_description: document.getElementById('shopDescriptionInput').value.trim()
  };

  saveLocalData(storeData);
  showToast('Shop details saved and updated on public website!', 'success');

  if (isServerAvailable) {
    fetch(`${API_BASE}/admin/shop-settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(storeData.shop)
    }).catch(() => {});
  }
}

// ==============================================================================
// 9. WEBSITE HOMEPAGE MANAGEMENT
// ==============================================================================
function loadHomepageSettings() {
  storeData = getLocalData();
  const hp = storeData.homepage || DEFAULT_DATA.homepage;

  document.getElementById('heroHeadlineInput').value = hp.hero_headline || '';
  document.getElementById('heroSubtitleInput').value = hp.hero_subtitle || '';
  document.getElementById('heroImageInput').value = hp.hero_image_url || '';
  document.getElementById('trustIndicatorInput').value = hp.trust_indicator || '';
  document.getElementById('announcementTextInput').value = hp.announcement_text || '';
  document.getElementById('announcementActiveInput').checked = hp.announcement_active !== '0';

  updateLiveHomepagePreview();
}

function updateLiveHomepagePreview() {
  const h1 = document.getElementById('heroHeadlineInput')?.value || 'Your Neighbourhood Grocery Store in Tiruppur';
  const sub = document.getElementById('heroSubtitleInput')?.value || '';
  const img = document.getElementById('heroImageInput')?.value || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&q=80';
  const trust = document.getElementById('trustIndicatorInput')?.value || 'Serving Your Neighbourhood in Tiruppur';

  const previewH1 = document.getElementById('previewHeroHeading');
  const previewSub = document.getElementById('previewHeroSubtitle');
  const previewImg = document.getElementById('previewHeroImage');
  const previewTrust = document.getElementById('previewHeroTrust');

  if (previewH1) previewH1.textContent = h1;
  if (previewSub) previewSub.textContent = sub;
  if (previewImg) previewImg.src = img;
  if (previewTrust) previewTrust.textContent = trust;
}

function handleSaveHomepageSettings(e) {
  e.preventDefault();
  storeData = getLocalData();

  storeData.homepage = {
    ...storeData.homepage,
    hero_headline: document.getElementById('heroHeadlineInput').value.trim(),
    hero_subtitle: document.getElementById('heroSubtitleInput').value.trim(),
    hero_image_url: document.getElementById('heroImageInput').value.trim(),
    trust_indicator: document.getElementById('trustIndicatorInput').value.trim(),
    announcement_text: document.getElementById('announcementTextInput').value.trim(),
    announcement_active: document.getElementById('announcementActiveInput').checked ? '1' : '0'
  };

  saveLocalData(storeData);
  showToast('Homepage content saved and live on website!', 'success');

  if (isServerAvailable) {
    fetch(`${API_BASE}/admin/homepage`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(storeData.homepage)
    }).catch(() => {});
  }
}

// ==============================================================================
// 10. ORDERS & WHATSAPP MANAGEMENT
// ==============================================================================
function loadOrders() {
  storeData = getLocalData();
  allOrders = storeData.orders || [];

  const tbody = document.getElementById('ordersTableBody');
  if (!tbody) return;

  if (allOrders.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding: 24px; color:#94a3b8;">No customer orders placed yet.</td></tr>';
    return;
  }

  tbody.innerHTML = allOrders.map(o => {
    const itemsSummary = Array.isArray(o.items)
      ? o.items.map(it => `${it.qty || 1}x ${it.name}`).join(', ')
      : 'Items list';

    return `
      <tr>
        <td><strong>#${o.id}</strong></td>
        <td>
          <strong>${escapeHtml(o.customer_name)}</strong>
          <div style="font-size:0.75rem; color:#64748b;">${escapeHtml(o.customer_phone)}</div>
        </td>
        <td>
          <div style="max-width:240px; font-size:0.82rem; color:#334155; line-height:1.4;">
            ${escapeHtml(itemsSummary)}
          </div>
        </td>
        <td><span style="font-weight:800; color:#0f172a;">₹${o.total_amount}</span></td>
        <td>
          <select class="form-control" style="padding:4px 8px; font-size:0.8rem; width:130px;" onchange="updateOrderStatus(${o.id}, this.value)">
            <option value="pending" ${o.status === 'pending' ? 'selected' : ''}>⏳ Pending</option>
            <option value="confirmed" ${o.status === 'confirmed' ? 'selected' : ''}>✅ Confirmed</option>
            <option value="out_for_delivery" ${o.status === 'out_for_delivery' ? 'selected' : ''}>🚚 Out for Delivery</option>
            <option value="delivered" ${o.status === 'delivered' ? 'selected' : ''}>🎉 Delivered</option>
            <option value="cancelled" ${o.status === 'cancelled' ? 'selected' : ''}>❌ Cancelled</option>
          </select>
        </td>
        <td>
          <span style="font-size:0.78rem; color:#64748b;">${new Date(o.created_at).toLocaleDateString()}</span>
        </td>
        <td>
          <button class="btn btn-sm btn-primary" onclick="openCustomerWhatsApp('${escapeJsString(o.customer_phone)}', '${escapeJsString(o.customer_name)}', ${o.id})">
            📲 WhatsApp Customer
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

function updateOrderStatus(orderId, newStatus) {
  storeData = getLocalData();
  const ord = (storeData.orders || []).find(o => String(o.id) === String(orderId));
  if (ord) {
    ord.status = newStatus;
    saveLocalData(storeData);
    showToast(`Order #${orderId} marked as ${newStatus}.`, 'success');
  }
}

function openCustomerWhatsApp(rawPhone, name, orderId) {
  let phone = rawPhone.replace(/\D/g, '');
  if (!phone.startsWith('91') && phone.length === 10) {
    phone = '91' + phone;
  }
  const msg = encodeURIComponent(`Hello ${name}, this is Sri Murugan Daily Fresh regarding your Order #${orderId}. We are packing your items for delivery!`);
  window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
}

// ==============================================================================
// 11. IMAGE UPLOAD HELPER (Client Base64 / LocalStorage + Server)
// ==============================================================================
function handleFileUpload(fileInput, targetUrlInputId, previewImgId) {
  const file = fileInput.files[0];
  if (!file) return;

  const validFormats = ['image/jpeg', 'image/png', 'image/webp'];
  if (!validFormats.includes(file.type)) {
    showToast('Only JPG, PNG and WebP images are allowed.', 'error');
    return;
  }

  if (file.size > 5 * 1024 * 1024) {
    showToast('Image size exceeds 5MB limit.', 'error');
    return;
  }

  showToast('Processing image...', 'info');

  const reader = new FileReader();
  reader.onload = function(e) {
    const dataUrl = e.target.result;
    const urlInput = document.getElementById(targetUrlInputId);
    if (urlInput) urlInput.value = dataUrl;

    const preview = document.getElementById(previewImgId);
    if (preview) {
      preview.src = dataUrl;
      preview.style.display = 'block';
    }
    showToast('Image ready and previewed!', 'success');
  };
  reader.readAsDataURL(file);
}

// ==============================================================================
// 12. MODAL & CONFIRMATION DIALOG UTILS
// ==============================================================================
function openModal(modalId) {
  const el = document.getElementById(modalId);
  if (el) el.classList.add('is-open');
}

function closeModal(modalId) {
  const el = document.getElementById(modalId);
  if (el) el.classList.remove('is-open');
}

let confirmActionCallback = null;
function showConfirm(title, messageHtml, onConfirm) {
  document.getElementById('confirmModalTitle').textContent = title;
  document.getElementById('confirmModalMessage').innerHTML = messageHtml;
  confirmActionCallback = onConfirm;
  openModal('confirmModal');
}

document.getElementById('confirmModalConfirmBtn')?.addEventListener('click', () => {
  if (typeof confirmActionCallback === 'function') {
    confirmActionCallback();
  }
  closeModal('confirmModal');
});

function showToast(message, type = 'success') {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️';
  toast.innerHTML = `<span>${icon}</span><span>${escapeHtml(message)}</span>`;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.25s ease';
    setTimeout(() => toast.remove(), 250);
  }, 3500);
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function escapeJsString(str) {
  if (!str) return '';
  return String(str).replace(/'/g, "\\'").replace(/"/g, '\\"');
}
