/**
 * ADMIN DASHBOARD JAVASCRIPT CONTROLLER
 * Sri Murugan Daily Fresh Grocery Store - Tiruppur
 */

const API_BASE = '/api';
let authToken = localStorage.getItem('grocery_admin_token');
let currentAdmin = null;

// Global State
let allProducts = [];
let allCategories = [];
let allOffers = [];
let shopSettings = {};
let homepageSettings = {};
let allOrders = [];

// ==============================================================================
// 1. INITIALIZATION & AUTH CHECK
// ==============================================================================
document.addEventListener('DOMContentLoaded', async () => {
  if (!authToken) {
    window.location.href = '/admin/login.html';
    return;
  }

  // Verify token
  try {
    const res = await apiFetch('/auth/me');
    if (!res.success) {
      logout();
      return;
    }
    currentAdmin = res.admin;
    document.getElementById('adminUserNameDisplay').textContent = currentAdmin.username || 'Admin';
    document.getElementById('adminUserEmailDisplay').textContent = currentAdmin.email || '';
    document.getElementById('adminAvatarInitial').textContent = (currentAdmin.username || 'A')[0].toUpperCase();
  } catch (err) {
    logout();
    return;
  }

  // Load initial view
  initNavigation();
  loadOverviewData();
});

// Wrapper for Authenticated API requests
async function apiFetch(endpoint, options = {}) {
  const headers = options.headers || {};
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }
  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });

  if (response.status === 401) {
    logout();
    throw new Error('Unauthorized');
  }

  return response.json();
}

