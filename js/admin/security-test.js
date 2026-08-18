
document.addEventListener('DOMContentLoaded', async () => {
  try {
    await AuthGuard.requireAdmin();
  } catch (error) {
    console.error('Access denied:', error);
    return;
  }
  
  setupEventListeners();
  setupSidebar();
  setupLogout();
});

function setupEventListeners() {
  document.getElementById('runTests').addEventListener('click', async () => {
    const resultsDiv = document.getElementById('testResults');
    
    resultsDiv.innerHTML = '<p>Running tests...</p>';
    
    const results = await SecurityTester.testPermissions();
    
    let html = '<div class="table-container"><table class="table">';
    html += '<thead><tr><th>Test</th><th>Status</th></tr></thead><tbody>';
    
    results.forEach(result => {
      const statusColor = result.status === 'PASS' ? 'green' : 'red';
      html += `
                <tr>
                    <td>${result.name}</td>
                    <td style="color: ${statusColor}; font-weight: bold;">${result.status}</td>
                </tr>
            `;
    });
    
    html += '</tbody></table></div>';
    resultsDiv.innerHTML = html;
  });
  
  document.getElementById('checkIntegrity').addEventListener('click', async () => {
    const resultsDiv = document.getElementById('integrityResults');
    
    resultsDiv.innerHTML = '<p>Checking data integrity...</p>';
    
    const result = await SecurityTester.checkDataIntegrity();
    
    let html = `<div style="margin-bottom: 15px;">
            <strong>Status:</strong> 
            <span style="color: ${result.valid ? 'green' : 'red'}; font-weight: bold;">
                ${result.valid ? 'VALID' : 'ISSUES FOUND'}
            </span>
        </div>`;
    
    if (result.totalProducts) {
      html += `<div><strong>Total Products:</strong> ${result.totalProducts}</div>`;
    }
    
    if (result.totalTransactions) {
      html += `<div><strong>Total Transactions:</strong> ${result.totalTransactions}</div>`;
    }
    
    if (result.issues && result.issues.length > 0) {
      html += '<div style="margin-top: 15px;"><strong>Issues:</strong></div>';
      html += '<ul>';
      result.issues.forEach(issue => {
        html += `<li style="color: red;">${issue}</li>`;
      });
      html += '</ul>';
    } else if (result.valid) {
      html += '<div style="margin-top: 15px; color: green;">No issues found. Data is consistent.</div>';
    }
    
    resultsDiv.innerHTML = html;
  });
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