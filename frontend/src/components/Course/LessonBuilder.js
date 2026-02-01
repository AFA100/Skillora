import React, { useState } from 'react';
import { courseAPI } from '../../services/api';
import VideoUpload from './VideoUpload';

const LessonBuilder = ({ courseId, section, lesson = null, onLessonCreated, onLessonUpdated, onClose }) => {
  const [formData, setFormData] = useState({
    title: lesson?.title || '',
    description: lesson?.description || '',
    lesson_type: lesson?.lesson_type || 'video',
    video_url: lesson?.video_url || '',
    video_duration: lesson?.video_duration || '',
    text_content: lesson?.text_content || '',
    duration_minutes: lesson?.duration_minutes || '',
    is_preview: lesson?.is_preview || false,
    is_required: lesson?.is_required !== undefined ? lesson.is_required : true,
    attachments: lesson?.attachments || [],
    order: lesson?.order || 0
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showVideoUpload, setShowVideoUpload] = useState(false);

  const isEditing = !!lesson;

  const lessonTypes = [
    { value: 'video', label: 'Video Lesson' },
    { value: 'text', label: 'Text/Article' },
    { value: 'quiz', label: 'Quiz' },
    { value: 'assignment', label: 'Assignment' }
  ];

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    if (error) {
      setError('');
    }
  };

  const handleVideoUpload = (videoUrl, duration) => {
    setFormData(prev => ({
      ...prev,
      video_url: videoUrl,
      video_duration: duration
    }));
    setShowVideoUpload(false);
  };

  const validateForm = () => {
    if (!formData.title.trim()) {
      return 'Lesson title is required';
    }
    if (formData.title.length < 3) {
      return 'Lesson title must be at least 3 characters';
    }
    
    if (formData.lesson_type === 'video' && !formData.video_url) {
      return 'Video URL is required for video lessons';
    }
    
    if (formData.lesson_type === 'text' && !formData.text_content.trim()) {
      return 'Text content is required for text lessons';
    }
    
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Prepare lesson data
      const lessonData = {
        ...formData,
        video_duration: formData.video_duration ? parseInt(formData.video_duration) : null,
        duration_minutes: formData.duration_minutes ? parseInt(formData.duration_minutes) : null
      };

      let response;
      if (isEditing) {
        response = await courseAPI.updateLesson(courseId, section.id, lesson.id, lessonData);
        onLessonUpdated(response.data);
      } else {
        response = await courseAPI.createLesson(courseId, section.id, lessonData);
        onLessonCreated(section.id, response.data);
      }
    } catch (error) {
      if (error.response?.data) {
        const errorData = error.response.data;
        if (typeof errorData === 'object') {
          const firstError = Object.values(errorData)[0];
          setError(Array.isArray(firstError) ? firstError[0] : firstError);
        } else {
          setError(errorData);
        }
      } else {
        setError(`Failed to ${isEditing ? 'update' : 'create'} lesson`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '24px',
        borderRadius: '8px',
        maxWidth: '600px',
        width: '90%',
        maxHeight: '90vh',
        overflowY: 'auto'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3>{isEditing ? 'Edit Lesson' : 'Add New Lesson'}</h3>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '20px',
              cursor: 'pointer',
              color: '#666'
            }}
          >
            ✕
          </button>
        </div>

        <p style={{ color: '#666', marginBottom: '20px' }}>
          Section: <strong>{section.title}</strong>
        </p>

        {error && (
          <div className="error" style={{ marginBottom: '20px' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Basic Information */}
          <div className="form-group">
            <label htmlFor="lesson-title">Lesson Title *</label>
            <input
              type="text"
              id="lesson-title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="Enter lesson title"
              maxLength="200"
              required
            />
            <small style={{ color: '#666', fontSize: '12px' }}>
              {formData.title.length}/200 characters
            </small>
          </div>

          <div className="form-group">
            <label htmlFor="lesson-description">Lesson Description</label>
            <textarea
              id="lesson-description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows="3"
              placeholder="Brief description of the lesson content"
            />
          </div>

          <div className="form-group">
            <label htmlFor="lesson-type">Lesson Type *</label>
            <select
              id="lesson-type"
              name="lesson_type"
              value={formData.lesson_type}
              onChange={handleChange}
              required
            >
              {lessonTypes.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {/* Content Based on Type */}
          {formData.lesson_type === 'video' && (
            <div>
              <div className="form-group">
                <label htmlFor="video-url">Video URL</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="url"
                    id="video-url"
                    name="video_url"
                    value={formData.video_url}
                    onChange={handleChange}
                    placeholder="https://example.com/video.mp4"
                    style={{ flex: 1 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowVideoUpload(true)}
                    style={{
                      padding: '8px 12px',
                      backgroundColor: '#28a745',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    Upload Video
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="video-duration">Video Duration (seconds)</label>
                <input
                  type="number"
                  id="video-duration"
                  name="video_duration"
                  value={formData.video_duration}
                  onChange={handleChange}
                  min="1"
                  placeholder="300"
                />
              </div>
            </div>
          )}

          {formData.lesson_type === 'text' && (
            <div className="form-group">
              <label htmlFor="text-content">Text Content *</label>
              <textarea
                id="text-content"
                name="text_content"
                value={formData.text_content}
                onChange={handleChange}
                rows="8"
                placeholder="Enter the lesson content..."
                required
              />
            </div>
          )}

          {/* Lesson Settings */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div className="form-group">
              <label htmlFor="duration-minutes">Duration (minutes)</label>
              <input
                type="number"
                id="duration-minutes"
                name="duration_minutes"
                value={formData.duration_minutes}
                onChange={handleChange}
                min="1"
                placeholder="10"
              />
            </div>

            {isEditing && (
              <div className="form-group">
                <label htmlFor="lesson-order">Lesson Order</label>
                <input
                  type="number"
                  id="lesson-order"
                  name="order"
                  value={formData.order}
                  onChange={handleChange}
                  min="1"
                  placeholder="1"
                />
              </div>
            )}
          </div>

          {/* Lesson Options */}
          <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="checkbox"
                name="is_preview"
                checked={formData.is_preview}
                onChange={handleChange}
              />
              Preview Lesson
              <small style={{ color: '#666', fontSize: '12px', marginLeft: '4px' }}>
                (Can be viewed without enrollment)
              </small>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="checkbox"
                name="is_required"
                checked={formData.is_required}
                onChange={handleChange}
              />
              Required for Completion
            </label>
          </div>

          <div style={{ 
            display: 'flex', 
            gap: '12px', 
            justifyContent: 'flex-end',
            marginTop: '24px',
            paddingTop: '20px',
            borderTop: '1px solid #dee2e6'
          }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '8px 16px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                backgroundColor: 'white',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '8px 16px',
                border: 'none',
                borderRadius: '4px',
                backgroundColor: '#007bff',
                color: 'white',
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
            >
              {loading ? 'Saving...' : (isEditing ? 'Update Lesson' : 'Create Lesson')}
            </button>
          </div>
        </form>

        {/* Video Upload Modal */}
        {showVideoUpload && (
          <VideoUpload
            onVideoUploaded={handleVideoUpload}
            onClose={() => setShowVideoUpload(false)}
          />
        )}
      </div>
    </div>
  );
};

export default LessonBuilder;