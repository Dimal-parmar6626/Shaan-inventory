
let selectedProduct = null;
let bulkProducts = [];

document.addEventListener('DOMContentLoaded', async () => {
    try {
        await AuthGuard.requireEmployee();
    } catch (error) {
        console.error('Access denied:', error);
        return;
    }

    console.log('Employee Stock Out page loaded');
    
    await loadProducts();
    await loadCategories();
    await loadMyRecentStockOut();
    setupEventListeners();
    setupSidebar();
    setupLogout();
});

async function loadProducts() {
    const db = firebase.firestore();
    const select = document.getElementById('productSelect');
    
    if (!select) return;
    
    try {
        select.innerHTML = '<option value="">Loading products...</option>';
        
        const snapshot = await db.collection('products').orderBy('name', 'asc').get();
        
        if (snapshot.empty) {
            select.innerHTML = '<option value="">No products found</option>';
            return;
        }
        
        select.innerHTML = '<option value="">Select Product</option>';
        
        snapshot.forEach(doc => {
            const product = doc.data();
            const option = document.createElement('option');
            option.value = doc.id;
            option.textContent = `${product.name} (${product.sku}) - Stock: ${product.currentStock}`;
            option.dataset.product = JSON.stringify(product);
            select.appendChild(option);
        });
        
    } catch (error) {
        console.error('Error loading products:', error);
        select.innerHTML = '<option value="">Error loading products</option>';
    }
}

async function loadCategories() {
    const db = firebase.firestore();
    const select = document.getElementById('bulkCategorySelect');
    
    if (!select) return;
    
    try {
        select.innerHTML = '<option value="">Loading categories...</option>';
        
        const snapshot = await db.collection('categories').orderBy('name', 'asc').get();
        
        if (snapshot.empty) {
            select.innerHTML = '<option value="">No categories found</option>';
            return;
        }
        
        select.innerHTML = '<option value="">Select Category</option>';
        
        snapshot.forEach(doc => {
            const category = doc.data();
            const option = document.createElement('option');
            option.value = category.name;
            option.textContent = category.name;
            select.appendChild(option);
        });
        
    } catch (error) {
        console.error('Error loading categories:', error);
        select.innerHTML = '<option value="">Error loading categories</option>';
    }
}

function setupEventListeners() {
    document.getElementById('singleTab').addEventListener('click', () => {
        document.getElementById('singleTab').style.background = '#dc2626';
        document.getElementById('singleTab').style.color = 'white';
        document.getElementById('bulkTab').style.background = 'white';
        document.getElementById('bulkTab').style.color = '#dc2626';
        document.getElementById('singleFormContainer').style.display = 'block';
        document.getElementById('bulkFormContainer').style.display = 'none';
    });
    
    document.getElementById('bulkTab').addEventListener('click', () => {
        document.getElementById('bulkTab').style.background = '#dc2626';
        document.getElementById('bulkTab').style.color = 'white';
        document.getElementById('singleTab').style.background = 'white';
        document.getElementById('singleTab').style.color = '#dc2626';
        document.getElementById('singleFormContainer').style.display = 'none';
        document.getElementById('bulkFormContainer').style.display = 'block';
    });
    
    document.getElementById('productSelect').addEventListener('change', (e) => {
        const selectedOption = e.target.selectedOptions[0];
        if (selectedOption && selectedOption.dataset.product) {
            selectedProduct = JSON.parse(selectedOption.dataset.product);
            displayProductInfo(selectedProduct);
        } else {
            selectedProduct = null;
            document.getElementById('productInfo').style.display = 'none';
        }
        calculateTotal();
    });
    
    document.getElementById('quantity').addEventListener('input', () => {
        validateQuantity();
        calculateTotal();
    });
    document.getElementById('stockOutForm').addEventListener('submit', handleSingleStockOut);
    
    document.getElementById('bulkCategorySelect').addEventListener('change', async (e) => {
        const category = e.target.value;
        if (category) {
            await loadBulkProducts(category);
        } else {
            document.getElementById('bulkProductsList').innerHTML = '<p style="text-align: center; color: #6b7280;">Select a category to see products</p>';
        }
    });
}