function logout() {
  if (authToken) {
    fetch(`${API_BASE}/auth/logout`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${authToken}` }
    }).catch(() => {});
  }
  localStorage.removeItem('grocery_admin_token');
  localStorage.removeItem('grocery_admin_user');
  window.location.href = '/admin/login.html';
}

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

  // Mobile drawer toggle
  const toggleBtn = document.getElementById('sidebarToggleBtn');
  const sidebar = document.getElementById('adminSidebar');
  if (toggleBtn && sidebar) {
    toggleBtn.addEventListener('click', () => {
      sidebar.classList.toggle('is-open');
    });
  }
}

function switchView(viewName) {
  // Update nav buttons
  document.querySelectorAll('.nav-item-btn[data-view]').forEach(btn => {
    if (btn.getAttribute('data-view') === viewName) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  // Update view containers
  document.querySelectorAll('.view-section').forEach(sec => {
    sec.classList.remove('is-active');
  });

  const activeSec = document.getElementById(`view-${viewName}`);
  if (activeSec) {
    activeSec.classList.add('is-active');
  }

  // Update Page Title
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
  document.getElementById('currentPageTitle').textContent = titles[viewName] || 'Dashboard';

  // Close mobile sidebar if open
  const sidebar = document.getElementById('adminSidebar');
  if (sidebar) sidebar.classList.remove('is-open');

  // Trigger data loader for the view
  if (viewName === 'overview') loadOverviewData();
  else if (viewName === 'products') loadProducts();
  else if (viewName === 'bulk-prices') loadBulkPriceTable();
  else if (viewName === 'categories') loadCategories();
  else if (viewName === 'offers') loadOffers();
  else if (viewName === 'shop-info') loadShopSettings();
  else if (viewName === 'homepage') loadHomepageSettings();
  else if (viewName === 'orders') loadOrders();
}

// ==============================================================================
// 3. OVERVIEW VIEW
// ==============================================================================
async function loadOverviewData() {
  try {
    const data = await apiFetch('/admin/overview');
    if (!data.success) return;

    const s = data.stats;
    document.getElementById('statTotalProducts').textContent = s.totalProducts || 0;
    document.getElementById('statActiveProducts').textContent = s.activeProducts || 0;
    document.getElementById('statOutOfStock').textContent = s.outOfStock || 0;
    document.getElementById('statCategories').textContent = s.totalCategories || 0;
    document.getElementById('statActiveOffers').textContent = s.activeOffers || 0;
    document.getElementById('statTotalOrders').textContent = s.totalOrders || 0;

    // Render Recent Products table
    const tbody = document.getElementById('recentProductsTableBody');
    if (tbody && data.recentProducts) {
      if (data.recentProducts.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 20px; color: #94a3b8;">No products found.</td></tr>';
      } else {
        tbody.innerHTML = data.recentProducts.map(p => `
          <tr>
            <td><strong>${escapeHtml(p.name)}</strong></td>
            <td>${escapeHtml(p.category_name || 'Uncategorized')}</td>
            <td>₹${p.offer_price ? `<span style="text-decoration:line-through; color:#94a3b8; font-size:0.8rem;">₹${p.price}</span> ₹${p.offer_price}` : p.price} <span style="font-size:0.75rem; color:#64748b;">/${escapeHtml(p.unit)}</span></td>
            <td>
              ${p.is_available ? '<span class="status-pill success">In Stock</span>' : '<span class="status-pill danger">Out of Stock</span>'}
            </td>
            <td>
              <button class="btn btn-sm btn-secondary" onclick="editProductById(${p.id})">Edit</button>
            </td>
          </tr>
        `).join('');
      }
    }
  } catch (err) {
    showToast('Failed to load overview data.', 'error');
  }
}

// ==============================================================================
// 4. PRODUCT MANAGEMENT VIEW
// ==============================================================================
async function loadProducts() {
  const search = document.getElementById('prodSearchInput')?.value || '';
  const cat = document.getElementById('prodCategoryFilter')?.value || '';
  const status = document.getElementById('prodStatusFilter')?.value || '';
  const sort = document.getElementById('prodSortSelect')?.value || '';

  const params = new URLSearchParams();
  if (search) params.append('search', search);
  if (cat) params.append('category_id', cat);
  if (status) params.append('status', status);
  if (sort) params.append('sort', sort);

  try {
    // Also refresh categories for the filter dropdown
    await populateCategoryDropdowns();

    const data = await apiFetch(`/admin/products?${params.toString()}`);
    if (!data.success) return;

    allProducts = data.products || [];
    renderProductsTable(allProducts);
  } catch (err) {
    showToast('Failed to load products.', 'error');
  }
}

function renderProductsTable(products) {
  const tbody = document.getElementById('productsTableBody');
  if (!tbody) return;

  if (products.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding: 30px; color:#94a3b8;">No products match your search or filter.</td></tr>';
    return;
  }

  tbody.innerHTML = products.map(p => `
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
      <td><span style="font-size:0.85rem; color:#334155; font-weight:600;">${escapeHtml(p.category_name || 'Uncategorized')}</span></td>
      <td>
        <div style="font-weight:700; color:#0f172a;">
          ${p.offer_price ? `₹${p.offer_price} <span style="text-decoration:line-through; color:#94a3b8; font-size:0.75rem;">₹${p.price}</span>` : `₹${p.price}`}
        </div>
        <div style="font-size:0.75rem; color:#64748b;">per ${escapeHtml(p.unit)}</div>
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
  `).join('');
}

async function populateCategoryDropdowns() {
  if (allCategories.length === 0) {
    const res = await apiFetch('/admin/categories');
    if (res.success) allCategories = res.categories || [];
  }

  // Populate Filter Dropdown
  const filterSelect = document.getElementById('prodCategoryFilter');
  if (filterSelect) {
    const currentVal = filterSelect.value;
    filterSelect.innerHTML = '<option value="">All Categories</option>' +
      allCategories.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('');
    filterSelect.value = currentVal;
  }

  // Populate Modal Dropdown
  const modalSelect = document.getElementById('modalProdCategory');
  if (modalSelect) {
    modalSelect.innerHTML = '<option value="">Select a Category</option>' +
      allCategories.map(c => `<option value="${c.id}">${c.icon || '📦'} ${escapeHtml(c.name)}</option>`).join('');
  }
}

// Open Add/Edit Product Modal
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
  const p = allProducts.find(item => item.id == id);
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

async function saveProductForm(e) {
  e.preventDefault();
  const id = document.getElementById('modalProductId').value;
  const payload = {
    name: document.getElementById('modalProdName').value.trim(),
    tamil_name: document.getElementById('modalProdTamilName').value.trim(),
    category_id: document.getElementById('modalProdCategory').value || null,
    price: document.getElementById('modalProdPrice').value,
    offer_price: document.getElementById('modalProdOfferPrice').value || null,
    unit: document.getElementById('modalProdUnit').value.trim(),
    image_url: document.getElementById('modalProdImage').value.trim(),
    description: document.getElementById('modalProdDescription').value.trim(),
    badge_text: document.getElementById('modalProdBadge').value.trim(),
    is_available: document.getElementById('modalProdAvailable').checked,
    is_published: document.getElementById('modalProdPublished').checked,
    is_featured: document.getElementById('modalProdFeatured').checked
  };

  const isEdit = !!id;
  const endpoint = isEdit ? `/admin/products/${id}` : '/admin/products';
  const method = isEdit ? 'PUT' : 'POST';

  try {
    const res = await apiFetch(endpoint, {
      method,
      body: JSON.stringify(payload)
    });

    if (res.success) {
      showToast(isEdit ? 'Product updated successfully!' : 'Product added successfully!', 'success');
      closeModal('productModal');
      loadProducts();
    } else {
      showToast(res.error || 'Failed to save product.', 'error');
    }
  } catch (err) {
    showToast('Server error while saving product.', 'error');
  }
}

function confirmDeleteProduct(id, name) {
  showConfirm(
    'Delete Product',
    `Are you sure you want to delete <strong>${escapeHtml(name)}</strong>? This will permanently remove it from the store.`,
    async () => {
      try {
        const res = await apiFetch(`/admin/products/${id}`, { method: 'DELETE' });
        if (res.success) {
          showToast('Product deleted.', 'info');
          loadProducts();
        } else {
          showToast(res.error || 'Failed to delete product.', 'error');
        }
      } catch (err) {
        showToast('Error deleting product.', 'error');
      }
    }
  );
}

// ==============================================================================
// 5. BULK PRICE UPDATE (Section 4)
// ==============================================================================
let bulkOriginalPrices = {};

async function loadBulkPriceTable() {
  try {
    const data = await apiFetch('/admin/products');
    if (!data.success) return;

    allProducts = data.products || [];
    bulkOriginalPrices = {};
    allProducts.forEach(p => {
      bulkOriginalPrices[p.id] = {
        price: Number(p.price),
        offer_price: p.offer_price ? Number(p.offer_price) : null
      };
    });

    renderBulkPriceTable(allProducts);
  } catch (err) {
    showToast('Failed to load products for bulk editing.', 'error');
  }
}

function renderBulkPriceTable(products) {
  const tbody = document.getElementById('bulkPriceTableBody');
  if (!tbody) return;

  tbody.innerHTML = products.map(p => `
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
        <div style="font-size:0.74rem; color:#64748b;">${escapeHtml(p.category_name || '')}</div>
      </td>
      <td><span style="font-size:0.82rem; font-weight:600;">per ${escapeHtml(p.unit)}</span></td>
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
    const p = allProducts.find(item => item.id == id);
    const regInp = r.querySelector('.bulk-reg-price');
    const offerInp = r.querySelector('.bulk-offer-price');

    const newReg = parseFloat(regInp.value);
    const newOffer = offerInp.value.trim() !== '' ? parseFloat(offerInp.value) : null;
    const orig = bulkOriginalPrices[id];

    if (newReg !== orig.price || newOffer !== orig.offer_price) {
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
    async () => {
      try {
        const res = await apiFetch('/admin/products/bulk-prices', {
          method: 'POST',
          body: JSON.stringify({ updates })
        });

        if (res.success) {
          showToast(res.message || 'Prices published live!', 'success');
          loadBulkPriceTable();
        } else {
          showToast(res.error || 'Failed to update prices.', 'error');
        }
      } catch (err) {
        showToast('Server error while saving prices.', 'error');
      }
    }
  );
}

// ==============================================================================
// 6. CATEGORY MANAGEMENT (Section 6)
// ==============================================================================
async function loadCategories() {
  try {
    const res = await apiFetch('/admin/categories');
    if (!res.success) return;

    allCategories = res.categories || [];
    renderCategoriesTable(allCategories);
  } catch (err) {
    showToast('Failed to load categories.', 'error');
  }
}

function renderCategoriesTable(categories) {
  const tbody = document.getElementById('categoriesTableBody');
  if (!tbody) return;

  tbody.innerHTML = categories.map(c => `
    <tr>
      <td style="font-size:1.4rem;">${c.icon || '📦'}</td>
      <td>
        <strong>${escapeHtml(c.name)}</strong>
        ${c.tamil_name ? `<div style="font-size:0.75rem; color:#64748b;">${escapeHtml(c.tamil_name)}</div>` : ''}
      </td>
      <td><span style="font-weight:700; color:#0f172a;">${c.product_count || 0} items</span></td>
      <td><span style="font-size:0.85rem; color:#64748b;">${c.display_order || 0}</span></td>
      <td>
        ${c.is_active ? '<span class="status-pill success">Active</span>' : '<span class="status-pill neutral">Disabled</span>'}
      </td>
      <td>
        <div style="display:flex; gap:6px;">
          <button class="action-icon-btn" onclick="editCategoryById(${c.id})" title="Edit Category">✏️</button>
          <button class="action-icon-btn danger" onclick="confirmDeleteCategory(${c.id}, '${escapeJsString(c.name)}', ${c.product_count || 0})" title="Delete Category">🗑️</button>
        </div>
      </td>
    </tr>
  `).join('');
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
  const c = allCategories.find(item => item.id == id);
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

async function saveCategoryForm(e) {
  e.preventDefault();
  const id = document.getElementById('modalCatId').value;
  const payload = {
    name: document.getElementById('modalCatName').value.trim(),
    tamil_name: document.getElementById('modalCatTamil').value.trim(),
    icon: document.getElementById('modalCatIcon').value.trim(),
    display_order: parseInt(document.getElementById('modalCatOrder').value) || 0,
    is_active: document.getElementById('modalCatActive').checked
  };

  const isEdit = !!id;
  const endpoint = isEdit ? `/admin/categories/${id}` : '/admin/categories';
  const method = isEdit ? 'PUT' : 'POST';

  try {
    const res = await apiFetch(endpoint, {
      method,
      body: JSON.stringify(payload)
    });

    if (res.success) {
      showToast(isEdit ? 'Category updated!' : 'Category created!', 'success');
      closeModal('categoryModal');
      loadCategories();
    } else {
      showToast(res.error || 'Failed to save category.', 'error');
    }
  } catch (err) {
    showToast('Server error while saving category.', 'error');
  }
}

function confirmDeleteCategory(id, name, productCount) {
  if (productCount > 0) {
    showToast(`Cannot delete "${name}". It has ${productCount} assigned products. Reassign them first.`, 'error');
    return;
  }

  showConfirm(
    'Delete Category',
    `Are you sure you want to delete category <strong>${escapeHtml(name)}</strong>?`,
    async () => {
      try {
        const res = await apiFetch(`/admin/categories/${id}`, { method: 'DELETE' });
        if (res.success) {
          showToast('Category deleted.', 'info');
          loadCategories();
        } else {
          showToast(res.error || 'Failed to delete category.', 'error');
        }
      } catch (err) {
        showToast('Error deleting category.', 'error');
      }
    }
  );
}

// ==============================================================================
// 7. OFFERS & PROMOTIONS (Section 7)
// ==============================================================================
async function loadOffers() {
  try {
    const res = await apiFetch('/admin/offers');
    if (!res.success) return;

    allOffers = res.offers || [];
    renderOffersTable(allOffers);
  } catch (err) {
    showToast('Failed to load offers.', 'error');
  }
}

function renderOffersTable(offers) {
  const tbody = document.getElementById('offersTableBody');
  if (!tbody) return;

  if (offers.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 24px; color:#94a3b8;">No offers created yet.</td></tr>';
    return;
  }

  tbody.innerHTML = offers.map(o => `
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
  document.getElementById('modalOfferCode').value = '';
  document.getElementById('modalOfferBanner').value = '';
  document.getElementById('modalOfferStart').value = '';
  document.getElementById('modalOfferEnd').value = '';
  document.getElementById('modalOfferActive').checked = true;

  openModal('offerModal');
}

function editOfferById(id) {
  const o = allOffers.find(item => item.id == id);
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

async function saveOfferForm(e) {
  e.preventDefault();
  const id = document.getElementById('modalOfferId').value;
  const payload = {
    title: document.getElementById('modalOfferTitle').value.trim(),
    description: document.getElementById('modalOfferDesc').value.trim(),
    discount_tag: document.getElementById('modalOfferTag').value.trim(),
    code: document.getElementById('modalOfferCode').value.trim(),
    banner_url: document.getElementById('modalOfferBanner').value.trim(),
    start_date: document.getElementById('modalOfferStart').value,
    end_date: document.getElementById('modalOfferEnd').value,
    is_active: document.getElementById('modalOfferActive').checked
  };

  const isEdit = !!id;
  const endpoint = isEdit ? `/admin/offers/${id}` : '/admin/offers';
  const method = isEdit ? 'PUT' : 'POST';

  try {
    const res = await apiFetch(endpoint, {
      method,
      body: JSON.stringify(payload)
    });

    if (res.success) {
      showToast(isEdit ? 'Offer updated!' : 'Offer published!', 'success');
      closeModal('offerModal');
      loadOffers();
    } else {
      showToast(res.error || 'Failed to save offer.', 'error');
    }
  } catch (err) {
    showToast('Server error while saving offer.', 'error');
  }
}

function confirmDeleteOffer(id, title) {
  showConfirm(
    'Delete Offer',
    `Delete offer <strong>${escapeHtml(title)}</strong>?`,
    async () => {
      try {
        const res = await apiFetch(`/admin/offers/${id}`, { method: 'DELETE' });
        if (res.success) {
          showToast('Offer deleted.', 'info');
          loadOffers();
        }
      } catch (err) {
        showToast('Failed to delete offer.', 'error');
      }
    }
  );
}

// ==============================================================================
// 8. SHOP INFORMATION SETTINGS (Section 8)
// ==============================================================================
async function loadShopSettings() {
  try {
    const res = await apiFetch('/admin/shop-settings');
    if (!res.success) return;

    shopSettings = res.settings || {};
    document.getElementById('shopNameInput').value = shopSettings.shop_name || '';
    document.getElementById('shopTaglineInput').value = shopSettings.tagline || '';
    document.getElementById('shopPhoneDisplayInput').value = shopSettings.phone_display || '';
    document.getElementById('shopWhatsappInput').value = shopSettings.whatsapp_number || '';
    document.getElementById('shopAddress1Input').value = shopSettings.address_line1 || '';
    document.getElementById('shopAddress2Input').value = shopSettings.address_line2 || '';
    document.getElementById('shopCityInput').value = shopSettings.city || 'Tiruppur';
    document.getElementById('shopPincodeInput').value = shopSettings.pincode || '641601';
    document.getElementById('shopTimingsInput').value = shopSettings.timings || '';
    document.getElementById('shopGmapsInput').value = shopSettings.gmaps_url || '';
    document.getElementById('shopDeliveryRadiusInput').value = shopSettings.delivery_radius || '';
    document.getElementById('shopMinOrderInput').value = shopSettings.min_order_amount || '200';
    document.getElementById('shopDescriptionInput').value = shopSettings.shop_description || '';
  } catch (err) {
    showToast('Failed to load shop settings.', 'error');
  }
}

async function handleSaveShopSettings(e) {
  e.preventDefault();
  const updates = {
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

  try {
    const res = await apiFetch('/admin/shop-settings', {
      method: 'PUT',
      body: JSON.stringify(updates)
    });

    if (res.success) {
      showToast('Shop details saved & updated on public website!', 'success');
    } else {
      showToast(res.error || 'Failed to update shop details.', 'error');
    }
  } catch (err) {
    showToast('Server error while updating shop settings.', 'error');
  }
}

// ==============================================================================
// 9. WEBSITE HOMEPAGE MANAGEMENT (Section 9)
// ==============================================================================
async function loadHomepageSettings() {
  try {
    const res = await apiFetch('/admin/homepage');
    if (!res.success) return;

    homepageSettings = res.settings || {};
    document.getElementById('heroHeadlineInput').value = homepageSettings.hero_headline || '';
    document.getElementById('heroSubtitleInput').value = homepageSettings.hero_subtitle || '';
    document.getElementById('heroImageInput').value = homepageSettings.hero_image_url || '';
    document.getElementById('trustIndicatorInput').value = homepageSettings.trust_indicator || '';
    document.getElementById('announcementTextInput').value = homepageSettings.announcement_text || '';
    document.getElementById('announcementActiveInput').checked = homepageSettings.announcement_active !== '0';

    updateLiveHomepagePreview();
  } catch (err) {
    showToast('Failed to load homepage settings.', 'error');
  }
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

async function handleSaveHomepageSettings(e) {
  e.preventDefault();
  const updates = {
    hero_headline: document.getElementById('heroHeadlineInput').value.trim(),
    hero_subtitle: document.getElementById('heroSubtitleInput').value.trim(),
    hero_image_url: document.getElementById('heroImageInput').value.trim(),
    trust_indicator: document.getElementById('trustIndicatorInput').value.trim(),
    announcement_text: document.getElementById('announcementTextInput').value.trim(),
    announcement_active: document.getElementById('announcementActiveInput').checked ? '1' : '0'
  };

  try {
    const res = await apiFetch('/admin/homepage', {
      method: 'PUT',
      body: JSON.stringify(updates)
    });

    if (res.success) {
      showToast('Homepage content saved and live on website!', 'success');
    } else {
      showToast(res.error || 'Failed to save homepage settings.', 'error');
    }
  } catch (err) {
    showToast('Server error while saving homepage settings.', 'error');
  }
}

// ==============================================================================
// 10. ORDERS & WHATSAPP MANAGEMENT (Section 10)
// ==============================================================================
async function loadOrders() {
  try {
    const res = await apiFetch('/admin/orders');
    if (!res.success) return;

    allOrders = res.orders || [];
    renderOrdersTable(allOrders);
  } catch (err) {
    showToast('Failed to load orders.', 'error');
  }
}

function renderOrdersTable(orders) {
  const tbody = document.getElementById('ordersTableBody');
  if (!tbody) return;

  if (orders.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding: 24px; color:#94a3b8;">No customer orders placed yet.</td></tr>';
    return;
  }

  tbody.innerHTML = orders.map(o => {
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

async function updateOrderStatus(orderId, newStatus) {
  try {
    const res = await apiFetch(`/admin/orders/${orderId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status: newStatus })
    });
    if (res.success) {
      showToast(res.message || 'Order status updated!', 'success');
    }
  } catch (err) {
    showToast('Failed to update order status.', 'error');
  }
}

