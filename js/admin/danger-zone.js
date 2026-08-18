
let pendingAction = null;
let currentTab = 'transactions';
let specificData = [];

document.addEventListener('DOMContentLoaded', async () => {
    try {
        await AuthGuard.requireAdmin();
    } catch (error) {
        console.error('Access denied:', error);
        window.location.href = '../index.html';
        return;
    }

    console.log('Danger Zone page loaded');
    
    await loadStats();
    setupEventListeners();
    setupSidebar();
    setupLogout();
    
    await loadSpecificData('transactions');
});

async function loadStats() {
    const db = firebase.firestore();
    
    try {
        const productsSnapshot = await db.collection('products').get();
        document.getElementById('statProducts').textContent = productsSnapshot.size;
        
        const categoriesSnapshot = await db.collection('categories').get();
        document.getElementById('statCategories').textContent = categoriesSnapshot.size;
        
        const transactionsSnapshot = await db.collection('stockTransactions').get();
        document.getElementById('statTransactions').textContent = transactionsSnapshot.size;
        
        const employeesSnapshot = await db.collection('users')
            .where('role', '==', 'employee')
            .get();
        document.getElementById('statEmployees').textContent = employeesSnapshot.size;
        
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

async function loadSpecificData(type, searchTerm = '') {
    const db = firebase.firestore();
    const container = document.getElementById('specificList');
    
    try {
        container.innerHTML = '<p style="text-align: center;">Loading...</p>';
        
        specificData = [];
        
        if (type === 'transactions') {
            const snapshot = await db.collection('stockTransactions').limit(50).get();
            
            snapshot.forEach(doc => {
                const data = doc.data();
                specificData.push({
                    id: doc.id,
                    type: 'transaction',
                    display: `${data.type} - ${data.productName} - Qty: ${data.quantity} - ${data.userName}`,
                    detail: Formatters.formatDateTime(data.createdAt)
                });
            });
        } else if (type === 'products') {
            const snapshot = await db.collection('products').get();
            
            snapshot.forEach(doc => {
                const data = doc.data();
                specificData.push({
                    id: doc.id,
                    type: 'product',
                    display: `${data.name} (${data.sku}) - Stock: ${data.currentStock}`,
                    detail: data.category
                });
            });
        } else if (type === 'categories') {
            const snapshot = await db.collection('categories').get();
            
            snapshot.forEach(doc => {
                const data = doc.data();
                specificData.push({
                    id: doc.id,
                    type: 'category',
                    display: data.name,
                    detail: data.description || ''
                });
            });
        }
        
        if (searchTerm) {
            const searchLower = searchTerm.toLowerCase();
            specificData = specificData.filter(item => 
                item.display.toLowerCase().includes(searchLower) ||
                item.detail.toLowerCase().includes(searchLower)
            );
        }
        
        if (specificData.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #6b7280;">No entries found</p>';
            return;
        }
        
        let html = '';
        
        specificData.forEach(item => {
            html += `
                <div class="specific-item">
                    <div style="flex: 1;">
                        <div style="font-weight: bold;">${item.display}</div>
                        <div style="font-size: 12px; color: #6b7280;">${item.detail}</div>
                    </div>
                    <button class="delete-single-btn" data-id="${item.id}" data-type="${item.type}" data-display="${item.display}">
                        🗑️ Delete
                    </button>
                </div>
            `;
        });
        
        container.innerHTML = html;
        
        document.querySelectorAll('.delete-single-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                openSpecificDeleteConfirm(
                    btn.dataset.id,
                    btn.dataset.type,
                    btn.dataset.display
                );
            });
        });
        
    } catch (error) {
        console.error('Error loading specific data:', error);
        container.innerHTML = '<p style="text-align: center; color: #dc2626;">Error: ' + error.message + '</p>';
    }
}

function openSpecificDeleteConfirm(id, type, display) {
    const collectionMap = {
        'transaction': 'stockTransactions',
        'product': 'products',
        'category': 'categories'
    };
    
    const collectionName = collectionMap[type];
    
    if (!collectionName) return;
    
    openConfirmModal(
        'Delete Entry',
        `Are you sure you want to delete:\n\n"${display}"\n\nThis action cannot be undone.`,
        `specific:${collectionName}:${id}`
    );
}

