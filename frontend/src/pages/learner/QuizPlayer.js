import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { quizAPI } from '../../services/api';
import './QuizPlayer.css';

const QuizPlayer = () => {
  const { quizId, attemptId } = useParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(false);
  const [quiz, setQuiz] = useState(null);
  const [attempt, setAttempt] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [responses, setResponses] = useState({});
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showResults, setShowResults] = useState(false);

  // Timer effect
  useEffect(() => {
    if (attempt && attempt.time_remaining_seconds > 0 && attempt.status === 'in_progress') {
      const timer = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            handleTimeExpired();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      setTimeRemaining(attempt.time_remaining_seconds);
      return () => clearInterval(timer);
    }
  }, [attempt]);

  useEffect(() => {
    if (attemptId) {
      loadAttempt();
    } else if (quizId) {
      loadQuiz();
    }
  }, [quizId, attemptId]);

  const loadQuiz = async () => {
    try {
      setLoading(true);
      const response = await quizAPI.getStudentQuiz(quizId);
      setQuiz(response.data);
    } catch (error) {
      console.error('Error loading quiz:', error);
      navigate('/learner/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const loadAttempt = async () => {
    try {
      setLoading(true);
      const response = await quizAPI.getQuizAttempt(attemptId);
      setAttempt(response.data);
      setQuiz(response.data.quiz);
      
      // Load existing responses
      const existingResponses = {};
      response.data.responses.forEach(resp => {
        existingResponses[resp.question] = {
          selected_answer_ids: resp.selected_answers.map(a => a.id),
          text_response: resp.text_response,
          response_data: resp.response_data
        };
      });
      setResponses(existingResponses);
      
      // Check if completed
      if (response.data.status === 'completed') {
        setShowResults(true);
      }
    } catch (error) {
      console.error('Error loading attempt:', error);
      navigate('/learner/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const startQuiz = async () => {
    try {
      setLoading(true);
      const response = await quizAPI.startQuizAttempt(quizId);
      setAttempt(response.data);
      setQuiz(response.data.quiz);
      setCurrentQuestionIndex(0);
      setResponses({});
    } catch (error) {
      console.error('Error starting quiz:', error);
      alert(error.response?.data?.error || 'Error starting quiz');
    } finally {
      setLoading(false);
    }
  };

  const handleTimeExpired = useCallback(async () => {
    if (attempt && attempt.status === 'in_progress') {
      try {
        await quizAPI.completeQuizAttempt(attempt.id);
        setAttempt(prev => ({ ...prev, status: 'time_expired' }));
        setShowResults(true);
      } catch (error) {
        console.error('Error handling time expiration:', error);
      }
    }
  }, [attempt]);

  const handleResponseChange = async (questionId, responseData) => {
    // Update local state
    setResponses(prev => ({
      ...prev,
      [questionId]: responseData
    }));

    // Save to backend
    try {
      await quizAPI.submitQuestionResponse(attempt.id, questionId, responseData);
    } catch (error) {
      console.error('Error saving response:', error);
    }
  };

  const handleMultipleChoiceChange = (questionId, answerId, isChecked) => {
    const currentResponse = responses[questionId] || { selected_answer_ids: [] };
    let newSelectedIds = [...currentResponse.selected_answer_ids];

    if (isChecked) {
      if (!newSelectedIds.includes(answerId)) {
        newSelectedIds.push(answerId);
      }
    } else {
      newSelectedIds = newSelectedIds.filter(id => id !== answerId);
    }

    handleResponseChange(questionId, {
      ...currentResponse,
      selected_answer_ids: newSelectedIds
    });
  };

  const handleTrueFalseChange = (questionId, answerId) => {
    const currentResponse = responses[questionId] || {};
    handleResponseChange(questionId, {
      ...currentResponse,
      selected_answer_ids: [answerId]
    });
  };

  const handleTextChange = (questionId, text) => {
    const currentResponse = responses[questionId] || {};
    handleResponseChange(questionId, {
      ...currentResponse,
      text_response: text
    });
  };

  const completeQuiz = async () => {
    if (!window.confirm('Are you sure you want to submit your quiz? You cannot change your answers after submission.')) {
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await quizAPI.completeQuizAttempt(attempt.id);
      setAttempt(response.data);
      setShowResults(true);
    } catch (error) {
      console.error('Error completing quiz:', error);
      alert('Error submitting quiz. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTime = (seconds) => {
    if (!seconds) return '';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const renderQuestion = (question, index) => {
    const response = responses[question.id] || {};

    return (
      <div key={question.id} className="question-container">
        <div className="question-header">
          <span className="question-number">Question {index + 1} of {quiz.questions.length}</span>
          <span className="question-points">{question.points} point{question.points !== 1 ? 's' : ''}</span>
        </div>

        <div className="question-text">
          {question.question_text}
        </div>

        {question.image && (
          <div className="question-image">
            <img src={question.image} alt="Question" />
          </div>
        )}

        <div className="question-answers">
          {question.question_type === 'multiple_choice' && (
            <div className="multiple-choice">
              {question.answers.map(answer => (
                <label key={answer.id} className="answer-option">
                  <input
                    type="checkbox"
                    checked={response.selected_answer_ids?.includes(answer.id) || false}
                    onChange={(e) => handleMultipleChoiceChange(question.id, answer.id, e.target.checked)}
                    disabled={showResults}
                  />
                  <span className="answer-text">{answer.answer_text}</span>
                  {showResults && answer.is_correct && (
                    <span className="correct-indicator">✓</span>
                  )}
                </label>
              ))}
            </div>
          )}

          {question.question_type === 'true_false' && (
            <div className="true-false">
              {question.answers.map(answer => (
                <label key={answer.id} className="answer-option">
                  <input
                    type="radio"
                    name={`question_${question.id}`}
                    checked={response.selected_answer_ids?.includes(answer.id) || false}
                    onChange={() => handleTrueFalseChange(question.id, answer.id)}
                    disabled={showResults}
                  />
                  <span className="answer-text">{answer.answer_text}</span>
                  {showResults && answer.is_correct && (
                    <span className="correct-indicator">✓</span>
                  )}
                </label>
              ))}
            </div>
          )}

          {(question.question_type === 'short_answer' || question.question_type === 'essay') && (
            <div className="text-answer">
              <textarea
                value={response.text_response || ''}
                onChange={(e) => handleTextChange(question.id, e.target.value)}
                placeholder="Enter your answer..."
                rows={question.question_type === 'essay' ? 8 : 3}
                disabled={showResults}
              />
            </div>
          )}

          {question.question_type === 'fill_blank' && (
            <div className="fill-blank">
              <input
                type="text"
                value={response.text_response || ''}
                onChange={(e) => handleTextChange(question.id, e.target.value)}
                placeholder="Fill in the blank..."
                disabled={showResults}
              />
            </div>
          )}
        </div>

        {showResults && question.explanation && (
          <div className="question-explanation">
            <h4>Explanation:</h4>
            <p>{question.explanation}</p>
          </div>
        )}

        {showResults && (
          <div className="question-result">
            {attempt.responses.find(r => r.question === question.id)?.is_correct ? (
              <span className="result-correct">Correct (+{question.points} points)</span>
            ) : (
              <span className="result-incorrect">Incorrect (0 points)</span>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderResults = () => (
    <div className="quiz-results">
      <div className="results-header">
        <h2>Quiz Results</h2>
        <div className="score-display">
          <div className="score-circle">
            <span className="score-percentage">{Math.round(attempt.score_percentage)}%</span>
            <span className="score-points">{attempt.score_points}/{quiz.total_points}</span>
          </div>
          <div className="pass-status">
            {attempt.passed ? (
              <span className="passed">✓ Passed</span>
            ) : (
              <span className="failed">✗ Failed</span>
            )}
            <span className="passing-score">Passing: {quiz.passing_score}%</span>
          </div>
        </div>
      </div>

      <div className="results-stats">
        <div className="stat">
          <label>Time Spent:</label>
          <span>{formatTime(attempt.time_spent_seconds)}</span>
        </div>
        <div className="stat">
          <label>Attempt:</label>
          <span>{attempt.attempt_number} of {quiz.max_attempts}</span>
        </div>
        <div className="stat">
          <label>Status:</label>
          <span className={`status ${attempt.status}`}>
            {attempt.status.replace('_', ' ').toUpperCase()}
          </span>
        </div>
      </div>

      {quiz.allow_review && (
        <div className="questions-review">
          <h3>Review Your Answers</h3>
          {quiz.questions.map((question, index) => renderQuestion(question, index))}
        </div>
      )}

      <div className="results-actions">
        <button onClick={() => navigate('/learner/dashboard')} className="btn-primary">
          Back to Dashboard
        </button>
        {attempt.attempt_number < quiz.max_attempts && (
          <button onClick={() => navigate(`/learner/quiz/${quiz.id}`)} className="btn-secondary">
            Try Again
          </button>
        )}
      </div>
    </div>
  );

  if (loading) {
    return <div className="loading">Loading quiz...</div>;
  }

  if (showResults) {
    return (
      <div className="quiz-player">
        {renderResults()}
      </div>
    );
  }

  if (!attempt && quiz) {
    return (
      <div className="quiz-player">
        <div className="quiz-intro">
          <h1>{quiz.title}</h1>
          {quiz.description && <p className="quiz-description">{quiz.description}</p>}
          
          <div className="quiz-info">
            <div className="info-item">
              <label>Questions:</label>
              <span>{quiz.question_count}</span>
            </div>
            <div className="info-item">
              <label>Total Points:</label>
              <span>{quiz.total_points}</span>
            </div>
            <div className="info-item">
              <label>Time Limit:</label>
              <span>{quiz.time_limit_minutes ? `${quiz.time_limit_minutes} minutes` : 'No limit'}</span>
            </div>
            <div className="info-item">
              <label>Attempts Allowed:</label>
              <span>{quiz.max_attempts}</span>
            </div>
            <div className="info-item">
              <label>Passing Score:</label>
              <span>{quiz.passing_score}%</span>
            </div>
          </div>

          {quiz.instructions && (
            <div className="quiz-instructions">
              <h3>Instructions:</h3>
              <p>{quiz.instructions}</p>
            </div>
          )}

          <div className="quiz-actions">
            <button onClick={startQuiz} className="btn-primary">
              Start Quiz
            </button>
            <button onClick={() => navigate('/learner/dashboard')} className="btn-secondary">
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!attempt || !quiz) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="quiz-player">
      <div className="quiz-header">
        <div className="quiz-title">
          <h1>{quiz.title}</h1>
          <span className="attempt-info">Attempt {attempt.attempt_number} of {quiz.max_attempts}</span>
        </div>
        
        {timeRemaining !== null && (
          <div className={`timer ${timeRemaining < 300 ? 'warning' : ''}`}>
            <span className="timer-label">Time Remaining:</span>
            <span className="timer-value">{formatTime(timeRemaining)}</span>
          </div>
        )}
      </div>

      <div className="quiz-progress">
        <div className="progress-bar">
          <div 
            className="progress-fill" 
            style={{ width: `${((currentQuestionIndex + 1) / quiz.questions.length) * 100}%` }}
          />
        </div>
        <span className="progress-text">
          {currentQuestionIndex + 1} of {quiz.questions.length} questions
        </span>
      </div>

      <div className="quiz-content">
        {renderQuestion(quiz.questions[currentQuestionIndex], currentQuestionIndex)}
      </div>

      <div className="quiz-navigation">
        <button
          onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
          disabled={currentQuestionIndex === 0}
          className="btn-secondary"
        >
          Previous
        </button>

        <div className="question-indicators">
          {quiz.questions.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentQuestionIndex(index)}
              className={`question-indicator ${index === currentQuestionIndex ? 'active' : ''} ${
                responses[quiz.questions[index].id] ? 'answered' : ''
              }`}
            >
              {index + 1}
            </button>
          ))}
        </div>

        {currentQuestionIndex < quiz.questions.length - 1 ? (
          <button
            onClick={() => setCurrentQuestionIndex(prev => prev + 1)}
            className="btn-primary"
          >
            Next
          </button>
        ) : (
          <button
            onClick={completeQuiz}
            disabled={isSubmitting}
            className="btn-primary submit-btn"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Quiz'}
          </button>
        )}
      </div>
    </div>
  );
};

export default QuizPlayer;