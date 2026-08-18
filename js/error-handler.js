
class ErrorHandler {
  static handleError(error, context = '') {
    console.error(`Error in ${context}:`, error);
    
    let userMessage = 'An unexpected error occurred';
    let errorCode = 'unknown_error';
    
    if (error.code) {
      errorCode = error.code;
      userMessage = this.getFirebaseErrorMessage(error.code);
    } else if (error.message) {
      userMessage = error.message;
    }
    
    if (context) {
      console.error(`Context: ${context}`);
    }
    
    if (typeof Utils !== 'undefined') {
      Utils.showToast(userMessage, 'error');
    }
    
    return {
      code: errorCode,
      message: userMessage,
      original: error
    };
  }
  
  static getFirebaseErrorMessage(code) {
    const errorMessages = {
      'auth/invalid-email': 'Invalid email address format',
      'auth/user-disabled': 'This account has been disabled',
      'auth/user-not-found': 'No account found with this email',
      'auth/wrong-password': 'Incorrect password',
      'auth/email-already-in-use': 'Email is already registered',
      'auth/weak-password': 'Password is too weak',
      'auth/too-many-requests': 'Too many attempts. Please try again later',
      'auth/network-request-failed': 'Network error. Check your connection',
      'auth/operation-not-allowed': 'This operation is not allowed',
      'auth/requires-recent-login': 'Please re-login to continue',
      
      'permission-denied': 'You do not have permission to perform this action',
      'not-found': 'The requested document was not found',
      'already-exists': 'The document already exists',
      'resource-exhausted': 'Quota exceeded. Please try again later',
      'failed-precondition': 'Operation failed. Please try again',
      'unauthenticated': 'Please login to continue',
      'unavailable': 'Service temporarily unavailable. Try again later',
      'deadline-exceeded': 'Operation timed out. Please try again',
      'cancelled': 'Operation was cancelled',
      
      'insufficient-stock': 'Insufficient stock available',
      'duplicate-sku': 'SKU already exists',
      'invalid-data': 'Invalid data provided',
      'unauthorized': 'You are not authorized to perform this action'
    };
    
    return errorMessages[code] || 'An unexpected error occurred';
  }
  
  static async retry(fn, maxRetries = 3, delay = 1000) {
    let lastError;
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        console.warn(`Retry attempt ${i + 1} failed:`, error);
        
        if (i < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
        }
      }
    }
    
    throw lastError;
  }
  
  static isNetworkError(error) {
    return error.code === 'auth/network-request-failed' ||
      error.code === 'unavailable' ||
      error.code === 'deadline-exceeded' ||
      (error.message && error.message.includes('network'));
  }
  
  static isPermissionError(error) {
    return error.code === 'permission-denied' ||
      error.code === 'unauthenticated' ||
      error.code === 'unauthorized';
  }
  
  static logError(error, context = '') {
    console.error(`[${new Date().toISOString()}] Error in ${context}:`, error);
    
  }
  
  static showErrorBoundary(error, container) {
    if (container) {
      container.innerHTML = `
        <div class="error-state">
          <div class="error-state-icon">⚠️</div>
          <h3>Something went wrong</h3>
          <p>${error.message || 'An unexpected error occurred'}</p>
          <button class="btn btn-primary" onclick="location.reload()">
            Reload Page
          </button>
        </div>
      `;
    }
  }
}

window.addEventListener('error', (event) => {
  ErrorHandler.logError(event.error, 'Global');
});

window.addEventListener('unhandledrejection', (event) => {
  ErrorHandler.logError(event.reason, 'Unhandled Promise Rejection');
});

window.ErrorHandler = ErrorHandler;