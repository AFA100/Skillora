import boto3
import uuid
from django.conf import settings
from botocore.exceptions import ClientError
from django.core.exceptions import ValidationError


class S3UploadService:
    """Service for handling S3 file uploads with presigned URLs"""
    
    def __init__(self):
        self.s3_client = boto3.client(
            's3',
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            region_name=settings.AWS_S3_REGION_NAME
        )
        self.bucket_name = settings.AWS_STORAGE_BUCKET_NAME
    
    def validate_file_type_and_size(self, file_type, file_size, upload_type):
        """Validate file type and size based on upload type"""
        
        if upload_type == 'government_id':
            allowed_types = settings.ALLOWED_DOCUMENT_TYPES
            max_size = settings.MAX_DOCUMENT_SIZE
        elif upload_type == 'portfolio':
            allowed_types = settings.ALLOWED_DOCUMENT_TYPES
            max_size = settings.MAX_DOCUMENT_SIZE
        elif upload_type == 'demo_video':
            allowed_types = settings.ALLOWED_VIDEO_TYPES
            max_size = settings.MAX_VIDEO_SIZE
        elif upload_type == 'profile_photo':
            allowed_types = settings.ALLOWED_IMAGE_TYPES
            max_size = settings.MAX_IMAGE_SIZE
        else:
            raise ValidationError("Invalid upload type")
        
        if file_type not in allowed_types:
            raise ValidationError(f"File type {file_type} not allowed for {upload_type}")
        
        if file_size > max_size:
            max_size_mb = max_size / (1024 * 1024)
            raise ValidationError(f"File size exceeds {max_size_mb}MB limit for {upload_type}")
    
    def generate_presigned_url(self, file_name, file_type, upload_type, user_id):
        """Generate presigned URL for file upload"""
        
        # Generate unique file key
        file_extension = file_name.split('.')[-1] if '.' in file_name else ''
        unique_filename = f"{uuid.uuid4()}.{file_extension}" if file_extension else str(uuid.uuid4())
        
        # Create S3 key based on upload type
        s3_key = f"verification/{upload_type}/{user_id}/{unique_filename}"
        
        try:
            # Generate presigned URL for PUT operation
            presigned_url = self.s3_client.generate_presigned_url(
                'put_object',
                Params={
                    'Bucket': self.bucket_name,
                    'Key': s3_key,
                    'ContentType': file_type,
                    'ACL': 'private'
                },
                ExpiresIn=3600  # 1 hour
            )
            
            return {
                'upload_url': presigned_url,
                's3_key': s3_key,
                'file_url': f"https://{self.bucket_name}.s3.amazonaws.com/{s3_key}"
            }
            
        except ClientError as e:
            raise ValidationError(f"Error generating upload URL: {str(e)}")
    
    def generate_presigned_download_url(self, s3_key, expires_in=3600):
        """Generate presigned URL for file download"""
        try:
            presigned_url = self.s3_client.generate_presigned_url(
                'get_object',
                Params={
                    'Bucket': self.bucket_name,
                    'Key': s3_key
                },
                ExpiresIn=expires_in
            )
            return presigned_url
        except ClientError as e:
            raise ValidationError(f"Error generating download URL: {str(e)}")
    
    def delete_file(self, s3_key):
        """Delete file from S3"""
        try:
            self.s3_client.delete_object(
                Bucket=self.bucket_name,
                Key=s3_key
            )
            return True
        except ClientError as e:
            raise ValidationError(f"Error deleting file: {str(e)}")


# Global instance
s3_service = S3UploadService()