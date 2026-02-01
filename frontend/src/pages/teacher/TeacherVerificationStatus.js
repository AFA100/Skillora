import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { teacherAPI } from '../../services/api';

const TeacherVerificationStatus = () => {
  const [verification, setVerification] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const location = useLocation();

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
      } else {
        setError('Failed to load verification status');
      }
    } finally {
      setLoading(false);
    }
  };

  const getStatusDisplay = (status) => {
    const statusConfig = {
      not_submitted: {
        color: '#6c757d',
        icon: '📝',
        title: 'Not Submitted',
        description: 'You haven\'t submitted your verification documents yet.'
      },
      pending: {
        color: '#ffc107',
        icon: '⏳',
        title: 'Under Review',
        description: 'Your documents are being reviewed by our team.'
      },
      approved: {
        color: '#28a745',
        icon: '✅',
        title: 'Approved',
        description: 'Congratulations! Your teacher account has been verified.'
      },
      rejected: {
        color: '#dc3545',
        icon: '❌',
        title: 'Rejected',
        description: 'Your verification was not approved. Please see the notes below.'
      },
      suspended: {
        color: '#dc3545',
        icon: '🚫',
        title: 'Suspended',
        description: 'Your teacher account has been suspended.'
      }
    };

    return statusConfig[status] || statusConfig.not_submitted;
  };

  if (loading) {
    return <div className="loading">Loading verification status...</div>;
  }

  if (error) {
    return (
      <div className="card" style={{ maxWidth: '600px', margin: '0 auto' }}>
        <div className="error">{error}</div>
      </div>
    );
  }

  const statusDisplay = getStatusDisplay(verification.status);

  return (
    <div className="card" style={{ maxWidth: '600px', margin: '0 auto' }}>
      <h2>Teacher Verification Status</h2>

      {/* Success message from form submission */}
      {location.state?.message && (
        <div style={{
          backgroundColor: '#d4edda',
          color: '#155724',
          padding: '12px',
          borderRadius: '4px',
          marginBottom: '20px',
          border: '1px solid #c3e6cb'
        }}>
          {location.state.message}
        </div>
      )}

      {/* Status Display */}
      <div style={{
        textAlign: 'center',
        padding: '30px',
        backgroundColor: '#f8f9fa',
        borderRadius: '8px',
        marginBottom: '20px'
      }}>
        <div style={{ fontSize: '64px', marginBottom: '16px' }}>
          {statusDisplay.icon}
        </div>
        <h3 style={{ color: statusDisplay.color, margin: '0 0 8px 0' }}>
          {statusDisplay.title}
        </h3>
        <p style={{ color: '#666', margin: 0 }}>
          {statusDisplay.description}
        </p>
      </div>

      {/* Verification Details */}
      {verification.status !== 'not_submitted' && (
        <div style={{ marginBottom: '20px' }}>
          <h4>Verification Details</h4>
          <div style={{ backgroundColor: '#f8f9fa', padding: '16px', borderRadius: '4px' }}>
            <div style={{ display: 'grid', gap: '8px' }}>
              <div><strong>Submission ID:</strong> {verification.submission_id}</div>
              <div><strong>Submitted:</strong> {new Date(verification.submitted_at).toLocaleDateString()}</div>
              {verification.reviewed_at && (
                <div><strong>Reviewed:</strong> {new Date(verification.reviewed_at).toLocaleDateString()}</div>
              )}
              {verification.reviewed_by_name && (
                <div><strong>Reviewed by:</strong> {verification.reviewed_by_name}</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Review Notes */}
      {verification.review_notes && (
        <div style={{ marginBottom: '20px' }}>
          <h4>Review Notes</h4>
          <div style={{
            backgroundColor: verification.status === 'approved' ? '#d4edda' : '#f8d7da',
            color: verification.status === 'approved' ? '#155724' : '#721c24',
            padding: '12px',
            borderRadius: '4px',
            border: `1px solid ${verification.status === 'approved' ? '#c3e6cb' : '#f5c6cb'}`
          }}>
            {verification.review_notes}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div style={{ textAlign: 'center' }}>
        {verification.status === 'not_submitted' && (
          <Link to="/app/teacher/verification/submit" className="btn btn-primary">
            Start Verification Process
          </Link>
        )}

        {verification.status === 'rejected' && (
          <div>
            <p style={{ color: '#666', marginBottom: '16px' }}>
              You can resubmit your verification with updated documents.
            </p>
            <Link to="/app/teacher/verification/submit" className="btn btn-primary">
              Resubmit Verification
            </Link>
          </div>
        )}

        {verification.status === 'approved' && (
          <div>
            <Link to="/app/teacher" className="btn btn-primary" style={{ marginRight: '10px' }}>
              Go to Teaching Dashboard
            </Link>
            <Link to="/app/teacher/courses/create" className="btn btn-primary">
              Create Your First Course
            </Link>
          </div>
        )}

        {verification.status === 'pending' && (
          <div>
            <p style={{ color: '#666', marginBottom: '16px' }}>
              We'll notify you via email once the review is complete.
            </p>
            <Link to="/app/teacher" className="btn btn-primary">
              Back to Dashboard
            </Link>
          </div>
        )}
      </div>

      {/* Help Section */}
      <div style={{
        marginTop: '30px',
        padding: '16px',
        backgroundColor: '#e3f2fd',
        borderRadius: '4px',
        border: '1px solid #bbdefb'
      }}>
        <h4 style={{ margin: '0 0 8px 0', color: '#1976d2' }}>Need Help?</h4>
        <p style={{ margin: '0 0 8px 0', fontSize: '14px' }}>
          If you have questions about the verification process or need to update your documents:
        </p>
        <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '14px' }}>
          <li>Email us at <a href="mailto:verification@skillora.com">verification@skillora.com</a></li>
          <li>Include your submission ID: {verification.submission_id}</li>
          <li>Response time: 1-2 business days</li>
        </ul>
      </div>
    </div>
  );
};

export default TeacherVerificationStatus;