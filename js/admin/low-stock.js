
document.addEventListener('DOMContentLoaded', async () => {
  try {
    await AuthGuard.requireAdmin();
  } catch (error) {
    console.error('Access denied:', error);
    return;
  }
  
  await loadCategories();
  loadLowStockItems();
  setupEventListeners();
  setupSidebar();
  setupLogout();
});

async function loadCategories() {
  try {
    const categories = await firebaseService.getCategories();
    const categoryFilter = document.getElementById('categoryFilter');
    
    categories.forEach(category => {
      const option = document.createElement('option');
      option.value = category.name;
      option.textContent = category.name;
      categoryFilter.appendChild(option);
    });
  } catch (error) {
    console.error('Error loading categories:', error);
  }
}

async function loadLowStockItems(searchTerm = '', categoryFilter = '') {
  const db = firebase.firestore();
  const tbody = document.getElementById('lowStockTable');
  
  try {
    tbody.innerHTML = '<tr><td colspan="10" class="text-center">Loading...</td></tr>';
    
    let query = db.collection('products').orderBy('currentStock', 'asc');
    
    if (categoryFilter) {
      query = query.where('category', '==', categoryFilter);
    }
    
    const snapshot = await query.get();
    const lowStockItems = [];
    
    snapshot.forEach(doc => {
      const product = doc.data();
      if (product.currentStock <= product.minimumStock) {
        lowStockItems.push({ id: doc.id, ...product });
      }
    });
    
    let filteredItems = lowStockItems;
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filteredItems = lowStockItems.filter(item =>
        item.name.toLowerCase().includes(searchLower) ||
        item.sku.toLowerCase().includes(searchLower)
      );
    }
    
    if (filteredItems.length === 0) {
      tbody.innerHTML = '<tr><td colspan="10" class="text-center">No low stock items</td></tr>';
      updateSummary([]);
      return;
    }
    
    tbody.innerHTML = '';
    
    filteredItems.forEach(product => {
      const deficit = product.minimumStock - product.currentStock;
      const restockValue = deficit * product.purchasePrice;
      const status = Formatters.getStockStatus(product.currentStock, product.minimumStock);
      
      const row = document.createElement('tr');
      
      row.innerHTML = `
                <td><strong>${product.name}</strong></td>
                <td>${product.sku}</td>
                <td>${product.category}</td>
                <td>${Formatters.formatNumber(product.currentStock)}</td>
                <td>${Formatters.formatNumber(product.minimumStock)}</td>
                <td style="color: red;">-${Formatters.formatNumber(deficit)}</td>
                <td>${Formatters.formatINR(product.purchasePrice)}</td>
                <td>${Formatters.formatINR(restockValue)}</td>
                <td><span class="badge badge-${status.badge}">${status.label}</span></td>
                <td>
                    <button class="btn btn-sm btn-primary restock-btn" data-id="${product.id}">
                        Restock
                    </button>
                </td>
            `;
      
      tbody.appendChild(row);
    });
    
    updateSummary(filteredItems);
    
    document.querySelectorAll('.restock-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        window.location.href = `stock-in.html?product=${btn.dataset.id}`;
      });
    });
    
  } catch (error) {
    console.error('Error loading low stock:', error);
    tbody.innerHTML = '<tr><td colspan="10" class="text-center text-danger">Error loading data</td></tr>';
  }
}

function updateSummary(items) {
  let lowStockCount = 0;
  let outOfStockCount = 0;
  let totalRestockValue = 0;
  
  items.forEach(item => {
    lowStockCount++;
    
    if (item.currentStock === 0) {
      outOfStockCount++;
    }
    
    const deficit = item.minimumStock - item.currentStock;
    totalRestockValue += deficit * item.purchasePrice;
  });
  
  document.getElementById('lowStockCount').textContent = Formatters.formatNumber(lowStockCount);
  document.getElementById('outOfStockCount').textContent = Formatters.formatNumber(outOfStockCount);
  document.getElementById('restockValue').textContent = Formatters.formatINR(totalRestockValue);
}

function setupEventListeners() {
  document.getElementById('searchBtn').addEventListener('click', () => {
    const searchTerm = document.getElementById('searchInput').value.trim();
    const categoryFilter = document.getElementById('categoryFilter').value;
    loadLowStockItems(searchTerm, categoryFilter);
  });
  
  document.getElementById('searchInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      const searchTerm = document.getElementById('searchInput').value.trim();
      const categoryFilter = document.getElementById('categoryFilter').value;
      loadLowStockItems(searchTerm, categoryFilter);
    }
  });
}

function setupSidebar() {
  const menuBtn = document.getElementById('menuBtn');
  const sidebar = document.getElementById('sidebar');
  
  menuBtn.addEventListener('click', () => {
    sidebar.classList.toggle('open');
  });
}

function setupLogout() {
  const logoutBtn = document.getElementById('logoutBtn');
  const userAvatar = document.getElementById('userAvatar');
  const userName = document.getElementById('userName');
  
  if (window.currentUser) {
    userName.textContent = window.currentUser.name;
    userAvatar.textContent = window.currentUser.name.charAt(0).toUpperCase();
  }
  
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