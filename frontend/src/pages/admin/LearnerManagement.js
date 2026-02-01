import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';

const LearnerManagement = () => {
  const [learners, setLearners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    active: '',
    search: ''
  });
  const [actionLoading, setActionLoading] = useState({});
  const [selectedLearner, setSelectedLearner] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalAction, setModalAction] = useState('');
  const [suspensionReason, setSuspensionReason] = useState('');

  useEffect(() => {
    fetchLearners();
  }, [filters]);

  const fetchLearners = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filters.active) params.active = filters.active;
      if (filters.search) params.search = filters.search;
      
      const response = await adminAPI.getLearners(params);
      setLearners(response.data.results);
    } catch (error) {
      setError('Failed to load learners');
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

  const openActionModal = (learner, action) => {
    setSelectedLearner(learner);
    setModalAction(action);
    setSuspensionReason('');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedLearner(null);
    setModalAction('');
    setSuspensionReason('');
  };

  const handleLearnerAction = async () => {
    if (!selectedLearner) return;

    const learnerId = selectedLearner.id;
    setActionLoading(prev => ({ ...prev, [learnerId]: true }));

    try {
      let response;

      switch (modalAction) {
        case 'suspend':
          if (!suspensionReason.trim()) {
            setError('Suspension reason is required');
            return;
          }
          response = await adminAPI.suspendLearner(learnerId, { reason: suspensionReason });
          break;
        case 'reactivate':
          response = await adminAPI.reactivateUser(learnerId);
          break;
        default:
          return;
      }

      // Update learner in local state
      setLearners(prev => prev.map(learner => 
        learner.id === learnerId 
          ? { 
              ...learner, 
              is_active: modalAction === 'reactivate'
            }
          : learner
      ));

      closeModal();
      setError('');
      
      // Show success message
      setTimeout(() => {
        fetchLearners(); // Refresh to get updated data
      }, 1000);

    } catch (error) {
      setError(error.response?.data?.error || `Failed to ${modalAction} learner`);
    } finally {
      setActionLoading(prev => ({ ...prev, [learnerId]: false }));
    }
  };

  const getStatusBadge = (learner) => {
    if (learner.is_active) {
      return <span className="status-badge active">Active</span>;
    } else {
      return <span className="status-badge suspended">Suspended</span>;
    }
  };

  const getAvailableActions = (learner) => {
    const actions = [];
    
    if (learner.is_active) {
      actions.push({ key: 'suspend', label: 'Suspend', color: '#ffc107' });
    } else {
      actions.push({ key: 'reactivate', label: 'Reactivate', color: '#28a745' });
    }
    
    return actions;
  };

  if (loading) {
    return <div className="loading">Loading learners...</div>;
  }

  return (
    <div>
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2>Learner Management</h2>
          <button onClick={fetchLearners} className="btn btn-primary">
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
            <label htmlFor="active-filter">Status:</label>
            <select
              id="active-filter"
              value={filters.active}
              onChange={(e) => handleFilterChange('active', e.target.value)}
              style={{ marginLeft: '8px', padding: '4px 8px' }}
            >
              <option value="">All</option>
              <option value="true">Active</option>
              <option value="false">Suspended</option>
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

        {/* Summary Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px', marginBottom: '20px' }}>
          <div style={{ textAlign: 'center', padding: '16px', backgroundColor: '#e8f5e8', borderRadius: '8px' }}>
            <h3 style={{ margin: '0', color: '#388e3c' }}>
              {learners.filter(l => l.is_active).length}
            </h3>
            <p style={{ margin: '0', fontSize: '14px', color: '#666' }}>Active Learners</p>
          </div>
          <div style={{ textAlign: 'center', padding: '16px', backgroundColor: '#ffebee', borderRadius: '8px' }}>
            <h3 style={{ margin: '0', color: '#d32f2f' }}>
              {learners.filter(l => !l.is_active).length}
            </h3>
            <p style={{ margin: '0', fontSize: '14px', color: '#666' }}>Suspended</p>
          </div>
          <div style={{ textAlign: 'center', padding: '16px', backgroundColor: '#e3f2fd', borderRadius: '8px' }}>
            <h3 style={{ margin: '0', color: '#1976d2' }}>
              {learners.length}
            </h3>
            <p style={{ margin: '0', fontSize: '14px', color: '#666' }}>Total Learners</p>
          </div>
        </div>

        {/* Learners Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8f9fa' }}>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Learner</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Status</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Joined</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Last Active</th>
                <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #dee2e6' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {learners.map((learner) => (
                <tr key={learner.id} style={{ borderBottom: '1px solid #dee2e6' }}>
                  <td style={{ padding: '12px' }}>
                    <div>
                      <div style={{ fontWeight: 'bold' }}>{learner.name}</div>
                      <div style={{ fontSize: '14px', color: '#666' }}>{learner.email}</div>
                      {learner.phone_number && (
                        <div style={{ fontSize: '12px', color: '#999', marginTop: '2px' }}>
                          📞 {learner.phone_number}
                        </div>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: '12px' }}>
                    {getStatusBadge(learner)}
                  </td>
                  <td style={{ padding: '12px' }}>
                    {new Date(learner.created_at).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '12px' }}>
                    {learner.updated_at ? new Date(learner.updated_at).toLocaleDateString() : 'N/A'}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
                      {getAvailableActions(learner).map((action) => (
                        <button
                          key={action.key}
                          onClick={() => openActionModal(learner, action.key)}
                          disabled={actionLoading[learner.id]}
                          style={{
                            padding: '4px 8px',
                            fontSize: '12px',
                            border: 'none',
                            borderRadius: '4px',
                            backgroundColor: action.color,
                            color: action.key === 'suspend' ? '#000' : 'white',
                            cursor: 'pointer'
                          }}
                        >
                          {actionLoading[learner.id] ? '...' : action.label}
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {learners.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
            No learners found matching your criteria.
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
              {modalAction.charAt(0).toUpperCase() + modalAction.slice(1)} Learner
            </h3>
            
            <p>
              <strong>Learner:</strong> {selectedLearner?.name} ({selectedLearner?.email})
            </p>

            {modalAction === 'suspend' && (
              <div style={{ marginBottom: '20px' }}>
                <label htmlFor="suspension-reason">Suspension Reason:</label>
                <textarea
                  id="suspension-reason"
                  value={suspensionReason}
                  onChange={(e) => setSuspensionReason(e.target.value)}
                  rows="4"
                  style={{ width: '100%', marginTop: '8px' }}
                  placeholder="Enter reason for suspension..."
                  required
                />
                <small style={{ color: '#666', fontSize: '12px' }}>
                  This reason will be logged and may be shared with the learner.
                </small>
              </div>
            )}

            {modalAction === 'reactivate' && (
              <div style={{ 
                padding: '12px', 
                backgroundColor: '#d4edda', 
                borderRadius: '4px', 
                marginBottom: '20px',
                border: '1px solid #c3e6cb'
              }}>
                <p style={{ margin: '0', color: '#155724' }}>
                  ✅ This will restore the learner's access to their account and all platform features.
                </p>
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
                onClick={handleLearnerAction}
                disabled={actionLoading[selectedLearner?.id]}
                style={{
                  padding: '8px 16px',
                  border: 'none',
                  borderRadius: '4px',
                  backgroundColor: modalAction === 'suspend' ? '#ffc107' : '#28a745',
                  color: modalAction === 'suspend' ? '#000' : 'white',
                  cursor: 'pointer'
                }}
              >
                {actionLoading[selectedLearner?.id] ? 'Processing...' : 
                 `${modalAction.charAt(0).toUpperCase() + modalAction.slice(1)} Learner`}
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
        .status-badge.active {
          background-color: #d4edda;
          color: #155724;
        }
        .status-badge.suspended {
          background-color: #f8d7da;
          color: #721c24;
        }
      `}</style>
    </div>
  );
};

export default LearnerManagement;