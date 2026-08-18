
let currentPage = 1;
const pageSize = 20;

document.addEventListener('DOMContentLoaded', async () => {
  try {
    await AuthGuard.requireEmployee();
  } catch (error) {
    console.error('Access denied:', error);
    return;
  }
  
  loadMyHistory();
  setupEventListeners();
  setupSidebar();
  setupLogout();
});

async function loadMyHistory() {
  const db = firebase.firestore();
  const tbody = document.getElementById('historyTable');
  const userId = window.currentUser.id;
  
  try {
    tbody.innerHTML = '<tr><td colspan="8" class="text-center">Loading history...</td></tr>';
    
    const snapshot = await db.collection('stockTransactions')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(pageSize)
      .get();
    
    if (snapshot.empty) {
      tbody.innerHTML = '<tr><td colspan="8" class="text-center">No transactions found</td></tr>';
      return;
    }
    
    tbody.innerHTML = '';
    
    snapshot.forEach(doc => {
      const transaction = doc.data();
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
                <td>${Formatters.formatNumber(transaction.previousStock)}</td>
                <td>${Formatters.formatNumber(transaction.newStock)}</td>
            `;
      
      tbody.appendChild(row);
    });
    
  } catch (error) {
    console.error('Error loading history:', error);
    tbody.innerHTML = '<tr><td colspan="8" class="text-center text-danger">Error loading history</td></tr>';
  }
}

function setupEventListeners() {
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