import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';

const ProfilePage = () => {
  const { user, updateProfile } = useAuth();
  const [formData, setFormData] = useState({
    name: user?.name || '',
    phone_number: user?.phone_number || '',
    date_of_birth: user?.date_of_birth || ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    const result = await updateProfile(formData);
    
    if (result.success) {
      setMessage('Profile updated successfully!');
    } else {
      setMessage('Failed to update profile.');
    }
    
    setLoading(false);
  };

  return (
    <div className="card" style={{ maxWidth: '500px', margin: '0 auto' }}>
      <h2>My Profile</h2>
      
      {message && (
        <div className={message.includes('success') ? 'success' : 'error'} style={{
          padding: '10px',
          borderRadius: '4px',
          marginBottom: '20px',
          backgroundColor: message.includes('success') ? '#d4edda' : '#f8d7da',
          color: message.includes('success') ? '#155724' : '#721c24'
        }}>
          {message}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="name">Full Name</label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="Enter your full name"
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="phone_number">Phone Number</label>
          <input
            type="tel"
            id="phone_number"
            name="phone_number"
            value={formData.phone_number}
            onChange={handleChange}
            placeholder="Enter your phone number"
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="date_of_birth">Date of Birth</label>
          <input
            type="date"
            id="date_of_birth"
            name="date_of_birth"
            value={formData.date_of_birth}
            onChange={handleChange}
          />
        </div>
        
        <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%' }}>
          {loading ? 'Updating...' : 'Update Profile'}
        </button>
      </form>
      
      <div style={{ marginTop: '30px', padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
        <h4>Account Information</h4>
        <div style={{ display: 'grid', gap: '10px' }}>
          <div><strong>Email:</strong> {user?.email}</div>
          <div><strong>Username:</strong> {user?.username}</div>
          <div><strong>Role:</strong> <span style={{ textTransform: 'capitalize' }}>{user?.role}</span></div>
          <div><strong>Account Status:</strong> {user?.is_active ? 'Active' : 'Inactive'}</div>
          <div><strong>Verified:</strong> {user?.is_verified ? '✓ Yes' : '⚠️ Pending'}</div>
          <div><strong>Member Since:</strong> {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}</div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;