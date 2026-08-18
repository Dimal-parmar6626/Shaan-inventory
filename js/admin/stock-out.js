
let selectedProduct = null;
let bulkProducts = [];

document.addEventListener('DOMContentLoaded', async () => {
    try {
        await AuthGuard.requireAdmin();
    } catch (error) {
        console.error('Access denied:', error);
        return;
    }

    console.log('Stock Out page loaded');
    
    await loadProducts();
    await loadCategories();
    await loadRecentStockOut();
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
        document.getElementById('singleTab').classList.add('active');
        document.getElementById('singleTab').style.background = '#4f46e5';
        document.getElementById('singleTab').style.color = 'white';
        document.getElementById('bulkTab').classList.remove('active');
        document.getElementById('bulkTab').style.background = 'white';
        document.getElementById('bulkTab').style.color = '#4f46e5';
        document.getElementById('singleFormContainer').style.display = 'block';
        document.getElementById('bulkFormContainer').style.display = 'none';
    });
    
    document.getElementById('bulkTab').addEventListener('click', () => {
        document.getElementById('bulkTab').classList.add('active');
        document.getElementById('bulkTab').style.background = '#dc2626';
        document.getElementById('bulkTab').style.color = 'white';
        document.getElementById('singleTab').classList.remove('active');
        document.getElementById('singleTab').style.background = 'white';
        document.getElementById('singleTab').style.color = '#4f46e5';
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
            <div style="margin-bottom: 20px;">
                <strong style="font-size: 16px;">📦 Products in ${category}:</strong>
                <span style="color: #6b7280; margin-left: 10px;">(${snapshot.size} products)</span>
            </div>
            <div style="background: #f9fafb; padding: 10px; border-radius: 8px; margin-bottom: 15px; display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
                <span style="font-weight: bold;">⚡ Quick Actions:</span>
                <button class="btn btn-sm btn-secondary" id="setAllZero" type="button">Reset All</button>
                <button class="btn btn-sm btn-primary" id="setAllTen" type="button">Set All to 10</button>
                <button class="btn btn-sm btn-primary" id="incrementAll" type="button">+1 All</button>
                <button class="btn btn-sm btn-secondary" id="decrementAll" type="button">-1 All</button>
            </div>
        `;
        
        snapshot.forEach(doc => {
            const product = doc.data();
            product.id = doc.id;
            bulkProducts.push(product);
            
            html += `
                <div class="bulk-product-row" data-product-id="${doc.id}" style="display: flex; align-items: center; gap: 15px; padding: 15px; border: 1px solid #e5e7eb; border-radius: 8px; margin-bottom: 10px; flex-wrap: wrap;">
                    <div class="bulk-product-info" style="flex: 2; min-width: 150px;">
                        <span class="bulk-product-name" style="font-weight: bold; font-size: 16px;">${product.name}</span>
                        <span class="bulk-product-sku" style="font-size: 12px; color: #6b7280; display: block;">SKU: ${product.sku}</span>
                        <span class="bulk-product-stock" style="font-size: 14px; color: #0369a1;">Available: ${product.currentStock} ${product.unit}</span>
                    </div>
                    
                    <div style="display: flex; align-items: center; gap: 10px; flex: 1; min-width: 250px;">
                        <div style="display: flex; align-items: center; gap: 5px;">
                            <span style="font-size: 12px; font-weight: bold;">Qty:</span>
                            <button type="button" class="qty-minus-btn" data-product-id="${doc.id}" 
                                    style="width: 35px; height: 35px; border: 2px solid #d1d5db; border-radius: 6px; background: white; cursor: pointer; font-size: 18px; font-weight: bold;">
                                −
                            </button>
                            <input type="number" class="bulk-quantity-input" 
                                   data-product-id="${doc.id}" 
                                   min="0" value="0" max="${product.currentStock}"
                                   style="width: 60px; padding: 8px; border: 2px solid #d1d5db; border-radius: 6px; text-align: center; font-size: 16px; font-weight: bold;">
                            <button type="button" class="qty-plus-btn" data-product-id="${doc.id}" 
                                    style="width: 35px; height: 35px; border: 2px solid #dc2626; border-radius: 6px; background: #dc2626; color: white; cursor: pointer; font-size: 18px; font-weight: bold;">
                                +
                            </button>
                        </div>
                        
                        <div style="display: flex; align-items: center; gap: 5px; background: #f3f4f6; padding: 8px 12px; border-radius: 6px;">
                            <span style="font-size: 12px; font-weight: bold;">Rate:</span>
                            <span style="font-size: 16px; font-weight: bold; color: #dc2626;">₹${product.sellingPrice}</span>
                        </div>
                        
                        <div class="bulk-total" id="bulkTotal-${doc.id}" 
                             style="font-weight: bold; color: #dc2626; min-width: 80px; text-align: right; font-size: 16px;">
                            ₹0.00
                        </div>
                    </div>
                </div>
            `;
        });
        
        html += `
            <div class="bulk-summary" style="background: #fef2f2; border: 2px solid #fecaca; border-radius: 8px; padding: 15px; margin-top: 20px;">
                <div class="bulk-summary-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px;">
                    <div class="bulk-summary-item" style="text-align: center;">
                        <div class="bulk-summary-label" style="font-size: 12px; color: #6b7280;">Total Items</div>
                        <div class="bulk-summary-value" id="bulkTotalItems" style="font-size: 22px; font-weight: bold; color: #dc2626;">0</div>
                    </div>
                    <div class="bulk-summary-item" style="text-align: center;">
                        <div class="bulk-summary-label" style="font-size: 12px; color: #6b7280;">Total Quantity</div>
                        <div class="bulk-summary-value" id="bulkTotalQuantity" style="font-size: 22px; font-weight: bold; color: #dc2626;">0</div>
                    </div>
                    <div class="bulk-summary-item" style="text-align: center;">
                        <div class="bulk-summary-label" style="font-size: 12px; color: #6b7280;">Total Value</div>
                        <div class="bulk-summary-value" id="bulkTotalValue" style="font-size: 22px; font-weight: bold; color: #dc2626;">₹0.00</div>
                    </div>
                </div>
                <button class="btn btn-danger" id="bulkSubmitBtn" style="width: 100%; margin-top: 15px; padding: 12px; font-size: 16px; font-weight: bold;">
                    📤 Bulk Stock Out
                </button>
            </div>
        `;
        
        container.innerHTML = html;
        
        document.querySelectorAll('.qty-plus-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const productId = btn.dataset.productId;
                const input = document.querySelector(`.bulk-quantity-input[data-product-id="${productId}"]`);
                const product = bulkProducts.find(p => p.id === productId);
                
                if (input && product) {
                    const currentValue = parseInt(input.value) || 0;
                    const maxStock = product.currentStock;
                    
                    if (currentValue < maxStock) {
                        input.value = currentValue + 1;
                        updateBulkTotals();
                    } else {
                        Utils.showToast(`Maximum stock: ${maxStock}`, 'warning');
                    }
                }
            });
        });
        
        document.querySelectorAll('.qty-minus-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const productId = btn.dataset.productId;
                const input = document.querySelector(`.bulk-quantity-input[data-product-id="${productId}"]`);
                if (input) {
                    const currentValue = parseInt(input.value) || 0;
                    input.value = Math.max(0, currentValue - 1);
                    updateBulkTotals();
                }
            });
        });
        
        document.querySelectorAll('.bulk-quantity-input').forEach(input => {
            input.addEventListener('input', () => {
                const productId = input.dataset.productId;
                const product = bulkProducts.find(p => p.id === productId);
                
                if (product && parseInt(input.value) > product.currentStock) {
                    input.value = product.currentStock;
                    Utils.showToast(`Maximum stock: ${product.currentStock}`, 'warning');
                }
                
                updateBulkTotals();
            });
        });
        
        document.getElementById('setAllZero').addEventListener('click', () => {
            document.querySelectorAll('.bulk-quantity-input').forEach(input => {
                input.value = 0;
            });
            updateBulkTotals();
        });
        
        document.getElementById('setAllTen').addEventListener('click', () => {
            document.querySelectorAll('.bulk-quantity-input').forEach(input => {
                const productId = input.dataset.productId;
                const product = bulkProducts.find(p => p.id === productId);
                input.value = product ? Math.min(10, product.currentStock) : 10;
            });
            updateBulkTotals();
        });
        
        document.getElementById('incrementAll').addEventListener('click', () => {
            document.querySelectorAll('.bulk-quantity-input').forEach(input => {
                const productId = input.dataset.productId;
                const product = bulkProducts.find(p => p.id === productId);
                const currentValue = parseInt(input.value) || 0;
                
                if (product && currentValue < product.currentStock) {
                    input.value = currentValue + 1;
                }
            });
            updateBulkTotals();
        });
        
        document.getElementById('decrementAll').addEventListener('click', () => {
            document.querySelectorAll('.bulk-quantity-input').forEach(input => {
                const currentValue = parseInt(input.value) || 0;
                input.value = Math.max(0, currentValue - 1);
            });
            updateBulkTotals();
        });
        
        document.getElementById('bulkSubmitBtn').addEventListener('click', handleBulkStockOut);
        
        updateBulkTotals();
        
    } catch (error) {
        console.error('Error loading bulk products:', error);
        container.innerHTML = '<p style="text-align: center; color: #dc2626;">Error: ' + error.message + '</p>';
    }
}

function updateBulkTotals() {
    let totalItems = 0;
    let totalQuantity = 0;
    let totalValue = 0;
    
    document.querySelectorAll('.bulk-quantity-input').forEach(input => {
        const productId = input.dataset.productId;
        const quantity = parseInt(input.value) || 0;
        
        const product = bulkProducts.find(p => p.id === productId);
        const rate = product ? product.sellingPrice : 0;
        const total = quantity * rate;
        
        const totalElement = document.getElementById(`bulkTotal-${productId}`);
        if (totalElement) {
            totalElement.textContent = Formatters.formatINR(total);
        }
        
        if (quantity > 0) {
            totalItems++;
            totalQuantity += quantity;
            totalValue += total;
        }
    });
    
    const totalItemsEl = document.getElementById('bulkTotalItems');
    const totalQuantityEl = document.getElementById('bulkTotalQuantity');
    const totalValueEl = document.getElementById('bulkTotalValue');
    
    if (totalItemsEl) totalItemsEl.textContent = totalItems;
    if (totalQuantityEl) totalQuantityEl.textContent = totalQuantity;
    if (totalValueEl) totalValueEl.textContent = Formatters.formatINR(totalValue);
}

async function handleBulkStockOut() {
    const quantityInputs = document.querySelectorAll('.bulk-quantity-input');
    const notes = document.getElementById('bulkNotes') ? document.getElementById('bulkNotes').value.trim() : '';
    
    let successCount = 0;
    let errorCount = 0;
    let errorMessages = [];
    
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
            errorMessages.push(`${productId}: ${error.message}`);
        }
    }
    
    Utils.hideLoading();
    
    if (successCount > 0) {
        Utils.showToast(`Bulk Stock OUT successful! ${successCount} products updated`, 'success');
    }
    
    if (errorCount > 0) {
        console.error('Bulk errors:', errorMessages);
        Utils.showToast(`${errorCount} products failed`, 'error');
    }
    
    if (successCount === 0 && errorCount === 0) {
        Utils.showToast('Please enter quantity for at least one product', 'warning');
    }
    
    await loadProducts();
    await loadRecentStockOut();
    
    const categorySelect = document.getElementById('bulkCategorySelect');
    if (categorySelect.value) {
        await loadBulkProducts(categorySelect.value);
    }
}

function displayProductInfo(product) {
    document.getElementById('productInfo').style.display = 'block';
    document.getElementById('availableStock').textContent = Formatters.formatNumber(product.currentStock);
    document.getElementById('productSku').textContent = product.sku;
    document.getElementById('productCategory').textContent = product.category;
    document.getElementById('sellingPrice').textContent = Formatters.formatINR(product.sellingPrice);
    
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
    const total = quantity * rate;
    document.getElementById('totalValue').textContent = Formatters.formatINR(total);
}

async function handleSingleStockOut(e) {
    e.preventDefault();
    
    const productId = document.getElementById('productSelect').value;
    const quantity = parseInt(document.getElementById('quantity').value);
    const rate = parseFloat(document.getElementById('rate').value);
    const notes = document.getElementById('notes').value.trim();
    
    if (!productId) {
        Utils.showToast('Please select a product', 'error');
        return;
    }
    
    if (!quantity || quantity <= 0) {
        Utils.showToast('Please enter a valid quantity', 'error');
        return;
    }
    
    if (!validateQuantity()) {
        Utils.showToast('Insufficient stock available', 'error');
        return;
    }
    
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
        await loadRecentStockOut();
    } catch (error) {
        Utils.hideLoading();
        console.error('Stock OUT error:', error);
        Utils.showToast(error.message || 'Error performing stock OUT', 'error');
    }
}

async function loadRecentStockOut() {
    const db = firebase.firestore();
    const tbody = document.getElementById('recentStockOut');
    
    if (!tbody) return;
    
    try {
        const snapshot = await db.collection('stockTransactions')
            .where('type', '==', 'OUT')
            .limit(10)
            .get();
        
        if (snapshot.empty) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center">No transactions yet</td></tr>';
            return;
        }
        
        tbody.innerHTML = '';
        
        snapshot.forEach(doc => {
            const transaction = doc.data();
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${Formatters.formatDateTime(transaction.createdAt)}</td>
                <td>${transaction.productName}</td>
                <td>${Formatters.formatNumber(transaction.quantity)}</td>
                <td>${Formatters.formatINR(transaction.totalValue)}</td>
                <td>${transaction.userName}</td>
            `;
            tbody.appendChild(row);
        });
    } catch (error) {
        console.error('Error loading recent transactions:', error);
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