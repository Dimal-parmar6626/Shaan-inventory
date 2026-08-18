
let currentReportType = 'all';
let allTransactions = [];
let allUsers = [];

document.addEventListener('DOMContentLoaded', async () => {
    try {
        await AuthGuard.requireAdmin();
    } catch (error) {
        console.error('Access denied:', error);
        return;
    }

    console.log('Reports page loaded');
    console.log('SheetJS loaded:', typeof XLSX !== 'undefined');
    
    await loadUsers();
    setupEventListeners();
    setupSidebar();
    setupLogout();
    await loadReport();
});

async function loadUsers() {
    const db = firebase.firestore();
    const userFilter = document.getElementById('userFilter');
    
    if (!userFilter) return;
    
    try {
        const snapshot = await db.collection('users').get();
        
        allUsers = [];
        snapshot.forEach(doc => {
            allUsers.push({ id: doc.id, ...doc.data() });
        });
        
        allUsers.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        
        userFilter.innerHTML = '<option value="">All Users</option>';
        
        allUsers.forEach(user => {
            const option = document.createElement('option');
            option.value = user.name;
            option.textContent = `${user.name} (${user.role})`;
            userFilter.appendChild(option);
        });
        
        console.log('Users loaded:', allUsers.length);
        
    } catch (error) {
        console.error('Error loading users:', error);
    }
}

function setupEventListeners() {
    document.querySelectorAll('.report-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.report-tab').forEach(t => {
                t.classList.remove('active');
                t.style.background = 'white';
                t.style.color = t.dataset.report === 'in' ? '#059669' : t.dataset.report === 'out' ? '#dc2626' : '#4f46e5';
                t.style.border = `2px solid ${t.dataset.report === 'in' ? '#059669' : t.dataset.report === 'out' ? '#dc2626' : '#4f46e5'}`;
            });
            
            tab.classList.add('active');
            tab.style.background = tab.dataset.report === 'in' ? '#059669' : tab.dataset.report === 'out' ? '#dc2626' : '#4f46e5';
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
    
    document.getElementById('userFilter').addEventListener('change', () => {
        loadReport();
    });
    
    document.getElementById('dateFilter').addEventListener('change', (e) => {
        const customRange = document.getElementById('customDateRange');
        if (e.target.value === 'custom') {
            customRange.style.display = 'flex';
        } else {
            customRange.style.display = 'none';
            loadReport();
        }
    });
    
    document.getElementById('startDate').addEventListener('change', () => {
        if (document.getElementById('endDate').value) {
            loadReport();
        }
    });
    
    document.getElementById('endDate').addEventListener('change', () => {
        if (document.getElementById('startDate').value) {
            loadReport();
        }
    });
}

function getDateRangeFromFilter(filter) {
    const now = new Date();
    let start = new Date();
    let end = new Date();
    
    switch(filter) {
        case 'today':
            start.setHours(0, 0, 0, 0);
            end.setHours(23, 59, 59, 999);
            break;
            
        case 'yesterday':
            start.setDate(start.getDate() - 1);
            start.setHours(0, 0, 0, 0);
            end.setDate(end.getDate() - 1);
            end.setHours(23, 59, 59, 999);
            break;
            
        case 'last7days':
            start.setDate(start.getDate() - 7);
            start.setHours(0, 0, 0, 0);
            end.setHours(23, 59, 59, 999);
            break;
            
        case 'last30days':
            start.setDate(start.getDate() - 30);
            start.setHours(0, 0, 0, 0);
            end.setHours(23, 59, 59, 999);
            break;
            
        case 'last2months':
            start.setMonth(start.getMonth() - 2);
            start.setHours(0, 0, 0, 0);
            end.setHours(23, 59, 59, 999);
            break;
            
        case 'last3months':
            start.setMonth(start.getMonth() - 3);
            start.setHours(0, 0, 0, 0);
            end.setHours(23, 59, 59, 999);
            break;
            
        case 'last6months':
            start.setMonth(start.getMonth() - 6);
            start.setHours(0, 0, 0, 0);
            end.setHours(23, 59, 59, 999);
            break;
            
        default:
            return null;
    }
    
    return { start, end };
}

