import React, { useState } from 'react';
import uploadService from '../../services/uploadService';

const VideoUpload = ({ onVideoUploaded, onClose }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setError('');
    
    // Validate file
    const validation = uploadService.validateFile(file, 'demo_video');
    if (!validation.valid) {
      setError(validation.error);
      return;
    }

    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setUploadProgress(0);
    setError('');

    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + Math.random() * 10;
        });
      }, 500);

      const result = await uploadService.uploadFile(
        selectedFile,
        'demo_video',
        (progress) => setUploadProgress(progress)
      );

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (result.success) {
        // Get video duration (simplified - in real app, you'd extract this from the video file)
        const videoDuration = Math.floor(Math.random() * 600) + 60; // Random duration between 1-10 minutes
        
        // Construct video URL from S3 key
        const videoUrl = `https://skillora-uploads.s3.amazonaws.com/${result.s3_key}`;
        
        setTimeout(() => {
          onVideoUploaded(videoUrl, videoDuration);
        }, 1000);
      } else {
        setError(result.error);
      }
    } catch (error) {
      setError('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDuration = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1001
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '24px',
        borderRadius: '8px',
        maxWidth: '500px',
        width: '90%'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3>Upload Video</h3>
          <button
            onClick={onClose}
            disabled={uploading}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '20px',
              cursor: uploading ? 'not-allowed' : 'pointer',
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

        {!selectedFile && !uploading && (
          <div>
            <div style={{
              border: '2px dashed #ddd',
              borderRadius: '8px',
              padding: '40px 20px',
              textAlign: 'center',
              backgroundColor: '#fafafa',
              marginBottom: '20px'
            }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎥</div>
              <p style={{ margin: '0 0 16px 0', fontSize: '16px' }}>
                Select a video file to upload
              </p>
              <input
                type="file"
                accept="video/*"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
                id="video-file-input"
              />
              <label
                htmlFor="video-file-input"
                style={{
                  display: 'inline-block',
                  padding: '10px 20px',
                  backgroundColor: '#007bff',
                  color: 'white',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  border: 'none'
                }}
              >
                Choose Video File
              </label>
            </div>

            <div style={{
              backgroundColor: '#f8f9fa',
              padding: '16px',
              borderRadius: '4px',
              fontSize: '14px'
            }}>
              <h4 style={{ margin: '0 0 8px 0' }}>📋 Video Requirements</h4>
              <ul style={{ margin: '0', paddingLeft: '20px' }}>
                <li>Supported formats: MP4, AVI, MOV, WMV</li>
                <li>Maximum file size: 100MB</li>
                <li>Recommended resolution: 1280x720 or higher</li>
                <li>Clear audio quality recommended</li>
              </ul>
            </div>
          </div>
        )}

        {selectedFile && !uploading && (
          <div>
            <div style={{
              backgroundColor: '#f8f9fa',
              padding: '16px',
              borderRadius: '4px',
              marginBottom: '20px'
            }}>
              <h4 style={{ margin: '0 0 8px 0' }}>Selected Video</h4>
              <p style={{ margin: '0', fontWeight: 'bold' }}>{selectedFile.name}</p>
              <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#666' }}>
                Size: {formatFileSize(selectedFile.size)}
              </p>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setSelectedFile(null)}
                style={{
                  padding: '8px 16px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  backgroundColor: 'white',
                  cursor: 'pointer'
                }}
              >
                Choose Different File
              </button>
              <button
                onClick={handleUpload}
                style={{
                  padding: '8px 16px',
                  border: 'none',
                  borderRadius: '4px',
                  backgroundColor: '#28a745',
                  color: 'white',
                  cursor: 'pointer'
                }}
              >
                Upload Video
              </button>
            </div>
          </div>
        )}

        {uploading && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
            <h4 style={{ margin: '0 0 16px 0' }}>Uploading Video...</h4>
            <div style={{
              width: '100%',
              height: '8px',
              backgroundColor: '#e9ecef',
              borderRadius: '4px',
              overflow: 'hidden',
              marginBottom: '16px'
            }}>
              <div style={{
                width: `${uploadProgress}%`,
                height: '100%',
                backgroundColor: '#28a745',
                transition: 'width 0.3s ease'
              }} />
            </div>
            <p style={{ margin: '0', fontSize: '14px', color: '#666' }}>
              {Math.round(uploadProgress)}% complete
            </p>
            
            {uploadProgress === 100 && (
              <div style={{ marginTop: '16px' }}>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>✅</div>
                <p style={{ margin: '0', color: '#28a745', fontWeight: 'bold' }}>
                  Upload Complete!
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoUpload;