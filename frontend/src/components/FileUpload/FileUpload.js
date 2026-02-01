import React, { useState, useRef } from 'react';
import uploadService from '../../services/uploadService';
import './FileUpload.css';

const FileUpload = ({ 
  uploadType, 
  onUploadComplete, 
  onUploadError, 
  accept, 
  maxSize,
  label,
  description,
  required = false 
}) => {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const handleFileSelect = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setError('');
    
    // Validate file
    const validation = uploadService.validateFile(file, uploadType);
    if (!validation.valid) {
      setError(validation.error);
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      // Upload file
      const result = await uploadService.uploadFile(
        file, 
        uploadType,
        (progress) => setUploadProgress(progress)
      );

      if (result.success) {
        setUploadedFile({
          name: file.name,
          size: file.size,
          type: file.type,
          s3_key: result.s3_key
        });
        onUploadComplete(result.s3_key, file);
      } else {
        setError(result.error);
        onUploadError(result.error);
      }
    } catch (error) {
      setError(error.message);
      onUploadError(error.message);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleRemoveFile = () => {
    setUploadedFile(null);
    setError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onUploadComplete(null, null);
  };

  const handleClick = () => {
    if (!uploading && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className="file-upload">
      <label className="file-upload-label">
        {label} {required && <span className="required">*</span>}
      </label>
      
      {description && (
        <p className="file-upload-description">{description}</p>
      )}

      <div 
        className={`file-upload-area ${uploading ? 'uploading' : ''} ${uploadedFile ? 'uploaded' : ''}`}
        onClick={handleClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          onChange={handleFileSelect}
          style={{ display: 'none' }}
          disabled={uploading}
        />

        {!uploadedFile && !uploading && (
          <div className="file-upload-prompt">
            <div className="file-upload-icon">📁</div>
            <p>Click to select file or drag and drop</p>
            <small>Max size: {uploadService.formatFileSize(maxSize)}</small>
          </div>
        )}

        {uploading && (
          <div className="file-upload-progress">
            <div className="file-upload-icon">⏳</div>
            <p>Uploading...</p>
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
          </div>
        )}

        {uploadedFile && (
          <div className="file-upload-success">
            <div className="file-upload-icon">✅</div>
            <div className="file-info">
              <p className="file-name">{uploadedFile.name}</p>
              <small className="file-size">
                {uploadService.formatFileSize(uploadedFile.size)}
              </small>
            </div>
            <button 
              type="button"
              className="remove-file-btn"
              onClick={(e) => {
                e.stopPropagation();
                handleRemoveFile();
              }}
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="file-upload-error">
          {error}
        </div>
      )}
    </div>
  );
};

export default FileUpload;