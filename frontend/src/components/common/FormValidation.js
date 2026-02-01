import React, { useState, useEffect } from 'react';
import './FormValidation.css';

// Validation rules
export const validationRules = {
  required: (value) => {
    if (value === null || value === undefined || value === '') {
      return 'This field is required';
    }
    return null;
  },

  email: (value) => {
    if (!value) return null;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      return 'Please enter a valid email address';
    }
    return null;
  },

  minLength: (min) => (value) => {
    if (!value) return null;
    if (value.length < min) {
      return `Must be at least ${min} characters long`;
    }
    return null;
  },

  maxLength: (max) => (value) => {
    if (!value) return null;
    if (value.length > max) {
      return `Must be no more than ${max} characters long`;
    }
    return null;
  },

  password: (value) => {
    if (!value) return null;
    
    const errors = [];
    
    if (value.length < 8) {
      errors.push('at least 8 characters');
    }
    
    if (!/[A-Z]/.test(value)) {
      errors.push('one uppercase letter');
    }
    
    if (!/[a-z]/.test(value)) {
      errors.push('one lowercase letter');
    }
    
    if (!/\d/.test(value)) {
      errors.push('one number');
    }
    
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(value)) {
      errors.push('one special character');
    }
    
    if (errors.length > 0) {
      return `Password must contain ${errors.join(', ')}`;
    }
    
    return null;
  },

  confirmPassword: (originalPassword) => (value) => {
    if (!value) return null;
    if (value !== originalPassword) {
      return 'Passwords do not match';
    }
    return null;
  },

  phone: (value) => {
    if (!value) return null;
    const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/;
    if (!phoneRegex.test(value)) {
      return 'Please enter a valid phone number';
    }
    return null;
  },

  url: (value) => {
    if (!value) return null;
    try {
      new URL(value);
      return null;
    } catch {
      return 'Please enter a valid URL';
    }
  },

  number: (value) => {
    if (!value) return null;
    if (isNaN(value)) {
      return 'Please enter a valid number';
    }
    return null;
  },

  min: (min) => (value) => {
    if (!value) return null;
    if (parseFloat(value) < min) {
      return `Value must be at least ${min}`;
    }
    return null;
  },

  max: (max) => (value) => {
    if (!value) return null;
    if (parseFloat(value) > max) {
      return `Value must be no more than ${max}`;
    }
    return null;
  },

  bankAccount: (value) => {
    if (!value) return null;
    const cleanValue = value.replace(/[\s\-]/g, '');
    if (!/^\d{8,17}$/.test(cleanValue)) {
      return 'Bank account number must be 8-17 digits';
    }
    return null;
  },

  routingNumber: (value) => {
    if (!value) return null;
    const cleanValue = value.replace(/[\s\-]/g, '');
    if (!/^\d{9}$/.test(cleanValue)) {
      return 'Routing number must be exactly 9 digits';
    }
    return null;
  },

  noScript: (value) => {
    if (!value) return null;
    if (/<script[^>]*>.*?<\/script>/i.test(value) || /javascript:/i.test(value)) {
      return 'Script content is not allowed';
    }
    return null;
  }
};

// Custom hook for form validation
export const useFormValidation = (initialValues, validationSchema) => {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isValid, setIsValid] = useState(false);

  // Validate a single field
  const validateField = (name, value) => {
    const fieldRules = validationSchema[name];
    if (!fieldRules) return null;

    for (const rule of fieldRules) {
      const error = rule(value);
      if (error) return error;
    }
    return null;
  };

  // Validate all fields
  const validateForm = () => {
    const newErrors = {};
    let formIsValid = true;

    Object.keys(validationSchema).forEach(fieldName => {
      const error = validateField(fieldName, values[fieldName]);
      if (error) {
        newErrors[fieldName] = error;
        formIsValid = false;
      }
    });

    setErrors(newErrors);
    setIsValid(formIsValid);
    return formIsValid;
  };

  // Handle field change
  const handleChange = (name, value) => {
    setValues(prev => ({ ...prev, [name]: value }));
    
    // Validate field if it's been touched
    if (touched[name]) {
      const error = validateField(name, value);
      setErrors(prev => ({ ...prev, [name]: error }));
    }
  };

  // Handle field blur
  const handleBlur = (name) => {
    setTouched(prev => ({ ...prev, [name]: true }));
    const error = validateField(name, values[name]);
    setErrors(prev => ({ ...prev, [name]: error }));
  };

  // Reset form
  const reset = () => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
    setIsValid(false);
  };

  // Update form validity when values or errors change
  useEffect(() => {
    const hasErrors = Object.values(errors).some(error => error !== null);
    const hasRequiredFields = Object.keys(validationSchema).every(fieldName => {
      const fieldRules = validationSchema[fieldName];
      const hasRequiredRule = fieldRules.some(rule => rule === validationRules.required);
      return !hasRequiredRule || values[fieldName];
    });
    
    setIsValid(!hasErrors && hasRequiredFields);
  }, [values, errors, validationSchema]);

  return {
    values,
    errors,
    touched,
    isValid,
    handleChange,
    handleBlur,
    validateForm,
    reset
  };
};

