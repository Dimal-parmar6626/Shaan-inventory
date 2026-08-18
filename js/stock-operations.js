
class StockOperations {
  static async performStockIn(productId, quantity, rate, notes = '') {
    const db = firebase.firestore();
    const user = firebase.auth().currentUser;
    
    if (!user) throw new Error('User not authenticated');
    
    const userDoc = await db.collection('users').doc(user.uid).get();
    if (!userDoc.exists) throw new Error('User profile not found');
    
    const userData = userDoc.data();
    
    if (!productId || !quantity || quantity <= 0) {
      throw new Error('Invalid quantity');
    }
    
    if (rate < 0) {
      throw new Error('Invalid rate');
    }
    
    try {
      const result = await db.runTransaction(async (transaction) => {
        const productRef = db.collection('products').doc(productId);
        const productDoc = await transaction.get(productRef);
        
        if (!productDoc.exists) {
          throw new Error('Product not found');
        }
        
        const product = productDoc.data();
        const previousStock = product.currentStock || 0;
        const newStock = previousStock + quantity;
        const totalValue = quantity * rate;
        
        transaction.update(productRef, {
          currentStock: newStock,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        const transactionRef = db.collection('stockTransactions').doc();
        const transactionData = {
          productId: productId,
          productName: product.name,
          sku: product.sku,
          category: product.category,
          type: 'IN',
          quantity: quantity,
          rate: rate,
          totalValue: totalValue,
          previousStock: previousStock,
          newStock: newStock,
          userId: user.uid,
          userName: userData.name,
          notes: notes || '',
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        transaction.set(transactionRef, transactionData);
        
        return {
          transactionId: transactionRef.id,
          previousStock,
          newStock,
          totalValue
        };
      });
      
      return result;
    } catch (error) {
      console.error('Stock IN transaction failed:', error);
      throw error;
    }
  }
  
  static async performStockOut(productId, quantity, rate, notes = '') {
    const db = firebase.firestore();
    const user = firebase.auth().currentUser;
    
    if (!user) throw new Error('User not authenticated');
    
    const userDoc = await db.collection('users').doc(user.uid).get();
    if (!userDoc.exists) throw new Error('User profile not found');
    
    const userData = userDoc.data();
    
    if (!productId || !quantity || quantity <= 0) {
      throw new Error('Invalid quantity');
    }
    
    if (rate < 0) {
      throw new Error('Invalid rate');
    }
    
    try {
      const result = await db.runTransaction(async (transaction) => {
        const productRef = db.collection('products').doc(productId);
        const productDoc = await transaction.get(productRef);
        
        if (!productDoc.exists) {
          throw new Error('Product not found');
        }
        
        const product = productDoc.data();
        const previousStock = product.currentStock || 0;
        
        if (previousStock < quantity) {
          throw new Error('Insufficient stock available');
        }
        
        const newStock = previousStock - quantity;
        const totalValue = quantity * rate;
        
        transaction.update(productRef, {
          currentStock: newStock,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        const transactionRef = db.collection('stockTransactions').doc();
        const transactionData = {
          productId: productId,
          productName: product.name,
          sku: product.sku,
          category: product.category,
          type: 'OUT',
          quantity: quantity,
          rate: rate,
          totalValue: totalValue,
          previousStock: previousStock,
          newStock: newStock,
          userId: user.uid,
          userName: userData.name,
          notes: notes || '',
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        transaction.set(transactionRef, transactionData);
        
        return {
          transactionId: transactionRef.id,
          previousStock,
          newStock,
          totalValue
        };
      });
      
      return result;
    } catch (error) {
      console.error('Stock OUT transaction failed:', error);
      throw error;
    }
  }
}

window.StockOperations = StockOperations;