
class FormValidator {
  constructor(formElement) {
    this.form = formElement;
    this.errors = {};
    this.validators = {};
    
    this.setupValidation();
  }
  
  setupValidation() {
    const inputs = this.form.querySelectorAll('[data-validate]');
    
    inputs.forEach(input => {
      const validateType = input.dataset.validate;
      this.validators[input.id] = validateType;
      
      input.addEventListener('blur', () => {
        this.validateField(input);
      });
      
      input.addEventListener('input', () => {
        if (this.errors[input.id]) {
          this.validateField(input);
        }
      });
    });
    
    this.form.addEventListener('submit', (e) => {
      if (!this.validateForm()) {
        e.preventDefault();
        this.showErrors();
      }
    });
  }
  
  validateField(input) {
    const validateType = this.validators[input.id];
    const value = input.value.trim();
    let error = null;
    
    switch (validateType) {
      case 'email':
        const emailResult = Validator.validateEmail(value);
        error = emailResult.valid ? null : emailResult.message;
        break;
        
      case 'password':
        const passwordResult = Validator.validatePassword(value);
        error = passwordResult.valid ? null : passwordResult.message;
        break;
        
      case 'required':
        error = value ? null : 'This field is required';
        break;
        
      case 'number':
        const numResult = Validator.validatePrice(value, input.dataset.label || 'Value');
        error = numResult.valid ? null : numResult.message;
        break;
        
      case 'quantity':
        const qtyResult = Validator.validateQuantity(value);
        error = qtyResult.valid ? null : qtyResult.message;
        break;
        
      case 'phone':
        const phoneResult = Validator.validatePhone(value);
        error = phoneResult.valid ? null : phoneResult.message;
        break;
    }
    
    if (error) {
      this.errors[input.id] = error;
      this.showFieldError(input, error);
    } else {
      delete this.errors[input.id];
      this.clearFieldError(input);
    }
    
    return !error;
  }
  
  validateForm() {
    this.errors = {};
    let isValid = true;
    
    Object.keys(this.validators).forEach(fieldId => {
      const input = document.getElementById(fieldId);
      if (input) {
        const fieldValid = this.validateField(input);
        if (!fieldValid) isValid = false;
      }
    });
    
    const customValidators = this.form.querySelectorAll('[data-custom-validator]');
    customValidators.forEach(element => {
      const validatorFn = window[element.dataset.customValidator];
      if (validatorFn) {
        const result = validatorFn();
        if (!result.valid) {
          this.errors[element.id] = result.message;
          this.showFieldError(element, result.message);
          isValid = false;
        }
      }
    });
    
    return isValid;
  }
  
  showFieldError(input, message) {
    input.classList.add('is-invalid');
    
    let errorElement = input.parentElement.querySelector('.error-message');
    if (!errorElement) {
      errorElement = document.createElement('small');
      errorElement.className = 'error-message text-danger';
      input.parentElement.appendChild(errorElement);
    }
    
    errorElement.textContent = message;
  }
  
  clearFieldError(input) {
    input.classList.remove('is-invalid');
    
    const errorElement = input.parentElement.querySelector('.error-message');
    if (errorElement) {
      errorElement.remove();
    }
  }
  
  showErrors() {
    const firstError = Object.keys(this.errors)[0];
    if (firstError) {
      const input = document.getElementById(firstError);
      if (input) {
        input.focus();
      }
    }
    
    const firstErrorMessage = this.errors[firstError];
    if (firstErrorMessage && typeof Utils !== 'undefined') {
      Utils.showToast(firstErrorMessage, 'error');
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const forms = document.querySelectorAll('form[data-validate-form]');
  forms.forEach(form => {
    new FormValidator(form);
  });
});

window.FormValidator = FormValidator;