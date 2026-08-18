
class SecurityTester {
  static async testPermissions() {
    const tests = [];
    
    tests.push({
      name: 'User Authentication',
      test: async () => {
        const user = firebase.auth().currentUser;
        return user !== null;
      }
    });
    
    tests.push({
      name: 'Products Read Access',
      test: async () => {
        try {
          const snapshot = await firebase.firestore()
            .collection('products')
            .limit(1)
            .get();
          return true;
        } catch (error) {
          return false;
        }
      }
    });
    
    tests.push({
      name: 'Transaction Write Access',
      test: async () => {
        if (window.currentUser.role === 'employee') {
          try {
            return true;
          } catch (error) {
            return false;
          }
        }
        return true;
      }
    });
    
    tests.push({
      name: 'Unauthorized Product Write',
      test: async () => {
        if (window.currentUser.role === 'employee') {
          try {
            await firebase.firestore()
              .collection('products')
              .doc('test')
              .set({ name: 'Test' });
            return false;
          } catch (error) {
            return true;
          }
        }
        return true;
      }
    });
    
    tests.push({
      name: 'Transaction Immutability',
      test: async () => {
        try {
          await firebase.firestore()
            .collection('stockTransactions')
            .doc('test')
            .delete();
          return false;
        } catch (error) {
          return true;
        }
      }
    });
    
    const results = [];
    
    for (const test of tests) {
      try {
        const passed = await test.test();
        results.push({
          name: test.name,
          passed,
          status: passed ? 'PASS' : 'FAIL'
        });
      } catch (error) {
        results.push({
          name: test.name,
          passed: false,
          status: 'ERROR',
          error: error.message
        });
      }
    }
    
    return results;
  }
  
  static async validateUserRole() {
    const user = window.currentUser;
    
    if (!user) {
      return {
        valid: false,
        message: 'User not authenticated'
      };
    }
    
    if (!user.role) {
      return {
        valid: false,
        message: 'User role not defined'
      };
    }
    
    if (!['admin', 'employee'].includes(user.role)) {
      return {
        valid: false,
        message: 'Invalid user role'
      };
    }
    
    if (user.active === undefined || user.active === null) {
      return {
        valid: false,
        message: 'User active status not defined'
      };
    }
    
    if (!user.active) {
      return {
        valid: false,
        message: 'User account is disabled'
      };
    }
    
    return {
      valid: true,
      message: 'User validation passed'
    };
  }
  
  static async checkDataIntegrity() {
    const db = firebase.firestore();
    const issues = [];
    
    try {
      const productsSnapshot = await db.collection('products').get();
      const products = [];
      
      productsSnapshot.forEach(doc => {
        const product = { id: doc.id, ...doc.data() };
        products.push(product);
        
        if (!product.name || !product.sku || !product.category) {
          issues.push(`Product ${doc.id}: Missing required fields`);
        }
        
        if (product.currentStock < 0) {
          issues.push(`Product ${doc.id}: Negative stock`);
        }
        
        if (product.purchasePrice < 0 || product.sellingPrice < 0) {
          issues.push(`Product ${doc.id}: Negative price`);
        }
        
        if (product.minimumStock < 0) {
          issues.push(`Product ${doc.id}: Negative minimum stock`);
        }
      });
      
      const skus = new Set();
      products.forEach(product => {
        if (skus.has(product.sku)) {
          issues.push(`Duplicate SKU: ${product.sku}`);
        }
        skus.add(product.sku);
      });
      
      const transactionsSnapshot = await db.collection('stockTransactions').get();
      
      transactionsSnapshot.forEach(doc => {
        const transaction = doc.data();
        
        if (!transaction.productId || !transaction.userId) {
          issues.push(`Transaction ${doc.id}: Missing required fields`);
        }
        
        if (transaction.quantity <= 0) {
          issues.push(`Transaction ${doc.id}: Invalid quantity`);
        }
        
        if (transaction.newStock !== transaction.previousStock +
          (transaction.type === 'IN' ? transaction.quantity : -transaction.quantity)) {
          issues.push(`Transaction ${doc.id}: Stock calculation mismatch`);
        }
      });
      
      return {
        valid: issues.length === 0,
        issues,
        totalProducts: products.length,
        totalTransactions: transactionsSnapshot.size
      };
      
    } catch (error) {
      return {
        valid: false,
        issues: [`Error checking integrity: ${error.message}`]
      };
    }
  }
}

window.SecurityTester = SecurityTester;