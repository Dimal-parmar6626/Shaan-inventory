
document.addEventListener('DOMContentLoaded', async () => {
  try {
    await AuthGuard.requireEmployee();
  } catch (error) {
    console.error('Access denied:', error);
    return;
  }
  
  console.log('Employee inventory loaded');
  
  await loadInventory();
  setupEventListeners();
  setupSidebar();
  setupLogout();
});

async function loadInventory(searchTerm = '') {
  const db = firebase.firestore();
  const tbody = document.getElementById('inventoryTable');
  
  if (!tbody) {
    console.warn('inventoryTable element not found');
    return;
  }
  
  try {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center">Loading inventory...</td></tr>';
    
    const snapshot = await db.collection('products').get();
    
    let products = [];
    snapshot.forEach(doc => {
      products.push({ id: doc.id, ...doc.data() });
    });
    
    products.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      products = products.filter(product =>
        (product.name || '').toLowerCase().includes(searchLower) ||
        (product.sku || '').toLowerCase().includes(searchLower)
      );
    }
    
    console.log('Products loaded:', products.length);
    
    updateSummary(products);
    
    if (products.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center">No products found</td></tr>';
      return;
    }
    
    tbody.innerHTML = '';
    
    products.forEach(product => {
      const status = Formatters.getStockStatus(product.currentStock, product.minimumStock);
      
      const row = document.createElement('tr');
      row.innerHTML = `
                <td><strong>${product.name}</strong></td>
                <td>${product.sku || '-'}</td>
                <td>${product.category || '-'}</td>
                <td>${Formatters.formatNumber(product.currentStock)}</td>
                <td>${product.unit || 'pcs'}</td>
                <td><span class="badge badge-${status.badge}">${status.label}</span></td>
            `;
      
      tbody.appendChild(row);
    });
    
  } catch (error) {
    console.error('Error loading inventory:', error);
    tbody.innerHTML = `<tr><td colspan="6" class="text-center text-danger">Error: ${error.message}</td></tr>`;
  }
}

function updateSummary(products) {
  const totalProductsEl = document.getElementById('totalProducts');
  const totalStockEl = document.getElementById('totalStock');
  const lowStockCountEl = document.getElementById('lowStockCount');
  
  if (!totalProductsEl && !totalStockEl && !lowStockCountEl) {
    return;
  }
  
  let totalStock = 0;
  let lowStockCount = 0;
  
  products.forEach(product => {
    totalStock += product.currentStock || 0;
    
    if (product.currentStock <= product.minimumStock) {
      lowStockCount++;
    }
  });
  
  if (totalProductsEl) totalProductsEl.textContent = Formatters.formatNumber(products.length);
  if (totalStockEl) totalStockEl.textContent = Formatters.formatNumber(totalStock);
  if (lowStockCountEl) lowStockCountEl.textContent = Formatters.formatNumber(lowStockCount);
}

function setupEventListeners() {
  const searchBtn = document.getElementById('searchBtn');
  const searchInput = document.getElementById('searchInput');
  
  if (searchBtn) {
    searchBtn.addEventListener('click', () => {
      const searchTerm = searchInput ? searchInput.value.trim() : '';
      loadInventory(searchTerm);
    });
  }
  
  if (searchInput) {
    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        const searchTerm = searchInput.value.trim();
        loadInventory(searchTerm);
      }
    });
  }
}

function setupSidebar() {
  const menuBtn = document.getElementById('menuBtn');
  const sidebar = document.getElementById('sidebar');
  
  if (menuBtn && sidebar) {
    menuBtn.addEventListener('click', () => {
      sidebar.classList.toggle('open');
    });
    
    document.addEventListener('click', (e) => {
      if (window.innerWidth <= 768) {
        if (!sidebar.contains(e.target) && e.target !== menuBtn) {
          sidebar.classList.remove('open');
        }
      }
    });
  }
}

function setupLogout() {
  const logoutBtn = document.getElementById('logoutBtn');
  const userAvatar = document.getElementById('userAvatar');
  const userName = document.getElementById('userName');
  
  if (window.currentUser) {
    if (userName) userName.textContent = window.currentUser.name;
    if (userAvatar) userAvatar.textContent = window.currentUser.name.charAt(0).toUpperCase();
  }
  
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      
      Utils.showConfirm('Are you sure you want to logout?', async () => {
        try {
          await authService.signOut();
        } catch (error) {
          console.error('Logout error:', error);
          Utils.showToast('Error logging out', 'error');
        }
      });
    });
  }
}