async function loadBulkProducts(category) {
    const db = firebase.firestore();
    const container = document.getElementById('bulkProductsList');
    
    try {
        container.innerHTML = '<p style="text-align: center;">Loading products...</p>';
        
        const snapshot = await db.collection('products')
            .where('category', '==', category)
            .get();
        
        if (snapshot.empty) {
            container.innerHTML = '<p style="text-align: center; color: #6b7280;">No products in this category</p>';
            return;
        }
        
        bulkProducts = [];
        let html = `
            <div style="margin-bottom: 15px;">
                <strong>📦 Products in ${category}:</strong>
                <span style="color: #6b7280;">(${snapshot.size} products)</span>
            </div>
            <div style="background: #f9fafb; padding: 10px; border-radius: 8px; margin-bottom: 15px; display: flex; gap: 10px; flex-wrap: wrap;">
                <span style="font-weight: bold;">⚡ Quick:</span>
                <button class="btn btn-sm btn-secondary" id="setAllZero" type="button">Reset</button>
                <button class="btn btn-sm btn-primary" id="setAllTen" type="button">Set 10</button>
                <button class="btn btn-sm btn-primary" id="incrementAll" type="button">+1 All</button>
                <button class="btn btn-sm btn-secondary" id="decrementAll" type="button">-1 All</button>
            </div>
        `;
        
        snapshot.forEach(doc => {
            const product = doc.data();
            product.id = doc.id;
            bulkProducts.push(product);
            
            html += `
                <div style="display: flex; align-items: center; gap: 10px; padding: 12px; border: 1px solid #e5e7eb; border-radius: 8px; margin-bottom: 8px; flex-wrap: wrap;">
                    <div style="flex: 2; min-width: 150px;">
                        <strong>${product.name}</strong><br>
                        <small style="color: #6b7280;">SKU: ${product.sku} | Available: ${product.currentStock}</small>
                    </div>
                    <div style="display: flex; align-items: center; gap: 5px;">
                        <button type="button" class="qty-minus-btn" data-product-id="${doc.id}" style="width: 30px; height: 30px; border: 2px solid #d1d5db; border-radius: 4px; background: white; cursor: pointer;">−</button>
                        <input type="number" class="bulk-quantity-input" data-product-id="${doc.id}" min="0" value="0" max="${product.currentStock}" style="width: 55px; padding: 5px; border: 2px solid #d1d5db; border-radius: 4px; text-align: center; font-weight: bold;">
                        <button type="button" class="qty-plus-btn" data-product-id="${doc.id}" style="width: 30px; height: 30px; border: 2px solid #dc2626; border-radius: 4px; background: #dc2626; color: white; cursor: pointer;">+</button>
                    </div>
                    <div style="background: #f3f4f6; padding: 5px 10px; border-radius: 4px;">
                        <small>Rate: <strong>₹${product.sellingPrice}</strong></small>
                    </div>
                    <div class="bulk-total" id="bulkTotal-${doc.id}" style="font-weight: bold; color: #dc2626; min-width: 70px; text-align: right;">₹0.00</div>
                </div>
            `;
        });
        
        html += `
            <div style="background: #fef2f2; border: 2px solid #fecaca; border-radius: 8px; padding: 15px; margin-top: 15px;">
                <div style="display: flex; justify-content: space-around; flex-wrap: wrap; gap: 10px;">
                    <div style="text-align: center;">
                        <div style="font-size: 12px; color: #6b7280;">Items</div>
                        <div id="bulkTotalItems" style="font-size: 20px; font-weight: bold;">0</div>
                    </div>
                    <div style="text-align: center;">
                        <div style="font-size: 12px; color: #6b7280;">Quantity</div>
                        <div id="bulkTotalQuantity" style="font-size: 20px; font-weight: bold;">0</div>
                    </div>
                    <div style="text-align: center;">
                        <div style="font-size: 12px; color: #6b7280;">Value</div>
                        <div id="bulkTotalValue" style="font-size: 20px; font-weight: bold; color: #dc2626;">₹0.00</div>
                    </div>
                </div>
                <button class="btn btn-danger" id="bulkSubmitBtn" style="width: 100%; margin-top: 10px; padding: 12px; font-weight: bold;">📤 Bulk Stock Out</button>
            </div>
        `;
        
        container.innerHTML = html;
        
        document.querySelectorAll('.qty-plus-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const input = document.querySelector(`.bulk-quantity-input[data-product-id="${btn.dataset.productId}"]`);
                const product = bulkProducts.find(p => p.id === btn.dataset.productId);
                if (input && product) {
                    const current = parseInt(input.value) || 0;
                    if (current < product.currentStock) {
                        input.value = current + 1;
                        updateBulkTotals();
                    } else {
                        Utils.showToast(`Max stock: ${product.currentStock}`, 'warning');
                    }
                }
            });
        });
        
        document.querySelectorAll('.qty-minus-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const input = document.querySelector(`.bulk-quantity-input[data-product-id="${btn.dataset.productId}"]`);
                if (input) { input.value = Math.max(0, (parseInt(input.value) || 0) - 1); updateBulkTotals(); }
            });
        });
        
        document.querySelectorAll('.bulk-quantity-input').forEach(input => {
            input.addEventListener('input', () => {
                const product = bulkProducts.find(p => p.id === input.dataset.productId);
                if (product && parseInt(input.value) > product.currentStock) {
                    input.value = product.currentStock;
                }
                updateBulkTotals();
            });
        });
        
        document.getElementById('setAllZero').addEventListener('click', () => {
            document.querySelectorAll('.bulk-quantity-input').forEach(i => i.value = 0);
            updateBulkTotals();
        });
        
        document.getElementById('setAllTen').addEventListener('click', () => {
            document.querySelectorAll('.bulk-quantity-input').forEach(i => {
                const product = bulkProducts.find(p => p.id === i.dataset.productId);
                i.value = product ? Math.min(10, product.currentStock) : 10;
            });
            updateBulkTotals();
        });
        
        document.getElementById('incrementAll').addEventListener('click', () => {
            document.querySelectorAll('.bulk-quantity-input').forEach(i => {
                const product = bulkProducts.find(p => p.id === i.dataset.productId);
                const current = parseInt(i.value) || 0;
                if (product && current < product.currentStock) i.value = current + 1;
            });
            updateBulkTotals();
        });
        
        document.getElementById('decrementAll').addEventListener('click', () => {
            document.querySelectorAll('.bulk-quantity-input').forEach(i => i.value = Math.max(0, (parseInt(i.value) || 0) - 1));
            updateBulkTotals();
        });
        
        document.getElementById('bulkSubmitBtn').addEventListener('click', handleBulkStockOut);
        
        updateBulkTotals();
        
    } catch (error) {
        console.error('Error loading bulk products:', error);
        container.innerHTML = '<p style="color: #dc2626;">Error: ' + error.message + '</p>';
    }
}

