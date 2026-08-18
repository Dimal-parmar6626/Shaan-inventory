
let currentReportType = 'all';
let allTransactions = [];

document.addEventListener('DOMContentLoaded', async () => {
    try {
        await AuthGuard.requireEmployee();
    } catch (error) {
        console.error('Access denied:', error);
        return;
    }
    
    console.log('Employee Reports page loaded');
    console.log('SheetJS loaded:', typeof XLSX !== 'undefined');
    
    setupEventListeners();
    setupSidebar();
    setupLogout();
    await loadReport();
});

function setupEventListeners() {
    document.querySelectorAll('.report-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.report-tab').forEach(t => {
                t.classList.remove('active');
                t.style.background = 'white';
                t.style.color = '#4f46e5';
                t.style.border = '2px solid #4f46e5';
            });
            
            tab.classList.add('active');
            tab.style.background = '#4f46e5';
            tab.style.color = 'white';
            tab.style.border = 'none';
            
            currentReportType = tab.dataset.report;
            console.log('Report type:', currentReportType);
            loadReport();
        });
    });
    
    document.getElementById('applyFilters').addEventListener('click', () => {
        loadReport();
    });
    
    document.getElementById('exportExcelBtn').addEventListener('click', () => {
        exportToExcel();
    });
    
    document.getElementById('searchInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            loadReport();
        }
    });
}

async function loadReport() {
    const db = firebase.firestore();
    const tbody = document.getElementById('reportTableBody');
    
    if (!tbody) return;
    
    try {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">Loading report...</td></tr>';
        
        const snapshot = await db.collection('stockTransactions')
            .limit(200)
            .get();
        
        allTransactions = [];
        snapshot.forEach(doc => {
            allTransactions.push({ id: doc.id, ...doc.data() });
        });
        
        const filtered = getFilteredTransactions();
        
        updateSummary(filtered);
        
        if (filtered.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center">No transactions found</td></tr>';
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
                <td>${transaction.productName}</td>
                <td>${typeBadge}</td>
                <td>${Formatters.formatNumber(transaction.quantity)}</td>
                <td>${Formatters.formatINR(transaction.rate)}</td>
                <td>${Formatters.formatINR(transaction.totalValue)}</td>
                <td>${transaction.userName}</td>
            `;
            
            tbody.appendChild(row);
        });
        
    } catch (error) {
        console.error('Error loading report:', error);
        tbody.innerHTML = `<tr><td colspan="7" class="text-center text-danger">Error: ${error.message}</td></tr>`;
    }
}

function getFilteredTransactions() {
    const dateFilter = document.getElementById('dateFilter').value;
    const searchTerm = document.getElementById('searchInput').value.trim().toLowerCase();
    
    let filtered = allTransactions;
    
    if (currentReportType === 'in') {
        filtered = filtered.filter(t => t.type === 'IN');
    } else if (currentReportType === 'out') {
        filtered = filtered.filter(t => t.type === 'OUT');
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
            (t.userName || '').toLowerCase().includes(searchTerm)
        );
    }
    
    filtered.sort((a, b) => {
        const dateA = a.createdAt ? a.createdAt.toDate() : new Date(0);
        const dateB = b.createdAt ? b.createdAt.toDate() : new Date(0);
        return dateB - dateA;
    });
    
    return filtered;
}

function updateSummary(transactions) {
    let totalQuantity = 0;
    let totalValue = 0;
    
    transactions.forEach(t => {
        totalQuantity += t.quantity || 0;
        totalValue += t.totalValue || 0;
    });
    
    const totalTransactionsEl = document.getElementById('totalTransactions');
    const totalQuantityEl = document.getElementById('totalQuantity');
    const totalValueEl = document.getElementById('totalValue');
    
    if (totalTransactionsEl) totalTransactionsEl.textContent = Formatters.formatNumber(transactions.length);
    if (totalQuantityEl) totalQuantityEl.textContent = Formatters.formatNumber(totalQuantity);
    if (totalValueEl) totalValueEl.textContent = Formatters.formatINR(totalValue);
}

function exportToExcel() {
    if (typeof XLSX === 'undefined') {
        console.error('SheetJS not loaded');
        Utils.showToast('Excel library not loaded. Check internet connection.', 'error');
        return;
    }
    
    const transactions = getFilteredTransactions();
    
    if (transactions.length === 0) {
        Utils.showToast('No data to export', 'warning');
        return;
    }
    
    try {
        const excelData = transactions.map(t => ({
            'Date & Time': t.createdAt ? t.createdAt.toDate().toLocaleString('en-IN') : '',
            'Product': t.productName || '',
            'SKU': t.sku || '',
            'Category': t.category || '',
            'Type': t.type || '',
            'Quantity': t.quantity || 0,
            'Rate': t.rate || 0,
            'Total Value': t.totalValue || 0,
            'Previous Stock': t.previousStock || 0,
            'New Stock': t.newStock || 0,
            'User': t.userName || '',
            'Notes': t.notes || ''
        }));
        
        const worksheet = XLSX.utils.json_to_sheet(excelData);
        
        worksheet['!cols'] = [
            { wch: 20 }, { wch: 25 }, { wch: 15 }, { wch: 15 },
            { wch: 8 }, { wch: 10 }, { wch: 12 }, { wch: 15 },
            { wch: 15 }, { wch: 12 }, { wch: 15 }, { wch: 20 }
        ];
        
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Report');
        
        const now = new Date();
        const filename = `EmployeeReport_${now.getFullYear()}-${(now.getMonth()+1).toString().padStart(2,'0')}-${now.getDate().toString().padStart(2,'0')}.xlsx`;
        
        XLSX.writeFile(workbook, filename);
        
        console.log('Excel exported successfully');
        Utils.showToast('Excel exported successfully', 'success');
        
    } catch (error) {
        console.error('Error exporting:', error);
        Utils.showToast('Error exporting: ' + error.message, 'error');
    }
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