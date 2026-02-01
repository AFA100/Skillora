import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';

const TeacherManagement = () => {
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    status: '',
    search: ''
  });
  const [actionLoading, setActionLoading] = useState({});
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalAction, setModalAction] = useState('');
  const [reviewNotes, setReviewNotes] = useState('');

  useEffect(() => {
    fetchTeachers();
  }, [filters]);

  const fetchTeachers = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filters.status) params.status = filters.status;
      if (filters.search) params.search = filters.search;
      
      const response = await adminAPI.getTeachers(params);
      setTeachers(response.data.results);
    } catch (error) {
      setError('Failed to load teachers');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const openActionModal = (teacher, action) => {
    setSelectedTeacher(teacher);
    setModalAction(action);
    setReviewNotes('');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedTeacher(null);
    setModalAction('');
    setReviewNotes('');
  };

  const handleTeacherAction = async () => {
    if (!selectedTeacher) return;

    const teacherId = selectedTeacher.id;
    setActionLoading(prev => ({ ...prev, [teacherId]: true }));

    try {
      let response;
      const data = { review_notes: reviewNotes };

      switch (modalAction) {
        case 'approve':
          response = await adminAPI.approveTeacher(teacherId, data);
          break;
        case 'reject':
          if (!reviewNotes.trim()) {
            setError('Review notes are required for rejection');
            return;
          }
          response = await adminAPI.rejectTeacher(teacherId, data);
          break;
        case 'suspend':
          if (!reviewNotes.trim()) {
            setError('Reason is required for suspension');
            return;
          }
          response = await adminAPI.suspendTeacher(teacherId, { reason: reviewNotes });
          break;
        case 'reactivate':
          response = await adminAPI.reactivateUser(teacherId);
          break;
        default:
          return;
      }

      // Update teacher in local state
      setTeachers(prev => prev.map(teacher => 
        teacher.id === teacherId 
          ? { 
              ...teacher, 
              is_verified: modalAction === 'approve',
              is_active: modalAction !== 'suspend'
            }
          : teacher
      ));

      closeModal();
      setError('');
      
      // Show success message
      setTimeout(() => {
        fetchTeachers(); // Refresh to get updated data
      }, 1000);

    } catch (error) {
      setError(error.response?.data?.error || `Failed to ${modalAction} teacher`);
    } finally {
      setActionLoading(prev => ({ ...prev, [teacherId]: false }));
    }
  };

  const getStatusBadge = (teacher) => {
    if (!teacher.is_active) {
      return <span className="status-badge suspended">Suspended</span>;
    }
    
    if (teacher.verification) {
      const status = teacher.verification.status;
      switch (status) {
        case 'approved':
          return <span className="status-badge approved">Verified</span>;
        case 'pending':
          return <span className="status-badge pending">Pending</span>;
        case 'rejected':
          return <span className="status-badge rejected">Rejected</span>;
        case 'suspended':
          return <span className="status-badge suspended">Suspended</span>;
        default:
          return <span className="status-badge unverified">Unverified</span>;
      }
    }
    
    return <span className="status-badge unverified">Unverified</span>;
  };

  const getAvailableActions = (teacher) => {
    const actions = [];
    
    if (!teacher.is_active) {
      actions.push({ key: 'reactivate', label: 'Reactivate', color: '#28a745' });
    } else {
      if (teacher.verification?.status === 'pending') {
        actions.push({ key: 'approve', label: 'Approve', color: '#28a745' });
        actions.push({ key: 'reject', label: 'Reject', color: '#dc3545' });
      } else if (teacher.verification?.status === 'rejected') {
        actions.push({ key: 'approve', label: 'Approve', color: '#28a745' });
      }
      actions.push({ key: 'suspend', label: 'Suspend', color: '#ffc107' });
    }
    
    return actions;
  };

  if (loading) {
    return <div className="loading">Loading teachers...</div>;
  }

  return (
    <div>
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2>Teacher Management</h2>
          <button onClick={fetchTeachers} className="btn btn-primary">
            🔄 Refresh
          </button>
        </div>

        {error && (
          <div className="error" style={{ marginBottom: '20px' }}>
            {error}
          </div>
        )}

        {/* Filters */}
        <div style={{ display: 'flex', gap: '16px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <div>
            <label htmlFor="status-filter">Status:</label>
            <select
              id="status-filter"
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              style={{ marginLeft: '8px', padding: '4px 8px' }}
            >
              <option value="">All</option>
              <option value="verified">Verified</option>
              <option value="unverified">Unverified</option>
              <option value="pending">Pending Review</option>
            </select>
          </div>
          
          <div>
            <label htmlFor="search-filter">Search:</label>
            <input
              id="search-filter"
              type="text"
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              placeholder="Name or email..."
              style={{ marginLeft: '8px', padding: '4px 8px', width: '200px' }}
            />
          </div>
        </div>

        {/* Teachers Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8f9fa' }}>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Teacher</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Status</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Experience</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Joined</th>
                <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #dee2e6' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {teachers.map((teacher) => (
                <tr key={teacher.id} style={{ borderBottom: '1px solid #dee2e6' }}>
                  <td style={{ padding: '12px' }}>
                    <div>
                      <div style={{ fontWeight: 'bold' }}>{teacher.name}</div>
                      <div style={{ fontSize: '14px', color: '#666' }}>{teacher.email}</div>
                      {teacher.profile?.skills && (
                        <div style={{ fontSize: '12px', color: '#007bff', marginTop: '4px' }}>
                          {teacher.profile.skills.substring(0, 50)}...
                        </div>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: '12px' }}>
                    {getStatusBadge(teacher)}
                  </td>
                  <td style={{ padding: '12px' }}>
                    {teacher.profile?.years_of_experience || 0} years
                  </td>
                  <td style={{ padding: '12px' }}>
                    {new Date(teacher.created_at).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
                      {getAvailableActions(teacher).map((action) => (
                        <button
                          key={action.key}
                          onClick={() => openActionModal(teacher, action.key)}
                          disabled={actionLoading[teacher.id]}
                          style={{
                            padding: '4px 8px',
                            fontSize: '12px',
                            border: 'none',
                            borderRadius: '4px',
                            backgroundColor: action.color,
                            color: 'white',
                            cursor: 'pointer'
                          }}
                        >
                          {actionLoading[teacher.id] ? '...' : action.label}
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {teachers.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
            No teachers found matching your criteria.
          </div>
        )}
      </div>

      {/* Action Modal */}
      {showModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '24px',
            borderRadius: '8px',
            maxWidth: '500px',
            width: '90%',
            maxHeight: '80vh',
            overflowY: 'auto'
          }}>
            <h3>
              {modalAction.charAt(0).toUpperCase() + modalAction.slice(1)} Teacher
            </h3>
            
            <p>
              <strong>Teacher:</strong> {selectedTeacher?.name} ({selectedTeacher?.email})
            </p>

            {(modalAction === 'reject' || modalAction === 'suspend') && (
              <div style={{ marginBottom: '20px' }}>
                <label htmlFor="review-notes">
                  {modalAction === 'reject' ? 'Rejection Reason:' : 'Suspension Reason:'}
                </label>
                <textarea
                  id="review-notes"
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  rows="4"
                  style={{ width: '100%', marginTop: '8px' }}
                  placeholder={`Enter reason for ${modalAction}...`}
                  required
                />
              </div>
            )}

            {modalAction === 'approve' && (
              <div style={{ marginBottom: '20px' }}>
                <label htmlFor="review-notes">Review Notes (Optional):</label>
                <textarea
                  id="review-notes"
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  rows="3"
                  style={{ width: '100%', marginTop: '8px' }}
                  placeholder="Add any notes about the approval..."
                />
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={closeModal}
                style={{
                  padding: '8px 16px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  backgroundColor: 'white',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleTeacherAction}
                disabled={actionLoading[selectedTeacher?.id]}
                style={{
                  padding: '8px 16px',
                  border: 'none',
                  borderRadius: '4px',
                  backgroundColor: modalAction === 'approve' ? '#28a745' : 
                                 modalAction === 'reject' ? '#dc3545' : 
                                 modalAction === 'suspend' ? '#ffc107' : '#007bff',
                  color: 'white',
                  cursor: 'pointer'
                }}
              >
                {actionLoading[selectedTeacher?.id] ? 'Processing...' : 
                 `${modalAction.charAt(0).toUpperCase() + modalAction.slice(1)} Teacher`}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .status-badge {
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: bold;
        }
        .status-badge.approved {
          background-color: #d4edda;
          color: #155724;
        }
        .status-badge.pending {
          background-color: #fff3cd;
          color: #856404;
        }
        .status-badge.rejected {
          background-color: #f8d7da;
          color: #721c24;
        }
        .status-badge.suspended {
          background-color: #f8d7da;
          color: #721c24;
        }
        .status-badge.unverified {
          background-color: #e2e3e5;
          color: #383d41;
        }
      `}</style>
    </div>
  );
};

export default TeacherManagement;