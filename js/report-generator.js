
class ReportGenerator {
  static async generateReport(filters) {
    const db = firebase.firestore();
    
    try {
      let query = db.collection('stockTransactions');
      
      if (filters.dateRange && filters.dateRange !== 'custom') {
        const dateRange = Utils.getDateRange(filters.dateRange);
        query = query.where('createdAt', '>=', dateRange.start)
          .where('createdAt', '<=', dateRange.end);
      } else if (filters.dateRange === 'custom' && filters.startDate && filters.endDate) {
        const startDate = new Date(filters.startDate);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(filters.endDate);
        endDate.setHours(23, 59, 59, 999);
        
        query = query.where('createdAt', '>=', startDate)
          .where('createdAt', '<=', endDate);
      }
      
      if (filters.productId) {
        query = query.where('productId', '==', filters.productId);
      }
      
      if (filters.userId) {
        query = query.where('userId', '==', filters.userId);
      }
      
      if (filters.type) {
        query = query.where('type', '==', filters.type);
      }
      
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        query = query.where('productName', '>=', searchLower)
          .where('productName', '<=', searchLower + '\uf8ff');
      }
      
      query = query.orderBy('createdAt', 'desc');
      
      const snapshot = await query.get();
      const transactions = [];
      
      snapshot.forEach(doc => {
        transactions.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      return transactions;
    } catch (error) {
      console.error('Error generating report:', error);
      throw error;
    }
  }
  
  static async generateMonthlySummary(months = 6) {
    const db = firebase.firestore();
    
    try {
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - months);
      startDate.setDate(1);
      startDate.setHours(0, 0, 0, 0);
      
      const snapshot = await db.collection('stockTransactions')
        .where('createdAt', '>=', startDate)
        .orderBy('createdAt', 'asc')
        .get();
      
      const monthlyData = {};
      
      snapshot.forEach(doc => {
        const transaction = doc.data();
        const date = transaction.createdAt.toDate();
        const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
        
        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = {
            month: Formatters.getMonthYear(date),
            inQty: 0,
            outQty: 0,
            inValue: 0,
            outValue: 0
          };
        }
        
        if (transaction.type === 'IN') {
          monthlyData[monthKey].inQty += transaction.quantity;
          monthlyData[monthKey].inValue += transaction.totalValue;
        } else {
          monthlyData[monthKey].outQty += transaction.quantity;
          monthlyData[monthKey].outValue += transaction.totalValue;
        }
      });
      
      return Object.values(monthlyData);
    } catch (error) {
      console.error('Error generating monthly summary:', error);
      throw error;
    }
  }
  
  static calculateSummary(transactions) {
    const summary = {
      totalQuantity: 0,
      totalValue: 0,
      transactionCount: transactions.length,
      stockInCount: 0,
      stockOutCount: 0,
      stockInValue: 0,
      stockOutValue: 0
    };
    
    transactions.forEach(transaction => {
      summary.totalQuantity += transaction.quantity;
      summary.totalValue += transaction.totalValue;
      
      if (transaction.type === 'IN') {
        summary.stockInCount += transaction.quantity;
        summary.stockInValue += transaction.totalValue;
      } else {
        summary.stockOutCount += transaction.quantity;
        summary.stockOutValue += transaction.totalValue;
      }
    });
    
    return summary;
  }
  
  static exportToCSV(transactions, filename = 'report.csv') {
    if (transactions.length === 0) {
      Utils.showToast('No data to export', 'warning');
      return;
    }
    
    const headers = [
      'Date & Time',
      'Product',
      'SKU',
      'Category',
      'Type',
      'Quantity',
      'Rate',
      'Total Value',
      'Previous Stock',
      'New Stock',
      'User'
    ];
    
    const csvRows = [headers.join(',')];
    
    transactions.forEach(transaction => {
      const row = [
        Formatters.formatDateTime(transaction.createdAt),
        transaction.productName,
        transaction.sku || '',
        transaction.category || '',
        transaction.type,
        transaction.quantity,
        transaction.rate,
        transaction.totalValue,
        transaction.previousStock,
        transaction.newStock,
        transaction.userName
      ];
      
      const escapedRow = row.map(field => {
        if (typeof field === 'string' && (field.includes(',') || field.includes('"'))) {
          return `"${field.replace(/"/g, '""')}"`;
        }
        return field;
      });
      
      csvRows.push(escapedRow.join(','));
    });
    
    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    Utils.showToast('Report exported successfully', 'success');
  }
}

window.ReportGenerator = ReportGenerator;