function updateBulkTotals() {
    let totalItems = 0, totalQuantity = 0, totalValue = 0;
    
    document.querySelectorAll('.bulk-quantity-input').forEach(input => {
        const productId = input.dataset.productId;
        const quantity = parseInt(input.value) || 0;
        const product = bulkProducts.find(p => p.id === productId);
        const rate = product ? product.sellingPrice : 0;
        const total = quantity * rate;
        
        const totalEl = document.getElementById(`bulkTotal-${productId}`);
        if (totalEl) totalEl.textContent = Formatters.formatINR(total);
        
        if (quantity > 0) { totalItems++; totalQuantity += quantity; totalValue += total; }
    });
    
    document.getElementById('bulkTotalItems').textContent = totalItems;
    document.getElementById('bulkTotalQuantity').textContent = totalQuantity;
    document.getElementById('bulkTotalValue').textContent = Formatters.formatINR(totalValue);
}

async function handleBulkStockOut() {
    const quantityInputs = document.querySelectorAll('.bulk-quantity-input');
    const notes = document.getElementById('bulkNotes') ? document.getElementById('bulkNotes').value.trim() : '';
    
    let successCount = 0, errorCount = 0;
    
    Utils.showLoading();
    
    for (const input of quantityInputs) {
        const productId = input.dataset.productId;
        const quantity = parseInt(input.value) || 0;
        if (quantity <= 0) continue;
        
        const product = bulkProducts.find(p => p.id === productId);
        const rate = product ? product.sellingPrice : 0;
        
        try {
            await StockOperations.performStockOut(productId, quantity, rate, notes);
            successCount++;
        } catch (error) {
            errorCount++;
        }
    }
    
    Utils.hideLoading();
    
    if (successCount > 0) Utils.showToast(`Bulk Stock OUT successful! ${successCount} products updated`, 'success');
    if (errorCount > 0) Utils.showToast(`${errorCount} products failed`, 'error');
    if (successCount === 0 && errorCount === 0) Utils.showToast('Enter quantity for at least one product', 'warning');
    
    await loadProducts();
    await loadMyRecentStockOut();
    
    const categorySelect = document.getElementById('bulkCategorySelect');
    if (categorySelect.value) await loadBulkProducts(categorySelect.value);
}

