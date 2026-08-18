
class AuthService {
  constructor() {
    this.auth = firebase.auth();
    this.db = firebase.firestore();
    this.persistenceReady = this.auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
  }
  
  async signIn(email, password) {
    try {
      await this.persistenceReady;
      const userCredential = await this.auth.signInWithEmailAndPassword(email, password);
      const user = userCredential.user;
      
      const userDoc = await this.db.collection('users').doc(user.uid).get();
      
      if (!userDoc.exists) {
        await this.auth.signOut();
        throw new Error('User profile not found. Please contact administrator.');
      }
      
      const userData = userDoc.data();
      
      if (!userData.active) {
        await this.auth.signOut();
        throw new Error('Your account has been disabled. Please contact administrator.');
      }
      
      if (userData.role === 'admin') {
        window.location.href = 'admin/dashboard.html';
      } else if (userData.role === 'employee') {
        window.location.href = 'employee/dashboard.html';
      } else {
        await this.auth.signOut();
        throw new Error('Invalid user role.');
      }
      
    } catch (error) {
      console.error('Sign in error:', error);
      let errorMessage = 'Login failed. Please try again.';
      
      switch (error.code) {
        case 'auth/invalid-email':
          errorMessage = 'Invalid email address.';
          break;
        case 'auth/user-disabled':
          errorMessage = 'This account has been disabled.';
          break;
        case 'auth/user-not-found':
          errorMessage = 'No account found with this email.';
          break;
        case 'auth/wrong-password':
          errorMessage = 'Incorrect password.';
          break;
        case 'auth/invalid-credential':
          errorMessage = 'Invalid email or password.';
          break;
        default:
          if (error.message) errorMessage = error.message;
      }
      
      throw new Error(errorMessage);
    }
  }
  
  async signOut() {
    try {
      await this.auth.signOut();
      window.location.href = '../index.html';
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  }
  
  async getCurrentProfile() {
    const user = this.auth.currentUser;
    if (!user) return null;
    
    const userDoc = await this.db.collection('users').doc(user.uid).get();
    return userDoc.exists ? { id: userDoc.id, ...userDoc.data() } : null;
  }
  
  onAuthStateChange(callback) {
    return this.auth.onAuthStateChanged(callback);
  }
}

const authService = new AuthService();

window.authService = authService;