// Validated Input Component
export const ValidatedInput = ({
  name,
  label,
  type = 'text',
  placeholder,
  value,
  error,
  touched,
  onChange,
  onBlur,
  required = false,
  disabled = false,
  className = '',
  ...props
}) => {
  const inputClasses = [
    'validated-input',
    error && touched ? 'error' : '',
    disabled ? 'disabled' : '',
    className
  ].filter(Boolean).join(' ');

  return (
    <div className="form-group">
      {label && (
        <label className="form-label">
          {label}
          {required && <span className="required-indicator">*</span>}
        </label>
      )}
      <input
        type={type}
        name={name}
        value={value || ''}
        placeholder={placeholder}
        onChange={(e) => onChange(name, e.target.value)}
        onBlur={() => onBlur(name)}
        disabled={disabled}
        className={inputClasses}
        {...props}
      />
      {error && touched && (
        <div className="error-message">
          <span className="error-icon">⚠️</span>
          {error}
        </div>
      )}
    </div>
  );
};

// Validated Textarea Component
export const ValidatedTextarea = ({
  name,
  label,
  placeholder,
  value,
  error,
  touched,
  onChange,
  onBlur,
  required = false,
  disabled = false,
  rows = 4,
  className = '',
  ...props
}) => {
  const textareaClasses = [
    'validated-textarea',
    error && touched ? 'error' : '',
    disabled ? 'disabled' : '',
    className
  ].filter(Boolean).join(' ');

  return (
    <div className="form-group">
      {label && (
        <label className="form-label">
          {label}
          {required && <span className="required-indicator">*</span>}
        </label>
      )}
      <textarea
        name={name}
        value={value || ''}
        placeholder={placeholder}
        onChange={(e) => onChange(name, e.target.value)}
        onBlur={() => onBlur(name)}
        disabled={disabled}
        rows={rows}
        className={textareaClasses}
        {...props}
      />
      {error && touched && (
        <div className="error-message">
          <span className="error-icon">⚠️</span>
          {error}
        </div>
      )}
    </div>
  );
};

// Validated Select Component
export const ValidatedSelect = ({
  name,
  label,
  options,
  value,
  error,
  touched,
  onChange,
  onBlur,
  required = false,
  disabled = false,
  placeholder = 'Select an option',
  className = '',
  ...props
}) => {
  const selectClasses = [
    'validated-select',
    error && touched ? 'error' : '',
    disabled ? 'disabled' : '',
    className
  ].filter(Boolean).join(' ');

  return (
    <div className="form-group">
      {label && (
        <label className="form-label">
          {label}
          {required && <span className="required-indicator">*</span>}
        </label>
      )}
      <select
        name={name}
        value={value || ''}
        onChange={(e) => onChange(name, e.target.value)}
        onBlur={() => onBlur(name)}
        disabled={disabled}
        className={selectClasses}
        {...props}
      >
        <option value="">{placeholder}</option>
        {options.map((option, index) => (
          <option key={index} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && touched && (
        <div className="error-message">
          <span className="error-icon">⚠️</span>
          {error}
        </div>
      )}
    </div>
  );
};

// Form validation summary component
export const ValidationSummary = ({ errors, touched }) => {
  const visibleErrors = Object.keys(errors)
    .filter(key => errors[key] && touched[key])
    .map(key => errors[key]);

  if (visibleErrors.length === 0) return null;

  return (
    <div className="validation-summary">
      <div className="validation-summary-header">
        <span className="error-icon">⚠️</span>
        Please correct the following errors:
      </div>
      <ul className="validation-summary-list">
        {visibleErrors.map((error, index) => (
          <li key={index}>{error}</li>
        ))}
      </ul>
    </div>
  );
};

export default {
  useFormValidation,
  ValidatedInput,
  ValidatedTextarea,
  ValidatedSelect,
  ValidationSummary,
  validationRules
};