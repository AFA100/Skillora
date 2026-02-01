import React, { useState } from 'react';
import { useParams, Navigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const ResetPasswordPage = () => {
  const { token } = useParams();
  const [formData, setFormData] = useState({
    password: '',
    password_confirm: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const { confirmPasswordReset } = useAuth();

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    if (error) {
      setError('');
    }
  };

  const validateForm = () => {
    if (formData.password.length < 8) {
      return 'Password must be at least 8 characters long';
    }
    if (formData.password !== formData.password_confirm) {
      return 'Passwords do not match';
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError('');

    const result = await confirmPasswordReset(token, formData.password, formData.password_confirm);
    
    if (result.success) {
      setSuccess(true);
    } else {
      setError(result.error);
    }
    
    setLoading(false);
  };

  if (success) {
    return (
      <div className="card" style={{ maxWidth: '400px', margin: '0 auto', textAlign: 'center' }}>
        <h2>Password Reset Successful</h2>
        <p style={{ color: '#28a745', marginBottom: '20px' }}>
          Your password has been successfully reset.
        </p>
        <Link to="/login" className="btn btn-primary">
          Sign In with New Password
        </Link>
      </div>
    );
  }

  return (
    <div className="card" style={{ maxWidth: '400px', margin: '0 auto' }}>
      <h2>Set New Password</h2>
      <p>Enter your new password below.</p>
      
      {error && <div className="error">{error}</div>}
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="password">New Password</label>
          <input
            type="password"
            id="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            required
            placeholder="Enter new password"
          />
          <small style={{ color: '#666', fontSize: '12px' }}>
            Password must be at least 8 characters with uppercase, lowercase, and number
          </small>
        </div>
        
        <div className="form-group">
          <label htmlFor="password_confirm">Confirm New Password</label>
          <input
            type="password"
            id="password_confirm"
            name="password_confirm"
            value={formData.password_confirm}
            onChange={handleChange}
            required
            placeholder="Confirm new password"
          />
        </div>
        
        <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%' }}>
          {loading ? 'Resetting...' : 'Reset Password'}
        </button>
      </form>
      
      <div style={{ textAlign: 'center', marginTop: '20px' }}>
        <Link to="/login">Back to Sign In</Link>
      </div>
    </div>
  );
};

export default ResetPasswordPage;