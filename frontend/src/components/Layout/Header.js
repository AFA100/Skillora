import React, { useState, useContext } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../../contexts/AuthContext';
import './Header.css';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/');
    setIsProfileOpen(false);
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const toggleProfile = () => {
    setIsProfileOpen(!isProfileOpen);
  };

  return (
    <header className="skillora-header">
      <nav className="skillora-navbar">
        <div className="skillora-container">
          <div className="skillora-navbar-content">
            {/* Brand Logo */}
            <Link to="/" className="skillora-navbar-brand">
              <div className="skillora-logo">
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect width="32" height="32" rx="8" fill="url(#gradient)" />
                  <path d="M8 12h16v2H8v-2zm0 4h16v2H8v-2zm0 4h12v2H8v-2z" fill="white" />
                  <circle cx="22" cy="10" r="3" fill="white" />
                  <defs>
                    <linearGradient id="gradient" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
                      <stop stopColor="var(--skillora-primary)" />
                      <stop offset="1" stopColor="var(--skillora-secondary)" />
                    </linearGradient>
                  </defs>
                </svg>
                <span className="skillora-brand-text">Skillora</span>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <div className="skillora-navbar-nav desktop-nav">
              {!user ? (
                <>
                  <Link 
                    to="/courses" 
                    className={`skillora-navbar-link ${isActive('/courses') ? 'active' : ''}`}
                  >
                    Courses
                  </Link>
                  <Link 
                    to="/about" 
                    className={`skillora-navbar-link ${isActive('/about') ? 'active' : ''}`}
                  >
                    About
                  </Link>
                  <Link 
                    to="/contact" 
                    className={`skillora-navbar-link ${isActive('/contact') ? 'active' : ''}`}
                  >
                    Contact
                  </Link>
                </>
              ) : (
                <>
                  {user.role === 'learner' && (
                    <>
                      <Link 
                        to="/dashboard" 
                        className={`skillora-navbar-link ${isActive('/dashboard') ? 'active' : ''}`}
                      >
                        Dashboard
                      </Link>
                      <Link 
                        to="/courses" 
                        className={`skillora-navbar-link ${isActive('/courses') ? 'active' : ''}`}
                      >
                        Browse Courses
                      </Link>
                      <Link 
                        to="/my-learning" 
                        className={`skillora-navbar-link ${isActive('/my-learning') ? 'active' : ''}`}
                      >
                        My Learning
                      </Link>
                      <Link 
                        to="/certificates" 
                        className={`skillora-navbar-link ${isActive('/certificates') ? 'active' : ''}`}
                      >
                        Certificates
                      </Link>
                    </>
                  )}
                  
                  {user.role === 'teacher' && (
                    <>
                      <Link 
                        to="/teacher/dashboard" 
                        className={`skillora-navbar-link ${isActive('/teacher/dashboard') ? 'active' : ''}`}
                      >
                        Dashboard
                      </Link>
                      <Link 
                        to="/teacher/courses" 
                        className={`skillora-navbar-link ${isActive('/teacher/courses') ? 'active' : ''}`}
                      >
                        My Courses
                      </Link>
                      <Link 
                        to="/teacher/earnings" 
                        className={`skillora-navbar-link ${isActive('/teacher/earnings') ? 'active' : ''}`}
                      >
                        Earnings
                      </Link>
                      <Link 
                        to="/teacher/analytics" 
                        className={`skillora-navbar-link ${isActive('/teacher/analytics') ? 'active' : ''}`}
                      >
                        Analytics
                      </Link>
                    </>
                  )}
                  
                  {user.role === 'admin' && (
                    <>
                      <Link 
                        to="/admin/dashboard" 
                        className={`skillora-navbar-link ${isActive('/admin/dashboard') ? 'active' : ''}`}
                      >
                        Admin Dashboard
                      </Link>
                      <Link 
                        to="/admin/users" 
                        className={`skillora-navbar-link ${isActive('/admin/users') ? 'active' : ''}`}
                      >
                        Users
                      </Link>
                      <Link 
                        to="/admin/courses" 
                        className={`skillora-navbar-link ${isActive('/admin/courses') ? 'active' : ''}`}
                      >
                        Courses
                      </Link>
                      <Link 
                        to="/admin/analytics" 
                        className={`skillora-navbar-link ${isActive('/admin/analytics') ? 'active' : ''}`}
                      >
                        Analytics
                      </Link>
                    </>
                  )}
                </>
              )}
            </div>

            {/* Auth Section */}
            <div className="skillora-navbar-auth">
              {!user ? (
                <div className="auth-buttons">
                  <Link to="/login" className="skillora-btn skillora-btn-ghost">
                    Sign In
                  </Link>
                  <Link to="/register" className="skillora-btn skillora-btn-primary">
                    Get Started
                  </Link>
                </div>
              ) : (
                <div className="user-menu">
                  {/* Notifications */}
                  <button className="notification-btn" title="Notifications">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M10 2C7.8 2 6 3.8 6 6v4l-2 2v1h12v-1l-2-2V6c0-2.2-1.8-4-4-4zm1 14h-2c0 1.1.9 2 2 2s2-.9 2-2z"/>
                    </svg>
                    <span className="notification-badge">3</span>
                  </button>

                  {/* Profile Dropdown */}
                  <div className="profile-dropdown">
                    <button 
                      className="profile-btn"
                      onClick={toggleProfile}
                      aria-expanded={isProfileOpen}
                    >
                      <div className="profile-avatar">
                        {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                      </div>
                      <span className="profile-name">{user.name}</span>
                      <svg 
                        width="16" 
                        height="16" 
                        viewBox="0 0 16 16" 
                        fill="currentColor"
                        className={`dropdown-arrow ${isProfileOpen ? 'open' : ''}`}
                      >
                        <path d="M4 6l4 4 4-4H4z"/>
                      </svg>
                    </button>

                    {isProfileOpen && (
                      <div className="profile-menu">
                        <div className="profile-menu-header">
                          <div className="profile-info">
                            <div className="profile-name">{user.name}</div>
                            <div className="profile-email">{user.email}</div>
                            <div className="profile-role">
                              <span className={`skillora-badge skillora-badge-${user.role === 'admin' ? 'danger' : user.role === 'teacher' ? 'secondary' : 'primary'}`}>
                                {user.role}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="profile-menu-divider"></div>
                        
                        <div className="profile-menu-items">
                          <Link to="/profile" className="profile-menu-item">
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                              <path d="M8 8a3 3 0 100-6 3 3 0 000 6zm2-3a2 2 0 11-4 0 2 2 0 014 0zm4 8c0 1-1 1-1 1H3s-1 0-1-1 1-4 6-4 6 3 6 4zm-1-.004c-.001-.246-.154-.986-.832-1.664C11.516 10.68 10.289 10 8 10c-2.29 0-3.516.68-4.168 1.332-.678.678-.83 1.418-.832 1.664h10z"/>
                            </svg>
                            Profile Settings
                          </Link>
                          
                          <Link to="/notifications" className="profile-menu-item">
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                              <path d="M8 16a2 2 0 001.985-1.75c.017-.137-.097-.25-.235-.25h-3.5c-.138 0-.252.113-.235.25A2 2 0 008 16z"/>
                              <path d="M8 1.918l-.797.161A4.002 4.002 0 004 6c0 .628-.134 2.197-.459 3.742-.16.767-.376 1.566-.663 2.258h10.244c-.287-.692-.502-1.49-.663-2.258C12.134 8.197 12 6.628 12 6a4.002 4.002 0 00-3.203-3.92L8 1.917zM14.22 12c.223.447.481.801.78 1H1c.299-.199.557-.553.78-1C2.68 10.2 3 6.88 3 6c0-2.42 1.72-4.44 4.005-4.901a1 1 0 111.99 0A5.002 5.002 0 0113 6c0 .88.32 4.2 1.22 6z"/>
                            </svg>
                            Notifications
                          </Link>
                          
                          {user.role === 'teacher' && (
                            <Link to="/teacher/settings" className="profile-menu-item">
                              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                                <path d="M8 4.754a3.246 3.246 0 100 6.492 3.246 3.246 0 000-6.492zM5.754 8a2.246 2.246 0 114.492 0 2.246 2.246 0 01-4.492 0z"/>
                                <path d="M9.796 1.343c-.527-1.79-3.065-1.79-3.592 0l-.094.319a.873.873 0 01-1.255.52l-.292-.16c-1.64-.892-3.433.902-2.54 2.541l.159.292a.873.873 0 01-.52 1.255l-.319.094c-1.79.527-1.79 3.065 0 3.592l.319.094a.873.873 0 01.52 1.255l-.16.292c-.892 1.64.901 3.434 2.541 2.54l.292-.159a.873.873 0 011.255.52l.094.319c.527 1.79 3.065 1.79 3.592 0l.094-.319a.873.873 0 011.255-.52l.292.16c1.64.893 3.434-.902 2.54-2.541l-.159-.292a.873.873 0 01.52-1.255l.319-.094c1.79-.527 1.79-3.065 0-3.592l-.319-.094a.873.873 0 01-.52-1.255l.16-.292c.893-1.64-.902-3.433-2.541-2.54l-.292.159a.873.873 0 01-1.255-.52l-.094-.319zm-2.633.283c.246-.835 1.428-.835 1.674 0l.094.319a1.873 1.873 0 002.693 1.115l.292-.16c.764-.415 1.6.42 1.184 1.185l-.159.292a1.873 1.873 0 001.116 2.692l.318.094c.835.246.835 1.428 0 1.674l-.319.094a1.873 1.873 0 00-1.115 2.693l.16.292c.415.764-.42 1.6-1.185 1.184l-.292-.159a1.873 1.873 0 00-2.692 1.116l-.094.318c-.246.835-1.428.835-1.674 0l-.094-.319a1.873 1.873 0 00-2.693-1.115l-.292.16c-.764.415-1.6-.42-1.184-1.185l.159-.292A1.873 1.873 0 001.945 8.93l-.319-.094c-.835-.246-.835-1.428 0-1.674l.319-.094A1.873 1.873 0 003.06 4.377l-.16-.292c-.415-.764.42-1.6 1.185-1.184l.292.159a1.873 1.873 0 002.692-1.115l.094-.319z"/>
                              </svg>
                              Teacher Settings
                            </Link>
                          )}
                          
                          <Link to="/help" className="profile-menu-item">
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                              <path d="M8 15A7 7 0 118 1a7 7 0 010 14zm0 1A8 8 0 108 0a8 8 0 000 16z"/>
                              <path d="M5.255 5.786a.237.237 0 00.241.247h.825c.138 0 .248-.113.266-.25.09-.656.54-1.134 1.342-1.134.686 0 1.314.343 1.314 1.168 0 .635-.374.927-.965 1.371-.673.489-1.206 1.06-1.168 1.987l.003.217a.25.25 0 00.25.246h.811a.25.25 0 00.25-.25v-.105c0-.718.273-.927 1.01-1.486.609-.463 1.244-.977 1.244-2.056 0-1.511-1.276-2.241-2.673-2.241-1.267 0-2.655.59-2.75 2.286zm1.557 5.763c0 .533.425.927 1.01.927.609 0 1.028-.394 1.028-.927 0-.552-.42-.94-1.029-.94-.584 0-1.009.388-1.009.94z"/>
                            </svg>
                            Help & Support
                          </Link>
                        </div>
                        
                        <div className="profile-menu-divider"></div>
                        
                        <button onClick={handleLogout} className="profile-menu-item logout-btn">
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                            <path fillRule="evenodd" d="M10 12.5a.5.5 0 01-.5.5h-8a.5.5 0 01-.5-.5v-9a.5.5 0 01.5-.5h8a.5.5 0 01.5.5v2a.5.5 0 001 0v-2A1.5 1.5 0 009.5 2h-8A1.5 1.5 0 000 3.5v9A1.5 1.5 0 001.5 14h8a1.5 1.5 0 001.5-1.5v-2a.5.5 0 00-1 0v2z"/>
                            <path fillRule="evenodd" d="M15.854 8.354a.5.5 0 000-.708l-3-3a.5.5 0 00-.708.708L14.293 7.5H5.5a.5.5 0 000 1h8.793l-2.147 2.146a.5.5 0 00.708.708l3-3z"/>
                          </svg>
                          Sign Out
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Mobile Menu Toggle */}
              <button 
                className="mobile-menu-toggle"
                onClick={toggleMenu}
                aria-expanded={isMenuOpen}
                aria-label="Toggle navigation menu"
              >
                <span className={`hamburger ${isMenuOpen ? 'open' : ''}`}>
                  <span></span>
                  <span></span>
                  <span></span>
                </span>
              </button>
            </div>
          </div>

          {/* Mobile Navigation */}
          {isMenuOpen && (
            <div className="mobile-nav">
              {!user ? (
                <>
                  <Link to="/courses" className="mobile-nav-link" onClick={() => setIsMenuOpen(false)}>
                    Courses
                  </Link>
                  <Link to="/about" className="mobile-nav-link" onClick={() => setIsMenuOpen(false)}>
                    About
                  </Link>
                  <Link to="/contact" className="mobile-nav-link" onClick={() => setIsMenuOpen(false)}>
                    Contact
                  </Link>
                  <div className="mobile-auth-buttons">
                    <Link to="/login" className="skillora-btn skillora-btn-outline skillora-btn-block" onClick={() => setIsMenuOpen(false)}>
                      Sign In
                    </Link>
                    <Link to="/register" className="skillora-btn skillora-btn-primary skillora-btn-block" onClick={() => setIsMenuOpen(false)}>
                      Get Started
                    </Link>
                  </div>
                </>
              ) : (
                <>
                  {user.role === 'learner' && (
                    <>
                      <Link to="/dashboard" className="mobile-nav-link" onClick={() => setIsMenuOpen(false)}>
                        Dashboard
                      </Link>
                      <Link to="/courses" className="mobile-nav-link" onClick={() => setIsMenuOpen(false)}>
                        Browse Courses
                      </Link>
                      <Link to="/my-learning" className="mobile-nav-link" onClick={() => setIsMenuOpen(false)}>
                        My Learning
                      </Link>
                      <Link to="/certificates" className="mobile-nav-link" onClick={() => setIsMenuOpen(false)}>
                        Certificates
                      </Link>
                    </>
                  )}
                  
                  {user.role === 'teacher' && (
                    <>
                      <Link to="/teacher/dashboard" className="mobile-nav-link" onClick={() => setIsMenuOpen(false)}>
                        Dashboard
                      </Link>
                      <Link to="/teacher/courses" className="mobile-nav-link" onClick={() => setIsMenuOpen(false)}>
                        My Courses
                      </Link>
                      <Link to="/teacher/earnings" className="mobile-nav-link" onClick={() => setIsMenuOpen(false)}>
                        Earnings
                      </Link>
                      <Link to="/teacher/analytics" className="mobile-nav-link" onClick={() => setIsMenuOpen(false)}>
                        Analytics
                      </Link>
                    </>
                  )}
                  
                  {user.role === 'admin' && (
                    <>
                      <Link to="/admin/dashboard" className="mobile-nav-link" onClick={() => setIsMenuOpen(false)}>
                        Admin Dashboard
                      </Link>
                      <Link to="/admin/users" className="mobile-nav-link" onClick={() => setIsMenuOpen(false)}>
                        Users
                      </Link>
                      <Link to="/admin/courses" className="mobile-nav-link" onClick={() => setIsMenuOpen(false)}>
                        Courses
                      </Link>
                      <Link to="/admin/analytics" className="mobile-nav-link" onClick={() => setIsMenuOpen(false)}>
                        Analytics
                      </Link>
                    </>
                  )}
                  
                  <div className="mobile-nav-divider"></div>
                  
                  <Link to="/profile" className="mobile-nav-link" onClick={() => setIsMenuOpen(false)}>
                    Profile Settings
                  </Link>
                  <Link to="/notifications" className="mobile-nav-link" onClick={() => setIsMenuOpen(false)}>
                    Notifications
                  </Link>
                  <Link to="/help" className="mobile-nav-link" onClick={() => setIsMenuOpen(false)}>
                    Help & Support
                  </Link>
                  
                  <button 
                    onClick={() => {
                      handleLogout();
                      setIsMenuOpen(false);
                    }} 
                    className="mobile-nav-link logout-btn"
                  >
                    Sign Out
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </nav>
    </header>
  );
};

export default Header;