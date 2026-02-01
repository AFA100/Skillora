import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';

const ActivityLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    action: '',
    resource_type: '',
    user_id: ''
  });
  const [selectedLog, setSelectedLog] = useState(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchLogs();
  }, [filters]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filters.action) params.action = filters.action;
      if (filters.resource_type) params.resource_type = filters.resource_type;
      if (filters.user_id) params.user_id = filters.user_id;
      
      const response = await adminAPI.getAuditLogs(params);
      setLogs(response.data.results);
    } catch (error) {
      setError('Failed to load activity logs');
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

  const openLogModal = (log) => {
    setSelectedLog(log);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedLog(null);
  };

  const getActionBadge = (action) => {
    const actionConfig = {
      create: { color: '#28a745', label: 'Create' },
      update: { color: '#007bff', label: 'Update' },
      delete: { color: '#dc3545', label: 'Delete' },
      login: { color: '#17a2b8', label: 'Login' },
      logout: { color: '#6c757d', label: 'Logout' },
      approve: { color: '#28a745', label: 'Approve' },
      reject: { color: '#dc3545', label: 'Reject' },
      suspend: { color: '#ffc107', label: 'Suspend' },
      reactivate: { color: '#28a745', label: 'Reactivate' },
      view: { color: '#6c757d', label: 'View' }
    };

    const config = actionConfig[action] || { color: '#6c757d', label: action };
    
    return (
      <span style={{
        padding: '4px 8px',
        borderRadius: '12px',
        fontSize: '12px',
        fontWeight: 'bold',
        backgroundColor: config.color,
        color: 'white'
      }}>
        {config.label}
      </span>
    );
  };

  const getResourceIcon = (resourceType) => {
    const icons = {
      user: '👤',
      teacher: '👨‍🏫',
      learner: '👨‍🎓',
      course: '📚',
      enrollment: '📝',
      payment: '💳',
      quiz: '❓',
      certificate: '🏆'
    };
    
    return icons[resourceType] || '📄';
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString()
    };
  };

  if (loading) {
    return <div className="loading">Loading activity logs...</div>;
  }

  return (
    <div>
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2>Activity Logs</h2>
          <button onClick={fetchLogs} className="btn btn-primary">
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
            <label htmlFor="action-filter">Action:</label>
            <select
              id="action-filter"
              value={filters.action}
              onChange={(e) => handleFilterChange('action', e.target.value)}
              style={{ marginLeft: '8px', padding: '4px 8px' }}
            >
              <option value="">All Actions</option>
              <option value="create">Create</option>
              <option value="update">Update</option>
              <option value="delete">Delete</option>
              <option value="login">Login</option>
              <option value="logout">Logout</option>
              <option value="approve">Approve</option>
              <option value="reject">Reject</option>
              <option value="suspend">Suspend</option>
              <option value="reactivate">Reactivate</option>
            </select>
          </div>
          
          <div>
            <label htmlFor="resource-filter">Resource:</label>
            <select
              id="resource-filter"
              value={filters.resource_type}
              onChange={(e) => handleFilterChange('resource_type', e.target.value)}
              style={{ marginLeft: '8px', padding: '4px 8px' }}
            >
              <option value="">All Resources</option>
              <option value="user">User</option>
              <option value="teacher">Teacher</option>
              <option value="learner">Learner</option>
              <option value="course">Course</option>
              <option value="enrollment">Enrollment</option>
              <option value="payment">Payment</option>
            </select>
          </div>
        </div>

        {/* Activity Summary */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '12px', marginBottom: '20px' }}>
          {['approve', 'reject', 'suspend', 'create'].map(action => {
            const count = logs.filter(log => log.action === action).length;
            return (
              <div key={action} style={{ 
                textAlign: 'center', 
                padding: '12px', 
                backgroundColor: '#f8f9fa', 
                borderRadius: '8px',
                cursor: 'pointer'
              }}
              onClick={() => handleFilterChange('action', action)}
              >
                <h4 style={{ margin: '0', color: '#007bff' }}>{count}</h4>
                <p style={{ margin: '0', fontSize: '12px', color: '#666', textTransform: 'capitalize' }}>
                  {action}
                </p>
              </div>
            );
          })}
        </div>

        {/* Logs Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8f9fa' }}>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>User</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Action</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Resource</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Timestamp</th>
                <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #dee2e6' }}>Details</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => {
                const timestamp = formatTimestamp(log.timestamp);
                return (
                  <tr key={log.id} style={{ borderBottom: '1px solid #dee2e6' }}>
                    <td style={{ padding: '12px' }}>
                      <div>
                        <div style={{ fontWeight: 'bold' }}>{log.user}</div>
                        {log.user_email && (
                          <div style={{ fontSize: '12px', color: '#666' }}>{log.user_email}</div>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '12px' }}>
                      {getActionBadge(log.action)}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>{getResourceIcon(log.resource_type)}</span>
                        <div>
                          <div style={{ fontWeight: 'bold', textTransform: 'capitalize' }}>
                            {log.resource_type}
                          </div>
                          {log.resource_id && (
                            <div style={{ fontSize: '12px', color: '#666' }}>
                              ID: {log.resource_id}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '12px' }}>
                      <div>
                        <div style={{ fontWeight: 'bold' }}>{timestamp.date}</div>
                        <div style={{ fontSize: '12px', color: '#666' }}>{timestamp.time}</div>
                      </div>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <button
                        onClick={() => openLogModal(log)}
                        style={{
                          padding: '4px 8px',
                          fontSize: '12px',
                          border: '1px solid #007bff',
                          borderRadius: '4px',
                          backgroundColor: 'white',
                          color: '#007bff',
                          cursor: 'pointer'
                        }}
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {logs.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
            No activity logs found matching your criteria.
          </div>
        )}
      </div>

      {/* Log Details Modal */}
      {showModal && selectedLog && (
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
            maxWidth: '600px',
            width: '90%',
            maxHeight: '80vh',
            overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3>Activity Log Details</h3>
              <button
                onClick={closeModal}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '20px',
                  cursor: 'pointer'
                }}
              >
                ✕
              </button>
            </div>
            
            <div style={{ display: 'grid', gap: '16px' }}>
              <div>
                <strong>User:</strong> {selectedLog.user}
                {selectedLog.user_email && (
                  <div style={{ fontSize: '14px', color: '#666' }}>
                    Email: {selectedLog.user_email}
                  </div>
                )}
              </div>
              
              <div>
                <strong>Action:</strong> {getActionBadge(selectedLog.action)}
              </div>
              
              <div>
                <strong>Resource:</strong> {selectedLog.resource_type}
                {selectedLog.resource_id && (
                  <div style={{ fontSize: '14px', color: '#666' }}>
                    ID: {selectedLog.resource_id}
                  </div>
                )}
              </div>
              
              <div>
                <strong>Timestamp:</strong> {new Date(selectedLog.timestamp).toLocaleString()}
              </div>
              
              {selectedLog.ip_address && (
                <div>
                  <strong>IP Address:</strong> {selectedLog.ip_address}
                </div>
              )}
              
              {selectedLog.details && Object.keys(selectedLog.details).length > 0 && (
                <div>
                  <strong>Additional Details:</strong>
                  <div style={{
                    backgroundColor: '#f8f9fa',
                    padding: '12px',
                    borderRadius: '4px',
                    marginTop: '8px',
                    fontSize: '14px'
                  }}>
                    <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                      {JSON.stringify(selectedLog.details, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>
            
            <div style={{ textAlign: 'right', marginTop: '20px' }}>
              <button
                onClick={closeModal}
                className="btn btn-primary"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ActivityLogs;