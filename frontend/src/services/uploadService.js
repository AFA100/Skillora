import api from './api';

class UploadService {
  /**
   * Get presigned URL for file upload
   */
  async getUploadUrl(fileName, fileType, fileSize, uploadType) {
    try {
      const response = await api.post('/teachers/verification/upload-url/', {
        file_name: fileName,
        file_type: fileType,
        file_size: fileSize,
        upload_type: uploadType
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to get upload URL');
    }
  }

  /**
   * Upload file to S3 using presigned URL
   */
  async uploadFileToS3(uploadUrl, file, onProgress = null) {
    try {
      const response = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      return true;
    } catch (error) {
      throw new Error(`Upload failed: ${error.message}`);
    }
  }

  /**
   * Complete file upload process
   */
  async uploadFile(file, uploadType, onProgress = null) {
    try {
      // Step 1: Get presigned URL
      const uploadData = await this.getUploadUrl(
        file.name,
        file.type,
        file.size,
        uploadType
      );

      // Step 2: Upload to S3
      await this.uploadFileToS3(uploadData.upload_url, file, onProgress);

      // Return S3 key for verification submission
      return {
        s3_key: uploadData.s3_key,
        success: true
      };
    } catch (error) {
      return {
        error: error.message,
        success: false
      };
    }
  }

  /**
   * Validate file before upload
   */
  validateFile(file, uploadType) {
    const validations = {
      government_id: {
        types: ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'],
        maxSize: 10 * 1024 * 1024, // 10MB
        name: 'Government ID'
      },
      portfolio: {
        types: ['application/pdf', 'image/jpeg', 'image/png'],
        maxSize: 10 * 1024 * 1024, // 10MB
        name: 'Portfolio'
      },
      demo_video: {
        types: ['video/mp4', 'video/avi', 'video/mov', 'video/wmv'],
        maxSize: 100 * 1024 * 1024, // 100MB
        name: 'Demo Video'
      },
      profile_photo: {
        types: ['image/jpeg', 'image/png', 'image/jpg'],
        maxSize: 5 * 1024 * 1024, // 5MB
        name: 'Profile Photo'
      }
    };

    const validation = validations[uploadType];
    if (!validation) {
      return { valid: false, error: 'Invalid upload type' };
    }

    if (!validation.types.includes(file.type)) {
      return {
        valid: false,
        error: `${validation.name} must be one of: ${validation.types.join(', ')}`
      };
    }

    if (file.size > validation.maxSize) {
      const maxSizeMB = validation.maxSize / (1024 * 1024);
      return {
        valid: false,
        error: `${validation.name} must be smaller than ${maxSizeMB}MB`
      };
    }

    return { valid: true };
  }

  /**
   * Format file size for display
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

export default new UploadService();