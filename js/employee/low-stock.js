
document.addEventListener('DOMContentLoaded', async () => {
  try {
    await AuthGuard.requireEmployee();
  } catch (error) {
    console.error('Access denied:', error);
    return;
  }
  
  loadLowStockItems();
  setupSidebar();
  setupLogout();
});

async function loadLowStockItems() {
  const db = firebase.firestore();
  const tbody = document.getElementById('lowStockTable');
  
  try {
    tbody.innerHTML = '<tr><td colspan="5" class="text-center">Loading low stock items...</td></tr>';
    
    const snapshot = await db.collection('products')
      .orderBy('currentStock', 'asc')
      .get();
    
    const lowStockItems = [];
    
    snapshot.forEach(doc => {
      const product = doc.data();
      if (product.currentStock <= product.minimumStock) {
        lowStockItems.push({ id: doc.id, ...product });
      }
    });
    
    if (lowStockItems.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="text-center">No low stock items 🎉</td></tr>';
      return;
    }
    
    tbody.innerHTML = '';
    
    lowStockItems.forEach(product => {
      const row = document.createElement('tr');
      const status = Formatters.getStockStatus(product.currentStock, product.minimumStock);
      
      row.innerHTML = `
                <td><strong>${product.name}</strong></td>
                <td>${product.sku}</td>
                <td>${product.category}</td>
                <td>${Formatters.formatNumber(product.currentStock)} / ${Formatters.formatNumber(product.minimumStock)}</td>
                <td><span class="badge badge-${status.badge}">${status.label}</span></td>
            `;
      
      tbody.appendChild(row);
    });
    
  } catch (error) {
    console.error('Error loading low stock:', error);
    tbody.innerHTML = '<tr><td colspan="5" class="text-center text-danger">Error loading data</td></tr>';
  }
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