
document.addEventListener('DOMContentLoaded', async () => {
  try {
    await AuthGuard.requireAdmin();
  } catch (error) {
    console.error('Access denied:', error);
    return;
  }
  
  loadInventory();
  setupSidebar();
  setupLogout();
});

async function loadInventory() {
  const db = firebase.firestore();
  const tbody = document.getElementById('inventoryTable');
  
  try {
    tbody.innerHTML = '<tr><td colspan="9" class="text-center">Loading inventory...</td></tr>';
    
    const snapshot = await db.collection('products')
      .orderBy('name', 'asc')
      .get();
    
    if (snapshot.empty) {
      tbody.innerHTML = '<tr><td colspan="9" class="text-center">No products found</td></tr>';
      return;
    }
    
    tbody.innerHTML = '';
    
    let totalProducts = 0;
    let totalStockValue = 0;
    let totalUnits = 0;
    let lowStockCount = 0;
    
    snapshot.forEach(doc => {
      const product = doc.data();
      const stockValue = product.currentStock * product.purchasePrice;
      const status = Formatters.getStockStatus(product.currentStock, product.minimumStock);
      
      totalProducts++;
      totalStockValue += stockValue;
      totalUnits += product.currentStock;
      
      if (product.currentStock <= product.minimumStock) {
        lowStockCount++;
      }
      
      const row = document.createElement('tr');
      
      row.innerHTML = `
                <td><strong>${product.name}</strong></td>
                <td>${product.sku}</td>
                <td>${product.category}</td>
                <td>${Formatters.formatNumber(product.currentStock)}</td>
                <td>${product.unit}</td>
                <td>${Formatters.formatINR(product.purchasePrice)}</td>
                <td>${Formatters.formatINR(product.sellingPrice)}</td>
                <td>${Formatters.formatINR(stockValue)}</td>
                <td>
                    <span class="badge badge-${status.badge}">${status.label}</span>
                </td>
            `;
      
      tbody.appendChild(row);
    });
    
    document.getElementById('totalProducts').textContent = Formatters.formatNumber(totalProducts);
    document.getElementById('totalValue').textContent = Formatters.formatINR(totalStockValue);
    document.getElementById('totalUnits').textContent = Formatters.formatNumber(totalUnits);
    document.getElementById('lowStockCount').textContent = Formatters.formatNumber(lowStockCount);
    
  } catch (error) {
    console.error('Error loading inventory:', error);
    tbody.innerHTML = '<tr><td colspan="9" class="text-center text-danger">Error loading inventory</td></tr>';
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