import React, { useState } from 'react';
import { courseAPI } from '../../services/api';

const SectionBuilder = ({ courseId, section = null, onSectionCreated, onSectionUpdated, onClose }) => {
  const [formData, setFormData] = useState({
    title: section?.title || '',
    description: section?.description || '',
    order: section?.order || 0
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isEditing = !!section;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    if (error) {
      setError('');
    }
  };

  const validateForm = () => {
    if (!formData.title.trim()) {
      return 'Section title is required';
    }
    if (formData.title.length < 3) {
      return 'Section title must be at least 3 characters';
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
      let response;
      if (isEditing) {
        response = await courseAPI.updateSection(courseId, section.id, formData);
        onSectionUpdated(response.data);
      } else {
        response = await courseAPI.createSection(courseId, formData);
        onSectionCreated(response.data);
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
        setError(`Failed to ${isEditing ? 'update' : 'create'} section`);
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
        maxWidth: '500px',
        width: '90%',
        maxHeight: '80vh',
        overflowY: 'auto'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3>{isEditing ? 'Edit Section' : 'Add New Section'}</h3>
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

        {error && (
          <div className="error" style={{ marginBottom: '20px' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="section-title">Section Title *</label>
            <input
              type="text"
              id="section-title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="Enter section title (e.g., 'Introduction to React')"
              maxLength="200"
              required
            />
            <small style={{ color: '#666', fontSize: '12px' }}>
              {formData.title.length}/200 characters
            </small>
          </div>

          <div className="form-group">
            <label htmlFor="section-description">Section Description</label>
            <textarea
              id="section-description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows="3"
              placeholder="Brief description of what this section covers (optional)"
            />
          </div>

          {isEditing && (
            <div className="form-group">
              <label htmlFor="section-order">Section Order</label>
              <input
                type="number"
                id="section-order"
                name="order"
                value={formData.order}
                onChange={handleChange}
                min="1"
                placeholder="1"
              />
              <small style={{ color: '#666', fontSize: '12px' }}>
                Leave as 0 to add at the end
              </small>
            </div>
          )}

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
              {loading ? 'Saving...' : (isEditing ? 'Update Section' : 'Create Section')}
            </button>
          </div>
        </form>

        {/* Section Tips */}
        <div style={{
          marginTop: '20px',
          padding: '16px',
          backgroundColor: '#f8f9fa',
          borderRadius: '4px',
          border: '1px solid #e9ecef'
        }}>
          <h4 style={{ margin: '0 0 8px 0', color: '#495057' }}>💡 Section Tips</h4>
          <ul style={{ margin: '0', paddingLeft: '20px', fontSize: '14px', lineHeight: '1.5' }}>
            <li>Use clear, descriptive titles that indicate what students will learn</li>
            <li>Group related lessons together logically</li>
            <li>Consider the learning progression from basic to advanced concepts</li>
            <li>Keep sections focused on specific topics or skills</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default SectionBuilder;