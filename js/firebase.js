
class FirebaseService {
  constructor() {
    this.db = firebase.firestore();
    this.auth = firebase.auth();
  }
  
  getCurrentUser() {
    return this.auth.currentUser;
  }
  
  async getCurrentUserProfile() {
    const user = this.getCurrentUser();
    if (!user) return null;
    
    try {
      const userDoc = await this.db.collection('users').doc(user.uid).get();
      if (userDoc.exists) {
        return { id: userDoc.id, ...userDoc.data() };
      }
      return null;
    } catch (error) {
      console.error('Error getting user profile:', error);
      return null;
    }
  }
  
  async isAdmin() {
    const profile = await this.getCurrentUserProfile();
    return profile && profile.role === 'admin' && profile.active;
  }
  
  async isEmployee() {
    const profile = await this.getCurrentUserProfile();
    return profile && profile.role === 'employee' && profile.active;
  }
  
  async signOut() {
    try {
      await this.auth.signOut();
      window.location.href = '../index.html';
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  }
  
  async getCategories() {
    const cacheKey = 'categories_cache';
    const cacheTime = 3600000;
    
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < cacheTime) {
        return data;
      }
    }
    
    try {
      const snapshot = await this.db.collection('categories')
        .orderBy('name', 'asc')
        .get();
      
      const categories = [];
      snapshot.forEach(doc => {
        categories.push({ id: doc.id, ...doc.data() });
      });
      
      localStorage.setItem(cacheKey, JSON.stringify({
        data: categories,
        timestamp: Date.now()
      }));
      
      return categories;
    } catch (error) {
      console.error('Error getting categories:', error);
      return [];
    }
  }
  
  async getProducts(limit = 20, startAfterDoc = null) {
    try {
      let query = this.db.collection('products')
        .orderBy('name', 'asc')
        .limit(limit);
      
      if (startAfterDoc) {
        query = query.startAfter(startAfterDoc);
      }
      
      const snapshot = await query.get();
      const products = [];
      let lastDoc = null;
      
      snapshot.forEach(doc => {
        products.push({ id: doc.id, ...doc.data() });
        lastDoc = doc;
      });
      
      return {
        products,
        lastDoc,
        hasMore: snapshot.docs.length === limit
      };
    } catch (error) {
      console.error('Error getting products:', error);
      return { products: [], lastDoc: null, hasMore: false };
    }
  }
  
  async getProduct(productId) {
    try {
      const doc = await this.db.collection('products').doc(productId).get();
      if (doc.exists) {
        return { id: doc.id, ...doc.data() };
      }
      return null;
    } catch (error) {
      console.error('Error getting product:', error);
      return null;
    }
  }
  
  async searchProducts(searchTerm, limit = 20) {
    try {
      const searchLower = searchTerm.toLowerCase();
      
      const nameQuery = await this.db.collection('products')
        .where('name', '>=', searchLower)
        .where('name', '<=', searchLower + '\uf8ff')
        .limit(limit)
        .get();
      
      const skuQuery = await this.db.collection('products')
        .where('sku', '>=', searchLower.toUpperCase())
        .where('sku', '<=', searchLower.toUpperCase() + '\uf8ff')
        .limit(limit)
        .get();
      
      const products = new Map();
      
      nameQuery.forEach(doc => {
        products.set(doc.id, { id: doc.id, ...doc.data() });
      });
      
      skuQuery.forEach(doc => {
        products.set(doc.id, { id: doc.id, ...doc.data() });
      });
      
      return Array.from(products.values());
    } catch (error) {
      console.error('Error searching products:', error);
      return [];
    }
  }
}

const firebaseService = new FirebaseService();

window.firebaseService = firebaseService;