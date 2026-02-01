import React, { useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const SignupPage = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    username: '',
    password: '',
    password_confirm: '',
    role: 'learner'
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const { signup, isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return <Navigate to="/app/dashboard" replace />;
  }

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    // Clear specific field error when user starts typing
    if (errors[e.target.name]) {
      setErrors({
        ...errors,
        [e.target.name]: null
      });
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    if (formData.password !== formData.password_confirm) {
      newErrors.password_confirm = 'Passwords do not match';
    }

    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const formErrors = validateForm();
    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors);
      return;
    }

    setLoading(true);
    setErrors({});

    const result = await signup(formData);
    
    if (!result.success) {
      if (typeof result.error === 'object') {
        setErrors(result.error);
      } else {
        setErrors({ general: result.error });
      }
    }
    
    setLoading(false);
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        {/* Header Section */}
        <div className="auth-header">
          <div className="auth-logo">
            <h1>Skillora</h1>
          </div>
          <h2>Create Your Account</h2>
          <p className="auth-subtitle">Join thousands of learners and start your journey today</p>
        </div>
        
        {/* Role Selection */}
        <div className="role-selection">
          <div className="role-tabs">
            <button 
              type="button"
              className={`role-tab ${formData.role === 'learner' ? 'active' : ''}`}
              onClick={() => setFormData({...formData, role: 'learner'})}
            >
              <div className="role-icon">🎓</div>
              <div>
                <div className="role-title">I want to Learn</div>
                <div className="role-desc">Access courses and grow your skills</div>
              </div>
            </button>
            <button 
              type="button"
              className={`role-tab ${formData.role === 'teacher' ? 'active' : ''}`}
              onClick={() => setFormData({...formData, role: 'teacher'})}
            >
              <div className="role-icon">👨‍🏫</div>
              <div>
                <div className="role-title">I want to Teach</div>
                <div className="role-desc">Share knowledge and earn money</div>
              </div>
            </button>
          </div>
        </div>
        
        {errors.general && <div className="error-banner">{errors.general}</div>}
        
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="name">Full Name *</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                placeholder="Enter your full name"
                className={errors.name ? 'error' : ''}
              />
              {errors.name && <div className="field-error">{errors.name}</div>}
            </div>
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="email">Email Address *</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                placeholder="Enter your email address"
                className={errors.email ? 'error' : ''}
              />
              {errors.email && <div className="field-error">{errors.email[0] || errors.email}</div>}
            </div>
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="username">Username *</label>
              <input
                type="text"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleChange}
                required
                placeholder="Choose a unique username"
                className={errors.username ? 'error' : ''}
              />
              <small className="field-hint">This will be your unique identifier on the platform</small>
              {errors.username && <div className="field-error">{errors.username[0] || errors.username}</div>}
            </div>
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="password">Password *</label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                placeholder="Create a strong password"
                className={errors.password ? 'error' : ''}
              />
              <small className="field-hint">
                At least 8 characters with uppercase, lowercase, and number
              </small>
              {errors.password && <div className="field-error">{errors.password[0] || errors.password}</div>}
            </div>
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="password_confirm">Confirm Password *</label>
              <input
                type="password"
                id="password_confirm"
                name="password_confirm"
                value={formData.password_confirm}
                onChange={handleChange}
                required
                placeholder="Confirm your password"
                className={errors.password_confirm ? 'error' : ''}
              />
              {errors.password_confirm && <div className="field-error">{errors.password_confirm}</div>}
            </div>
          </div>
          
          <button type="submit" className="auth-submit-btn" disabled={loading}>
            {loading ? (
              <div className="btn-loading">
                <div className="spinner"></div>
                Creating Account...
              </div>
            ) : (
              'Create Account'
            )}
          </button>
        </form>
        
        <div className="auth-footer">
          <p>Already have an account? <Link to="/login" className="auth-link">Sign in here</Link></p>
        </div>
      </div>
    </div>
  );
};

export default SignupPage;