import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { teacherAPI } from '../../services/api';
import './BankAccountForm.css';

const BankAccountForm = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [existingAccount, setExistingAccount] = useState(null);
  
  const [formData, setFormData] = useState({
    bank_name: '',
    account_holder_name: '',
    account_number: '',
    routing_number: '',
    account_type: 'checking',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'US'
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    fetchBankAccount();
  }, []);

  const fetchBankAccount = async () => {
    try {
      setLoading(true);
      const response = await teacherAPI.getBankAccount();
      setExistingAccount(response.data);
      
      // Pre-fill form with existing data (except sensitive fields)
      setFormData({
        bank_name: response.data.bank_name || '',
        account_holder_name: response.data.account_holder_name || '',
        account_number: '', // Never pre-fill account number
        routing_number: response.data.routing_number || '',
        account_type: response.data.account_type || 'checking',
        address_line1: response.data.address_line1 || '',
        address_line2: response.data.address_line2 || '',
        city: response.data.city || '',
        state: response.data.state || '',
        postal_code: response.data.postal_code || '',
        country: response.data.country || 'US'
      });
    } catch (error) {
      if (error.response?.status !== 404) {
        console.error('Error fetching bank account:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.bank_name.trim()) {
      newErrors.bank_name = 'Bank name is required';
    }

    if (!formData.account_holder_name.trim()) {
      newErrors.account_holder_name = 'Account holder name is required';
    }

    if (!formData.account_number.trim()) {
      newErrors.account_number = 'Account number is required';
    } else if (!/^\d{8,17}$/.test(formData.account_number)) {
      newErrors.account_number = 'Account number must be 8-17 digits';
    }

    if (!formData.routing_number.trim()) {
      newErrors.routing_number = 'Routing number is required';
    } else if (!/^\d{9}$/.test(formData.routing_number)) {
      newErrors.routing_number = 'Routing number must be exactly 9 digits';
    }

    if (!formData.address_line1.trim()) {
      newErrors.address_line1 = 'Address is required';
    }

    if (!formData.city.trim()) {
      newErrors.city = 'City is required';
    }

    if (!formData.state.trim()) {
      newErrors.state = 'State is required';
    }

    if (!formData.postal_code.trim()) {
      newErrors.postal_code = 'Postal code is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      setSaving(true);
      
      if (existingAccount) {
        await teacherAPI.updateBankAccount(formData);
      } else {
        await teacherAPI.createBankAccount(formData);
      }
      
      navigate('/teacher/earnings', {
        state: { 
          message: 'Bank account information saved successfully. Verification may take 1-2 business days.',
          type: 'success'
        }
      });
    } catch (error) {
      console.error('Error saving bank account:', error);
      
      if (error.response?.data) {
        const serverErrors = error.response.data;
        setErrors(serverErrors);
      } else {
        alert('Failed to save bank account information. Please try again.');
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading bank account information...</div>;
  }

  return (
    <div className="bank-account-form">
      <div className="form-header">
        <h1>{existingAccount ? 'Update Bank Account' : 'Add Bank Account'}</h1>
        <p>
          Add your bank account information to receive payouts from course sales.
          All information is encrypted and secure.
        </p>
        {existingAccount && !existingAccount.is_verified && (
          <div className="verification-notice">
            <strong>Verification Pending:</strong> Your bank account is pending verification.
            This process typically takes 1-2 business days.
          </div>
        )}
        {existingAccount && existingAccount.is_verified && (
          <div className="verification-success">
            <strong>Verified:</strong> Your bank account has been verified and is ready for payouts.
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="bank-form">
        <div className="form-section">
          <h2>Bank Information</h2>
          
          <div className="form-row">
            <div className="form-group">
              <label>Bank Name *</label>
              <input
                type="text"
                name="bank_name"
                value={formData.bank_name}
                onChange={handleChange}
                placeholder="e.g., Chase Bank, Bank of America"
                className={errors.bank_name ? 'error' : ''}
              />
              {errors.bank_name && <span className="error-text">{errors.bank_name}</span>}
            </div>
            
            <div className="form-group">
              <label>Account Type *</label>
              <select
                name="account_type"
                value={formData.account_type}
                onChange={handleChange}
              >
                <option value="checking">Checking Account</option>
                <option value="savings">Savings Account</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Account Holder Name *</label>
            <input
              type="text"
              name="account_holder_name"
              value={formData.account_holder_name}
              onChange={handleChange}
              placeholder="Full name as it appears on your bank account"
              className={errors.account_holder_name ? 'error' : ''}
            />
            {errors.account_holder_name && <span className="error-text">{errors.account_holder_name}</span>}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Account Number *</label>
              <input
                type="text"
                name="account_number"
                value={formData.account_number}
                onChange={handleChange}
                placeholder="8-17 digits"
                className={errors.account_number ? 'error' : ''}
              />
              {errors.account_number && <span className="error-text">{errors.account_number}</span>}
            </div>
            
            <div className="form-group">
              <label>Routing Number *</label>
              <input
                type="text"
                name="routing_number"
                value={formData.routing_number}
                onChange={handleChange}
                placeholder="9 digits"
                className={errors.routing_number ? 'error' : ''}
              />
              {errors.routing_number && <span className="error-text">{errors.routing_number}</span>}
            </div>
          </div>
        </div>

        <div className="form-section">
          <h2>Billing Address</h2>
          
          <div className="form-group">
            <label>Address Line 1 *</label>
            <input
              type="text"
              name="address_line1"
              value={formData.address_line1}
              onChange={handleChange}
              placeholder="Street address"
              className={errors.address_line1 ? 'error' : ''}
            />
            {errors.address_line1 && <span className="error-text">{errors.address_line1}</span>}
          </div>

          <div className="form-group">
            <label>Address Line 2</label>
            <input
              type="text"
              name="address_line2"
              value={formData.address_line2}
              onChange={handleChange}
              placeholder="Apartment, suite, etc. (optional)"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>City *</label>
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleChange}
                className={errors.city ? 'error' : ''}
              />
              {errors.city && <span className="error-text">{errors.city}</span>}
            </div>
            
            <div className="form-group">
              <label>State *</label>
              <input
                type="text"
                name="state"
                value={formData.state}
                onChange={handleChange}
                placeholder="e.g., CA, NY, TX"
                className={errors.state ? 'error' : ''}
              />
              {errors.state && <span className="error-text">{errors.state}</span>}
            </div>
            
            <div className="form-group">
              <label>Postal Code *</label>
              <input
                type="text"
                name="postal_code"
                value={formData.postal_code}
                onChange={handleChange}
                className={errors.postal_code ? 'error' : ''}
              />
              {errors.postal_code && <span className="error-text">{errors.postal_code}</span>}
            </div>
          </div>

          <div className="form-group">
            <label>Country *</label>
            <select
              name="country"
              value={formData.country}
              onChange={handleChange}
            >
              <option value="US">United States</option>
              {/* Add more countries as needed */}
            </select>
          </div>
        </div>

        <div className="security-notice">
          <h3>🔒 Security Notice</h3>
          <p>
            Your banking information is encrypted and stored securely. We use bank-level security
            to protect your data and never store your full account number in plain text.
          </p>
        </div>

        <div className="form-actions">
          <button 
            type="button" 
            onClick={() => navigate('/teacher/earnings')}
            className="btn-secondary"
          >
            Cancel
          </button>
          <button 
            type="submit" 
            disabled={saving}
            className="btn-primary"
          >
            {saving ? 'Saving...' : (existingAccount ? 'Update Account' : 'Add Account')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default BankAccountForm;