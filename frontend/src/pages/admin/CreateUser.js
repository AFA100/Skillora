import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminAPI } from '../../services/api';

const CreateUser = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'learner',
    is_active: true
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // Clear errors when user starts typing
    if (error) {
      setError('');
    }
  };

  const validateForm = () => {
    const errors = [];
    
    if (!formData.name.trim()) {
      errors.push('Name is required');
    }
    
    if (!formData.email.trim()) {
      errors.push('Email is required');
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.push('Email is invalid');
    }
    
    if (!formData.password) {
      errors.push('Password is required');
    } else if (formData.password.length < 8) {
      errors.push('Password must be at least 8 characters');
    }
    
    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const validationErrors = validateForm();
    if (validationErrors.length > 0) {
      setError(validationErrors.join(', '));
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await adminAPI.createUser(formData);
      setSuccess(`User ${formData.name} created successfully!`);
      
      // Reset form
      setFormData({
        name: '',
        email: '',
        password: '',
        role: 'learner',
        is_active: true
      });
      
      // Redirect after 2 seconds
      setTimeout(() => {
        if (formData.role === 'teacher') {
          navigate('/app/admin/teachers');
        } else {
          navigate('/app/admin/learners');
        }
      }, 2000);
      
    } catch (error) {
      if (error.response?.data) {
        const errorData = error.response.data;
        if (typeof errorData === 'object') {
          const errorMessages = Object.entries(errorData)
            .map(([field, messages]) => `${field}: ${Array.isArray(messages) ? messages.join(', ') : messages}`)
            .join('; ');
          setError(errorMessages);
        } else {
          setError(errorData);
        }
      } else {
        setError('Failed to create user');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="card" style={{ maxWidth: '600px', margin: '0 auto' }}>
        <h2>Create New User</h2>
        <p>Create a new user account with admin privileges.</p>

        {error && (
          <div className="error" style={{ marginBottom: '20px' }}>
            {error}
          </div>
        )}

        {success && (
          <div style={{
            backgroundColor: '#d4edda',
            color: '#155724',
            padding: '12px',
            borderRadius: '4px',
            marginBottom: '20px',
            border: '1px solid #c3e6cb'
          }}>
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name">Full Name *</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              placeholder="Enter full name"
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Email Address *</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="Enter email address"
            />
          </div>

          <div className="form-group">
            <label htmlFor="role">Role *</label>
            <select
              id="role"
              name="role"
              value={formData.role}
              onChange={handleChange}
              required
            >
              <option value="learner">Learner</option>
              <option value="teacher">Teacher</option>
              <option value="admin">Admin</option>
            </select>
            <small style={{ color: '#666', fontSize: '12px', display: 'block', marginTop: '4px' }}>
              {formData.role === 'learner' && 'Can enroll in courses and access learning materials'}
              {formData.role === 'teacher' && 'Can create courses after verification (requires manual verification)'}
              {formData.role === 'admin' && 'Full system access including user management'}
            </small>
          </div>

          <div className="form-group">
            <label htmlFor="password">Password *</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              placeholder="Enter password"
            />
            <small style={{ color: '#666', fontSize: '12px', display: 'block', marginTop: '4px' }}>
              Password must be at least 8 characters with uppercase, lowercase, and number
            </small>
          </div>

          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="checkbox"
                name="is_active"
                checked={formData.is_active}
                onChange={handleChange}
              />
              Account Active
            </label>
            <small style={{ color: '#666', fontSize: '12px', display: 'block', marginTop: '4px' }}>
              Inactive accounts cannot log in to the system
            </small>
          </div>

          {/* Role-specific warnings */}
          {formData.role === 'teacher' && (
            <div style={{
              backgroundColor: '#fff3cd',
              color: '#856404',
              padding: '12px',
              borderRadius: '4px',
              marginBottom: '20px',
              border: '1px solid #ffeaa7'
            }}>
              <strong>⚠️ Teacher Account Note:</strong>
              <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
                <li>Teacher accounts require verification before they can create courses</li>
                <li>You'll need to manually approve their verification documents</li>
                <li>They can access the teacher dashboard but with limited functionality until verified</li>
              </ul>
            </div>
          )}

          {formData.role === 'admin' && (
            <div style={{
              backgroundColor: '#f8d7da',
              color: '#721c24',
              padding: '12px',
              borderRadius: '4px',
              marginBottom: '20px',
              border: '1px solid #f5c6cb'
            }}>
              <strong>🚨 Admin Account Warning:</strong>
              <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
                <li>Admin accounts have full system access</li>
                <li>They can manage all users, courses, and system settings</li>
                <li>Only create admin accounts for trusted personnel</li>
              </ul>
            </div>
          )}

          <button 
            type="submit" 
            className="btn btn-primary" 
            disabled={loading}
            style={{ width: '100%', padding: '12px' }}
          >
            {loading ? 'Creating User...' : 'Create User'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <button
            onClick={() => navigate('/app/admin')}
            style={{
              background: 'none',
              border: 'none',
              color: '#007bff',
              textDecoration: 'underline',
              cursor: 'pointer'
            }}
          >
            ← Back to Admin Dashboard
          </button>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card" style={{ maxWidth: '600px', margin: '20px auto 0', backgroundColor: '#f8f9fa' }}>
        <h3>Quick Actions</h3>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button
            onClick={() => navigate('/app/admin/teachers')}
            className="btn btn-primary"
          >
            👨‍🏫 Manage Teachers
          </button>
          <button
            onClick={() => navigate('/app/admin/learners')}
            className="btn btn-primary"
          >
            👨‍🎓 Manage Learners
          </button>
          <button
            onClick={() => navigate('/app/admin/logs')}
            className="btn btn-primary"
          >
            📊 View Activity Logs
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateUser;