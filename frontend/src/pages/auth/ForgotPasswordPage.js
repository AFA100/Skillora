import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetToken, setResetToken] = useState(''); // For development

  const { requestPasswordReset } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    const result = await requestPasswordReset(email);
    
    if (result.success) {
      setMessage(result.message);
      if (result.token) {
        setResetToken(result.token); // Show token in development
      }
    } else {
      setError(result.error);
    }
    
    setLoading(false);
  };

  return (
    <div className="card" style={{ maxWidth: '400px', margin: '0 auto' }}>
      <h2>Reset Your Password</h2>
      <p>Enter your email address and we'll send you a link to reset your password.</p>
      
      {error && <div className="error">{error}</div>}
      {message && (
        <div style={{ color: '#28a745', padding: '10px', backgroundColor: '#d4edda', borderRadius: '4px', marginBottom: '20px' }}>
          {message}
          {resetToken && (
            <div style={{ marginTop: '10px', fontSize: '12px' }}>
              <strong>Development Token:</strong> 
              <Link to={`/reset-password/${resetToken}`} style={{ marginLeft: '5px' }}>
                Use this link to reset password
              </Link>
            </div>
          )}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="email">Email Address</label>
          <input
            type="email"
            id="email"
            name="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="Enter your email address"
          />
        </div>
        
        <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%' }}>
          {loading ? 'Sending...' : 'Send Reset Link'}
        </button>
      </form>
      
      <div style={{ textAlign: 'center', marginTop: '20px' }}>
        <Link to="/login">Back to Sign In</Link>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;