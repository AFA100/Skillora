import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { enrollmentAPI } from '../../services/api';

const LearningAnalytics = () => {
  const { enrollmentId } = useParams();
  const [analytics, setAnalytics] = useState(null);
  const [enrollment, setEnrollment] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
    fetchEnrollment();
  }, [enrollmentId]);

  const fetchAnalytics = async () => {
    try {
      const response = await enrollmentAPI.getLearningAnalytics(enrollmentId);
      setAnalytics(response.data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  };

  const fetchEnrollment = async () => {
    try {
      const response = await enrollmentAPI.getEnrollment(enrollmentId);
      setEnrollment(response.data);
    } catch (error) {
      console.error('Error fetching enrollment:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getInteractionIcon = (type) => {
    switch (type) {
      case 'play': return '▶️';
      case 'pause': return '⏸️';
      case 'seek': return '⏩';
      case 'note_create': return '📝';
      case 'bookmark_create': return '📌';
      case 'quiz_start': return '❓';
      case 'quiz_complete': return '✅';
      default: return '📊';
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '20px' }}>
        <p>Loading analytics...</p>
      </div>
    );
  }

  if (!analytics || !enrollment) {
    return (
      <div style={{ padding: '20px' }}>
        <h2>Analytics not available</h2>
        <Link to="/app/learner" className="btn btn-primary">
          Back to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2>Learning Analytics</h2>
            <p>{enrollment.course_title}</p>
          </div>
          <Link to={`/app/learner/course/${enrollmentId}`} className="btn btn-primary">
            Continue Learning
          </Link>
        </div>
      </div>

      {/* Key Metrics */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
        gap: '20px', 
        marginBottom: '30px' 
      }}>
        <div className="card" style={{ textAlign: 'center' }}>
          <h3 style={{ margin: '0', color: '#007bff', fontSize: '32px' }}>
            {analytics.progress_percentage}%
          </h3>
          <p style={{ margin: '0', fontSize: '14px', color: '#666' }}>
            Course Progress
          </p>
          <div style={{
            width: '100%',
            height: '8px',
            backgroundColor: '#e9ecef',
            borderRadius: '4px',
            marginTop: '10px'
          }}>
            <div
              style={{
                width: `${analytics.progress_percentage}%`,
                height: '100%',
                backgroundColor: '#007bff',
                borderRadius: '4px'
              }}
            />
          </div>
        </div>

        <div className="card" style={{ textAlign: 'center' }}>
          <h3 style={{ margin: '0', color: '#28a745', fontSize: '32px' }}>
            {formatDuration(analytics.total_study_time_seconds)}
          </h3>
          <p style={{ margin: '0', fontSize: '14px', color: '#666' }}>
            Total Study Time
          </p>
          <p style={{ margin: '5px 0 0 0', fontSize: '12px', color: '#999' }}>
            Across {analytics.total_study_sessions} sessions
          </p>
        </div>

        <div className="card" style={{ textAlign: 'center' }}>
          <h3 style={{ margin: '0', color: '#ffc107', fontSize: '32px' }}>
            {formatDuration(analytics.average_session_duration)}
          </h3>
          <p style={{ margin: '0', fontSize: '14px', color: '#666' }}>
            Average Session
          </p>
          <p style={{ margin: '5px 0 0 0', fontSize: '12px', color: '#999' }}>
            Per study session
          </p>
        </div>

        <div className="card" style={{ textAlign: 'center' }}>
          <h3 style={{ margin: '0', color: '#17a2b8', fontSize: '32px' }}>
            {analytics.days_since_enrollment}
          </h3>
          <p style={{ margin: '0', fontSize: '14px', color: '#666' }}>
            Days Enrolled
          </p>
          <p style={{ margin: '5px 0 0 0', fontSize: '12px', color: '#999' }}>
            Since {formatDate(enrollment.enrolled_at)}
          </p>
        </div>
      </div>

      {/* Study Habits */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '1fr 1fr', 
        gap: '20px', 
        marginBottom: '30px' 
      }}>
        <div className="card">
          <h3>Study Activity</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              padding: '10px',
              backgroundColor: '#f8f9fa',
              borderRadius: '4px'
            }}>
              <span>📝 Notes Created</span>
              <strong>{analytics.notes_count}</strong>
            </div>
            
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              padding: '10px',
              backgroundColor: '#f8f9fa',
              borderRadius: '4px'
            }}>
              <span>📌 Bookmarks</span>
              <strong>{analytics.bookmarks_count}</strong>
            </div>
            
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              padding: '10px',
              backgroundColor: '#f8f9fa',
              borderRadius: '4px'
            }}>
              <span>📚 Study Sessions</span>
              <strong>{analytics.total_study_sessions}</strong>
            </div>
          </div>
        </div>

        <div className="card">
          <h3>Learning Pace</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                <span>Daily Average</span>
                <strong>
                  {formatDuration(analytics.total_study_time_seconds / Math.max(analytics.days_since_enrollment, 1))}
                </strong>
              </div>
              <div style={{ fontSize: '12px', color: '#666' }}>
                Study time per day since enrollment
              </div>
            </div>
            
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                <span>Session Frequency</span>
                <strong>
                  {(analytics.total_study_sessions / Math.max(analytics.days_since_enrollment, 1)).toFixed(1)}
                </strong>
              </div>
              <div style={{ fontSize: '12px', color: '#666' }}>
                Sessions per day on average
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="card">
        <h3>Recent Activity</h3>
        {analytics.recent_interactions.length === 0 ? (
          <p style={{ color: '#666', fontStyle: 'italic' }}>
            No recent activity recorded
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {analytics.recent_interactions.map((interaction, index) => (
              <div key={index} style={{ 
                display: 'flex', 
                alignItems: 'center',
                gap: '15px',
                padding: '10px',
                backgroundColor: '#f8f9fa',
                borderRadius: '4px'
              }}>
                <span style={{ fontSize: '20px' }}>
                  {getInteractionIcon(interaction.interaction_type)}
                </span>
                
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '500', fontSize: '14px' }}>
                    {interaction.interaction_type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </div>
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    {new Date(interaction.created_at).toLocaleString()}
                  </div>
                </div>
                
                {interaction.timestamp_seconds && (
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    {Math.floor(interaction.timestamp_seconds / 60)}:{(interaction.timestamp_seconds % 60).toString().padStart(2, '0')}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Progress Insights */}
      <div className="card">
        <h3>Progress Insights</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {analytics.progress_percentage === 100 ? (
            <div style={{ 
              padding: '15px',
              backgroundColor: '#d4edda',
              border: '1px solid #c3e6cb',
              borderRadius: '4px',
              color: '#155724'
            }}>
              🎉 Congratulations! You've completed this course. 
              <Link to={`/app/learner/course/${enrollmentId}/certificate`} style={{ marginLeft: '10px' }}>
                View Certificate
              </Link>
            </div>
          ) : analytics.progress_percentage >= 80 ? (
            <div style={{ 
              padding: '15px',
              backgroundColor: '#fff3cd',
              border: '1px solid #ffeaa7',
              borderRadius: '4px',
              color: '#856404'
            }}>
              🚀 You're almost there! Just a few more lessons to complete the course.
            </div>
          ) : analytics.progress_percentage >= 50 ? (
            <div style={{ 
              padding: '15px',
              backgroundColor: '#cce5ff',
              border: '1px solid #99d6ff',
              borderRadius: '4px',
              color: '#004085'
            }}>
              📈 Great progress! You're halfway through the course.
            </div>
          ) : (
            <div style={{ 
              padding: '15px',
              backgroundColor: '#f8f9fa',
              border: '1px solid #dee2e6',
              borderRadius: '4px',
              color: '#495057'
            }}>
              💪 Keep going! Every lesson brings you closer to your goal.
            </div>
          )}
          
          {analytics.total_study_time_seconds > 0 && (
            <div style={{ fontSize: '14px', color: '#666' }}>
              <strong>Study Tip:</strong> {
                analytics.average_session_duration < 1800 ? // 30 minutes
                  "Try longer study sessions (30+ minutes) for better retention." :
                analytics.average_session_duration > 7200 ? // 2 hours
                  "Consider taking breaks during long study sessions." :
                  "Your study session length is optimal for learning!"
              }
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LearningAnalytics;