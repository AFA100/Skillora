import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import FileUpload from '../../components/FileUpload/FileUpload';
import { teacherAPI } from '../../services/api';

const TeacherVerificationForm = () => {
  const [formData, setFormData] = useState({
    government_id_key: '',
    portfolio_key: '',
    demo_video_key: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleFileUpload = (field, s3Key, file) => {
    setFormData(prev => ({
      ...prev,
      [field]: s3Key || ''
    }));
  };

  const handleFileError = (error) => {
    setError(error);
  };

  const isFormValid = () => {
    return formData.government_id_key && 
           formData.portfolio_key && 
           formData.demo_video_key;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!isFormValid()) {
      setError('Please upload all required documents');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await teacherAPI.submitVerification(formData);
      
      // Redirect to verification status page
      navigate('/app/teacher/verification/status', {
        state: { 
          message: 'Verification submitted successfully! We will review your documents within 2-3 business days.',
          submissionId: response.data.submission_id
        }
      });
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to submit verification');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card" style={{ maxWidth: '800px', margin: '0 auto' }}>
      <h2>Teacher Verification</h2>
      <p>To start teaching on Skillora, please submit the following documents for verification:</p>

      {error && (
        <div className="error" style={{ marginBottom: '20px' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <FileUpload
          uploadType="government_id"
          label="Government-Issued ID"
          description="Upload a clear photo of your driver's license, passport, or national ID card. This helps us verify your identity."
          accept="image/*,application/pdf"
          maxSize={10 * 1024 * 1024} // 10MB
          required
          onUploadComplete={(s3Key, file) => handleFileUpload('government_id_key', s3Key, file)}
          onUploadError={handleFileError}
        />

        <FileUpload
          uploadType="portfolio"
          label="Portfolio or Resume"
          description="Upload your teaching portfolio, resume, or CV that showcases your qualifications and experience."
          accept="application/pdf,image/*"
          maxSize={10 * 1024 * 1024} // 10MB
          required
          onUploadComplete={(s3Key, file) => handleFileUpload('portfolio_key', s3Key, file)}
          onUploadError={handleFileError}
        />

        <FileUpload
          uploadType="demo_video"
          label="Demo Teaching Video"
          description="Upload a 2-5 minute video demonstrating your teaching skills. This can be a sample lesson or introduction."
          accept="video/*"
          maxSize={100 * 1024 * 1024} // 100MB
          required
          onUploadComplete={(s3Key, file) => handleFileUpload('demo_video_key', s3Key, file)}
          onUploadError={handleFileError}
        />

        <div style={{ 
          backgroundColor: '#e3f2fd', 
          padding: '16px', 
          borderRadius: '4px', 
          marginBottom: '20px',
          border: '1px solid #bbdefb'
        }}>
          <h4 style={{ margin: '0 0 8px 0', color: '#1976d2' }}>📋 Verification Process</h4>
          <ul style={{ margin: 0, paddingLeft: '20px' }}>
            <li>Our team will review your documents within 2-3 business days</li>
            <li>You'll receive an email notification once the review is complete</li>
            <li>If approved, you can immediately start creating and selling courses</li>
            <li>If additional information is needed, we'll contact you directly</li>
          </ul>
        </div>

        <div style={{ 
          backgroundColor: '#fff3cd', 
          padding: '16px', 
          borderRadius: '4px', 
          marginBottom: '20px',
          border: '1px solid #ffeaa7'
        }}>
          <h4 style={{ margin: '0 0 8px 0', color: '#856404' }}>⚠️ Important Notes</h4>
          <ul style={{ margin: 0, paddingLeft: '20px' }}>
            <li>All documents must be clear and legible</li>
            <li>Government ID must be current and not expired</li>
            <li>Demo video should showcase your teaching abilities</li>
            <li>Files are securely stored and only accessible to our verification team</li>
          </ul>
        </div>

        <button 
          type="submit" 
          className="btn btn-primary" 
          disabled={loading || !isFormValid()}
          style={{ width: '100%', padding: '12px' }}
        >
          {loading ? 'Submitting Verification...' : 'Submit for Verification'}
        </button>
      </form>

      <div style={{ textAlign: 'center', marginTop: '20px' }}>
        <p style={{ fontSize: '14px', color: '#666' }}>
          Need help? Contact our support team at{' '}
          <a href="mailto:support@skillora.com">support@skillora.com</a>
        </p>
      </div>
    </div>
  );
};

export default TeacherVerificationForm;