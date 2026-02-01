"""
Custom validators for Skillora platform
"""
import re
import magic
from django.core.exceptions import ValidationError
from django.core.validators import RegexValidator
from django.utils.translation import gettext_lazy as _


class StrongPasswordValidator:
    """
    Validate that the password meets strong password requirements
    """
    
    def validate(self, password, user=None):
        if len(password) < 8:
            raise ValidationError(
                _("Password must be at least 8 characters long."),
                code='password_too_short',
            )
        
        if not re.search(r'[A-Z]', password):
            raise ValidationError(
                _("Password must contain at least one uppercase letter."),
                code='password_no_upper',
            )
        
        if not re.search(r'[a-z]', password):
            raise ValidationError(
                _("Password must contain at least one lowercase letter."),
                code='password_no_lower',
            )
        
        if not re.search(r'\d', password):
            raise ValidationError(
                _("Password must contain at least one digit."),
                code='password_no_digit',
            )
        
        if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
            raise ValidationError(
                _("Password must contain at least one special character."),
                code='password_no_special',
            )
        
        # Check for common passwords
        common_passwords = [
            'password', '123456', '123456789', 'qwerty', 'abc123',
            'password123', 'admin', 'letmein', 'welcome', 'monkey'
        ]
        
        if password.lower() in common_passwords:
            raise ValidationError(
                _("Password is too common. Please choose a more secure password."),
                code='password_too_common',
            )
    
    def get_help_text(self):
        return _(
            "Your password must contain at least 8 characters, including uppercase, "
            "lowercase, digit, and special character."
        )


class FileTypeValidator:
    """
    Validate file types based on content, not just extension
    """
    
    def __init__(self, allowed_types):
        self.allowed_types = allowed_types
    
    def __call__(self, file):
        try:
            # Read file content to determine actual type
            file_content = file.read(1024)  # Read first 1KB
            file.seek(0)  # Reset file pointer
            
            # Use python-magic to detect file type
            file_type = magic.from_buffer(file_content, mime=True)
            
            if file_type not in self.allowed_types:
                raise ValidationError(
                    f'File type {file_type} is not allowed. Allowed types: {", ".join(self.allowed_types)}'
                )
        except Exception as e:
            raise ValidationError(f'Could not validate file type: {str(e)}')


class FileSizeValidator:
    """
    Validate file size
    """
    
    def __init__(self, max_size_mb):
        self.max_size_mb = max_size_mb
        self.max_size_bytes = max_size_mb * 1024 * 1024
    
    def __call__(self, file):
        if file.size > self.max_size_bytes:
            raise ValidationError(
                f'File size {file.size / (1024*1024):.1f}MB exceeds maximum allowed size of {self.max_size_mb}MB'
            )


class VideoFileValidator:
    """
    Comprehensive video file validator
    """
    
    ALLOWED_VIDEO_TYPES = [
        'video/mp4',
        'video/mpeg',
        'video/quicktime',
        'video/x-msvideo',  # AVI
        'video/webm'
    ]
    
    def __init__(self, max_size_mb=500):
        self.max_size_mb = max_size_mb
        self.file_type_validator = FileTypeValidator(self.ALLOWED_VIDEO_TYPES)
        self.file_size_validator = FileSizeValidator(max_size_mb)
    
    def __call__(self, file):
        # Validate file type
        self.file_type_validator(file)
        
        # Validate file size
        self.file_size_validator(file)
        
        # Additional video-specific validations
        self.validate_video_properties(file)
    
    def validate_video_properties(self, file):
        """Validate video properties like duration, resolution"""
        try:
            import cv2
            import tempfile
            import os
            
            # Save file temporarily for analysis
            with tempfile.NamedTemporaryFile(delete=False, suffix='.mp4') as temp_file:
                for chunk in file.chunks():
                    temp_file.write(chunk)
                temp_file_path = temp_file.name
            
            try:
                # Open video file
                cap = cv2.VideoCapture(temp_file_path)
                
                if not cap.isOpened():
                    raise ValidationError("Invalid video file format")
                
                # Get video properties
                fps = cap.get(cv2.CAP_PROP_FPS)
                frame_count = cap.get(cv2.CAP_PROP_FRAME_COUNT)
                duration = frame_count / fps if fps > 0 else 0
                width = cap.get(cv2.CAP_PROP_FRAME_WIDTH)
                height = cap.get(cv2.CAP_PROP_FRAME_HEIGHT)
                
                cap.release()
                
                # Validate duration (max 4 hours)
                if duration > 14400:  # 4 hours in seconds
                    raise ValidationError("Video duration cannot exceed 4 hours")
                
                # Validate resolution (minimum 480p)
                if width < 640 or height < 480:
                    raise ValidationError("Video resolution must be at least 640x480 (480p)")
                
            finally:
                # Clean up temporary file
                os.unlink(temp_file_path)
                
        except ImportError:
            # OpenCV not available, skip video property validation
            pass
        except Exception as e:
            raise ValidationError(f"Error validating video properties: {str(e)}")


