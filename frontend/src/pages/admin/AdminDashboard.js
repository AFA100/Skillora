import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminAPI } from '../../services/api';

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const response = await adminAPI.getDashboardStats();
      setStats(response.data);
    } catch (error) {
      setError('Failed to load dashboard statistics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading dashboard...</div>;
  }

  if (error) {
    return (
      <div className="card">
        <div className="error">{error}</div>
      </div>
    );
  }

  return (
    <div>
      <div className="card">
        <h2>Admin Dashboard</h2>
        <p>System administration and management overview.</p>
      </div>

      {/* Statistics Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '30px' }}>
        <div className="card" style={{ textAlign: 'center', backgroundColor: '#e3f2fd' }}>
          <h3 style={{ margin: '0 0 8px 0', color: '#1976d2', fontSize: '32px' }}>
            {stats?.user_stats?.total_users || 0}
          </h3>
          <p style={{ margin: '0', color: '#666' }}>Total Users</p>
          <small style={{ color: '#999' }}>
            +{stats?.activity_stats?.new_users_30d || 0} this month
          </small>
        </div>

        <div className="card" style={{ textAlign: 'center', backgroundColor: '#f3e5f5' }}>
          <h3 style={{ margin: '0 0 8px 0', color: '#7b1fa2', fontSize: '32px' }}>
            {stats?.user_stats?.total_teachers || 0}
          </h3>
          <p style={{ margin: '0', color: '#666' }}>Teachers</p>
          <small style={{ color: '#999' }}>
            {stats?.user_stats?.verified_teachers || 0} verified
          </small>
        </div>

        <div className="card" style={{ textAlign: 'center', backgroundColor: '#e8f5e8' }}>
          <h3 style={{ margin: '0 0 8px 0', color: '#388e3c', fontSize: '32px' }}>
            {stats?.user_stats?.total_learners || 0}
          </h3>
          <p style={{ margin: '0', color: '#666' }}>Learners</p>
          <small style={{ color: '#999' }}>
            Active students
          </small>
        </div>

        <div className="card" style={{ textAlign: 'center', backgroundColor: '#fff3e0' }}>
          <h3 style={{ margin: '0 0 8px 0', color: '#f57c00', fontSize: '32px' }}>
            {stats?.user_stats?.pending_verifications || 0}
          </h3>
          <p style={{ margin: '0', color: '#666' }}>Pending Verifications</p>
          <small style={{ color: '#999' }}>
            Require review
          </small>
        </div>
      </div>

      {/* Management Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '30px' }}>
        <div className="card">
          <h3>👨‍🏫 Teacher Management</h3>
          <p>Manage teacher accounts, approvals, and verifications.</p>
          <div style={{ marginTop: '16px' }}>
            <Link to="/app/admin/teachers" className="btn btn-primary" style={{ marginRight: '10px' }}>
              Manage Teachers
            </Link>
            {stats?.user_stats?.pending_verifications > 0 && (
              <span style={{ 
                backgroundColor: '#ffc107', 
                color: '#856404', 
                padding: '4px 8px', 
                borderRadius: '12px', 
                fontSize: '12px',
                fontWeight: 'bold'
              }}>
                {stats.user_stats.pending_verifications} pending
              </span>
            )}
          </div>
        </div>

        <div className="card">
          <h3>👨‍🎓 Learner Management</h3>
          <p>View and manage learner accounts and activities.</p>
          <div style={{ marginTop: '16px' }}>
            <Link to="/app/admin/learners" className="btn btn-primary">
              Manage Learners
            </Link>
          </div>
        </div>

        <div className="card">
          <h3>📊 Activity Logs</h3>
          <p>Monitor system activities and user actions.</p>
          <div style={{ marginTop: '16px' }}>
            <Link to="/app/admin/logs" className="btn btn-primary">
              View Logs
            </Link>
          </div>
        </div>

        <div className="card">
          <h3>➕ Create User</h3>
          <p>Create new user accounts with specific roles.</p>
          <div style={{ marginTop: '16px' }}>
            <Link to="/app/admin/create-user" className="btn btn-primary">
              Create User
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Activities */}
      {stats?.recent_activities && stats.recent_activities.length > 0 && (
        <div className="card">
          <h3>Recent Activities</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8f9fa' }}>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>User</th>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Action</th>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Resource</th>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Time</th>
                </tr>
              </thead>
              <tbody>
                {stats.recent_activities.slice(0, 5).map((activity) => (
                  <tr key={activity.id}>
                    <td style={{ padding: '12px', borderBottom: '1px solid #dee2e6' }}>
                      {activity.user}
                    </td>
                    <td style={{ padding: '12px', borderBottom: '1px solid #dee2e6' }}>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        backgroundColor: activity.action === 'approve' ? '#d4edda' : 
                                       activity.action === 'reject' ? '#f8d7da' :
                                       activity.action === 'suspend' ? '#fff3cd' : '#e2e3e5',
                        color: activity.action === 'approve' ? '#155724' : 
                               activity.action === 'reject' ? '#721c24' :
                               activity.action === 'suspend' ? '#856404' : '#383d41'
                      }}>
                        {activity.action}
                      </span>
                    </td>
                    <td style={{ padding: '12px', borderBottom: '1px solid #dee2e6' }}>
                      {activity.resource_type}
                    </td>
                    <td style={{ padding: '12px', borderBottom: '1px solid #dee2e6' }}>
                      {new Date(activity.timestamp).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ textAlign: 'center', marginTop: '16px' }}>
            <Link to="/app/admin/logs" style={{ color: '#007bff', textDecoration: 'none' }}>
              View All Activities →
            </Link>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="card" style={{ backgroundColor: '#f8f9fa' }}>
        <h3>Quick Actions</h3>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button 
            className="btn btn-primary"
            onClick={() => window.location.reload()}
          >
            🔄 Refresh Dashboard
          </button>
          <Link to="/app/admin/teachers?status=pending" className="btn btn-primary">
            📋 Review Pending Teachers
          </Link>
          <Link to="/app/admin/logs?action=suspend" className="btn btn-primary">
            🚫 View Suspensions
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;