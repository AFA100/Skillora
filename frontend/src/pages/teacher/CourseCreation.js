import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { courseAPI } from '../../services/api';
import FileUpload from '../../components/FileUpload/FileUpload';

const CourseCreation = () => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    short_description: '',
    price: '',
    difficulty: 'beginner',
    category: 'programming',
    tags: '',
    learning_outcomes: '',
    prerequisites: '',
    duration_hours: '',
    language: 'English',
    thumbnail: null
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const navigate = useNavigate();

  const categoryOptions = [
    { value: 'programming', label: 'Programming' },
    { value: 'design', label: 'Design' },
    { value: 'business', label: 'Business' },
    { value: 'marketing', label: 'Marketing' },
    { value: 'data_science', label: 'Data Science' },
    { value: 'photography', label: 'Photography' },
    { value: 'music', label: 'Music' },
    { value: 'language', label: 'Language' },
    { value: 'health', label: 'Health & Fitness' },
    { value: 'other', label: 'Other' }
  ];

  const difficultyOptions = [
    { value: 'beginner', label: 'Beginner' },
    { value: 'intermediate', label: 'Intermediate' },
    { value: 'advanced', label: 'Advanced' }
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear specific field error
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: null
      }));
    }
  };

  const handleThumbnailUpload = (s3Key, file) => {
    setFormData(prev => ({
      ...prev,
      thumbnail: s3Key
    }));
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Course title is required';
    } else if (formData.title.length < 10) {
      newErrors.title = 'Course title must be at least 10 characters';
    }

    if (!formData.short_description.trim()) {
      newErrors.short_description = 'Short description is required';
    } else if (formData.short_description.length < 50) {
      newErrors.short_description = 'Short description must be at least 50 characters';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Course description is required';
    } else if (formData.description.length < 100) {
      newErrors.description = 'Course description must be at least 100 characters';
    }

    if (!formData.price || parseFloat(formData.price) < 0) {
      newErrors.price = 'Valid price is required';
    }

    if (!formData.learning_outcomes.trim()) {
      newErrors.learning_outcomes = 'Learning outcomes are required';
    } else {
      const outcomes = formData.learning_outcomes.split('\n').filter(o => o.trim());
      if (outcomes.length < 1) {
        newErrors.learning_outcomes = 'At least one learning outcome is required';
      }
    }

    if (!formData.duration_hours || parseInt(formData.duration_hours) < 1) {
      newErrors.duration_hours = 'Duration must be at least 1 hour';
    }

    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      // Prepare form data
      const courseData = {
        ...formData,
        price: parseFloat(formData.price),
        duration_hours: parseInt(formData.duration_hours)
      };

      const response = await courseAPI.createCourse(courseData);
      
      // Redirect to course builder
      navigate(`/app/teacher/courses/${response.data.id}/build`, {
        state: { 
          message: 'Course created successfully! Now add sections and lessons.',
          courseId: response.data.id
        }
      });
      
    } catch (error) {
      if (error.response?.data) {
        setErrors(error.response.data);
      } else {
        setErrors({ general: 'Failed to create course. Please try again.' });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="card" style={{ maxWidth: '800px', margin: '0 auto' }}>
        <h2>Create New Course</h2>
        <p>Fill in the details below to create your course. You'll be able to add sections and lessons next.</p>

        {errors.general && (
          <div className="error" style={{ marginBottom: '20px' }}>
            {errors.general}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Basic Information */}
          <div style={{ marginBottom: '30px' }}>
            <h3>Basic Information</h3>
            
            <div className="form-group">
              <label htmlFor="title">Course Title *</label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="Enter an engaging course title"
                maxLength="200"
              />
              {errors.title && <div className="error">{errors.title}</div>}
              <small style={{ color: '#666' }}>
                {formData.title.length}/200 characters
              </small>
            </div>

            <div className="form-group">
              <label htmlFor="short_description">Short Description *</label>
              <textarea
                id="short_description"
                name="short_description"
                value={formData.short_description}
                onChange={handleChange}
                rows="3"
                placeholder="A brief, compelling summary of your course (50-500 characters)"
                maxLength="500"
              />
              {errors.short_description && <div className="error">{errors.short_description}</div>}
              <small style={{ color: '#666' }}>
                {formData.short_description.length}/500 characters
              </small>
            </div>

            <div className="form-group">
              <label htmlFor="description">Course Description *</label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows="6"
                placeholder="Provide a detailed description of your course content, structure, and what makes it unique"
              />
              {errors.description && <div className="error">{errors.description}</div>}
            </div>
          </div>

          {/* Course Details */}
          <div style={{ marginBottom: '30px' }}>
            <h3>Course Details</h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
              <div className="form-group">
                <label htmlFor="category">Category *</label>
                <select
                  id="category"
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                >
                  {categoryOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="difficulty">Difficulty Level *</label>
                <select
                  id="difficulty"
                  name="difficulty"
                  value={formData.difficulty}
                  onChange={handleChange}
                >
                  {difficultyOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="price">Price (USD) *</label>
                <input
                  type="number"
                  id="price"
                  name="price"
                  value={formData.price}
                  onChange={handleChange}
                  min="0"
                  step="0.01"
                  placeholder="29.99"
                />
                {errors.price && <div className="error">{errors.price}</div>}
              </div>

              <div className="form-group">
                <label htmlFor="duration_hours">Duration (Hours) *</label>
                <input
                  type="number"
                  id="duration_hours"
                  name="duration_hours"
                  value={formData.duration_hours}
                  onChange={handleChange}
                  min="1"
                  placeholder="10"
                />
                {errors.duration_hours && <div className="error">{errors.duration_hours}</div>}
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="language">Language</label>
              <input
                type="text"
                id="language"
                name="language"
                value={formData.language}
                onChange={handleChange}
                placeholder="English"
              />
            </div>

            <div className="form-group">
              <label htmlFor="tags">Tags</label>
              <input
                type="text"
                id="tags"
                name="tags"
                value={formData.tags}
                onChange={handleChange}
                placeholder="javascript, react, web development, frontend"
              />
              <small style={{ color: '#666' }}>
                Separate tags with commas. Maximum 10 tags.
              </small>
            </div>
          </div>

          {/* Learning Content */}
          <div style={{ marginBottom: '30px' }}>
            <h3>Learning Content</h3>
            
            <div className="form-group">
              <label htmlFor="learning_outcomes">Learning Outcomes *</label>
              <textarea
                id="learning_outcomes"
                name="learning_outcomes"
                value={formData.learning_outcomes}
                onChange={handleChange}
                rows="5"
                placeholder="What will students learn? Enter one outcome per line:&#10;Build a complete React application&#10;Understand modern JavaScript concepts&#10;Deploy applications to production"
              />
              {errors.learning_outcomes && <div className="error">{errors.learning_outcomes}</div>}
              <small style={{ color: '#666' }}>
                Enter one learning outcome per line. Maximum 10 outcomes.
              </small>
            </div>

            <div className="form-group">
              <label htmlFor="prerequisites">Prerequisites</label>
              <textarea
                id="prerequisites"
                name="prerequisites"
                value={formData.prerequisites}
                onChange={handleChange}
                rows="3"
                placeholder="What should students know before taking this course? (Optional)"
              />
            </div>
          </div>

          {/* Course Thumbnail */}
          <div style={{ marginBottom: '30px' }}>
            <h3>Course Thumbnail</h3>
            <FileUpload
              uploadType="profile_photo"
              label="Course Thumbnail"
              description="Upload an eye-catching thumbnail for your course. Recommended size: 1280x720 pixels."
              accept="image/*"
              maxSize={5 * 1024 * 1024} // 5MB
              onUploadComplete={handleThumbnailUpload}
              onUploadError={(error) => setErrors({ thumbnail: error })}
            />
            {errors.thumbnail && <div className="error">{errors.thumbnail}</div>}
          </div>

          {/* Submit Button */}
          <div style={{ textAlign: 'center', paddingTop: '20px', borderTop: '1px solid #dee2e6' }}>
            <button 
              type="submit" 
              className="btn btn-primary" 
              disabled={loading}
              style={{ padding: '12px 40px', fontSize: '16px' }}
            >
              {loading ? 'Creating Course...' : 'Create Course & Continue'}
            </button>
          </div>
        </form>
      </div>

      {/* Help Section */}
      <div className="card" style={{ maxWidth: '800px', margin: '20px auto 0', backgroundColor: '#f8f9fa' }}>
        <h3>💡 Course Creation Tips</h3>
        <ul style={{ paddingLeft: '20px', lineHeight: '1.6' }}>
          <li><strong>Title:</strong> Make it clear and specific. Include key topics students will learn.</li>
          <li><strong>Description:</strong> Explain what makes your course unique and valuable.</li>
          <li><strong>Learning Outcomes:</strong> Be specific about skills students will gain.</li>
          <li><strong>Pricing:</strong> Research similar courses to set competitive pricing.</li>
          <li><strong>Thumbnail:</strong> Use high-quality images that represent your course content.</li>
        </ul>
      </div>
    </div>
  );
};

export default CourseCreation;