
let categories = [];

document.addEventListener('DOMContentLoaded', async () => {
    try {
        await AuthGuard.requireAdmin();
    } catch (error) {
        console.error('Access denied:', error);
        return;
    }

    console.log('Loading products page...');
    
    await loadCategories();
    await loadProducts();
    setupEventListeners();
    setupSidebar();
    setupLogout();
});

async function loadCategories() {
    const db = firebase.firestore();
    const categoryFilter = document.getElementById('categoryFilter');
    const categorySelect = document.getElementById('category');
    
    try {
        console.log('Loading categories...');
        
        const snapshot = await db.collection('categories')
            .orderBy('name', 'asc')
            .get();
        
        console.log('Categories found:', snapshot.size);
        
        categories = [];
        snapshot.forEach(doc => {
            categories.push({ id: doc.id, name: doc.data().name });
        });
        
        categoryFilter.innerHTML = '<option value="">All Categories</option>';
        categorySelect.innerHTML = '<option value="">Select Category</option>';
        
        categories.forEach(category => {
            const option1 = document.createElement('option');
            option1.value = category.name;
            option1.textContent = category.name;
            categoryFilter.appendChild(option1);
            
            const option2 = document.createElement('option');
            option2.value = category.name;
            option2.textContent = category.name;
            categorySelect.appendChild(option2);
        });
        
        console.log('Categories loaded:', categories);
        
    } catch (error) {
        console.error('Error loading categories:', error);
        Utils.showToast('Error loading categories: ' + error.message, 'error');
    }
}

async function loadProducts(searchTerm = '', categoryFilter = '') {
    const db = firebase.firestore();
    const tbody = document.getElementById('productsTable');
    
    try {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center">Loading products...</td></tr>';
        
        let query = db.collection('products');
        
        if (categoryFilter) {
            query = query.where('category', '==', categoryFilter);
        }
        
        query = query.orderBy('name', 'asc');
        
        const snapshot = await query.get();
        
        console.log('Products found:', snapshot.size);
        
        if (snapshot.empty) {
            tbody.innerHTML = '<tr><td colspan="8" class="text-center">No products found. Click "+ Add Product" to add one.</td></tr>';
            return;
        }
        
        tbody.innerHTML = '';
        
        snapshot.forEach(doc => {
            const product = doc.data();
            const row = document.createElement('tr');
            
            row.innerHTML = `
                <td><strong>${product.name}</strong></td>
                <td>${product.sku}</td>
                <td>${product.category}</td>
                <td>${product.unit}</td>
                <td>${Formatters.formatINR(product.purchasePrice)}</td>
                <td>${Formatters.formatINR(product.sellingPrice)}</td>
                <td>${Formatters.formatNumber(product.currentStock)}</td>
                <td>
                    <button class="btn btn-sm btn-primary edit-btn" data-id="${doc.id}">Edit</button>
                    <button class="btn btn-sm btn-danger delete-btn" data-id="${doc.id}">Delete</button>
                </td>
            `;
            
            tbody.appendChild(row);
        });
        
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                editProduct(this.dataset.id);
            });
        });
        
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                deleteProduct(this.dataset.id);
            });
        });
        
    } catch (error) {
        console.error('Error loading products:', error);
        tbody.innerHTML = `<tr><td colspan="8" class="text-center text-danger">Error: ${error.message}</td></tr>`;
    }
}

function setupEventListeners() {
    document.getElementById('addProductBtn').addEventListener('click', () => {
        console.log('Add Product button clicked');
        openModal();
    });
    
    document.getElementById('closeModal').addEventListener('click', closeModal);
    document.getElementById('cancelBtn').addEventListener('click', closeModal);
    
    document.getElementById('productForm').addEventListener('submit', saveProduct);
    
    document.getElementById('productModal').addEventListener('click', (e) => {
        if (e.target === e.currentTarget) {
            closeModal();
        }
    });
    
    document.getElementById('searchBtn').addEventListener('click', () => {
        const searchTerm = document.getElementById('searchInput').value.trim();
        const categoryFilter = document.getElementById('categoryFilter').value;
        loadProducts(searchTerm, categoryFilter);
    });
}

