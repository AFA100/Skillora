import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const Navbar = () => {
  const { user, logout, isLearner, isTeacher, isAdmin } = useAuth();

  const handleLogout = () => {
    logout();
  };

  return (
    <nav className="navbar">
      <div className="container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Link to="/app/dashboard" className="navbar-brand">
            Skillora
          </Link>
          
          <ul className="navbar-nav">
            <li>
              <Link to="/app/dashboard" className="nav-link">
                Dashboard
              </Link>
            </li>
            
            {isLearner && (
              <li>
                <Link to="/app/learner" className="nav-link">
                  My Learning
                </Link>
              </li>
            )}
            
            {isTeacher && (
              <li>
                <Link to="/app/teacher" className="nav-link">
                  Teaching
                  {!user?.is_verified && <span style={{ fontSize: '10px', color: '#ffc107' }}> ⚠️</span>}
                </Link>
              </li>
            )}
            
            {isAdmin && (
              <>
                <li>
                  <Link to="/app/admin" className="nav-link">
                    Admin
                  </Link>
                </li>
                <li>
                  <Link to="/app/admin/teachers" className="nav-link">
                    Teachers
                  </Link>
                </li>
                <li>
                  <Link to="/app/admin/learners" className="nav-link">
                    Learners
                  </Link>
                </li>
              </>
            )}
            
            <li>
              <Link to="/app/profile" className="nav-link">
                {user?.name || user?.email}
              </Link>
            </li>
            
            <li>
              <button onClick={handleLogout} className="nav-link" style={{ background: 'none', border: 'none' }}>
                Sign Out
              </button>
            </li>
          </ul>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;