class ImageFileValidator:
    """
    Comprehensive image file validator
    """
    
    ALLOWED_IMAGE_TYPES = [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp'
    ]
    
    def __init__(self, max_size_mb=10):
        self.max_size_mb = max_size_mb
        self.file_type_validator = FileTypeValidator(self.ALLOWED_IMAGE_TYPES)
        self.file_size_validator = FileSizeValidator(max_size_mb)
    
    def __call__(self, file):
        # Validate file type
        self.file_type_validator(file)
        
        # Validate file size
        self.file_size_validator(file)
        
        # Additional image-specific validations
        self.validate_image_properties(file)
    
    def validate_image_properties(self, file):
        """Validate image properties"""
        try:
            from PIL import Image
            
            # Open and validate image
            image = Image.open(file)
            
            # Validate dimensions (minimum 100x100, maximum 5000x5000)
            width, height = image.size
            
            if width < 100 or height < 100:
                raise ValidationError("Image must be at least 100x100 pixels")
            
            if width > 5000 or height > 5000:
                raise ValidationError("Image cannot exceed 5000x5000 pixels")
            
            # Reset file pointer
            file.seek(0)
            
        except Exception as e:
            raise ValidationError(f"Invalid image file: {str(e)}")


class DocumentFileValidator:
    """
    Validator for document files (PDFs, etc.)
    """
    
    ALLOWED_DOCUMENT_TYPES = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain'
    ]
    
    def __init__(self, max_size_mb=25):
        self.max_size_mb = max_size_mb
        self.file_type_validator = FileTypeValidator(self.ALLOWED_DOCUMENT_TYPES)
        self.file_size_validator = FileSizeValidator(max_size_mb)
    
    def __call__(self, file):
        # Validate file type
        self.file_type_validator(file)
        
        # Validate file size
        self.file_size_validator(file)


class NoScriptValidator:
    """
    Validator to prevent script injection in text fields
    """
    
    def __call__(self, value):
        if isinstance(value, str):
            # Check for script tags
            if re.search(r'<script[^>]*>.*?</script>', value, re.IGNORECASE | re.DOTALL):
                raise ValidationError("Script tags are not allowed")
            
            # Check for javascript: protocol
            if re.search(r'javascript:', value, re.IGNORECASE):
                raise ValidationError("JavaScript protocol is not allowed")
            
            # Check for event handlers
            event_handlers = [
                'onload', 'onclick', 'onmouseover', 'onmouseout', 'onkeydown',
                'onkeyup', 'onchange', 'onsubmit', 'onerror', 'onabort'
            ]
            
            for handler in event_handlers:
                if re.search(f'{handler}\\s*=', value, re.IGNORECASE):
                    raise ValidationError(f"Event handler '{handler}' is not allowed")


class BankAccountValidator:
    """
    Validator for bank account numbers
    """
    
    def __call__(self, value):
        # Remove spaces and hyphens
        clean_value = re.sub(r'[\s\-]', '', str(value))
        
        # Check if it's all digits
        if not clean_value.isdigit():
            raise ValidationError("Bank account number must contain only digits")
        
        # Check length (US bank accounts are typically 8-17 digits)
        if len(clean_value) < 8 or len(clean_value) > 17:
            raise ValidationError("Bank account number must be between 8 and 17 digits")


class RoutingNumberValidator:
    """
    Validator for US bank routing numbers
    """
    
    def __call__(self, value):
        # Remove spaces and hyphens
        clean_value = re.sub(r'[\s\-]', '', str(value))
        
        # Check if it's exactly 9 digits
        if not clean_value.isdigit() or len(clean_value) != 9:
            raise ValidationError("Routing number must be exactly 9 digits")
        
        # Validate checksum (basic ABA routing number validation)
        if not self.validate_routing_checksum(clean_value):
            raise ValidationError("Invalid routing number checksum")
    
    def validate_routing_checksum(self, routing_number):
        """Validate ABA routing number checksum"""
        try:
            # ABA checksum algorithm
            weights = [3, 7, 1, 3, 7, 1, 3, 7, 1]
            total = sum(int(digit) * weight for digit, weight in zip(routing_number, weights))
            return total % 10 == 0
        except:
            return False


# Regex validators for common patterns
phone_validator = RegexValidator(
    regex=r'^\+?1?\d{9,15}$',
    message="Phone number must be entered in the format: '+999999999'. Up to 15 digits allowed."
)

username_validator = RegexValidator(
    regex=r'^[\w.@+-]+$',
    message="Username may only contain letters, numbers, and @/./+/-/_ characters."
)

slug_validator = RegexValidator(
    regex=r'^[-a-zA-Z0-9_]+$',
    message="Slug may only contain letters, numbers, hyphens, and underscores."
)