function openCustomerWhatsApp(rawPhone, name, orderId) {
  // Clean phone number
  let phone = rawPhone.replace(/\D/g, '');
  if (!phone.startsWith('91') && phone.length === 10) {
    phone = '91' + phone;
  }

  const msg = encodeURIComponent(`Hello ${name}, this is Sri Murugan Daily Fresh regarding your Order #${orderId}. We are packing your items for delivery!`);
  window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
}

// ==============================================================================
// 11. IMAGE UPLOAD HELPER (Section 5)
// ==============================================================================
async function handleFileUpload(fileInput, targetUrlInputId, previewImgId) {
  const file = fileInput.files[0];
  if (!file) return;

  // Validate format
  const validFormats = ['image/jpeg', 'image/png', 'image/webp'];
  if (!validFormats.includes(file.type)) {
    showToast('Only JPG, PNG and WebP images are allowed.', 'error');
    return;
  }

  // Validate size (5MB)
  if (file.size > 5 * 1024 * 1024) {
    showToast('Image size exceeds 5MB limit.', 'error');
    return;
  }

  const formData = new FormData();
  formData.append('image', file);

  showToast('Uploading image...', 'info');

  try {
    const res = await apiFetch('/admin/upload', {
      method: 'POST',
      body: formData
    });

    if (res.success && res.url) {
      const urlInput = document.getElementById(targetUrlInputId);
      if (urlInput) urlInput.value = res.url;

      const preview = document.getElementById(previewImgId);
      if (preview) {
        preview.src = res.url;
        preview.style.display = 'block';
      }

      showToast('Image uploaded successfully!', 'success');
    } else {
      showToast(res.error || 'Upload failed.', 'error');
    }
  } catch (err) {
    showToast('Error uploading image to server.', 'error');
  }
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

// Toast notification system
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

// String escaping utilities
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
