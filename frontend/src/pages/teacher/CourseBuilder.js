import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { courseAPI } from '../../services/api';
import SectionBuilder from '../../components/Course/SectionBuilder';
import LessonBuilder from '../../components/Course/LessonBuilder';

const CourseBuilder = () => {
  const { courseId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [course, setCourse] = useState(null);
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeSection, setActiveSection] = useState(null);
  const [showSectionForm, setShowSectionForm] = useState(false);
  const [showLessonForm, setShowLessonForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchCourseData();
  }, [courseId]);

  const fetchCourseData = async () => {
    try {
      setLoading(true);
      const [courseResponse, sectionsResponse] = await Promise.all([
        courseAPI.getCourse(courseId),
        courseAPI.getSections(courseId)
      ]);
      
      setCourse(courseResponse.data);
      setSections(sectionsResponse.data);
    } catch (error) {
      setError('Failed to load course data');
    } finally {
      setLoading(false);
    }
  };

  const handleSectionCreated = (newSection) => {
    setSections(prev => [...prev, newSection]);
    setShowSectionForm(false);
  };

  const handleSectionUpdated = (updatedSection) => {
    setSections(prev => prev.map(section => 
      section.id === updatedSection.id ? updatedSection : section
    ));
  };

  const handleSectionDeleted = (sectionId) => {
    setSections(prev => prev.filter(section => section.id !== sectionId));
    if (activeSection?.id === sectionId) {
      setActiveSection(null);
    }
  };

  const handleLessonCreated = (sectionId, newLesson) => {
    setSections(prev => prev.map(section => 
      section.id === sectionId 
        ? { ...section, lessons: [...(section.lessons || []), newLesson] }
        : section
    ));
    setShowLessonForm(false);
  };

  const handleSubmitCourse = async () => {
    if (!course) return;

    // Validate course has content
    if (sections.length === 0) {
      setError('Course must have at least one section before submission');
      return;
    }

    const totalLessons = sections.reduce((total, section) => 
      total + (section.lessons?.length || 0), 0
    );

    if (totalLessons < 3) {
      setError('Course must have at least 3 lessons before submission');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      await courseAPI.submitCourse(courseId);
      navigate('/app/teacher/courses', {
        state: { 
          message: 'Course submitted for review successfully! We\'ll notify you once it\'s approved.',
          type: 'success'
        }
      });
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to submit course');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      draft: { color: '#6c757d', label: 'Draft' },
      submitted: { color: '#ffc107', label: 'Under Review' },
      published: { color: '#28a745', label: 'Published' },
      rejected: { color: '#dc3545', label: 'Rejected' },
      archived: { color: '#6c757d', label: 'Archived' }
    };

    const config = statusConfig[status] || statusConfig.draft;
    
    return (
      <span style={{
        padding: '4px 12px',
        borderRadius: '12px',
        fontSize: '12px',
        fontWeight: 'bold',
        backgroundColor: config.color,
        color: 'white'
      }}>
        {config.label}
      </span>
    );
  };

  if (loading) {
    return <div className="loading">Loading course builder...</div>;
  }

  if (!course) {
    return (
      <div className="card">
        <div className="error">Course not found</div>
      </div>
    );
  }

  return (
    <div>
      {/* Success message from course creation */}
      {location.state?.message && (
        <div style={{
          backgroundColor: '#d4edda',
          color: '#155724',
          padding: '12px',
          borderRadius: '4px',
          marginBottom: '20px',
          border: '1px solid #c3e6cb'
        }}>
          {location.state.message}
        </div>
      )}

      {/* Course Header */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
          <div>
            <h2>{course.title}</h2>
            <p style={{ color: '#666', margin: '8px 0' }}>{course.short_description}</p>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              {getStatusBadge(course.status)}
              <span style={{ fontSize: '14px', color: '#666' }}>
                {sections.length} sections • {sections.reduce((total, s) => total + (s.lessons?.length || 0), 0)} lessons
              </span>
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={() => navigate(`/app/teacher/courses/${courseId}/edit`)}
              className="btn btn-primary"
              disabled={!course.can_be_edited}
            >
              Edit Details
            </button>
            
            {course.can_be_edited && (
              <button
                onClick={handleSubmitCourse}
                disabled={submitting || sections.length === 0}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: submitting ? 'not-allowed' : 'pointer'
                }}
              >
                {submitting ? 'Submitting...' : 'Submit for Review'}
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="error" style={{ marginBottom: '20px' }}>
            {error}
          </div>
        )}

        {course.review_notes && (
          <div style={{
            backgroundColor: course.status === 'rejected' ? '#f8d7da' : '#d4edda',
            color: course.status === 'rejected' ? '#721c24' : '#155724',
            padding: '12px',
            borderRadius: '4px',
            marginBottom: '20px',
            border: `1px solid ${course.status === 'rejected' ? '#f5c6cb' : '#c3e6cb'}`
          }}>
            <strong>Review Notes:</strong> {course.review_notes}
          </div>
        )}
      </div>

      {/* Course Content Builder */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3>Course Content</h3>
          <button
            onClick={() => setShowSectionForm(true)}
            className="btn btn-primary"
            disabled={!course.can_be_edited}
          >
            + Add Section
          </button>
        </div>

        {/* Sections List */}
        {sections.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            padding: '40px', 
            backgroundColor: '#f8f9fa', 
            borderRadius: '8px',
            border: '2px dashed #dee2e6'
          }}>
            <h4 style={{ color: '#666', margin: '0 0 12px 0' }}>No sections yet</h4>
            <p style={{ color: '#666', margin: '0 0 20px 0' }}>
              Start building your course by adding your first section.
            </p>
            <button
              onClick={() => setShowSectionForm(true)}
              className="btn btn-primary"
              disabled={!course.can_be_edited}
            >
              Create First Section
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {sections.map((section, index) => (
              <div key={section.id} style={{
                border: '1px solid #dee2e6',
                borderRadius: '8px',
                backgroundColor: 'white'
              }}>
                <div style={{
                  padding: '16px',
                  borderBottom: '1px solid #dee2e6',
                  backgroundColor: '#f8f9fa',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <h4 style={{ margin: '0 0 4px 0' }}>
                      Section {index + 1}: {section.title}
                    </h4>
                    <p style={{ margin: '0', fontSize: '14px', color: '#666' }}>
                      {section.lessons?.length || 0} lessons
                      {section.description && ` • ${section.description}`}
                    </p>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => {
                        setActiveSection(section);
                        setShowLessonForm(true);
                      }}
                      style={{
                        padding: '4px 8px',
                        fontSize: '12px',
                        backgroundColor: '#007bff',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                      disabled={!course.can_be_edited}
                    >
                      + Add Lesson
                    </button>
                  </div>
                </div>

                {/* Lessons List */}
                {section.lessons && section.lessons.length > 0 && (
                  <div style={{ padding: '16px' }}>
                    {section.lessons.map((lesson, lessonIndex) => (
                      <div key={lesson.id} style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '8px 0',
                        borderBottom: lessonIndex < section.lessons.length - 1 ? '1px solid #f0f0f0' : 'none'
                      }}>
                        <div>
                          <span style={{ fontWeight: 'bold' }}>
                            {lessonIndex + 1}. {lesson.title}
                          </span>
                          <span style={{ 
                            marginLeft: '8px', 
                            fontSize: '12px', 
                            color: '#666',
                            textTransform: 'capitalize'
                          }}>
                            ({lesson.lesson_type})
                          </span>
                          {lesson.duration_minutes && (
                            <span style={{ marginLeft: '8px', fontSize: '12px', color: '#666' }}>
                              {lesson.duration_minutes} min
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Section Form Modal */}
      {showSectionForm && (
        <SectionBuilder
          courseId={courseId}
          onSectionCreated={handleSectionCreated}
          onClose={() => setShowSectionForm(false)}
        />
      )}

      {/* Lesson Form Modal */}
      {showLessonForm && activeSection && (
        <LessonBuilder
          courseId={courseId}
          section={activeSection}
          onLessonCreated={handleLessonCreated}
          onClose={() => {
            setShowLessonForm(false);
            setActiveSection(null);
          }}
        />
      )}

      {/* Course Submission Guidelines */}
      {course.can_be_edited && (
        <div className="card" style={{ backgroundColor: '#e3f2fd', border: '1px solid #bbdefb' }}>
          <h3 style={{ color: '#1976d2', margin: '0 0 16px 0' }}>📋 Submission Guidelines</h3>
          <ul style={{ margin: '0', paddingLeft: '20px', lineHeight: '1.6' }}>
            <li>Course must have at least 3 lessons across one or more sections</li>
            <li>Each lesson should have clear, descriptive titles</li>
            <li>Video lessons should include duration information</li>
            <li>Consider adding preview lessons to attract students</li>
            <li>Review will typically take 2-3 business days</li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default CourseBuilder;