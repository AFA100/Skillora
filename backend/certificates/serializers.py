from rest_framework import serializers
from .models import Certificate


class CertificateSerializer(serializers.ModelSerializer):
    """Serializer for Certificate model"""
    
    student_name = serializers.CharField(source='student.name', read_only=True)
    course_title = serializers.CharField(source='course.title', read_only=True)
    course_instructor = serializers.CharField(source='course.instructor.name', read_only=True)
    verification_url = serializers.CharField(read_only=True)
    pdf_url = serializers.SerializerMethodField()
    
    class Meta:
        model = Certificate
        fields = [
            'certificate_id',
            'certificate_number',
            'verification_code',
            'student_name',
            'course_title',
            'course_instructor',
            'issued_at',
            'completion_date',
            'final_score',
            'completion_percentage',
            'verification_url',
            'pdf_url',
            'is_valid',
            'is_verified'
        ]
        read_only_fields = [
            'certificate_id',
            'certificate_number',
            'verification_code',
            'issued_at'
        ]
    
    def get_pdf_url(self, obj):
        """Get PDF file URL"""
        if obj.pdf_file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.pdf_file.url)
            return obj.pdf_file.url
        return None


class CertificateVerificationSerializer(serializers.Serializer):
    """Serializer for certificate verification"""
    
    verification_code = serializers.CharField(max_length=20)
    
    def validate_verification_code(self, value):
        """Validate verification code format"""
        if not value.isalnum():
            raise serializers.ValidationError("Invalid verification code format")
        return value.upper()


class CertificateListSerializer(serializers.ModelSerializer):
    """Simplified serializer for certificate lists"""
    
    course_title = serializers.CharField(source='course.title', read_only=True)
    course_thumbnail = serializers.SerializerMethodField()
    
    class Meta:
        model = Certificate
        fields = [
            'certificate_id',
            'certificate_number',
            'course_title',
            'course_thumbnail',
            'issued_at',
            'completion_date',
            'final_score',
            'is_valid'
        ]
    
    def get_course_thumbnail(self, obj):
        """Get course thumbnail URL"""
        if obj.course.thumbnail:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.course.thumbnail.url)
            return obj.course.thumbnail.url
        return None