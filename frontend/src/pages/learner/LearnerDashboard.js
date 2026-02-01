import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { enrollmentAPI } from '../../services/api';

const LearnerDashboard = () => {
  const { user } = useAuth();
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEnrollments();
  }, []);

  const fetchEnrollments = async () => {
    try {
      const response = await enrollmentAPI.getEnrollments();
      setEnrollments(response.data.results || response.data);
    } catch (error) {
      console.error('Error fetching enrollments:', error);
    } finally {
      setLoading(false);
    }
  };

  const getProgressColor = (percentage) => {
    if (percentage >= 80) return '#28a745';
    if (percentage >= 50) return '#ffc107';
    return '#dc3545';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return '#007bff';
      case 'completed': return '#28a745';
      case 'dropped': return '#dc3545';
      case 'suspended': return '#6c757d';
      default: return '#6c757d';
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '20px' }}>
        <p>Loading your courses...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="card">
        <h2>Learning Dashboard</h2>
        <p>Welcome back, {user?.name}! Continue your learning journey.</p>
      </div>

      {/* Quick Stats */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
        gap: '20px', 
        marginBottom: '30px' 
      }}>
        <div className="card" style={{ textAlign: 'center' }}>
          <h3 style={{ margin: '0', color: '#007bff' }}>
            {enrollments.length}
          </h3>
          <p style={{ margin: '0', fontSize: '14px', color: '#666' }}>
            Enrolled Courses
          </p>
        </div>
        
        <div className="card" style={{ textAlign: 'center' }}>
          <h3 style={{ margin: '0', color: '#28a745' }}>
            {enrollments.filter(e => e.is_completed).length}
          </h3>
          <p style={{ margin: '0', fontSize: '14px', color: '#666' }}>
            Completed
          </p>
        </div>
        
        <div className="card" style={{ textAlign: 'center' }}>
          <h3 style={{ margin: '0', color: '#ffc107' }}>
            {enrollments.filter(e => e.status === 'active').length}
          </h3>
          <p style={{ margin: '0', fontSize: '14px', color: '#666' }}>
            In Progress
          </p>
        </div>
        
        <div className="card" style={{ textAlign: 'center' }}>
          <h3 style={{ margin: '0', color: '#17a2b8' }}>
            {enrollments.reduce((total, e) => total + e.completed_lessons_count, 0)}
          </h3>
          <p style={{ margin: '0', fontSize: '14px', color: '#666' }}>
            Lessons Completed
          </p>
        </div>
      </div>

      {/* Course Grid */}
      {enrollments.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
          <h3>No Enrolled Courses</h3>
          <p>You haven't enrolled in any courses yet.</p>
          <Link to="/courses" className="btn btn-primary">
            Browse Courses
          </Link>
        </div>
      ) : (
        <div>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            marginBottom: '20px' 
          }}>
            <h3>My Courses</h3>
            <Link to="/courses" className="btn btn-primary">
              Browse More Courses
            </Link>
          </div>

          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', 
            gap: '20px' 
          }}>
            {enrollments.map(enrollment => (
              <div key={enrollment.id} className="card">
                {enrollment.course_thumbnail && (
                  <img
                    src={enrollment.course_thumbnail}
                    alt={enrollment.course_title}
                    style={{
                      width: '100%',
                      height: '180px',
                      objectFit: 'cover',
                      borderRadius: '8px 8px 0 0'
                    }}
                  />
                )}
                
                <div style={{ padding: '20px' }}>
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'flex-start',
                    marginBottom: '10px'
                  }}>
                    <h4 style={{ margin: '0', flex: 1 }}>
                      {enrollment.course_title}
                    </h4>
                    <span
                      style={{
                        backgroundColor: getStatusColor(enrollment.status),
                        color: 'white',
                        padding: '2px 8px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        textTransform: 'capitalize',
                        marginLeft: '10px'
                      }}
                    >
                      {enrollment.status}
                    </span>
                  </div>

                  <p style={{ 
                    fontSize: '14px', 
                    color: '#666', 
                    margin: '0 0 15px 0' 
                  }}>
                    by {enrollment.instructor_name}
                  </p>

                  {/* Progress Bar */}
                  <div style={{ marginBottom: '15px' }}>
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      marginBottom: '5px' 
                    }}>
                      <span style={{ fontSize: '14px' }}>Progress</span>
                      <span style={{ fontSize: '14px', fontWeight: 'bold' }}>
                        {enrollment.progress_percentage}%
                      </span>
                    </div>
                    <div style={{
                      width: '100%',
                      height: '8px',
                      backgroundColor: '#e9ecef',
                      borderRadius: '4px',
                      overflow: 'hidden'
                    }}>
                      <div
                        style={{
                          width: `${enrollment.progress_percentage}%`,
                          height: '100%',
                          backgroundColor: getProgressColor(enrollment.progress_percentage),
                          transition: 'width 0.3s ease'
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    fontSize: '12px', 
                    color: '#666',
                    marginBottom: '15px'
                  }}>
                    <span>
                      {enrollment.completed_lessons_count} / {enrollment.total_lessons} lessons
                    </span>
                    <span>
                      {enrollment.course_difficulty}
                    </span>
                  </div>

                  <div style={{ 
                    display: 'flex', 
                    gap: '10px' 
                  }}>
                    <Link
                      to={`/app/learner/course/${enrollment.id}`}
                      className="btn btn-primary"
                      style={{ flex: 1, textAlign: 'center' }}
                    >
                      {enrollment.progress_percentage === 0 ? 'Start Course' : 'Continue'}
                    </Link>
                    
                    {enrollment.is_completed && (
                      <Link
                        to={`/app/learner/course/${enrollment.id}/certificate`}
                        className="btn btn-success"
                        style={{ whiteSpace: 'nowrap' }}
                      >
                        Certificate
                      </Link>
                    )}
                  </div>

                  {enrollment.last_accessed_at && (
                    <p style={{ 
                      fontSize: '12px', 
                      color: '#999', 
                      margin: '10px 0 0 0' 
                    }}>
                      Last accessed: {new Date(enrollment.last_accessed_at).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Activity */}
      <div className="card" style={{ marginTop: '30px' }}>
        <h3>Continue Learning</h3>
        {enrollments.filter(e => e.status === 'active' && e.progress_percentage < 100).length === 0 ? (
          <p>No courses in progress. <Link to="/courses">Browse courses</Link> to start learning!</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {enrollments
              .filter(e => e.status === 'active' && e.progress_percentage < 100)
              .slice(0, 3)
              .map(enrollment => (
                <div key={enrollment.id} style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  padding: '15px',
                  backgroundColor: '#f8f9fa',
                  borderRadius: '8px'
                }}>
                  <div>
                    <strong>{enrollment.course_title}</strong>
                    <div style={{ fontSize: '14px', color: '#666' }}>
                      {enrollment.progress_percentage}% complete
                    </div>
                  </div>
                  <Link
                    to={`/app/learner/course/${enrollment.id}`}
                    className="btn btn-primary"
                  >
                    Continue
                  </Link>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default LearnerDashboard;