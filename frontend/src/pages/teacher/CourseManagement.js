import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { courseAPI } from '../../services/api';

const CourseManagement = () => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const location = useLocation();

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const response = await courseAPI.getCourses();
      setCourses(response.data.results || response.data);
    } catch (error) {
      setError('Failed to load courses');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      draft: { color: '#6c757d', label: 'Draft', description: 'Course is being created' },
      submitted: { color: '#ffc107', label: 'Under Review', description: 'Submitted for admin review' },
      published: { color: '#28a745', label: 'Published', description: 'Live and available to students' },
      rejected: { color: '#dc3545', label: 'Rejected', description: 'Needs revision before resubmission' },
      archived: { color: '#6c757d', label: 'Archived', description: 'No longer available' }
    };

    const config = statusConfig[status] || statusConfig.draft;
    
    return (
      <span 
        style={{
          padding: '4px 12px',
          borderRadius: '12px',
          fontSize: '12px',
          fontWeight: 'bold',
          backgroundColor: config.color,
          color: 'white'
        }}
        title={config.description}
      >
        {config.label}
      </span>
    );
  };

  const getActionButtons = (course) => {
    const buttons = [];

    if (course.can_be_edited) {
      buttons.push(
        <Link
          key="edit"
          to={`/app/teacher/courses/${course.id}/build`}
          style={{
            padding: '4px 8px',
            fontSize: '12px',
            backgroundColor: '#007bff',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '4px',
            marginRight: '4px'
          }}
        >
          Edit
        </Link>
      );
    }

    // Add Quiz Management button for all courses
    buttons.push(
      <Link
        key="quizzes"
        to={`/teacher/courses/${course.id}/quizzes`}
        style={{
          padding: '4px 8px',
          fontSize: '12px',
          backgroundColor: '#6f42c1',
          color: 'white',
          textDecoration: 'none',
          borderRadius: '4px',
          marginRight: '4px'
        }}
      >
        Quizzes
      </Link>
    );

    if (course.status === 'published') {
      buttons.push(
        <Link
          key="view"
          to={`/app/courses/${course.id}`}
          style={{
            padding: '4px 8px',
            fontSize: '12px',
            backgroundColor: '#28a745',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '4px',
            marginRight: '4px'
          }}
        >
          View
        </Link>
      );
    }

    return buttons;
  };

  if (loading) {
    return <div className="loading">Loading courses...</div>;
  }

  return (
    <div>
      {/* Success/Info Messages */}
      {location.state?.message && (
        <div style={{
          backgroundColor: location.state.type === 'success' ? '#d4edda' : '#d1ecf1',
          color: location.state.type === 'success' ? '#155724' : '#0c5460',
          padding: '12px',
          borderRadius: '4px',
          marginBottom: '20px',
          border: `1px solid ${location.state.type === 'success' ? '#c3e6cb' : '#bee5eb'}`
        }}>
          {location.state.message}
        </div>
      )}

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2>My Courses</h2>
          <Link to="/app/teacher/courses/create" className="btn btn-primary">
            + Create New Course
          </Link>
        </div>

        {error && (
          <div className="error" style={{ marginBottom: '20px' }}>
            {error}
          </div>
        )}

        {/* Course Statistics */}
        {courses.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '12px', marginBottom: '20px' }}>
            {['draft', 'submitted', 'published', 'rejected'].map(status => {
              const count = courses.filter(course => course.status === status).length;
              return (
                <div key={status} style={{ 
                  textAlign: 'center', 
                  padding: '12px', 
                  backgroundColor: '#f8f9fa', 
                  borderRadius: '8px'
                }}>
                  <h4 style={{ margin: '0', color: '#007bff' }}>{count}</h4>
                  <p style={{ margin: '0', fontSize: '12px', color: '#666', textTransform: 'capitalize' }}>
                    {status === 'submitted' ? 'Under Review' : status}
                  </p>
                </div>
              );
            })}
          </div>
        )}

        {/* Courses List */}
        {courses.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            padding: '60px 20px',
            backgroundColor: '#f8f9fa',
            borderRadius: '8px',
            border: '2px dashed #dee2e6'
          }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>📚</div>
            <h3 style={{ color: '#666', margin: '0 0 12px 0' }}>No courses yet</h3>
            <p style={{ color: '#666', margin: '0 0 24px 0' }}>
              Start sharing your knowledge by creating your first course.
            </p>
            <Link to="/app/teacher/courses/create" className="btn btn-primary">
              Create Your First Course
            </Link>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8f9fa' }}>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Course</th>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Status</th>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Content</th>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Price</th>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Created</th>
                  <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #dee2e6' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {courses.map((course) => (
                  <tr key={course.id} style={{ borderBottom: '1px solid #dee2e6' }}>
                    <td style={{ padding: '12px' }}>
                      <div>
                        <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                          {course.title}
                        </div>
                        <div style={{ fontSize: '12px', color: '#666' }}>
                          {course.category} • {course.difficulty}
                        </div>
                        {course.short_description && (
                          <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                            {course.short_description.substring(0, 80)}...
                          </div>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '12px' }}>
                      {getStatusBadge(course.status)}
                      {course.review_notes && (
                        <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>
                          Review notes available
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <div style={{ fontSize: '14px' }}>
                        {course.total_sections || 0} sections
                      </div>
                      <div style={{ fontSize: '12px', color: '#666' }}>
                        {course.total_lessons || 0} lessons
                      </div>
                    </td>
                    <td style={{ padding: '12px' }}>
                      <div style={{ fontWeight: 'bold' }}>
                        ${parseFloat(course.price || 0).toFixed(2)}
                      </div>
                    </td>
                    <td style={{ padding: '12px' }}>
                      <div style={{ fontSize: '14px' }}>
                        {new Date(course.created_at).toLocaleDateString()}
                      </div>
                      {course.submitted_at && (
                        <div style={{ fontSize: '12px', color: '#666' }}>
                          Submitted: {new Date(course.submitted_at).toLocaleDateString()}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '4px', justifyContent: 'center', flexWrap: 'wrap' }}>
                        {getActionButtons(course)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Course Creation Tips */}
      <div className="card" style={{ backgroundColor: '#e3f2fd', border: '1px solid #bbdefb' }}>
        <h3 style={{ color: '#1976d2', margin: '0 0 16px 0' }}>💡 Course Success Tips</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
          <div>
            <h4 style={{ margin: '0 0 8px 0', color: '#1976d2' }}>Content Quality</h4>
            <ul style={{ margin: '0', paddingLeft: '20px', fontSize: '14px' }}>
              <li>Create clear, engaging video content</li>
              <li>Structure lessons logically</li>
              <li>Include practical examples</li>
            </ul>
          </div>
          <div>
            <h4 style={{ margin: '0 0 8px 0', color: '#1976d2' }}>Course Structure</h4>
            <ul style={{ margin: '0', paddingLeft: '20px', fontSize: '14px' }}>
              <li>Start with course overview</li>
              <li>Break content into digestible sections</li>
              <li>End with summary and next steps</li>
            </ul>
          </div>
          <div>
            <h4 style={{ margin: '0 0 8px 0', color: '#1976d2' }}>Student Engagement</h4>
            <ul style={{ margin: '0', paddingLeft: '20px', fontSize: '14px' }}>
              <li>Add preview lessons to attract students</li>
              <li>Include quizzes and assignments</li>
              <li>Provide downloadable resources</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CourseManagement;