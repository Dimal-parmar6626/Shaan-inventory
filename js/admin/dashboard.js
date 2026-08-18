
document.addEventListener('DOMContentLoaded', async () => {
  try {
    await AuthGuard.requireAdmin();
  } catch (error) {
    console.error('Access denied:', error);
    return;
  }
  
  initializeDashboard();
  
  setupSidebar();
  
  setupLogout();
});

async function initializeDashboard() {
  try {
    Utils.showLoading();
    
    await Promise.all([
      loadDashboardStats(),
      loadRecentTransactions(),
      loadLowStockItems()
    ]);
    
    Utils.hideLoading();
  } catch (error) {
    console.error('Error loading dashboard:', error);
    Utils.hideLoading();
    Utils.showToast('Error loading dashboard data', 'error');
  }
}

async function loadDashboardStats() {
  const db = firebase.firestore();
  const today = Utils.getTodayRange();
  
  try {
    const productsSnapshot = await db.collection('products').get();
    const totalProducts = productsSnapshot.size;
    
    let totalStock = 0;
    let stockValue = 0;
    let lowStockCount = 0;
    
    productsSnapshot.forEach(doc => {
      const product = doc.data();
      totalStock += product.currentStock || 0;
      stockValue += (product.currentStock || 0) * (product.purchasePrice || 0);
      
      if (product.currentStock <= product.minimumStock) {
        lowStockCount++;
      }
    });
    
    const employeesSnapshot = await db.collection('users')
      .where('role', '==', 'employee')
      .get();
    const totalEmployees = employeesSnapshot.size;
    
    const transactionsSnapshot = await db.collection('stockTransactions')
      .where('createdAt', '>=', today.start)
      .where('createdAt', '<=', today.end)
      .get();
    
    let todayIn = 0;
    let todayOut = 0;
    
    transactionsSnapshot.forEach(doc => {
      const transaction = doc.data();
      if (transaction.type === 'IN') {
        todayIn += transaction.quantity;
      } else {
        todayOut += transaction.quantity;
      }
    });
    
    const elements = {
      totalProducts: document.getElementById('totalProducts'),
      totalStock: document.getElementById('totalStock'),
      stockValue: document.getElementById('stockValue'),
      todayIn: document.getElementById('todayIn'),
      todayOut: document.getElementById('todayOut'),
      lowStock: document.getElementById('lowStock'),
      totalEmployees: document.getElementById('totalEmployees'),
      todayTransactions: document.getElementById('todayTransactions')
    };
    
    if (elements.totalProducts) elements.totalProducts.textContent = Formatters.formatNumber(totalProducts);
    if (elements.totalStock) elements.totalStock.textContent = Formatters.formatNumber(totalStock);
    if (elements.stockValue) elements.stockValue.textContent = Formatters.formatINR(stockValue);
    if (elements.todayIn) elements.todayIn.textContent = Formatters.formatNumber(todayIn);
    if (elements.todayOut) elements.todayOut.textContent = Formatters.formatNumber(todayOut);
    if (elements.lowStock) elements.lowStock.textContent = Formatters.formatNumber(lowStockCount);
    if (elements.totalEmployees) elements.totalEmployees.textContent = Formatters.formatNumber(totalEmployees);
    if (elements.todayTransactions) elements.todayTransactions.textContent = Formatters.formatNumber(transactionsSnapshot.size);
    
  } catch (error) {
    console.error('Error loading dashboard stats:', error);
    throw error;
  }
}

async function loadRecentTransactions() {
  const db = firebase.firestore();
  const tbody = document.getElementById('recentTransactions');
  
  if (!tbody) {
    console.warn('recentTransactions element not found');
    return;
  }
  
  try {
    const snapshot = await db.collection('stockTransactions')
      .orderBy('createdAt', 'desc')
      .limit(10)
      .get();
    
    if (snapshot.empty) {
      tbody.innerHTML = '<tr><td colspan="5" class="text-center">No transactions found</td></tr>';
      return;
    }
    
    tbody.innerHTML = '';
    
    snapshot.forEach(doc => {
      const transaction = doc.data();
      const row = document.createElement('tr');
      
      row.innerHTML = `
                <td>${Formatters.formatDateTime(transaction.createdAt)}</td>
                <td>${transaction.productName}</td>
                <td>
                    <span class="badge ${transaction.type === 'IN' ? 'badge-success' : 'badge-danger'}">
                        ${transaction.type}
                    </span>
                </td>
                <td>${Formatters.formatNumber(transaction.quantity)}</td>
                <td>${transaction.userName}</td>
            `;
      
      tbody.appendChild(row);
    });
    
  } catch (error) {
    console.error('Error loading recent transactions:', error);
    if (tbody) {
      tbody.innerHTML = '<tr><td colspan="5" class="text-center text-danger">Error loading transactions</td></tr>';
    }
  }
}

async function loadLowStockItems() {
  const db = firebase.firestore();
  const tbody = document.getElementById('lowStockTable');
  const lowStockSection = document.getElementById('lowStockSection');
  
  if (!tbody || !lowStockSection) {
    console.warn('Low stock elements not found');
    return;
  }
  
  try {
    const snapshot = await db.collection('products')
      .orderBy('currentStock', 'asc')
      .limit(5)
      .get();
    
    const lowStockItems = [];
    
    snapshot.forEach(doc => {
      const product = doc.data();
      if (product.currentStock <= product.minimumStock) {
        lowStockItems.push({ id: doc.id, ...product });
      }
    });
    
    if (lowStockItems.length === 0) {
      lowStockSection.style.display = 'none';
      return;
    }
    
    lowStockSection.style.display = 'block';
    tbody.innerHTML = '';
    
    lowStockItems.forEach(product => {
      const row = document.createElement('tr');
      const status = Formatters.getStockStatus(product.currentStock, product.minimumStock);
      
      row.innerHTML = `
                <td>${product.name}</td>
                <td>${Formatters.formatNumber(product.currentStock)}</td>
                <td>${Formatters.formatNumber(product.minimumStock)}</td>
                <td><span class="badge badge-${status.badge}">${status.label}</span></td>
            `;
      
      tbody.appendChild(row);
    });
    
  } catch (error) {
    console.error('Error loading low stock items:', error);
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