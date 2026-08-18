
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await AuthGuard.requireAdmin();
    } catch (error) {
        console.error('Access denied:', error);
        return;
    }

    loadEmployees();
    setupEventListeners();
    setupSidebar();
    setupLogout();
});

async function loadEmployees() {
    const db = firebase.firestore();
    const tbody = document.getElementById('employeesTable');
    
    try {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">Loading employees...</td></tr>';
        
        const snapshot = await db.collection('users')
            .where('role', '==', 'employee')
            .get();
        
        const employees = [];
        snapshot.forEach(doc => {
            employees.push({ 
                id: doc.id, 
                ...doc.data() 
            });
        });
        
        employees.sort((a, b) => {
            const nameA = (a.name || '').toLowerCase();
            const nameB = (b.name || '').toLowerCase();
            if (nameA < nameB) return -1;
            if (nameA > nameB) return 1;
            return 0;
        });
        
        if (employees.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center">No employees found</td></tr>';
            return;
        }
        
        tbody.innerHTML = '';
        
        employees.forEach(employee => {
            const row = document.createElement('tr');
            const statusBadge = employee.active ? 
                '<span class="badge badge-success">Active</span>' : 
                '<span class="badge badge-danger">Inactive</span>';
            
            row.innerHTML = `
                <td><strong>${employee.name || 'N/A'}</strong></td>
                <td>${employee.email || 'N/A'}</td>
                <td>${statusBadge}</td>
                <td>${Formatters.formatDate(employee.createdAt)}</td>
                <td>
                    <button class="btn btn-sm btn-primary edit-btn" data-id="${employee.id}">Edit</button>
                    <button class="btn btn-sm ${employee.active ? 'btn-danger' : 'btn-success'} toggle-btn" 
                            data-id="${employee.id}" 
                            data-active="${employee.active}">
                        ${employee.active ? 'Disable' : 'Enable'}
                    </button>
                </td>
            `;
            
            tbody.appendChild(row);
        });
        
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                editEmployee(this.dataset.id);
            });
        });
        
        document.querySelectorAll('.toggle-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                toggleEmployeeStatus(this.dataset.id, this.dataset.active === 'true');
            });
        });
        
    } catch (error) {
        console.error('Error loading employees:', error);
        
        if (error.code === 'failed-precondition') {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center">
                        <div style="padding: 20px;">
                            <p style="color: #dc2626; font-weight: bold;">Database index required</p>
                            <p style="margin: 10px 0;">The query requires an index. You can create it manually:</p>
                            <ol style="text-align: left; display: inline-block; margin: 10px 0;">
                                <li>Go to Firebase Console</li>
                                <li>Navigate to Firestore Database</li>
                                <li>Click on "Indexes" tab</li>
                                <li>Create a composite index for:</li>
                                <ul>
                                    <li>Collection: users</li>
                                    <li>Field 1: role (Ascending)</li>
                                    <li>Field 2: name (Ascending)</li>
                                </ul>
                            </ol>
                            <br>
                            <button class="btn btn-primary btn-sm" onclick="location.reload()">
                                Reload After Creating Index
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        } else {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center text-danger">
                        Error loading employees: ${error.message}
                        <br>
                        <button class="btn btn-primary btn-sm" onclick="location.reload()">
                            Retry
                        </button>
                    </td>
                </tr>
            `;
        }
        
        Utils.showToast('Error loading employees', 'error');
    }
}

function setupEventListeners() {
    const addBtn = document.getElementById('addEmployeeBtn');
    if (addBtn) {
        addBtn.addEventListener('click', () => {
            openModal();
        });
    }
    
    const closeBtn = document.getElementById('closeModal');
    if (closeBtn) {
        closeBtn.addEventListener('click', closeModal);
    }
    
    const cancelBtn = document.getElementById('cancelBtn');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', closeModal);
    }
    
    const form = document.getElementById('employeeForm');
    if (form) {
        form.addEventListener('submit', saveEmployee);
    }
    
    const modal = document.getElementById('employeeModal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === e.currentTarget) {
                closeModal();
            }
        });
    }
}

function openModal(employee = null) {
    const modal = document.getElementById('employeeModal');
    const modalTitle = document.getElementById('modalTitle');
    const form = document.getElementById('employeeForm');
    const passwordGroup = document.getElementById('passwordGroup');
    const emailInput = document.getElementById('employeeEmail');
    
    if (!modal || !modalTitle || !form) return;
    
    form.reset();
    
    if (employee) {
        modalTitle.textContent = 'Edit Employee';
        document.getElementById('employeeId').value = employee.id;
        document.getElementById('employeeName').value = employee.name || '';
        document.getElementById('employeeEmail').value = employee.email || '';
        document.getElementById('employeeEmail').disabled = true;
        document.getElementById('employeeEmail').style.backgroundColor = '#f3f4f6';
        document.getElementById('employeeStatus').value = employee.active ? 'true' : 'false';
        
        if (passwordGroup) {
            passwordGroup.style.display = 'none';
        }
        document.getElementById('employeePassword').required = false;
    } else {
        modalTitle.textContent = 'Add Employee';
        document.getElementById('employeeId').value = '';
        document.getElementById('employeeEmail').disabled = false;
        document.getElementById('employeeEmail').style.backgroundColor = '';
        document.getElementById('employeeStatus').value = 'true';
        
        if (passwordGroup) {
            passwordGroup.style.display = 'block';
        }
        document.getElementById('employeePassword').required = true;
    }
    
    modal.style.display = 'flex';
}

function closeModal() {
    const modal = document.getElementById('employeeModal');
    if (modal) {
        modal.style.display = 'none';
    }
    
    const emailInput = document.getElementById('employeeEmail');
    if (emailInput) {
        emailInput.disabled = false;
        emailInput.style.backgroundColor = '';
    }
}

async function saveEmployee(e) {
    e.preventDefault();
    
    const employeeId = document.getElementById('employeeId').value;
    const name = document.getElementById('employeeName').value.trim();
    const email = document.getElementById('employeeEmail').value.trim();
    const password = document.getElementById('employeePassword').value;
    const active = document.getElementById('employeeStatus').value === 'true';
    
    if (!name || name.length < 2) {
        Utils.showToast('Please enter a valid name (minimum 2 characters)', 'error');
        return;
    }
    
    if (!email || !email.includes('@') || !email.includes('.')) {
        Utils.showToast('Please enter a valid email address', 'error');
        return;
    }
    
    if (!employeeId && (!password || password.length < 6)) {
        Utils.showToast('Password must be at least 6 characters', 'error');
        return;
    }
    
    try {
        Utils.showLoading();
        
        const db = firebase.firestore();
        const auth = firebase.auth();
        
        if (employeeId) {
            await db.collection('users').doc(employeeId).update({
                name: name,
                active: active,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            Utils.hideLoading();
            Utils.showToast('Employee updated successfully', 'success');
            closeModal();
            loadEmployees();
            
        } else {
            
            const existingUsers = await db.collection('users')
                .where('email', '==', email)
                .get();
            
            if (!existingUsers.empty) {
                Utils.hideLoading();
                Utils.showToast('An employee with this email already exists', 'error');
                return;
            }
            
            try {
                const userCredential = await auth.createUserWithEmailAndPassword(email, password);
                
                await db.collection('users').doc(userCredential.user.uid).set({
                    name: name,
                    email: email,
                    role: 'employee',
                    active: active,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                
                Utils.hideLoading();
                Utils.showToast('Employee added successfully', 'success');
                closeModal();
                loadEmployees();
                
            } catch (authError) {
                Utils.hideLoading();
                console.error('Auth error:', authError);
                
                switch (authError.code) {
                    case 'auth/email-already-in-use':
                        Utils.showToast('This email is already registered. Please use a different email.', 'error');
                        break;
                    case 'auth/invalid-email':
                        Utils.showToast('Invalid email address format.', 'error');
                        break;
                    case 'auth/operation-not-allowed':
                        Utils.showToast('Email/Password sign-in is not enabled. Please enable it in Firebase Console.', 'error');
                        break;
                    case 'auth/weak-password':
                        Utils.showToast('Password is too weak. Please use at least 6 characters.', 'error');
                        break;
                    default:
                        Utils.showToast(authError.message || 'Error creating employee', 'error');
                }
            }
        }
        
    } catch (error) {
        Utils.hideLoading();
        console.error('Error saving employee:', error);
        
        let errorMessage = 'Error saving employee';
        
        switch (error.code) {
            case 'permission-denied':
                errorMessage = 'You do not have permission to perform this action';
                break;
            case 'unavailable':
                errorMessage = 'Service temporarily unavailable. Please try again';
                break;
            default:
                if (error.message) errorMessage = error.message;
        }
        
        Utils.showToast(errorMessage, 'error');
    }
}

async function editEmployee(employeeId) {
    try {
        Utils.showLoading();
        
        const db = firebase.firestore();
        const doc = await db.collection('users').doc(employeeId).get();
        
        Utils.hideLoading();
        
        if (doc.exists) {
            openModal({ id: doc.id, ...doc.data() });
        } else {
            Utils.showToast('Employee not found', 'error');
        }
    } catch (error) {
        Utils.hideLoading();
        console.error('Error loading employee:', error);
        Utils.showToast('Error loading employee', 'error');
    }
}

async function toggleEmployeeStatus(employeeId, currentStatus) {
    const action = currentStatus ? 'disable' : 'enable';
    
    Utils.showConfirm(`Are you sure you want to ${action} this employee?`, async () => {
        try {
            Utils.showLoading();
            
            const db = firebase.firestore();
            await db.collection('users').doc(employeeId).update({
                active: !currentStatus,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            Utils.hideLoading();
            Utils.showToast(`Employee ${action}d successfully`, 'success');
            loadEmployees();
            
        } catch (error) {
            Utils.hideLoading();
            console.error('Error toggling employee status:', error);
            Utils.showToast('Error updating employee status', 'error');
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