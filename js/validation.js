
class Validator {
  static validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) return { valid: false, message: 'Email is required' };
    if (!emailRegex.test(email)) return { valid: false, message: 'Invalid email format' };
    return { valid: true };
  }
  
  static validatePassword(password) {
    if (!password) return { valid: false, message: 'Password is required' };
    if (password.length < 6) return { valid: false, message: 'Password must be at least 6 characters' };
    if (password.length > 50) return { valid: false, message: 'Password must be less than 50 characters' };
    return { valid: true };
  }
  
  static validateProductName(name) {
    if (!name || !name.trim()) return { valid: false, message: 'Product name is required' };
    if (name.trim().length < 2) return { valid: false, message: 'Product name must be at least 2 characters' };
    if (name.trim().length > 200) return { valid: false, message: 'Product name must be less than 200 characters' };
    return { valid: true };
  }
  
  static validateSKU(sku, existingProducts = []) {
    if (!sku || !sku.trim()) return { valid: false, message: 'SKU is required' };
    
    const skuTrimmed = sku.trim().toUpperCase();
    if (skuTrimmed.length < 2) return { valid: false, message: 'SKU must be at least 2 characters' };
    if (skuTrimmed.length > 50) return { valid: false, message: 'SKU must be less than 50 characters' };
    if (!/^[A-Z0-9-_]+$/.test(skuTrimmed)) {
      return { valid: false, message: 'SKU can only contain letters, numbers, hyphens, and underscores' };
    }
    
    const duplicate = existingProducts.find(p => p.sku === skuTrimmed);
    if (duplicate) return { valid: false, message: 'SKU already exists' };
    
    return { valid: true, value: skuTrimmed };
  }
  
  static validatePrice(price, fieldName = 'Price') {
    const numPrice = parseFloat(price);
    if (isNaN(numPrice)) return { valid: false, message: `${fieldName} must be a number` };
    if (numPrice < 0) return { valid: false, message: `${fieldName} cannot be negative` };
    if (numPrice > 10000000) return { valid: false, message: `${fieldName} is too large` };
    return { valid: true, value: numPrice };
  }
  
  static validateQuantity(quantity, availableStock = null) {
    const numQty = parseInt(quantity);
    if (isNaN(numQty)) return { valid: false, message: 'Quantity must be a number' };
    if (numQty <= 0) return { valid: false, message: 'Quantity must be greater than 0' };
    if (numQty > 1000000) return { valid: false, message: 'Quantity is too large' };
    
    if (availableStock !== null && numQty > availableStock) {
      return { valid: false, message: `Insufficient stock. Available: ${availableStock}` };
    }
    
    return { valid: true, value: numQty };
  }
  
  static validateStock(stock) {
    const numStock = parseInt(stock);
    if (isNaN(numStock)) return { valid: false, message: 'Stock must be a number' };
    if (numStock < 0) return { valid: false, message: 'Stock cannot be negative' };
    if (numStock > 1000000) return { valid: false, message: 'Stock is too large' };
    return { valid: true, value: numStock };
  }
  
  static validateCategoryName(name, existingCategories = []) {
    if (!name || !name.trim()) return { valid: false, message: 'Category name is required' };
    if (name.trim().length < 2) return { valid: false, message: 'Category name must be at least 2 characters' };
    if (name.trim().length > 100) return { valid: false, message: 'Category name must be less than 100 characters' };
    
    const duplicate = existingCategories.find(c =>
      c.name.toLowerCase() === name.trim().toLowerCase()
    );
    if (duplicate) return { valid: false, message: 'Category already exists' };
    
    return { valid: true, value: name.trim() };
  }
  
  static validateEmployeeName(name) {
    if (!name || !name.trim()) return { valid: false, message: 'Name is required' };
    if (name.trim().length < 2) return { valid: false, message: 'Name must be at least 2 characters' };
    if (name.trim().length > 100) return { valid: false, message: 'Name must be less than 100 characters' };
    if (!/^[a-zA-Z\s]+$/.test(name.trim())) {
      return { valid: false, message: 'Name can only contain letters and spaces' };
    }
    return { valid: true, value: name.trim() };
  }
  
  static validatePhone(phone) {
    if (!phone) return { valid: true };
    const phoneRegex = /^[0-9]{10}$/;
    if (!phoneRegex.test(phone)) {
      return { valid: false, message: 'Phone number must be 10 digits' };
    }
    return { valid: true, value: phone };
  }
  
  static validateDateRange(startDate, endDate) {
    if (!startDate || !endDate) {
      return { valid: false, message: 'Both start and end dates are required' };
    }
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return { valid: false, message: 'Invalid date format' };
    }
    
    if (start > end) {
      return { valid: false, message: 'Start date must be before end date' };
    }
    
    const maxRange = 365;
    const daysDiff = (end - start) / (1000 * 60 * 60 * 24);
    if (daysDiff > maxRange) {
      return { valid: false, message: `Date range cannot exceed ${maxRange} days` };
    }
    
    return { valid: true };
  }
  
  static validateForm(data, rules) {
    const errors = {};
    
    Object.keys(rules).forEach(field => {
      const rule = rules[field];
      const value = data[field];
      
      if (rule.required && !value) {
        errors[field] = rule.message || `${field} is required`;
        return;
      }
      
      if (value && rule.min !== undefined && value < rule.min) {
        errors[field] = rule.message || `${field} must be at least ${rule.min}`;
        return;
      }
      
      if (value && rule.max !== undefined && value > rule.max) {
        errors[field] = rule.message || `${field} must be less than ${rule.max}`;
        return;
      }
      
      if (value && rule.pattern && !rule.pattern.test(value)) {
        errors[field] = rule.message || `${field} format is invalid`;
        return;
      }
    });
    
    return {
      valid: Object.keys(errors).length === 0,
      errors
    };
  }
}

window.Validator = Validator;