import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { teacherAPI } from '../../services/api';

const TeacherDashboard = () => {
  const { user } = useAuth();
  const [verification, setVerification] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVerificationStatus();
  }, []);

  const fetchVerificationStatus = async () => {
    try {
      const response = await teacherAPI.getVerificationStatus();
      setVerification(response.data);
    } catch (error) {
      if (error.response?.status === 404 || error.response?.data?.status === 'not_submitted') {
        setVerification({ status: 'not_submitted' });
      }
    } finally {
      setLoading(false);
    }
  };

  const getVerificationStatusCard = () => {
    if (loading) {
      return (
        <div className="card">
          <p>Loading verification status...</p>
        </div>
      );
    }

    const status = verification?.status || 'not_submitted';

    switch (status) {
      case 'not_submitted':
        return (
          <div className="card" style={{ backgroundColor: '#fff3cd', border: '1px solid #ffeaa7' }}>
            <h3 style={{ color: '#856404', margin: '0 0 12px 0' }}>⚠️ Verification Required</h3>
            <p style={{ margin: '0 0 16px 0' }}>
              To start teaching and creating courses, you need to complete the verification process.
            </p>
            <Link to="/app/teacher/verification/submit" className="btn btn-primary">
              Start Verification
            </Link>
          </div>
        );

      case 'pending':
        return (
          <div className="card" style={{ backgroundColor: '#fff8e1', border: '1px solid #ffecb3' }}>
            <h3 style={{ color: '#f57f17', margin: '0 0 12px 0' }}>⏳ Verification Under Review</h3>
            <p style={{ margin: '0 0 16px 0' }}>
              Your documents are being reviewed. We'll notify you within 2-3 business days.
            </p>
            <Link to="/app/teacher/verification/status" className="btn btn-primary">
              Check Status
            </Link>
          </div>
        );

      case 'approved':
        return (
          <div className="card" style={{ backgroundColor: '#f8fff9', border: '1px solid #c3e6cb' }}>
            <h3 style={{ color: '#28a745', margin: '0 0 12px 0' }}>✅ Verification Approved</h3>
            <p style={{ margin: '0 0 16px 0' }}>
              Congratulations! You can now create and sell courses on Skillora.
            </p>
            <div>
              <Link to="/app/teacher/courses/create" className="btn btn-primary" style={{ marginRight: '10px' }}>
                Create Course
              </Link>
              <Link to="/app/teacher/courses" className="btn btn-primary" style={{ marginRight: '10px' }}>
                Manage Courses
              </Link>
              <Link to="/app/teacher/verification/status" className="btn btn-primary">
                View Status
              </Link>
            </div>
          </div>
        );

      case 'rejected':
        return (
          <div className="card" style={{ backgroundColor: '#f8d7da', border: '1px solid #f5c6cb' }}>
            <h3 style={{ color: '#721c24', margin: '0 0 12px 0' }}>❌ Verification Rejected</h3>
            <p style={{ margin: '0 0 16px 0' }}>
              Your verification was not approved. Please review the feedback and resubmit.
            </p>
            <div>
              <Link to="/app/teacher/verification/status" className="btn btn-primary" style={{ marginRight: '10px' }}>
                View Details
              </Link>
              <Link to="/app/teacher/verification/submit" className="btn btn-primary">
                Resubmit
              </Link>
            </div>
          </div>
        );

      case 'suspended':
        return (
          <div className="card" style={{ backgroundColor: '#f8d7da', border: '1px solid #f5c6cb' }}>
            <h3 style={{ color: '#721c24', margin: '0 0 12px 0' }}>🚫 Account Suspended</h3>
            <p style={{ margin: '0 0 16px 0' }}>
              Your teacher account has been suspended. Please contact support for assistance.
            </p>
            <a href="mailto:support@skillora.com" className="btn btn-primary">
              Contact Support
            </a>
          </div>
        );

      default:
        return null;
    }
  };

  const isVerified = verification?.status === 'approved';

  return (
    <div>
      <div className="card">
        <h2>Teaching Dashboard</h2>
        <p>Welcome to your teaching space, {user?.name}!</p>
      </div>

      {/* Verification Status */}
      {getVerificationStatusCard()}

      {/* Dashboard Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginTop: '20px' }}>
        <div className="card">
          <h3>My Courses</h3>
          <p>Create and manage your courses.</p>
          {isVerified ? (
            <Link to="/app/teacher/courses" className="btn btn-primary">
              Manage Courses
            </Link>
          ) : (
            <button className="btn btn-primary" disabled>
              Verification Required
            </button>
          )}
        </div>
        
        <div className="card">
          <h3>Students</h3>
          <p>View and manage your enrolled students.</p>
          <button className="btn btn-primary" disabled={!isVerified}>
            {isVerified ? 'View Students' : 'Verification Required'}
          </button>
        </div>
        
        <div className="card">
          <h3>Analytics</h3>
          <p>Track course performance and student progress.</p>
          <button className="btn btn-primary" disabled={!isVerified}>
            {isVerified ? 'View Analytics' : 'Verification Required'}
          </button>
        </div>
        
        <div className="card">
          <h3>Earnings</h3>
          <p>View your teaching earnings and payments.</p>
          <button className="btn btn-primary" disabled={!isVerified}>
            {isVerified ? 'View Earnings' : 'Verification Required'}
          </button>
        </div>

        <div className="card">
          <h3>Profile</h3>
          <p>Update your teaching profile and bio.</p>
          <Link to="/app/teacher/profile" className="btn btn-primary">
            Edit Profile
          </Link>
        </div>

        <div className="card">
          <h3>Help & Support</h3>
          <p>Get help with teaching on Skillora.</p>
          <a href="mailto:support@skillora.com" className="btn btn-primary">
            Contact Support
          </a>
        </div>
      </div>

      {/* Quick Stats (placeholder for verified teachers) */}
      {isVerified && (
        <div className="card" style={{ marginTop: '20px' }}>
          <h3>Quick Stats</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '20px', textAlign: 'center' }}>
            <div>
              <h4 style={{ margin: '0', color: '#007bff' }}>0</h4>
              <p style={{ margin: '0', fontSize: '14px', color: '#666' }}>Courses</p>
            </div>
            <div>
              <h4 style={{ margin: '0', color: '#28a745' }}>0</h4>
              <p style={{ margin: '0', fontSize: '14px', color: '#666' }}>Students</p>
            </div>
            <div>
              <h4 style={{ margin: '0', color: '#ffc107' }}>$0</h4>
              <p style={{ margin: '0', fontSize: '14px', color: '#666' }}>Earnings</p>
            </div>
            <div>
              <h4 style={{ margin: '0', color: '#17a2b8' }}>0</h4>
              <p style={{ margin: '0', fontSize: '14px', color: '#666' }}>Reviews</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherDashboard;