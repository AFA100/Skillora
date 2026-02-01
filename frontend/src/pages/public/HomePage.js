import React from 'react';
import { Link } from 'react-router-dom';
import './HomePage.css';

const HomePage = () => {
  return (
    <div className="homepage">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="skillora-container">
          <div className="hero-content">
            <div className="hero-text">
              <h1 className="hero-title">
                Master New Skills with
                <span className="hero-highlight"> Skillora</span>
              </h1>
              <p className="hero-description">
                Join thousands of learners worldwide and unlock your potential with our comprehensive 
                online learning platform. Expert-led courses, interactive content, and personalized learning paths.
              </p>
              <div className="hero-actions">
                <Link to="/register" className="skillora-btn skillora-btn-primary skillora-btn-lg">
                  Start Learning Today
                </Link>
                <Link to="/courses" className="skillora-btn skillora-btn-outline skillora-btn-lg">
                  Browse Courses
                </Link>
              </div>
              <div className="hero-stats">
                <div className="stat-item">
                  <div className="stat-number">50K+</div>
                  <div className="stat-label">Active Learners</div>
                </div>
                <div className="stat-item">
                  <div className="stat-number">1,200+</div>
                  <div className="stat-label">Expert Courses</div>
                </div>
                <div className="stat-item">
                  <div className="stat-number">95%</div>
                  <div className="stat-label">Success Rate</div>
                </div>
              </div>
            </div>
            <div className="hero-visual">
              <div className="hero-image-container">
                <div className="hero-card hero-card-1">
                  <div className="card-icon">📚</div>
                  <div className="card-content">
                    <h4>Interactive Learning</h4>
                    <p>Hands-on projects and real-world applications</p>
                  </div>
                </div>
                <div className="hero-card hero-card-2">
                  <div className="card-icon">🎯</div>
                  <div className="card-content">
                    <h4>Personalized Path</h4>
                    <p>AI-powered recommendations for your goals</p>
                  </div>
                </div>
                <div className="hero-card hero-card-3">
                  <div className="card-icon">🏆</div>
                  <div className="card-content">
                    <h4>Certified Skills</h4>
                    <p>Industry-recognized certificates</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <div className="skillora-container">
          <div className="section-header">
            <h2>Why Choose Skillora?</h2>
            <p>Everything you need to succeed in your learning journey</p>
          </div>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
                  <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
                </svg>
              </div>
              <h3>Expert-Led Courses</h3>
              <p>Learn from industry professionals with years of real-world experience and proven track records.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12,6 12,12 16,14"/>
                </svg>
              </div>
              <h3>Learn at Your Pace</h3>
              <p>Flexible scheduling that fits your lifestyle. Access courses 24/7 from any device, anywhere.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                </svg>
              </div>
              <h3>Interactive Learning</h3>
              <p>Engage with hands-on projects, quizzes, and real-world applications to reinforce your knowledge.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
                  <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
                  <path d="M9 14l2 2 4-4"/>
                </svg>
              </div>
              <h3>Verified Certificates</h3>
              <p>Earn industry-recognized certificates that showcase your skills to employers and peers.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
              </div>
              <h3>Community Support</h3>
              <p>Connect with fellow learners, share knowledge, and get help from our supportive community.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2h-4"/>
                  <polyline points="9,11 12,14 15,11"/>
                  <line x1="12" y1="2" x2="12" y2="14"/>
                </svg>
              </div>
              <h3>Lifetime Access</h3>
              <p>Once enrolled, access your courses forever. Get updates and new content at no additional cost.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Popular Courses Section */}
      <section className="courses-section">
        <div className="skillora-container">
          <div className="section-header">
            <h2>Popular Courses</h2>
            <p>Start with our most loved courses by the community</p>
          </div>
          <div className="courses-grid">
            <div className="course-card">
              <div className="course-image">
                <div className="course-badge">Bestseller</div>
              </div>
              <div className="course-content">
                <div className="course-category">Web Development</div>
                <h3>Complete React Developer Course</h3>
                <p>Master React from basics to advanced concepts with hands-on projects and real-world applications.</p>
                <div className="course-meta">
                  <div className="course-rating">
                    <span className="rating-stars">★★★★★</span>
                    <span className="rating-text">4.8 (2,340)</span>
                  </div>
                  <div className="course-price">$89</div>
                </div>
                <div className="course-instructor">
                  <div className="instructor-avatar">JS</div>
                  <span>John Smith</span>
                </div>
              </div>
            </div>
            <div className="course-card">
              <div className="course-image">
                <div className="course-badge">New</div>
              </div>
              <div className="course-content">
                <div className="course-category">Data Science</div>
                <h3>Python for Data Analysis</h3>
                <p>Learn Python programming and data analysis with pandas, numpy, and visualization libraries.</p>
                <div className="course-meta">
                  <div className="course-rating">
                    <span className="rating-stars">★★★★★</span>
                    <span className="rating-text">4.9 (1,890)</span>
                  </div>
                  <div className="course-price">$79</div>
                </div>
                <div className="course-instructor">
                  <div className="instructor-avatar">AD</div>
                  <span>Alice Davis</span>
                </div>
              </div>
            </div>
            <div className="course-card">
              <div className="course-image">
                <div className="course-badge">Popular</div>
              </div>
              <div className="course-content">
                <div className="course-category">Design</div>
                <h3>UI/UX Design Masterclass</h3>
                <p>Create stunning user interfaces and experiences with modern design principles and tools.</p>
                <div className="course-meta">
                  <div className="course-rating">
                    <span className="rating-stars">★★★★★</span>
                    <span className="rating-text">4.7 (3,120)</span>
                  </div>
                  <div className="course-price">$99</div>
                </div>
                <div className="course-instructor">
                  <div className="instructor-avatar">MJ</div>
                  <span>Maria Johnson</span>
                </div>
              </div>
            </div>
          </div>
          <div className="section-cta">
            <Link to="/courses" className="skillora-btn skillora-btn-primary">
              View All Courses
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="skillora-container">
          <div className="cta-content">
            <h2>Ready to Start Your Learning Journey?</h2>
            <p>Join thousands of successful learners who have transformed their careers with Skillora</p>
            <div className="cta-actions">
              <Link to="/register" className="skillora-btn skillora-btn-primary skillora-btn-xl">
                Get Started Free
              </Link>
              <Link to="/contact" className="skillora-btn skillora-btn-ghost skillora-btn-xl">
                Talk to Sales
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;