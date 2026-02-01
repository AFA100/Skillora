import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { courseAPI, enrollmentAPI } from '../../services/api';

const CourseDetail = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [reviews, setReviews] = useState([]);

  useEffect(() => {
    fetchCourseDetails();
  }, [courseId]);

  const fetchCourseDetails = async () => {
    try {
      setLoading(true);
      const response = await enrollmentAPI.getPublicCourse(courseId);
      setCourse(response.data);
      setReviews(response.data.recent_reviews || []);
    } catch (error) {
      console.error('Error fetching course details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async () => {
    if (!user) {
      navigate('/login', { state: { from: `/courses/${courseId}` } });
      return;
    }

    if (user.role !== 'learner') {
      alert('Only learners can enroll in courses');
      return;
    }

    try {
      setEnrolling(true);
      
      if (course.price === '0.00' || course.price === 0) {
        // Free course - direct enrollment
        const response = await enrollmentAPI.createEnrollment({ course: courseId });
        alert('Successfully enrolled in the course!');
        navigate('/app/learner');
      } else {
        // Paid course - redirect to payment
        navigate(`/payment/checkout/${courseId}`);
      }
    } catch (error) {
      console.error('Error enrolling:', error);
      if (error.response?.data?.course) {
        alert(error.response.data.course[0]);
      } else {
        alert('Error enrolling in course. Please try again.');
      }
    } finally {
      setEnrolling(false);
    }
  };

  const formatPrice = (price) => {
    return price === '0.00' || price === 0 ? 'Free' : `$${price}`;
  };

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'beginner': return '#28a745';
      case 'intermediate': return '#ffc107';
      case 'advanced': return '#dc3545';
      default: return '#6c757d';
    }
  };

  const renderStars = (rating) => {
    return '★'.repeat(rating) + '☆'.repeat(5 - rating);
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <p>Loading course details...</p>
      </div>
    );
  }

  if (!course) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h2>Course not found</h2>
        <p>The course you're looking for doesn't exist or is not available.</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
      {/* Course Header */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '2fr 1fr', 
        gap: '40px', 
        marginBottom: '40px' 
      }}>
        <div>
          <h1 style={{ margin: '0 0 15px 0' }}>{course.title}</h1>
          
          <p style={{ fontSize: '18px', color: '#666', marginBottom: '20px' }}>
            {course.short_description}
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '20px' }}>
            <span style={{ fontSize: '16px' }}>
              <strong>Instructor:</strong> {course.instructor_name}
            </span>
            
            <span
              style={{
                backgroundColor: getDifficultyColor(course.difficulty),
                color: 'white',
                padding: '4px 12px',
                borderRadius: '16px',
                fontSize: '14px',
                textTransform: 'capitalize'
              }}
            >
              {course.difficulty}
            </span>

            <span style={{ 
              backgroundColor: '#e9ecef',
              padding: '4px 12px',
              borderRadius: '16px',
              fontSize: '14px',
              textTransform: 'capitalize'
            }}>
              {course.category.replace('_', ' ')}
            </span>
          </div>

          <div style={{ display: 'flex', gap: '30px', marginBottom: '20px' }}>
            <div>
              <strong>{course.stats?.total_enrollments || 0}</strong>
              <div style={{ fontSize: '14px', color: '#666' }}>Students</div>
            </div>
            <div>
              <strong>{course.total_lessons}</strong>
              <div style={{ fontSize: '14px', color: '#666' }}>Lessons</div>
            </div>
            <div>
              <strong>{course.total_sections}</strong>
              <div style={{ fontSize: '14px', color: '#666' }}>Sections</div>
            </div>
            {course.duration_hours > 0 && (
              <div>
                <strong>{course.duration_hours}h</strong>
                <div style={{ fontSize: '14px', color: '#666' }}>Duration</div>
              </div>
            )}
          </div>

          {course.stats?.average_rating > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <span style={{ fontSize: '18px', color: '#ffc107' }}>
                {renderStars(Math.round(course.stats.average_rating))}
              </span>
              <span style={{ marginLeft: '10px', color: '#666' }}>
                {course.stats.average_rating.toFixed(1)} ({course.stats.total_reviews} reviews)
              </span>
            </div>
          )}
        </div>

        {/* Enrollment Card */}
        <div className="card" style={{ height: 'fit-content' }}>
          {course.thumbnail && (
            <img
              src={course.thumbnail}
              alt={course.title}
              style={{
                width: '100%',
                height: '200px',
                objectFit: 'cover',
                borderRadius: '8px 8px 0 0'
              }}
            />
          )}
          
          <div style={{ padding: '20px' }}>
            <div style={{ 
              fontSize: '32px', 
              fontWeight: 'bold', 
              color: course.price === '0.00' ? '#28a745' : '#007bff',
              marginBottom: '20px',
              textAlign: 'center'
            }}>
              {formatPrice(course.price)}
            </div>

            {course.is_enrolled ? (
              <div style={{ textAlign: 'center' }}>
                <p style={{ color: '#28a745', marginBottom: '15px' }}>
                  ✓ You are enrolled in this course
                </p>
                <button
                  onClick={() => navigate('/app/learner')}
                  className="btn btn-success"
                  style={{ width: '100%' }}
                >
                  Go to Course
                </button>
              </div>
            ) : (
              <button
                onClick={handleEnroll}
                disabled={enrolling}
                className="btn btn-primary"
                style={{ width: '100%', fontSize: '18px', padding: '12px' }}
              >
                {enrolling ? 'Enrolling...' : 
                 course.price === '0.00' ? 'Enroll for Free' : 'Enroll Now'}
              </button>
            )}

            {!user && (
              <p style={{ fontSize: '14px', color: '#666', textAlign: 'center', marginTop: '10px' }}>
                Please <a href="/login">login</a> to enroll
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Course Content */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '40px' }}>
        <div>
          {/* Description */}
          <section style={{ marginBottom: '40px' }}>
            <h2>About This Course</h2>
            <div style={{ whiteSpace: 'pre-line', lineHeight: '1.6' }}>
              {course.description}
            </div>
          </section>

          {/* Learning Outcomes */}
          {course.learning_outcomes && (
            <section style={{ marginBottom: '40px' }}>
              <h2>What You'll Learn</h2>
              <ul style={{ lineHeight: '1.8' }}>
                {course.learning_outcomes.split('\n').map((outcome, index) => (
                  <li key={index}>{outcome.trim()}</li>
                ))}
              </ul>
            </section>
          )}

          {/* Prerequisites */}
          {course.prerequisites && (
            <section style={{ marginBottom: '40px' }}>
              <h2>Prerequisites</h2>
              <div style={{ whiteSpace: 'pre-line', lineHeight: '1.6' }}>
                {course.prerequisites}
              </div>
            </section>
          )}

          {/* Course Content */}
          {course.sections && course.sections.length > 0 && (
            <section style={{ marginBottom: '40px' }}>
              <h2>Course Content</h2>
              <div style={{ border: '1px solid #ddd', borderRadius: '8px' }}>
                {course.sections.map((section, sectionIndex) => (
                  <div key={section.id} style={{ 
                    borderBottom: sectionIndex < course.sections.length - 1 ? '1px solid #eee' : 'none'
                  }}>
                    <div style={{ 
                      padding: '15px 20px', 
                      backgroundColor: '#f8f9fa',
                      fontWeight: 'bold'
                    }}>
                      Section {sectionIndex + 1}: {section.title}
                      <span style={{ float: 'right', fontWeight: 'normal', color: '#666' }}>
                        {section.lessons?.length || 0} lessons
                      </span>
                    </div>
                    
                    {section.lessons && section.lessons.map((lesson, lessonIndex) => (
                      <div key={lesson.id} style={{ 
                        padding: '10px 20px',
                        borderBottom: lessonIndex < section.lessons.length - 1 ? '1px solid #f0f0f0' : 'none'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span>
                            {lesson.lesson_type === 'video' ? '▶️' : '📄'} {lesson.title}
                            {lesson.is_preview && (
                              <span style={{ 
                                marginLeft: '10px',
                                backgroundColor: '#28a745',
                                color: 'white',
                                padding: '2px 6px',
                                borderRadius: '10px',
                                fontSize: '12px'
                              }}>
                                Preview
                              </span>
                            )}
                          </span>
                          {lesson.duration_minutes && (
                            <span style={{ color: '#666', fontSize: '14px' }}>
                              {lesson.duration_minutes} min
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Reviews */}
          {reviews.length > 0 && (
            <section>
              <h2>Student Reviews</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {reviews.map((review, index) => (
                  <div key={index} className="card" style={{ padding: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                      <strong>{review.reviewer_name}</strong>
                      <span style={{ color: '#ffc107' }}>
                        {renderStars(review.rating)}
                      </span>
                    </div>
                    {review.review_text && (
                      <p style={{ margin: 0, lineHeight: '1.6' }}>
                        {review.review_text}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Sidebar */}
        <div>
          {/* Tags */}
          {course.tags && (
            <div className="card" style={{ marginBottom: '20px' }}>
              <h3>Tags</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {course.tags.split(',').map((tag, index) => (
                  <span
                    key={index}
                    style={{
                      backgroundColor: '#e9ecef',
                      padding: '4px 8px',
                      borderRadius: '12px',
                      fontSize: '12px'
                    }}
                  >
                    {tag.trim()}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Course Stats */}
          <div className="card">
            <h3>Course Statistics</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Total Students:</span>
                <strong>{course.stats?.total_enrollments || 0}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Active Students:</span>
                <strong>{course.stats?.active_enrollments || 0}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Completion Rate:</span>
                <strong>{course.stats?.completion_rate || 0}</strong>
              </div>
              {course.stats?.average_rating > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Average Rating:</span>
                  <strong>{course.stats.average_rating.toFixed(1)}/5</strong>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CourseDetail;