function openModal(product = null) {
    console.log('Opening modal...');
    
    const modal = document.getElementById('productModal');
    const modalTitle = document.getElementById('modalTitle');
    const form = document.getElementById('productForm');
    
    form.reset();
    
    if (product) {
        modalTitle.textContent = 'Edit Product';
        document.getElementById('productId').value = product.id;
        document.getElementById('productName').value = product.name;
        document.getElementById('sku').value = product.sku;
        document.getElementById('category').value = product.category;
        document.getElementById('unit').value = product.unit;
        document.getElementById('purchasePrice').value = product.purchasePrice;
        document.getElementById('sellingPrice').value = product.sellingPrice;
        document.getElementById('minimumStock').value = product.minimumStock;
        document.getElementById('currentStock').value = product.currentStock;
    } else {
        modalTitle.textContent = 'Add Product';
        document.getElementById('productId').value = '';
    }
    
    modal.style.display = 'flex';
    console.log('Modal opened');
}

function closeModal() {
    document.getElementById('productModal').style.display = 'none';
}

async function saveProduct(e) {
    e.preventDefault();
    console.log('Saving product...');
    
    const productId = document.getElementById('productId').value;
    const name = document.getElementById('productName').value.trim();
    const sku = document.getElementById('sku').value.trim().toUpperCase();
    const category = document.getElementById('category').value;
    const unit = document.getElementById('unit').value;
    const purchasePrice = parseFloat(document.getElementById('purchasePrice').value);
    const sellingPrice = parseFloat(document.getElementById('sellingPrice').value);
    const minimumStock = parseInt(document.getElementById('minimumStock').value);
    const currentStock = parseInt(document.getElementById('currentStock').value);
    
    if (!name) {
        Utils.showToast('Product name is required', 'error');
        return;
    }
    
    if (!sku) {
        Utils.showToast('SKU is required', 'error');
        return;
    }
    
    if (!category) {
        Utils.showToast('Please select a category', 'error');
        return;
    }
    
    if (!unit) {
        Utils.showToast('Please select a unit', 'error');
        return;
    }
    
    if (isNaN(purchasePrice) || purchasePrice < 0) {
        Utils.showToast('Please enter a valid purchase price', 'error');
        return;
    }
    
    if (isNaN(sellingPrice) || sellingPrice < 0) {
        Utils.showToast('Please enter a valid selling price', 'error');
        return;
    }
    
    if (isNaN(minimumStock) || minimumStock < 0) {
        Utils.showToast('Please enter a valid minimum stock', 'error');
        return;
    }
    
    if (isNaN(currentStock) || currentStock < 0) {
        Utils.showToast('Please enter a valid current stock', 'error');
        return;
    }
    
    try {
        Utils.showLoading();
        
        const db = firebase.firestore();
        
        const productData = {
            name: name,
            sku: sku,
            category: category,
            unit: unit,
            purchasePrice: purchasePrice,
            sellingPrice: sellingPrice,
            minimumStock: minimumStock,
            currentStock: currentStock,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        console.log('Product data:', productData);
        
        if (productId) {
            await db.collection('products').doc(productId).update(productData);
            console.log('Product updated');
            Utils.showToast('Product updated successfully', 'success');
        } else {
            const skuQuery = await db.collection('products')
                .where('sku', '==', sku)
                .get();
            
            if (!skuQuery.empty) {
                Utils.hideLoading();
                Utils.showToast('SKU already exists. Please use a different SKU.', 'error');
                return;
            }
            
            productData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            await db.collection('products').add(productData);
            console.log('Product added');
            Utils.showToast('Product added successfully', 'success');
        }
        
        Utils.hideLoading();
        closeModal();
        await loadCategories();
        await loadProducts();
        
    } catch (error) {
        Utils.hideLoading();
        console.error('Error saving product:', error);
        Utils.showToast('Error saving product: ' + error.message, 'error');
    }
}

async function editProduct(productId) {
    try {
        Utils.showLoading();
        const db = firebase.firestore();
        const doc = await db.collection('products').doc(productId).get();
        Utils.hideLoading();
        
        if (doc.exists) {
            openModal({ id: doc.id, ...doc.data() });
        } else {
            Utils.showToast('Product not found', 'error');
        }
    } catch (error) {
        Utils.hideLoading();
        console.error('Error editing product:', error);
        Utils.showToast('Error loading product', 'error');
    }
}

async function deleteProduct(productId) {
    Utils.showConfirm('Are you sure you want to delete this product?', async () => {
        try {
            Utils.showLoading();
            const db = firebase.firestore();
            await db.collection('products').doc(productId).delete();
            Utils.hideLoading();
            Utils.showToast('Product deleted successfully', 'success');
            loadProducts();
        } catch (error) {
            Utils.hideLoading();
            console.error('Error deleting product:', error);
            Utils.showToast('Error deleting product', 'error');
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