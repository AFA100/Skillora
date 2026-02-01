import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { quizAPI, courseAPI } from '../../services/api';
import './QuizBuilder.css';

const QuizBuilder = () => {
  const { courseId, quizId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [courses, setCourses] = useState([]);
  const [lessons, setLessons] = useState([]);
  
  const [quiz, setQuiz] = useState({
    title: '',
    description: '',
    instructions: '',
    quiz_type: 'practice',
    time_limit_minutes: '',
    max_attempts: 1,
    passing_score: 70,
    available_from: '',
    available_until: '',
    is_active: true,
    shuffle_questions: false,
    shuffle_answers: false,
    show_correct_answers: true,
    show_score_immediately: true,
    allow_review: true,
    require_completion: false,
    course: courseId || '',
    lesson: '',
    questions: []
  });

  const [currentQuestion, setCurrentQuestion] = useState({
    question_type: 'multiple_choice',
    question_text: '',
    explanation: '',
    points: 1,
    is_required: true,
    answers: [
      { answer_text: '', is_correct: false },
      { answer_text: '', is_correct: false }
    ]
  });

  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [editingQuestionIndex, setEditingQuestionIndex] = useState(-1);

  useEffect(() => {
    loadCourses();
    if (quizId) {
      loadQuiz();
    }
  }, [quizId]);

  useEffect(() => {
    if (quiz.course) {
      loadLessons(quiz.course);
    }
  }, [quiz.course]);

  const loadCourses = async () => {
    try {
      const response = await courseAPI.getCourses();
      setCourses(response.data);
    } catch (error) {
      console.error('Error loading courses:', error);
    }
  };

  const loadLessons = async (courseId) => {
    try {
      const response = await courseAPI.getCourse(courseId);
      const allLessons = [];
      response.data.sections.forEach(section => {
        section.lessons.forEach(lesson => {
          allLessons.push({
            ...lesson,
            section_title: section.title
          });
        });
      });
      setLessons(allLessons);
    } catch (error) {
      console.error('Error loading lessons:', error);
    }
  };

  const loadQuiz = async () => {
    try {
      setLoading(true);
      const response = await quizAPI.getQuiz(quizId);
      setQuiz(response.data);
    } catch (error) {
      console.error('Error loading quiz:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleQuizChange = (field, value) => {
    setQuiz(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleQuestionChange = (field, value) => {
    setCurrentQuestion(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAnswerChange = (index, field, value) => {
    setCurrentQuestion(prev => ({
      ...prev,
      answers: prev.answers.map((answer, i) => 
        i === index ? { ...answer, [field]: value } : answer
      )
    }));
  };

  const addAnswer = () => {
    setCurrentQuestion(prev => ({
      ...prev,
      answers: [...prev.answers, { answer_text: '', is_correct: false }]
    }));
  };

  const removeAnswer = (index) => {
    if (currentQuestion.answers.length > 2) {
      setCurrentQuestion(prev => ({
        ...prev,
        answers: prev.answers.filter((_, i) => i !== index)
      }));
    }
  };

  const addQuestion = () => {
    setCurrentQuestion({
      question_type: 'multiple_choice',
      question_text: '',
      explanation: '',
      points: 1,
      is_required: true,
      answers: [
        { answer_text: '', is_correct: false },
        { answer_text: '', is_correct: false }
      ]
    });
    setEditingQuestionIndex(-1);
    setShowQuestionForm(true);
  };

  const editQuestion = (index) => {
    setCurrentQuestion(quiz.questions[index]);
    setEditingQuestionIndex(index);
    setShowQuestionForm(true);
  };

  const saveQuestion = () => {
    // Validate question
    if (!currentQuestion.question_text.trim()) {
      alert('Please enter a question text');
      return;
    }

    if (currentQuestion.question_type === 'multiple_choice' || currentQuestion.question_type === 'true_false') {
      const hasCorrectAnswer = currentQuestion.answers.some(answer => answer.is_correct);
      if (!hasCorrectAnswer) {
        alert('Please mark at least one answer as correct');
        return;
      }
    }

    const updatedQuestions = [...quiz.questions];
    if (editingQuestionIndex >= 0) {
      updatedQuestions[editingQuestionIndex] = { ...currentQuestion, order: editingQuestionIndex + 1 };
    } else {
      updatedQuestions.push({ ...currentQuestion, order: updatedQuestions.length + 1 });
    }

    setQuiz(prev => ({
      ...prev,
      questions: updatedQuestions
    }));

    setShowQuestionForm(false);
  };

  const removeQuestion = (index) => {
    if (window.confirm('Are you sure you want to remove this question?')) {
      const updatedQuestions = quiz.questions.filter((_, i) => i !== index);
      // Reorder remaining questions
      const reorderedQuestions = updatedQuestions.map((q, i) => ({ ...q, order: i + 1 }));
      
      setQuiz(prev => ({
        ...prev,
        questions: reorderedQuestions
      }));
    }
  };

  const saveQuiz = async () => {
    try {
      setSaving(true);

      // Validate quiz
      if (!quiz.title.trim()) {
        alert('Please enter a quiz title');
        return;
      }

      if (!quiz.course) {
        alert('Please select a course');
        return;
      }

      if (quiz.questions.length === 0) {
        alert('Please add at least one question');
        return;
      }

      if (quizId) {
        await quizAPI.updateQuiz(quizId, quiz);
      } else {
        await quizAPI.createQuiz(quiz);
      }

      navigate('/teacher/courses');
    } catch (error) {
      console.error('Error saving quiz:', error);
      alert('Error saving quiz. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const renderQuestionForm = () => (
    <div className="question-form">
      <h3>{editingQuestionIndex >= 0 ? 'Edit Question' : 'Add Question'}</h3>
      
      <div className="form-group">
        <label>Question Type</label>
        <select
          value={currentQuestion.question_type}
          onChange={(e) => handleQuestionChange('question_type', e.target.value)}
        >
          <option value="multiple_choice">Multiple Choice</option>
          <option value="true_false">True/False</option>
          <option value="short_answer">Short Answer</option>
          <option value="essay">Essay</option>
          <option value="fill_blank">Fill in the Blank</option>
        </select>
      </div>

      <div className="form-group">
        <label>Question Text *</label>
        <textarea
          value={currentQuestion.question_text}
          onChange={(e) => handleQuestionChange('question_text', e.target.value)}
          placeholder="Enter your question..."
          rows="3"
        />
      </div>

      <div className="form-group">
        <label>Explanation (shown after answering)</label>
        <textarea
          value={currentQuestion.explanation}
          onChange={(e) => handleQuestionChange('explanation', e.target.value)}
          placeholder="Optional explanation..."
          rows="2"
        />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Points</label>
          <input
            type="number"
            min="1"
            value={currentQuestion.points}
            onChange={(e) => handleQuestionChange('points', parseInt(e.target.value))}
          />
        </div>
        <div className="form-group">
          <label>
            <input
              type="checkbox"
              checked={currentQuestion.is_required}
              onChange={(e) => handleQuestionChange('is_required', e.target.checked)}
            />
            Required Question
          </label>
        </div>
      </div>

      {(currentQuestion.question_type === 'multiple_choice' || currentQuestion.question_type === 'true_false') && (
        <div className="answers-section">
          <h4>Answer Choices</h4>
          {currentQuestion.answers.map((answer, index) => (
            <div key={index} className="answer-item">
              <input
                type="text"
                value={answer.answer_text}
                onChange={(e) => handleAnswerChange(index, 'answer_text', e.target.value)}
                placeholder={`Answer ${index + 1}`}
              />
              <label>
                <input
                  type={currentQuestion.question_type === 'multiple_choice' ? 'checkbox' : 'radio'}
                  name="correct_answer"
                  checked={answer.is_correct}
                  onChange={(e) => {
                    if (currentQuestion.question_type === 'true_false') {
                      // For true/false, only one can be correct
                      setCurrentQuestion(prev => ({
                        ...prev,
                        answers: prev.answers.map((a, i) => ({
                          ...a,
                          is_correct: i === index
                        }))
                      }));
                    } else {
                      handleAnswerChange(index, 'is_correct', e.target.checked);
                    }
                  }}
                />
                Correct
              </label>
              {currentQuestion.answers.length > 2 && (
                <button
                  type="button"
                  onClick={() => removeAnswer(index)}
                  className="btn-remove"
                >
                  Remove
                </button>
              )}
            </div>
          ))}
          
          {currentQuestion.question_type === 'multiple_choice' && (
            <button type="button" onClick={addAnswer} className="btn-add">
              Add Answer Choice
            </button>
          )}
        </div>
      )}

      <div className="form-actions">
        <button type="button" onClick={saveQuestion} className="btn-primary">
          {editingQuestionIndex >= 0 ? 'Update Question' : 'Add Question'}
        </button>
        <button type="button" onClick={() => setShowQuestionForm(false)} className="btn-secondary">
          Cancel
        </button>
      </div>
    </div>
  );

  if (loading) {
    return <div className="loading">Loading quiz...</div>;
  }

  return (
    <div className="quiz-builder">
      <div className="quiz-builder-header">
        <h1>{quizId ? 'Edit Quiz' : 'Create Quiz'}</h1>
        <div className="header-actions">
          <button onClick={() => navigate('/teacher/courses')} className="btn-secondary">
            Cancel
          </button>
          <button onClick={saveQuiz} disabled={saving} className="btn-primary">
            {saving ? 'Saving...' : 'Save Quiz'}
          </button>
        </div>
      </div>

      <div className="quiz-builder-content">
        <div className="quiz-settings">
          <h2>Quiz Settings</h2>
          
          <div className="form-row">
            <div className="form-group">
              <label>Quiz Title *</label>
              <input
                type="text"
                value={quiz.title}
                onChange={(e) => handleQuizChange('title', e.target.value)}
                placeholder="Enter quiz title"
              />
            </div>
            <div className="form-group">
              <label>Quiz Type</label>
              <select
                value={quiz.quiz_type}
                onChange={(e) => handleQuizChange('quiz_type', e.target.value)}
              >
                <option value="practice">Practice Quiz</option>
                <option value="graded">Graded Assessment</option>
                <option value="final">Final Exam</option>
                <option value="survey">Survey</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              value={quiz.description}
              onChange={(e) => handleQuizChange('description', e.target.value)}
              placeholder="Brief description of the quiz"
              rows="3"
            />
          </div>

          <div className="form-group">
            <label>Instructions</label>
            <textarea
              value={quiz.instructions}
              onChange={(e) => handleQuizChange('instructions', e.target.value)}
              placeholder="Instructions for students taking the quiz"
              rows="3"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Course *</label>
              <select
                value={quiz.course}
                onChange={(e) => handleQuizChange('course', e.target.value)}
              >
                <option value="">Select Course</option>
                {courses.map(course => (
                  <option key={course.id} value={course.id}>
                    {course.title}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Lesson (Optional)</label>
              <select
                value={quiz.lesson}
                onChange={(e) => handleQuizChange('lesson', e.target.value)}
              >
                <option value="">No specific lesson</option>
                {lessons.map(lesson => (
                  <option key={lesson.id} value={lesson.id}>
                    {lesson.section_title} - {lesson.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Time Limit (minutes)</label>
              <input
                type="number"
                min="1"
                value={quiz.time_limit_minutes}
                onChange={(e) => handleQuizChange('time_limit_minutes', e.target.value ? parseInt(e.target.value) : '')}
                placeholder="No limit"
              />
            </div>
            <div className="form-group">
              <label>Max Attempts</label>
              <input
                type="number"
                min="1"
                value={quiz.max_attempts}
                onChange={(e) => handleQuizChange('max_attempts', parseInt(e.target.value))}
              />
            </div>
            <div className="form-group">
              <label>Passing Score (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                value={quiz.passing_score}
                onChange={(e) => handleQuizChange('passing_score', parseInt(e.target.value))}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Available From</label>
              <input
                type="datetime-local"
                value={quiz.available_from}
                onChange={(e) => handleQuizChange('available_from', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Available Until</label>
              <input
                type="datetime-local"
                value={quiz.available_until}
                onChange={(e) => handleQuizChange('available_until', e.target.value)}
              />
            </div>
          </div>

          <div className="quiz-options">
            <h3>Quiz Options</h3>
            <div className="options-grid">
              <label>
                <input
                  type="checkbox"
                  checked={quiz.shuffle_questions}
                  onChange={(e) => handleQuizChange('shuffle_questions', e.target.checked)}
                />
                Shuffle Questions
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={quiz.shuffle_answers}
                  onChange={(e) => handleQuizChange('shuffle_answers', e.target.checked)}
                />
                Shuffle Answers
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={quiz.show_correct_answers}
                  onChange={(e) => handleQuizChange('show_correct_answers', e.target.checked)}
                />
                Show Correct Answers
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={quiz.show_score_immediately}
                  onChange={(e) => handleQuizChange('show_score_immediately', e.target.checked)}
                />
                Show Score Immediately
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={quiz.allow_review}
                  onChange={(e) => handleQuizChange('allow_review', e.target.checked)}
                />
                Allow Review
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={quiz.is_active}
                  onChange={(e) => handleQuizChange('is_active', e.target.checked)}
                />
                Active
              </label>
            </div>
          </div>
        </div>

        <div className="questions-section">
          <div className="questions-header">
            <h2>Questions ({quiz.questions.length})</h2>
            <button onClick={addQuestion} className="btn-primary">
              Add Question
            </button>
          </div>

          {quiz.questions.length === 0 ? (
            <div className="no-questions">
              <p>No questions added yet. Click "Add Question" to get started.</p>
            </div>
          ) : (
            <div className="questions-list">
              {quiz.questions.map((question, index) => (
                <div key={index} className="question-item">
                  <div className="question-header">
                    <span className="question-number">Q{index + 1}</span>
                    <span className="question-type">{question.question_type.replace('_', ' ')}</span>
                    <span className="question-points">{question.points} pts</span>
                    <div className="question-actions">
                      <button onClick={() => editQuestion(index)} className="btn-edit">
                        Edit
                      </button>
                      <button onClick={() => removeQuestion(index)} className="btn-remove">
                        Remove
                      </button>
                    </div>
                  </div>
                  <div className="question-text">
                    {question.question_text}
                  </div>
                  {question.answers && question.answers.length > 0 && (
                    <div className="question-answers">
                      {question.answers.map((answer, answerIndex) => (
                        <div key={answerIndex} className={`answer ${answer.is_correct ? 'correct' : ''}`}>
                          {answer.answer_text}
                          {answer.is_correct && <span className="correct-indicator">✓</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {showQuestionForm && (
            <div className="question-form-overlay">
              <div className="question-form-modal">
                {renderQuestionForm()}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuizBuilder;