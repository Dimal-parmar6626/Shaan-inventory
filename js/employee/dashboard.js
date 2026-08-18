
document.addEventListener('DOMContentLoaded', async () => {
  try {
    await AuthGuard.requireEmployee();
  } catch (error) {
    console.error('Access denied:', error);
    return;
  }
  
  console.log('Employee dashboard loaded');
  
  initializeDashboard();
  setupSidebar();
  setupLogout();
});

async function initializeDashboard() {
  try {
    Utils.showLoading();
    
    await Promise.all([
      loadDashboardStats(),
      loadMyRecentTransactions(),
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
  const userId = window.currentUser ? window.currentUser.id : null;
  
  if (!userId) {
    console.warn('User ID not found');
    return;
  }
  
  try {
    console.log('Loading dashboard stats...');
    
    const productsSnapshot = await db.collection('products').get();
    const totalProducts = productsSnapshot.size;
    
    let totalStock = 0;
    let lowStockCount = 0;
    
    productsSnapshot.forEach(doc => {
      const product = doc.data();
      totalStock += product.currentStock || 0;
      
      if (product.currentStock <= product.minimumStock) {
        lowStockCount++;
      }
    });
    
    const todayTransactions = await db.collection('stockTransactions')
      .where('createdAt', '>=', today.start)
      .get();
    
    let todayIn = 0;
    let todayOut = 0;
    let myTransactions = 0;
    
    todayTransactions.forEach(doc => {
      const transaction = doc.data();
      
      const transactionDate = transaction.createdAt ? transaction.createdAt.toDate() : null;
      if (transactionDate && transactionDate <= today.end) {
        if (transaction.type === 'IN') {
          todayIn += transaction.quantity;
        } else {
          todayOut += transaction.quantity;
        }
        
        if (transaction.userId === userId) {
          myTransactions++;
        }
      }
    });
    
    updateElement('todayIn', Formatters.formatNumber(todayIn));
    updateElement('todayOut', Formatters.formatNumber(todayOut));
    updateElement('totalProducts', Formatters.formatNumber(totalProducts));
    updateElement('lowStockItems', Formatters.formatNumber(lowStockCount));
    updateElement('myTransactions', Formatters.formatNumber(myTransactions));
    updateElement('totalStock', Formatters.formatNumber(totalStock));
    
    console.log('Stats loaded:', { totalProducts, totalStock, lowStockCount, todayIn, todayOut, myTransactions });
    
  } catch (error) {
    console.error('Error loading stats:', error);
    throw error;
  }
}

function updateElement(id, value) {
  const element = document.getElementById(id);
  if (element) {
    element.textContent = value;
  }
}

async function loadMyRecentTransactions() {
  const db = firebase.firestore();
  const tbody = document.getElementById('myRecentTransactions');
  const userId = window.currentUser ? window.currentUser.id : null;
  
  if (!tbody) {
    console.warn('myRecentTransactions element not found');
    return;
  }
  
  if (!userId) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center">User not found</td></tr>';
    return;
  }
  
  try {
    const snapshot = await db.collection('stockTransactions')
      .where('userId', '==', userId)
      .limit(10)
      .get();
    
    console.log('My transactions:', snapshot.size);
    
    if (snapshot.empty) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center">No transactions yet</td></tr>';
      return;
    }
    
    const transactions = [];
    snapshot.forEach(doc => {
      transactions.push({ id: doc.id, ...doc.data() });
    });
    
    transactions.sort((a, b) => {
      const dateA = a.createdAt ? a.createdAt.toDate() : new Date(0);
      const dateB = b.createdAt ? b.createdAt.toDate() : new Date(0);
      return dateB - dateA;
    });
    
    tbody.innerHTML = '';
    
    transactions.slice(0, 10).forEach(transaction => {
      const row = document.createElement('tr');
      const typeBadge = transaction.type === 'IN' ?
        '<span class="badge badge-success">IN</span>' :
        '<span class="badge badge-danger">OUT</span>';
      
      row.innerHTML = `
                <td>${Formatters.formatDateTime(transaction.createdAt)}</td>
                <td>${transaction.productName}</td>
                <td>${typeBadge}</td>
                <td>${Formatters.formatNumber(transaction.quantity)}</td>
                <td>${Formatters.formatINR(transaction.rate)}</td>
                <td>${Formatters.formatINR(transaction.totalValue)}</td>
            `;
      
      tbody.appendChild(row);
    });
    
  } catch (error) {
    console.error('Error loading transactions:', error);
    tbody.innerHTML = `<tr><td colspan="6" class="text-center text-danger">Error: ${error.message}</td></tr>`;
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
    const snapshot = await db.collection('products').get();
    
    const lowStockItems = [];
    snapshot.forEach(doc => {
      const product = doc.data();
      if (product.currentStock <= product.minimumStock) {
        lowStockItems.push({ id: doc.id, ...product });
      }
    });
    
    lowStockItems.sort((a, b) => a.currentStock - b.currentStock);
    
    const topItems = lowStockItems.slice(0, 5);
    
    if (topItems.length === 0) {
      lowStockSection.style.display = 'none';
      return;
    }
    
    lowStockSection.style.display = 'block';
    tbody.innerHTML = '';
    
    topItems.forEach(product => {
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
    console.error('Error loading low stock:', error);
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
  const welcomeName = document.getElementById('welcomeName');
  
  if (window.currentUser) {
    if (userName) userName.textContent = window.currentUser.name;
    if (welcomeName) welcomeName.textContent = window.currentUser.name;
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