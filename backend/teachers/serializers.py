from rest_framework import serializers
from django.core.exceptions import ValidationError
from .models import TeacherProfile, TeacherVerification
from .services import s3_service


class TeacherProfileSerializer(serializers.ModelSerializer):
    """Serializer for TeacherProfile model"""
    
    class Meta:
        model = TeacherProfile
        fields = [
            'id', 'bio', 'skills', 'profile_photo', 'years_of_experience',
            'education', 'certifications', 'hourly_rate', 'is_approved',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'is_approved', 'created_at', 'updated_at']


class TeacherVerificationSerializer(serializers.ModelSerializer):
    """Serializer for TeacherVerification model"""
    
    teacher_name = serializers.CharField(source='teacher.user.name', read_only=True)
    teacher_email = serializers.CharField(source='teacher.user.email', read_only=True)
    reviewed_by_name = serializers.CharField(source='reviewed_by.name', read_only=True)
    
    class Meta:
        model = TeacherVerification
        fields = [
            'id', 'submission_id', 'status', 'government_id', 'portfolio',
            'demo_video', 'review_notes', 'reviewed_by_name', 'reviewed_at',
            'submitted_at', 'updated_at', 'teacher_name', 'teacher_email'
        ]
        read_only_fields = [
            'id', 'submission_id', 'reviewed_by_name', 'reviewed_at',
            'submitted_at', 'updated_at', 'teacher_name', 'teacher_email'
        ]


class FileUploadRequestSerializer(serializers.Serializer):
    """Serializer for file upload request"""
    
    file_name = serializers.CharField(max_length=255)
    file_type = serializers.CharField(max_length=100)
    file_size = serializers.IntegerField()
    upload_type = serializers.ChoiceField(choices=[
        'government_id', 'portfolio', 'demo_video', 'profile_photo'
    ])
    
    def validate(self, attrs):
        """Validate file upload request"""
        try:
            s3_service.validate_file_type_and_size(
                attrs['file_type'],
                attrs['file_size'],
                attrs['upload_type']
            )
        except ValidationError as e:
            raise serializers.ValidationError(str(e))
        
        return attrs


class VerificationSubmissionSerializer(serializers.Serializer):
    """Serializer for verification submission"""
    
    government_id_key = serializers.CharField(max_length=500)
    portfolio_key = serializers.CharField(max_length=500)
    demo_video_key = serializers.CharField(max_length=500)
    
    def validate(self, attrs):
        """Validate that all required files are provided"""
        required_files = ['government_id_key', 'portfolio_key', 'demo_video_key']
        
        for field in required_files:
            if not attrs.get(field):
                raise serializers.ValidationError(f"{field} is required")
        
        return attrs


class VerificationReviewSerializer(serializers.ModelSerializer):
    """Serializer for admin verification review"""
    
    class Meta:
        model = TeacherVerification
        fields = ['status', 'review_notes']
    
    def validate_status(self, value):
        """Validate status change"""
        if value not in ['approved', 'rejected', 'suspended']:
            raise serializers.ValidationError("Invalid status for review")
        return value