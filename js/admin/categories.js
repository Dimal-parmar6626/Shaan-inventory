
document.addEventListener('DOMContentLoaded', async () => {
  try {
    await AuthGuard.requireAdmin();
  } catch (error) {
    console.error('Access denied:', error);
    return;
  }
  
  loadCategories();
  setupEventListeners();
  setupSidebar();
  setupLogout();
});

async function loadCategories() {
  const db = firebase.firestore();
  const tbody = document.getElementById('categoriesTable');
  
  try {
    tbody.innerHTML = '<tr><td colspan="4" class="text-center">Loading categories...</td></tr>';
    
    const snapshot = await db.collection('categories')
      .orderBy('name', 'asc')
      .get();
    
    if (snapshot.empty) {
      tbody.innerHTML = '<tr><td colspan="4" class="text-center">No categories found</td></tr>';
      return;
    }
    
    tbody.innerHTML = '';
    
    snapshot.forEach(doc => {
      const category = doc.data();
      const row = document.createElement('tr');
      
      row.innerHTML = `
                <td><strong>${category.name}</strong></td>
                <td>${category.description || '-'}</td>
                <td>${Formatters.formatDate(category.createdAt)}</td>
                <td>
                    <button class="btn btn-sm btn-primary edit-btn" 
                            data-id="${doc.id}" 
                            data-name="${category.name}" 
                            data-description="${category.description || ''}">
                        Edit
                    </button>
                    <button class="btn btn-sm btn-danger delete-btn" 
                            data-id="${doc.id}" 
                            data-name="${category.name}">
                        Delete
                    </button>
                </td>
            `;
      
      tbody.appendChild(row);
    });
    
    document.querySelectorAll('.edit-btn').forEach(btn => {
      btn.addEventListener('click', function() {
        editCategory(this.dataset.id, this.dataset.name, this.dataset.description);
      });
    });
    
    document.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', function() {
        deleteCategory(this.dataset.id, this.dataset.name);
      });
    });
    
  } catch (error) {
    console.error('Error loading categories:', error);
    tbody.innerHTML = '<tr><td colspan="4" class="text-center text-danger">Error loading categories</td></tr>';
    Utils.showToast('Error loading categories', 'error');
  }
}

function setupEventListeners() {
  document.getElementById('categoryForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const name = document.getElementById('categoryName').value.trim();
    const description = document.getElementById('categoryDescription').value.trim();
    
    if (!name) {
      Utils.showToast('Category name is required', 'error');
      return;
    }
    
    if (name.length < 2) {
      Utils.showToast('Category name must be at least 2 characters', 'error');
      return;
    }
    
    try {
      Utils.showLoading();
      
      const db = firebase.firestore();
      
      const existing = await db.collection('categories')
        .where('name', '==', name)
        .get();
      
      if (!existing.empty) {
        Utils.hideLoading();
        Utils.showToast('Category already exists', 'error');
        return;
      }
      
      await db.collection('categories').add({
        name: name,
        description: description || '',
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      
      Utils.hideLoading();
      Utils.showToast('Category added successfully', 'success');
      
      document.getElementById('categoryForm').reset();
      
      loadCategories();
      
    } catch (error) {
      console.error('Error adding category:', error);
      Utils.hideLoading();
      Utils.showToast('Error adding category', 'error');
    }
  });
}

function editCategory(id, name, description) {
  const rows = document.querySelectorAll('#categoriesTable tr');
  let targetRow = null;
  
  rows.forEach(row => {
    const editBtn = row.querySelector('.edit-btn');
    if (editBtn && editBtn.dataset.id === id) {
      targetRow = row;
    }
  });
  
  if (!targetRow) return;
  
  targetRow.innerHTML = `
        <td><input type="text" id="editName" class="form-control" value="${name}"></td>
        <td><input type="text" id="editDescription" class="form-control" value="${description}"></td>
        <td>-</td>
        <td>
            <button class="btn btn-sm btn-success save-btn">Save</button>
            <button class="btn btn-sm btn-secondary cancel-btn">Cancel</button>
        </td>
    `;
  
  targetRow.querySelector('.save-btn').addEventListener('click', async () => {
    const newName = targetRow.querySelector('#editName').value.trim();
    const newDescription = targetRow.querySelector('#editDescription').value.trim();
    
    if (!newName) {
      Utils.showToast('Category name is required', 'error');
      return;
    }
    
    try {
      Utils.showLoading();
      
      const db = firebase.firestore();
      await db.collection('categories').doc(id).update({
        name: newName,
        description: newDescription
      });
      
      Utils.hideLoading();
      Utils.showToast('Category updated successfully', 'success');
      loadCategories();
      
    } catch (error) {
      console.error('Error updating category:', error);
      Utils.hideLoading();
      Utils.showToast('Error updating category', 'error');
    }
  });
  
  targetRow.querySelector('.cancel-btn').addEventListener('click', () => {
    loadCategories();
  });
}

function deleteCategory(id, name) {
  Utils.showConfirm(`Are you sure you want to delete category "${name}"?`, async () => {
    try {
      Utils.showLoading();
      
      const db = firebase.firestore();
      
      const productsQuery = await db.collection('products')
        .where('category', '==', name)
        .get();
      
      if (!productsQuery.empty) {
        Utils.hideLoading();
        Utils.showToast('Cannot delete category that has products', 'error');
        return;
      }
      
      await db.collection('categories').doc(id).delete();
      
      Utils.hideLoading();
      Utils.showToast('Category deleted successfully', 'success');
      loadCategories();
      
    } catch (error) {
      console.error('Error deleting category:', error);
      Utils.hideLoading();
      Utils.showToast('Error deleting category', 'error');
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