function getFilteredTransactions() {
    const dateFilter = document.getElementById('dateFilter').value;
    const userFilter = document.getElementById('userFilter').value;
    const searchTerm = document.getElementById('searchInput').value.trim().toLowerCase();
    
    let filtered = allTransactions;
    
    if (currentReportType === 'in') {
        filtered = filtered.filter(t => t.type === 'IN');
    } else if (currentReportType === 'out') {
        filtered = filtered.filter(t => t.type === 'OUT');
    }
    
    if (dateFilter === 'custom') {
        const startDateVal = document.getElementById('startDate').value;
        const endDateVal = document.getElementById('endDate').value;
        
        if (startDateVal && endDateVal) {
            const startDate = new Date(startDateVal);
            startDate.setHours(0, 0, 0, 0);
            const endDate = new Date(endDateVal);
            endDate.setHours(23, 59, 59, 999);
            
            filtered = filtered.filter(t => {
                const date = t.createdAt ? t.createdAt.toDate() : null;
                return date && date >= startDate && date <= endDate;
            });
        }
    } else if (dateFilter !== 'all') {
        const dateRange = getDateRangeFromFilter(dateFilter);
        
        if (dateRange) {
            filtered = filtered.filter(t => {
                const date = t.createdAt ? t.createdAt.toDate() : null;
                return date && date >= dateRange.start && date <= dateRange.end;
            });
        }
    }
    
    if (userFilter) {
        filtered = filtered.filter(t => t.userName === userFilter);
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

async function loadReport() {
    const db = firebase.firestore();
    const tbody = document.getElementById('reportTableBody');
    
    if (!tbody) return;
    
    try {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 20px;">Loading report...</td></tr>';
        
        const snapshot = await db.collection('stockTransactions')
            .limit(500)
            .get();
        
        allTransactions = [];
        snapshot.forEach(doc => {
            allTransactions.push({ id: doc.id, ...doc.data() });
        });
        
        console.log('Total transactions fetched:', allTransactions.length);
        
        const filtered = getFilteredTransactions();
        console.log('Filtered transactions:', filtered.length);
        
        updateSummary(filtered);
        
        if (filtered.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 20px; color: #6b7280;">No transactions found for selected filters</td></tr>';
            return;
        }
        
        tbody.innerHTML = '';
        
        filtered.forEach(transaction => {
            const row = document.createElement('tr');
            const typeBadge = transaction.type === 'IN' ? 
                '<span class="badge badge-success">IN</span>' : 
                '<span class="badge badge-danger">OUT</span>';
            
            row.innerHTML = `
                <td style="padding: 10px;">${Formatters.formatDateTime(transaction.createdAt)}</td>
                <td style="padding: 10px;"><strong>${transaction.productName}</strong></td>
                <td style="padding: 10px;">${typeBadge}</td>
                <td style="padding: 10px;">${Formatters.formatNumber(transaction.quantity)}</td>
                <td style="padding: 10px;">${Formatters.formatINR(transaction.rate)}</td>
                <td style="padding: 10px;">${Formatters.formatINR(transaction.totalValue)}</td>
                <td style="padding: 10px;">${transaction.userName}</td>
            `;
            
            tbody.appendChild(row);
        });
        
    } catch (error) {
        console.error('Error loading report:', error);
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 20px; color: #dc2626;">Error: ${error.message}</td></tr>`;
    }
}

function updateSummary(transactions) {
    let totalQuantity = 0;
    let totalValue = 0;
    
    transactions.forEach(t => {
        totalQuantity += t.quantity || 0;
        totalValue += t.totalValue || 0;
    });
    
    document.getElementById('totalTransactions').textContent = Formatters.formatNumber(transactions.length);
    document.getElementById('totalQuantity').textContent = Formatters.formatNumber(totalQuantity);
    document.getElementById('totalValue').textContent = Formatters.formatINR(totalValue);
}

function exportToExcel() {
    if (typeof XLSX === 'undefined') {
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
            {wch:20},{wch:25},{wch:15},{wch:15},{wch:8},
            {wch:10},{wch:12},{wch:15},{wch:15},{wch:12},{wch:15},{wch:20}
        ];
        
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Report');
        
        const now = new Date();
        const filename = `Report_${now.getFullYear()}-${(now.getMonth()+1).toString().padStart(2,'0')}-${now.getDate().toString().padStart(2,'0')}.xlsx`;
        
        XLSX.writeFile(workbook, filename);
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