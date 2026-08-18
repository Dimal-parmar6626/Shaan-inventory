
document.addEventListener('DOMContentLoaded', async () => {
  try {
    await AuthGuard.requireAdmin();
  } catch (error) {
    console.error('Access denied:', error);
    return;
  }
  
  loadSettings();
  setupEventListeners();
  setupSidebar();
  setupLogout();
});

async function loadSettings() {
  const db = firebase.firestore();
  
  try {
    const settingsDoc = await db.collection('settings').doc('general').get();
    
    if (settingsDoc.exists) {
      const settings = settingsDoc.data();
      document.getElementById('storeName').value = settings.storeName || '';
      document.getElementById('storeAddress').value = settings.storeAddress || '';
      document.getElementById('storePhone').value = settings.storePhone || '';
      document.getElementById('lowStockThreshold').value = settings.lowStockThreshold || 10;
    }
  } catch (error) {
    console.error('Error loading settings:', error);
    Utils.showToast('Error loading settings', 'error');
  }
}

function setupEventListeners() {
  document.getElementById('settingsForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const storeName = document.getElementById('storeName').value.trim();
    const storeAddress = document.getElementById('storeAddress').value.trim();
    const storePhone = document.getElementById('storePhone').value.trim();
    const lowStockThreshold = parseInt(document.getElementById('lowStockThreshold').value);
    
    try {
      Utils.showLoading();
      
      const db = firebase.firestore();
      await db.collection('settings').doc('general').set({
        storeName,
        storeAddress,
        storePhone,
        lowStockThreshold,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
      
      Utils.hideLoading();
      Utils.showToast('Settings saved successfully', 'success');
      
    } catch (error) {
      Utils.hideLoading();
      console.error('Error saving settings:', error);
      Utils.showToast('Error saving settings', 'error');
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