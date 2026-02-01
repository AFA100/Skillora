import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { quizAPI, courseAPI } from '../../services/api';
import './QuizManagement.css';

const QuizManagement = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadCourseAndQuizzes();
  }, [courseId]);

  const loadCourseAndQuizzes = async () => {
    try {
      setLoading(true);
      
      // Load course details
      const courseResponse = await courseAPI.getCourse(courseId);
      setCourse(courseResponse.data);
      
      // Load course quiz summary
      const quizzesResponse = await quizAPI.getCourseQuizSummary(courseId);
      setQuizzes(quizzesResponse.data);
    } catch (error) {
      console.error('Error loading data:', error);
      setError('Failed to load course and quizzes');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteQuiz = async (quizId) => {
    if (!window.confirm('Are you sure you want to delete this quiz? This action cannot be undone.')) {
      return;
    }

    try {
      await quizAPI.deleteQuiz(quizId);
      setQuizzes(prev => prev.filter(quiz => quiz.id !== quizId));
    } catch (error) {
      console.error('Error deleting quiz:', error);
      alert('Failed to delete quiz. Please try again.');
    }
  };

  const getQuizTypeColor = (type) => {
    const colors = {
      practice: '#17a2b8',
      graded: '#ffc107',
      final: '#dc3545',
      survey: '#6c757d'
    };
    return colors[type] || '#6c757d';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return <div className="loading">Loading quizzes...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div className="quiz-management">
      <div className="quiz-management-header">
        <div className="header-content">
          <div className="breadcrumb">
            <Link to="/teacher/courses">My Courses</Link>
            <span> / </span>
            <span>{course?.title}</span>
            <span> / Quizzes</span>
          </div>
          <h1>Quiz Management</h1>
          <p className="course-info">
            Managing quizzes for: <strong>{course?.title}</strong>
          </p>
        </div>
        <div className="header-actions">
          <Link to={`/teacher/courses/${courseId}/quiz/create`} className="btn-primary">
            + Create Quiz
          </Link>
        </div>
      </div>

      {quizzes.length === 0 ? (
        <div className="no-quizzes">
          <div className="no-quizzes-content">
            <h3>No Quizzes Yet</h3>
            <p>Create your first quiz to assess student learning and engagement.</p>
            <Link to={`/teacher/courses/${courseId}/quiz/create`} className="btn-primary">
              Create Your First Quiz
            </Link>
          </div>
        </div>
      ) : (
        <div className="quizzes-grid">
          {quizzes.map(quiz => (
            <div key={quiz.id} className="quiz-card">
              <div className="quiz-card-header">
                <div className="quiz-title">
                  <h3>{quiz.title}</h3>
                  <span 
                    className="quiz-type-badge"
                    style={{ backgroundColor: getQuizTypeColor(quiz.quiz_type) }}
                  >
                    {quiz.quiz_type.replace('_', ' ')}
                  </span>
                </div>
                <div className="quiz-status">
                  {quiz.is_available ? (
                    <span className="status-active">Active</span>
                  ) : (
                    <span className="status-inactive">Inactive</span>
                  )}
                </div>
              </div>

              <div className="quiz-card-body">
                {quiz.description && (
                  <p className="quiz-description">
                    {quiz.description.length > 100 
                      ? `${quiz.description.substring(0, 100)}...`
                      : quiz.description
                    }
                  </p>
                )}

                <div className="quiz-stats">
                  <div className="stat">
                    <span className="stat-label">Questions:</span>
                    <span className="stat-value">{quiz.question_count}</span>
                  </div>
                  <div className="stat">
                    <span className="stat-label">Points:</span>
                    <span className="stat-value">{quiz.total_points}</span>
                  </div>
                  <div className="stat">
                    <span className="stat-label">Time Limit:</span>
                    <span className="stat-value">
                      {quiz.time_limit_minutes ? `${quiz.time_limit_minutes}m` : 'No limit'}
                    </span>
                  </div>
                  <div className="stat">
                    <span className="stat-label">Attempts:</span>
                    <span className="stat-value">{quiz.attempt_count || 0}</span>
                  </div>
                  <div className="stat">
                    <span className="stat-label">Avg Score:</span>
                    <span className="stat-value">
                      {quiz.average_score ? `${Math.round(quiz.average_score)}%` : 'N/A'}
                    </span>
                  </div>
                  <div className="stat">
                    <span className="stat-label">Passing:</span>
                    <span className="stat-value">{quiz.passing_score}%</span>
                  </div>
                </div>

                <div className="quiz-meta">
                  <span className="created-date">
                    Created: {formatDate(quiz.created_at)}
                  </span>
                  {quiz.lesson_title && (
                    <span className="lesson-link">
                      Lesson: {quiz.lesson_title}
                    </span>
                  )}
                </div>
              </div>

              <div className="quiz-card-actions">
                <Link 
                  to={`/teacher/quiz/${quiz.id}/edit`} 
                  className="btn-secondary"
                >
                  Edit
                </Link>
                <Link 
                  to={`/teacher/quiz/${quiz.id}/analytics`} 
                  className="btn-info"
                >
                  Analytics
                </Link>
                <Link 
                  to={`/teacher/quiz/${quiz.id}/attempts`} 
                  className="btn-outline"
                >
                  Attempts
                </Link>
                <button 
                  onClick={() => handleDeleteQuiz(quiz.id)}
                  className="btn-danger"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="quiz-management-footer">
        <div className="footer-stats">
          <div className="footer-stat">
            <span className="stat-number">{quizzes.length}</span>
            <span className="stat-label">Total Quizzes</span>
          </div>
          <div className="footer-stat">
            <span className="stat-number">
              {quizzes.reduce((sum, quiz) => sum + (quiz.attempt_count || 0), 0)}
            </span>
            <span className="stat-label">Total Attempts</span>
          </div>
          <div className="footer-stat">
            <span className="stat-number">
              {quizzes.length > 0 
                ? Math.round(quizzes.reduce((sum, quiz) => sum + (quiz.average_score || 0), 0) / quizzes.length)
                : 0
              }%
            </span>
            <span className="stat-label">Overall Avg Score</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuizManagement;