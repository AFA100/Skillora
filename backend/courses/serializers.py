from rest_framework import serializers
from django.utils import timezone
from .models import Course, CourseSection, Lesson


class LessonSerializer(serializers.ModelSerializer):
    """Serializer for Lesson model"""
    
    class Meta:
        model = Lesson
        fields = [
            'id', 'title', 'description', 'lesson_type', 'order',
            'video_url', 'video_duration', 'text_content', 'duration_minutes',
            'is_preview', 'is_required', 'attachments', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def validate_order(self, value):
        """Validate lesson order within section"""
        section = self.context.get('section')
        if section:
            # Check if order already exists (excluding current instance)
            existing = Lesson.objects.filter(section=section, order=value)
            if self.instance:
                existing = existing.exclude(id=self.instance.id)
            
            if existing.exists():
                raise serializers.ValidationError(
                    f"A lesson with order {value} already exists in this section"
                )
        return value
    
    def validate(self, attrs):
        """Validate lesson content based on type"""
        lesson_type = attrs.get('lesson_type', 'video')
        
        if lesson_type == 'video' and not attrs.get('video_url'):
            raise serializers.ValidationError({
                'video_url': 'Video URL is required for video lessons'
            })
        
        if lesson_type == 'text' and not attrs.get('text_content'):
            raise serializers.ValidationError({
                'text_content': 'Text content is required for text lessons'
            })
        
        return attrs


class CourseSectionSerializer(serializers.ModelSerializer):
    """Serializer for CourseSection model"""
    
    lessons = LessonSerializer(many=True, read_only=True)
    lesson_count = serializers.ReadOnlyField()
    duration_minutes = serializers.ReadOnlyField()
    
    class Meta:
        model = CourseSection
        fields = [
            'id', 'title', 'description', 'order', 'lessons',
            'lesson_count', 'duration_minutes', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def validate_order(self, value):
        """Validate section order within course"""
        course = self.context.get('course')
        if course:
            # Check if order already exists (excluding current instance)
            existing = CourseSection.objects.filter(course=course, order=value)
            if self.instance:
                existing = existing.exclude(id=self.instance.id)
            
            if existing.exists():
                raise serializers.ValidationError(
                    f"A section with order {value} already exists in this course"
                )
        return value


class CourseSerializer(serializers.ModelSerializer):
    """Serializer for Course model"""
    
    sections = CourseSectionSerializer(many=True, read_only=True)
    instructor_name = serializers.CharField(source='instructor.name', read_only=True)
    total_lessons = serializers.ReadOnlyField()
    total_sections = serializers.ReadOnlyField()
    can_be_edited = serializers.ReadOnlyField()
    is_published = serializers.ReadOnlyField()
    
    class Meta:
        model = Course
        fields = [
            'id', 'title', 'description', 'short_description', 'thumbnail',
            'price', 'difficulty', 'category', 'tags', 'learning_outcomes',
            'prerequisites', 'status', 'duration_hours', 'language',
            'instructor_name', 'sections', 'total_lessons', 'total_sections',
            'can_be_edited', 'is_published', 'submitted_at', 'review_notes',
            'reviewed_at', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'instructor_name', 'sections', 'total_lessons', 'total_sections',
            'can_be_edited', 'is_published', 'submitted_at', 'review_notes',
            'reviewed_at', 'created_at', 'updated_at'
        ]
    
    def validate_price(self, value):
        """Validate course price"""
        if value < 0:
            raise serializers.ValidationError("Price cannot be negative")
        if value > 999999.99:
            raise serializers.ValidationError("Price cannot exceed $999,999.99")
        return value
    
    def validate_learning_outcomes(self, value):
        """Validate learning outcomes"""
        if not value.strip():
            raise serializers.ValidationError("Learning outcomes are required")
        
        outcomes = [outcome.strip() for outcome in value.split('\n') if outcome.strip()]
        if len(outcomes) < 1:
            raise serializers.ValidationError("At least one learning outcome is required")
        if len(outcomes) > 10:
            raise serializers.ValidationError("Maximum 10 learning outcomes allowed")
        
        return value
    
    def validate_tags(self, value):
        """Validate course tags"""
        if value:
            tags = [tag.strip() for tag in value.split(',') if tag.strip()]
            if len(tags) > 10:
                raise serializers.ValidationError("Maximum 10 tags allowed")
            
            # Clean and rejoin tags
            return ', '.join(tags)
        return value
    
    def validate(self, attrs):
        """Validate course data"""
        # Check if instructor is verified teacher
        request = self.context.get('request')
        if request and request.user:
            if request.user.role != 'teacher':
                raise serializers.ValidationError("Only teachers can create courses")
            if not request.user.is_verified:
                raise serializers.ValidationError("Teacher must be verified to create courses")
        
        return attrs


class CourseCreateSerializer(CourseSerializer):
    """Serializer for course creation"""
    
    class Meta(CourseSerializer.Meta):
        fields = [
            'id', 'title', 'description', 'short_description', 'thumbnail',
            'price', 'difficulty', 'category', 'tags', 'learning_outcomes',
            'prerequisites', 'duration_hours', 'language', 'status',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'status', 'created_at', 'updated_at']


class CourseSubmissionSerializer(serializers.Serializer):
    """Serializer for course submission"""
    
    def validate(self, attrs):
        """Validate course is ready for submission"""
        course = self.context.get('course')
        if not course:
            raise serializers.ValidationError("Course not found")
        
        # Check if course can be submitted
        if course.status not in ['draft', 'rejected']:
            raise serializers.ValidationError(
                f"Course with status '{course.get_status_display()}' cannot be submitted"
            )
        
        # Validate course has required content
        if not course.sections.exists():
            raise serializers.ValidationError("Course must have at least one section")
        
        # Check if all sections have lessons
        sections_without_lessons = course.sections.filter(lessons__isnull=True).distinct()
        if sections_without_lessons.exists():
            raise serializers.ValidationError("All sections must have at least one lesson")
        
        # Check if course has minimum content
        total_lessons = course.total_lessons
        if total_lessons < 3:
            raise serializers.ValidationError("Course must have at least 3 lessons")
        
        return attrs


class LessonCreateSerializer(serializers.ModelSerializer):
    """Serializer for lesson creation"""
    
    class Meta:
        model = Lesson
        fields = [
            'id', 'title', 'description', 'lesson_type', 'order',
            'video_url', 'video_duration', 'text_content', 'duration_minutes',
            'is_preview', 'is_required', 'attachments', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def validate_order(self, value):
        """Auto-assign order if not provided"""
        if value is None or value == 0:
            section = self.context.get('section')
            if section:
                last_lesson = section.lessons.order_by('-order').first()
                return (last_lesson.order + 1) if last_lesson else 1
        return value


class SectionCreateSerializer(serializers.ModelSerializer):
    """Serializer for section creation"""
    
    class Meta:
        model = CourseSection
        fields = ['id', 'title', 'description', 'order', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def validate_order(self, value):
        """Auto-assign order if not provided"""
        if value is None or value == 0:
            course = self.context.get('course')
            if course:
                last_section = course.sections.order_by('-order').first()
                return (last_section.order + 1) if last_section else 1
        return value