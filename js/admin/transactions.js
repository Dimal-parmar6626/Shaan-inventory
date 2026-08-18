
let allTransactions = [];

document.addEventListener('DOMContentLoaded', async () => {
  try {
    await AuthGuard.requireAdmin();
  } catch (error) {
    console.error('Access denied:', error);
    return;
  }
  
  console.log('Transactions page loaded');
  
  await loadTransactions();
  setupEventListeners();
  setupSidebar();
  setupLogout();
});

async function loadTransactions() {
  const db = firebase.firestore();
  const tbody = document.getElementById('transactionsTableBody');
  
  if (!tbody) return;
  
  try {
    tbody.innerHTML = '<tr><td colspan="12" class="text-center">Loading transactions...</td></tr>';
    
    const dateFilter = document.getElementById('dateFilter').value;
    const typeFilter = document.getElementById('typeFilter').value;
    const searchTerm = document.getElementById('searchInput').value.trim().toLowerCase();
    
    const snapshot = await db.collection('stockTransactions')
      .limit(200)
      .get();
    
    allTransactions = [];
    snapshot.forEach(doc => {
      allTransactions.push({ id: doc.id, ...doc.data() });
    });
    
    let filtered = allTransactions;
    
    if (typeFilter) {
      filtered = filtered.filter(t => t.type === typeFilter);
    }
    
    if (dateFilter !== 'all') {
      const dateRange = Utils.getDateRange(dateFilter);
      filtered = filtered.filter(t => {
        const date = t.createdAt ? t.createdAt.toDate() : null;
        return date && date >= dateRange.start && date <= dateRange.end;
      });
    }
    
    if (searchTerm) {
      filtered = filtered.filter(t =>
        (t.productName || '').toLowerCase().includes(searchTerm) ||
        (t.userName || '').toLowerCase().includes(searchTerm) ||
        (t.sku || '').toLowerCase().includes(searchTerm)
      );
    }
    
    filtered.sort((a, b) => {
      const dateA = a.createdAt ? a.createdAt.toDate() : new Date(0);
      const dateB = b.createdAt ? b.createdAt.toDate() : new Date(0);
      return dateB - dateA;
    });
    
    if (filtered.length === 0) {
      tbody.innerHTML = '<tr><td colspan="12" class="text-center">No transactions found</td></tr>';
      return;
    }
    
    tbody.innerHTML = '';
    
    filtered.forEach(transaction => {
      const row = document.createElement('tr');
      const typeBadge = transaction.type === 'IN' ?
        '<span class="badge badge-success">IN</span>' :
        '<span class="badge badge-danger">OUT</span>';
      
      row.innerHTML = `
                <td>${Formatters.formatDateTime(transaction.createdAt)}</td>
                <td><strong>${transaction.productName}</strong></td>
                <td>${transaction.sku || '-'}</td>
                <td>${transaction.category || '-'}</td>
                <td>${typeBadge}</td>
                <td>${Formatters.formatNumber(transaction.quantity)}</td>
                <td>${Formatters.formatINR(transaction.rate)}</td>
                <td>${Formatters.formatINR(transaction.totalValue)}</td>
                <td>${Formatters.formatNumber(transaction.previousStock)}</td>
                <td>${Formatters.formatNumber(transaction.newStock)}</td>
                <td>${transaction.userName}</td>
                <td>${transaction.notes || '-'}</td>
            `;
      
      tbody.appendChild(row);
    });
    
  } catch (error) {
    console.error('Error loading transactions:', error);
    tbody.innerHTML = `<tr><td colspan="12" class="text-center text-danger">Error: ${error.message}</td></tr>`;
  }
}

function getFilteredTransactions() {
  const dateFilter = document.getElementById('dateFilter').value;
  const typeFilter = document.getElementById('typeFilter').value;
  const searchTerm = document.getElementById('searchInput').value.trim().toLowerCase();
  
  let filtered = allTransactions;
  
  if (typeFilter) {
    filtered = filtered.filter(t => t.type === typeFilter);
  }
  
  if (dateFilter !== 'all') {
    const dateRange = Utils.getDateRange(dateFilter);
    filtered = filtered.filter(t => {
      const date = t.createdAt ? t.createdAt.toDate() : null;
      return date && date >= dateRange.start && date <= dateRange.end;
    });
  }
  
  if (searchTerm) {
    filtered = filtered.filter(t =>
      (t.productName || '').toLowerCase().includes(searchTerm) ||
      (t.userName || '').toLowerCase().includes(searchTerm) ||
      (t.sku || '').toLowerCase().includes(searchTerm)
    );
  }
  
  filtered.sort((a, b) => {
    const dateA = a.createdAt ? a.createdAt.toDate() : new Date(0);
    const dateB = b.createdAt ? b.createdAt.toDate() : new Date(0);
    return dateB - dateA;
  });
  
  return filtered;
}

function exportToExcel() {
  const transactions = getFilteredTransactions();
  
  if (transactions.length === 0) {
    Utils.showToast('No data to export', 'warning');
    return;
  }
  
  try {
    const excelData = transactions.map(t => ({
      'Date & Time': Formatters.formatDateTime(t.createdAt),
      'Product': t.productName,
      'SKU': t.sku || '',
      'Category': t.category || '',
      'Type': t.type,
      'Quantity': t.quantity,
      'Rate': t.rate,
      'Total Value': t.totalValue,
      'Previous Stock': t.previousStock,
      'New Stock': t.newStock,
      'User': t.userName,
      'Notes': t.notes || ''
    }));
    
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    
    const columnWidths = [
      { wch: 20 },
      { wch: 25 },
      { wch: 15 },
      { wch: 15 },
      { wch: 8 },
      { wch: 10 },
      { wch: 12 },
      { wch: 15 },
      { wch: 15 },
      { wch: 12 },
      { wch: 15 },
      { wch: 20 }
    ];
    worksheet['!cols'] = columnWidths;
    
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Transactions');
    
    const now = new Date();
    const filename = `Transactions_${now.getFullYear()}-${(now.getMonth()+1).toString().padStart(2,'0')}-${now.getDate().toString().padStart(2,'0')}.xlsx`;
    
    XLSX.writeFile(workbook, filename);
    
    Utils.showToast('Excel exported successfully', 'success');
    
  } catch (error) {
    console.error('Error exporting to Excel:', error);
    Utils.showToast('Error exporting: ' + error.message, 'error');
  }
}

function setupEventListeners() {
  document.getElementById('applyFilters').addEventListener('click', () => {
    loadTransactions();
  });
  
  document.getElementById('exportExcelBtn').addEventListener('click', () => {
    exportToExcel();
  });
  
  document.getElementById('searchInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      loadTransactions();
    }
  });
}

function setupSidebar() {
  const menuBtn = document.getElementById('menuBtn');
  const sidebar = document.getElementById('sidebar');
  
  if (menuBtn && sidebar) {
    menuBtn.addEventListener('click', () => {
      sidebar.classList.toggle('open');
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