function displayProductInfo(product) {
    document.getElementById('productInfo').style.display = 'block';
    document.getElementById('availableStock').textContent = Formatters.formatNumber(product.currentStock);
    document.getElementById('productSku').textContent = product.sku;
    document.getElementById('productCategory').textContent = product.category;
    
    const rateInput = document.getElementById('rate');
    rateInput.value = product.sellingPrice || 0;
    rateInput.readOnly = true;
    rateInput.style.backgroundColor = '#f3f4f6';
    rateInput.style.fontWeight = 'bold';
    rateInput.style.color = '#dc2626';
    
    calculateTotal();
}

function validateQuantity() {
    const quantityInput = document.getElementById('quantity');
    const stockError = document.getElementById('stockError');
    
    if (!quantityInput || !stockError) return true;
    
    const quantity = parseInt(quantityInput.value);
    
    if (selectedProduct && quantity > selectedProduct.currentStock) {
        stockError.style.display = 'block';
        stockError.textContent = `Insufficient stock! Available: ${selectedProduct.currentStock}`;
        return false;
    } else {
        stockError.style.display = 'none';
        return true;
    }
}

function calculateTotal() {
    const quantity = parseFloat(document.getElementById('quantity').value) || 0;
    const rate = parseFloat(document.getElementById('rate').value) || 0;
    document.getElementById('totalValue').textContent = Formatters.formatINR(quantity * rate);
}

async function handleSingleStockOut(e) {
    e.preventDefault();
    
    const productId = document.getElementById('productSelect').value;
    const quantity = parseInt(document.getElementById('quantity').value);
    const rate = parseFloat(document.getElementById('rate').value);
    const notes = document.getElementById('notes').value.trim();
    
    if (!productId) { Utils.showToast('Select a product', 'error'); return; }
    if (!quantity || quantity <= 0) { Utils.showToast('Enter valid quantity', 'error'); return; }
    if (!validateQuantity()) { Utils.showToast('Insufficient stock', 'error'); return; }
    
    try {
        Utils.showLoading();
        const result = await StockOperations.performStockOut(productId, quantity, rate, notes);
        Utils.hideLoading();
        Utils.showToast(`Stock OUT successful! Remaining: ${result.newStock}`, 'success');
        
        document.getElementById('stockOutForm').reset();
        document.getElementById('productInfo').style.display = 'none';
        document.getElementById('totalValue').textContent = '₹0.00';
        selectedProduct = null;
        
        await loadProducts();
        await loadMyRecentStockOut();
    } catch (error) {
        Utils.hideLoading();
        Utils.showToast(error.message || 'Error', 'error');
    }
}

async function loadMyRecentStockOut() {
    const db = firebase.firestore();
    const tbody = document.getElementById('recentStockOut');
    const userId = window.currentUser ? window.currentUser.id : null;
    
    if (!tbody || !userId) return;
    
    try {
        const snapshot = await db.collection('stockTransactions')
            .where('userId', '==', userId)
            .get();
        
        const transactions = [];
        snapshot.forEach(doc => {
            const t = doc.data();
            if (t.type === 'OUT') transactions.push(t);
        });
        
        transactions.sort((a, b) => {
            const dateA = a.createdAt ? a.createdAt.toDate() : new Date(0);
            const dateB = b.createdAt ? b.createdAt.toDate() : new Date(0);
            return dateB - dateA;
        });
        
        const recent = transactions.slice(0, 10);
        
        if (recent.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center">No transactions yet</td></tr>';
            return;
        }
        
        tbody.innerHTML = '';
        recent.forEach(t => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${Formatters.formatDateTime(t.createdAt)}</td>
                <td>${t.productName}</td>
                <td>${Formatters.formatNumber(t.quantity)}</td>
                <td>${Formatters.formatINR(t.totalValue)}</td>
            `;
            tbody.appendChild(row);
        });
    } catch (error) {
        console.error('Error loading recent:', error);
    }
}

function setupSidebar() {
    const menuBtn = document.getElementById('menuBtn');
    const sidebar = document.getElementById('sidebar');
    if (menuBtn && sidebar) {
        menuBtn.addEventListener('click', () => sidebar.classList.toggle('open'));
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
            Utils.showConfirm('Logout?', async () => {
                try { await authService.signOut(); } catch (error) { console.error(error); }
            });
        });
    }
}