function setupEventListeners() {
    document.getElementById('showTransactionsTab').addEventListener('click', () => {
        currentTab = 'transactions';
        document.getElementById('showTransactionsTab').style.background = '#3b82f6';
        document.getElementById('showProductsTab').style.background = '#6b7280';
        document.getElementById('showCategoriesTab').style.background = '#6b7280';
        loadSpecificData('transactions');
    });
    
    document.getElementById('showProductsTab').addEventListener('click', () => {
        currentTab = 'products';
        document.getElementById('showTransactionsTab').style.background = '#6b7280';
        document.getElementById('showProductsTab').style.background = '#3b82f6';
        document.getElementById('showCategoriesTab').style.background = '#6b7280';
        loadSpecificData('products');
    });
    
    document.getElementById('showCategoriesTab').addEventListener('click', () => {
        currentTab = 'categories';
        document.getElementById('showTransactionsTab').style.background = '#6b7280';
        document.getElementById('showProductsTab').style.background = '#6b7280';
        document.getElementById('showCategoriesTab').style.background = '#3b82f6';
        loadSpecificData('categories');
    });
    
    document.getElementById('specificSearch').addEventListener('input', (e) => {
        loadSpecificData(currentTab, e.target.value.trim());
    });
    
    document.getElementById('clearTransactionsBtn').addEventListener('click', () => {
        openConfirmModal('Clear All Transactions', 'This will permanently delete ALL stock transaction logs.', 'clearTransactions');
    });
    
    document.getElementById('clearStockInBtn').addEventListener('click', () => {
        openConfirmModal('Clear Stock IN Logs', 'This will delete all Stock IN transaction records only.', 'clearStockIn');
    });
    
    document.getElementById('clearStockOutBtn').addEventListener('click', () => {
        openConfirmModal('Clear Stock OUT Logs', 'This will delete all Stock OUT transaction records only.', 'clearStockOut');
    });
    
    document.getElementById('deleteProductsBtn').addEventListener('click', () => {
        openConfirmModal('Delete All Products', 'This will permanently delete ALL products.', 'deleteProducts');
    });
    
    document.getElementById('deleteCategoriesBtn').addEventListener('click', () => {
        openConfirmModal('Delete All Categories', 'This will permanently delete ALL categories.', 'deleteCategories');
    });
    
    document.getElementById('nukeAllBtn').addEventListener('click', () => {
        openConfirmModal('NUKE ALL DATA', 'This will delete ALL products, categories, and transaction logs.', 'nukeAll');
    });
    
    document.getElementById('cancelBtn').addEventListener('click', closeConfirmModal);
    
    document.getElementById('confirmInput').addEventListener('input', (e) => {
        const confirmBtn = document.getElementById('confirmBtn');
        if (e.target.value === 'DELETE') {
            confirmBtn.disabled = false;
        } else {
            confirmBtn.disabled = true;
        }
    });
    
    document.getElementById('confirmBtn').addEventListener('click', async () => {
        await executeAction();
    });
    
    document.getElementById('confirmModal').addEventListener('click', (e) => {
        if (e.target === e.currentTarget) {
            closeConfirmModal();
        }
    });
}

function openConfirmModal(title, text, action) {
    pendingAction = action;
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalText').textContent = text;
    document.getElementById('confirmInput').value = '';
    document.getElementById('confirmBtn').disabled = true;
    document.getElementById('confirmModal').style.display = 'flex';
}

function closeConfirmModal() {
    document.getElementById('confirmModal').style.display = 'none';
    pendingAction = null;
    document.getElementById('confirmInput').value = '';
    document.getElementById('confirmBtn').disabled = true;
}

async function executeAction() {
    const confirmInput = document.getElementById('confirmInput').value;
    
    if (confirmInput !== 'DELETE') {
        Utils.showToast('Please type DELETE to confirm', 'error');
        return;
    }
    
    if (!pendingAction) {
        Utils.showToast('No action selected', 'error');
        return;
    }
    
    const actionToExecute = pendingAction;
    closeConfirmModal();
    
    try {
        Utils.showLoading();
        
        const db = firebase.firestore();
        let deletedCount = 0;
        
        if (actionToExecute.startsWith('specific:')) {
            const parts = actionToExecute.split(':');
            const collectionName = parts[1];
            const docId = parts[2];
            
            console.log(`Deleting specific document: ${collectionName}/${docId}`);
            
            await db.collection(collectionName).doc(docId).delete();
            deletedCount = 1;
            
            Utils.hideLoading();
            Utils.showToast('Entry deleted successfully', 'success');
            await loadStats();
            await loadSpecificData(currentTab);
            return;
        }
        
        switch (actionToExecute) {
            case 'clearTransactions':
                deletedCount = await deleteAllTransactions(db);
                break;
            case 'clearStockIn':
                deletedCount = await deleteTransactionsByType(db, 'IN');
                break;
            case 'clearStockOut':
                deletedCount = await deleteTransactionsByType(db, 'OUT');
                break;
            case 'deleteProducts':
                deletedCount = await deleteAllDocuments(db, 'products');
                break;
            case 'deleteCategories':
                deletedCount = await deleteAllDocuments(db, 'categories');
                break;
            case 'nukeAll':
                const productsDeleted = await deleteAllDocuments(db, 'products');
                const categoriesDeleted = await deleteAllDocuments(db, 'categories');
                const transactionsDeleted = await deleteAllTransactions(db);
                deletedCount = productsDeleted + categoriesDeleted + transactionsDeleted;
                break;
        }
        
        Utils.hideLoading();
        Utils.showToast(`Successfully deleted ${deletedCount} items`, 'success');
        
        await loadStats();
        await loadSpecificData(currentTab);
        
    } catch (error) {
        Utils.hideLoading();
        console.error('Error executing action:', error);
        Utils.showToast('Error: ' + error.message, 'error');
    }
}

async function deleteAllTransactions(db) {
    let deletedCount = 0;
    
    try {
        const snapshot = await db.collection('stockTransactions').get();
        
        if (snapshot.empty) return 0;
        
        for (const doc of snapshot.docs) {
            await doc.ref.delete();
            deletedCount++;
            console.log(`Deleted ${deletedCount}/${snapshot.size}`);
        }
        
        return deletedCount;
    } catch (error) {
        console.error('Error deleting transactions:', error);
        throw error;
    }
}

async function deleteTransactionsByType(db, type) {
    let deletedCount = 0;
    
    try {
        const snapshot = await db.collection('stockTransactions').get();
        
        const matchingDocs = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            if (data.type === type) {
                matchingDocs.push(doc);
            }
        });
        
        for (const doc of matchingDocs) {
            await doc.ref.delete();
            deletedCount++;
        }
        
        return deletedCount;
    } catch (error) {
        console.error(`Error deleting ${type} transactions:`, error);
        throw error;
    }
}

async function deleteAllDocuments(db, collectionName) {
    let deletedCount = 0;
    
    try {
        const snapshot = await db.collection(collectionName).get();
        
        if (snapshot.empty) return 0;
        
        for (const doc of snapshot.docs) {
            await doc.ref.delete();
            deletedCount++;
        }
        
        return deletedCount;
    } catch (error) {
        console.error(`Error deleting from ${collectionName}:`, error);
        throw error;
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