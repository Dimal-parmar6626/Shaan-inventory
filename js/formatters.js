
class Formatters {
  static formatINR(amount) {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount || 0);
  }

  static formatNumber(number) {
    return new Intl.NumberFormat('en-IN').format(number || 0);
  }

  static formatDate(timestamp) {
    if (!timestamp) return '-';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }

  static formatDateTime(timestamp) {
    if (!timestamp) return '-';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  static formatTime(timestamp) {
    if (!timestamp) return '-';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  static getMonthName(date) {
    return date.toLocaleString('en-IN', { month: 'long' });
  }

  static getMonthYear(date) {
    return date.toLocaleString('en-IN', { 
      month: 'long',
      year: 'numeric'
    });
  }

  static getStockStatus(currentStock, minimumStock) {
    if (currentStock <= 0) {
      return { label: 'OUT OF STOCK', color: 'red', badge: 'danger' };
    } else if (currentStock <= minimumStock) {
      return { label: 'LOW STOCK', color: 'orange', badge: 'warning' };
    } else {
      return { label: 'IN STOCK', color: 'green', badge: 'success' };
    }
  }
}

window.Formatters = Formatters;