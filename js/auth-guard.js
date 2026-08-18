class AuthGuard {
  static async protectPage(requiredRole = null) {
    const auth = firebase.auth();
    const db = firebase.firestore();

    try {
      await auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
    } catch (persistenceError) {
      console.warn('Could not enable local auth persistence:', persistenceError);
    }
    
    return new Promise((resolve, reject) => {
      const unsubscribe = auth.onAuthStateChanged(async (user) => {
        unsubscribe();
        
        if (!user) {
          window.location.href = '../index.html';
          reject(new Error('Not authenticated'));
          return;
        }
        
        try {
          const userDoc = await db.collection('users').doc(user.uid).get();
          
          if (!userDoc.exists) {
            await auth.signOut();
            window.location.href = '../index.html';
            reject(new Error('User profile not found'));
            return;
          }
          
          const userData = userDoc.data();
          
          if (!userData.active) {
            await auth.signOut();
            window.location.href = '../index.html';
            reject(new Error('Account disabled'));
            return;
          }
          
          if (requiredRole && userData.role !== requiredRole) {
            if (userData.role === 'admin') {
              window.location.href = '../admin/dashboard.html';
            } else {
              window.location.href = '../employee/dashboard.html';
            }
            reject(new Error('Invalid role'));
            return;
          }
          
          window.currentUser = {
            id: user.uid,
            email: user.email,
            ...userData
          };
          
          resolve(userData);
        } catch (error) {
          console.error('Auth guard error:', error);
          reject(error);
        }
      });
    });
  }
  
  static async requireAdmin() {
    return await this.protectPage('admin');
  }
  
  static async requireEmployee() {
    return await this.protectPage('employee');
  }
}

window.AuthGuard = AuthGuard;