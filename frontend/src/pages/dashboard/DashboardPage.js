import React from 'react';
import { useAuth } from '../../contexts/AuthContext';

const DashboardPage = () => {
  const { user, isLearner, isTeacher, isAdmin } = useAuth();

  return (
    <div>
      <div className="card">
        <h1>Welcome, {user?.name || user?.email}!</h1>
        <p>Role: <strong>{user?.role}</strong></p>
        
        {isLearner && (
          <div>
            <h3>Learner Dashboard</h3>
            <p>Access your courses, track progress, and manage your learning journey.</p>
            <div style={{ marginTop: '20px' }}>
              <a href="/app/learner" className="btn btn-primary">
                Go to My Learning
              </a>
            </div>
          </div>
        )}
        
        {isTeacher && (
          <div>
            <h3>Teacher Dashboard</h3>
            {user?.is_verified ? (
              <div>
                <p style={{ color: '#28a745' }}>✓ Your teacher account is verified</p>
                <p>Create courses, manage students, and track teaching performance.</p>
                <div style={{ marginTop: '20px' }}>
                  <a href="/app/teacher" className="btn btn-primary">
                    Go to Teaching Dashboard
                  </a>
                </div>
              </div>
            ) : (
              <div>
                <p style={{ color: '#ffc107', backgroundColor: '#fff3cd', padding: '10px', borderRadius: '4px' }}>
                  ⚠️ Your teacher account is pending verification. You can view the teaching dashboard but cannot create courses until verified.
                </p>
                <div style={{ marginTop: '20px' }}>
                  <a href="/app/teacher" className="btn btn-primary">
                    View Teaching Dashboard (Limited)
                  </a>
                </div>
              </div>
            )}
          </div>
        )}
        
        {isAdmin && (
          <div>
            <h3>Admin Dashboard</h3>
            <p>Manage users, courses, and system settings.</p>
            <div style={{ marginTop: '20px' }}>
              <a href="/app/admin" className="btn btn-primary">
                Go to Admin Panel
              </a>
            </div>
          </div>
        )}
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginTop: '30px' }}>
        <div className="card">
          <h4>Profile</h4>
          <p>Update your personal information and settings.</p>
          <a href="/app/profile" className="btn btn-primary">
            Edit Profile
          </a>
        </div>
        
        {isLearner && (
          <>
            <div className="card">
              <h4>Browse Courses</h4>
              <p>Discover new courses to enhance your skills.</p>
              <button className="btn btn-primary" disabled>
                Coming Soon
              </button>
            </div>
            
            <div className="card">
              <h4>My Certificates</h4>
              <p>View your earned certificates and achievements.</p>
              <button className="btn btn-primary" disabled>
                Coming Soon
              </button>
            </div>
          </>
        )}
        
        {isTeacher && (
          <>
            <div className="card">
              <h4>Create Course</h4>
              <p>Start creating your next course.</p>
              <button className="btn btn-primary" disabled={!user?.is_verified}>
                {user?.is_verified ? 'Coming Soon' : 'Verification Required'}
              </button>
            </div>
            
            <div className="card">
              <h4>Analytics</h4>
              <p>View your teaching performance metrics.</p>
              <button className="btn btn-primary" disabled>
                Coming Soon
              </button>
            </div>
          </>
        )}
        
        {isAdmin && (
          <>
            <div className="card">
              <h4>User Management</h4>
              <p>Manage platform users and permissions.</p>
              <a href="/app/admin/teachers" className="btn btn-primary">
                Manage Teachers
              </a>
            </div>
            
            <div className="card">
              <h4>System Logs</h4>
              <p>View audit logs and system activity.</p>
              <a href="/app/admin/logs" className="btn btn-primary">
                View Activity Logs
              </a>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;