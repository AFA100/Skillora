from rest_framework import serializers
from django.utils import timezone
from .models import Enrollment, LessonProgress, CourseReview
from courses.serializers import CourseSerializer, LessonSerializer
from accounts.models import User


class LessonProgressSerializer(serializers.ModelSerializer):
    """Serializer for lesson progress tracking"""
    
    lesson_title = serializers.CharField(source='lesson.title', read_only=True)
    lesson_type = serializers.CharField(source='lesson.lesson_type', read_only=True)
    lesson_duration = serializers.IntegerField(source='lesson.duration_minutes', read_only=True)
    
    class Meta:
        model = LessonProgress
        fields = [
            'id', 'lesson', 'lesson_title', 'lesson_type', 'lesson_duration',
            'completed_at', 'watch_time_seconds'
        ]
        read_only_fields = ['id', 'completed_at']


class CourseReviewSerializer(serializers.ModelSerializer):
    """Serializer for course reviews"""
    
    reviewer_name = serializers.ReadOnlyField()
    course_title = serializers.CharField(source='course.title', read_only=True)
    
    class Meta:
        model = CourseReview
        fields = [
            'id', 'rating', 'review_text', 'is_public', 'reviewer_name',
            'course_title', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'reviewer_name', 'course_title', 'created_at', 'updated_at']
    
    def validate_rating(self, value):
        """Validate rating is between 1 and 5"""
        if value < 1 or value > 5:
            raise serializers.ValidationError("Rating must be between 1 and 5")
        return value


class EnrollmentSerializer(serializers.ModelSerializer):
    """Serializer for enrollment details"""
    
    course = CourseSerializer(read_only=True)
    student_name = serializers.CharField(source='student.name', read_only=True)
    student_email = serializers.CharField(source='student.email', read_only=True)
    current_lesson_title = serializers.CharField(source='current_lesson.title', read_only=True)
    completed_lessons_count = serializers.SerializerMethodField()
    total_lessons = serializers.IntegerField(source='course.total_lessons', read_only=True)
    review = CourseReviewSerializer(read_only=True)
    days_since_enrollment = serializers.ReadOnlyField()
    is_completed = serializers.ReadOnlyField()
    
    class Meta:
        model = Enrollment
        fields = [
            'id', 'course', 'student_name', 'student_email', 'status',
            'progress_percentage', 'current_lesson', 'current_lesson_title',
            'completed_lessons_count', 'total_lessons', 'enrolled_at',
            'completed_at', 'last_accessed_at', 'days_since_enrollment',
            'is_completed', 'review'
        ]
        read_only_fields = [
            'id', 'course', 'student_name', 'student_email', 'enrolled_at',
            'completed_at', 'days_since_enrollment', 'is_completed'
        ]
    
    def get_completed_lessons_count(self, obj):
        """Get count of completed lessons"""
        return obj.completed_lessons.count()


class EnrollmentCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating enrollments"""
    
    class Meta:
        model = Enrollment
        fields = ['course']
    
    def validate_course(self, value):
        """Validate course enrollment"""
        request = self.context.get('request')
        if not request or not request.user:
            raise serializers.ValidationError("Authentication required")
        
        user = request.user
        
        # Check if user is a learner
        if user.role != 'learner':
            raise serializers.ValidationError("Only learners can enroll in courses")
        
        # Check if course is published
        if value.status != 'published':
            raise serializers.ValidationError("Course is not available for enrollment")
        
        # Check if already enrolled
        if Enrollment.objects.filter(student=user, course=value).exists():
            raise serializers.ValidationError("Already enrolled in this course")
        
        return value
    
    def create(self, validated_data):
        """Create enrollment with student from request"""
        request = self.context.get('request')
        validated_data['student'] = request.user
        return super().create(validated_data)


class LearnerDashboardSerializer(serializers.ModelSerializer):
    """Simplified serializer for learner dashboard"""
    
    course_title = serializers.CharField(source='course.title', read_only=True)
    course_thumbnail = serializers.ImageField(source='course.thumbnail', read_only=True)
    instructor_name = serializers.CharField(source='course.instructor.name', read_only=True)
    course_difficulty = serializers.CharField(source='course.difficulty', read_only=True)
    course_category = serializers.CharField(source='course.category', read_only=True)
    total_lessons = serializers.IntegerField(source='course.total_lessons', read_only=True)
    completed_lessons_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Enrollment
        fields = [
            'id', 'course_title', 'course_thumbnail', 'instructor_name',
            'course_difficulty', 'course_category', 'status', 'progress_percentage',
            'total_lessons', 'completed_lessons_count', 'enrolled_at',
            'last_accessed_at', 'is_completed'
        ]
    
    def get_completed_lessons_count(self, obj):
        """Get count of completed lessons"""
        return obj.completed_lessons.count()


class ProgressUpdateSerializer(serializers.Serializer):
    """Serializer for updating lesson progress"""
    
    lesson_id = serializers.IntegerField()
    watch_time_seconds = serializers.IntegerField(min_value=0, required=False, default=0)
    completed = serializers.BooleanField(default=True)
    
    def validate_lesson_id(self, value):
        """Validate lesson exists and belongs to enrolled course"""
        from courses.models import Lesson
        
        try:
            lesson = Lesson.objects.get(id=value)
        except Lesson.DoesNotExist:
            raise serializers.ValidationError("Lesson not found")
        
        # Check if user is enrolled in the course
        request = self.context.get('request')
        enrollment = self.context.get('enrollment')
        
        if not enrollment or lesson.course != enrollment.course:
            raise serializers.ValidationError("Lesson does not belong to enrolled course")
        
        return value
from .player_models import StudentNote, LessonBookmark, VideoProgress, LessonInteraction, StudySession


class StudentNoteSerializer(serializers.ModelSerializer):
    """Serializer for student notes"""
    
    lesson_title = serializers.CharField(source='lesson.title', read_only=True)
    
    class Meta:
        model = StudentNote
        fields = [
            'id', 'lesson', 'lesson_title', 'content', 'timestamp_seconds',
            'is_private', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'lesson_title', 'created_at', 'updated_at']
    
    def create(self, validated_data):
        """Create note with enrollment from context"""
        enrollment = self.context.get('enrollment')
        validated_data['enrollment'] = enrollment
        return super().create(validated_data)


class LessonBookmarkSerializer(serializers.ModelSerializer):
    """Serializer for lesson bookmarks"""
    
    lesson_title = serializers.CharField(source='lesson.title', read_only=True)
    
    class Meta:
        model = LessonBookmark
        fields = [
            'id', 'lesson', 'lesson_title', 'title', 'description',
            'timestamp_seconds', 'created_at'
        ]
        read_only_fields = ['id', 'lesson_title', 'created_at']
    
    def create(self, validated_data):
        """Create bookmark with enrollment from context"""
        enrollment = self.context.get('enrollment')
        validated_data['enrollment'] = enrollment
        return super().create(validated_data)


class VideoProgressSerializer(serializers.ModelSerializer):
    """Serializer for video progress"""
    
    lesson_title = serializers.CharField(source='lesson.title', read_only=True)
    lesson_duration = serializers.IntegerField(source='lesson.video_duration', read_only=True)
    
    class Meta:
        model = VideoProgress
        fields = [
            'id', 'lesson', 'lesson_title', 'lesson_duration',
            'current_time_seconds', 'total_watched_seconds', 'watch_percentage',
            'last_watched_at'
        ]
        read_only_fields = [
            'id', 'lesson_title', 'lesson_duration', 'watch_percentage',
            'last_watched_at'
        ]
    
    def create(self, validated_data):
        """Create or update video progress"""
        enrollment = self.context.get('enrollment')
        lesson = validated_data['lesson']
        
        progress, created = VideoProgress.objects.get_or_create(
            enrollment=enrollment,
            lesson=lesson,
            defaults=validated_data
        )
        
        if not created:
            # Update existing progress
            for key, value in validated_data.items():
                setattr(progress, key, value)
            progress.save()
        
        return progress


class LessonInteractionSerializer(serializers.ModelSerializer):
    """Serializer for lesson interactions"""
    
    class Meta:
        model = LessonInteraction
        fields = [
            'id', 'lesson', 'interaction_type', 'timestamp_seconds',
            'metadata', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']
    
    def create(self, validated_data):
        """Create interaction with enrollment from context"""
        enrollment = self.context.get('enrollment')
        validated_data['enrollment'] = enrollment
        return super().create(validated_data)


class StudySessionSerializer(serializers.ModelSerializer):
    """Serializer for study sessions"""
    
    lessons_accessed_count = serializers.SerializerMethodField()
    is_active = serializers.ReadOnlyField()
    
    class Meta:
        model = StudySession
        fields = [
            'id', 'started_at', 'ended_at', 'duration_seconds',
            'lessons_accessed_count', 'device_type', 'user_agent',
            'is_active'
        ]
        read_only_fields = [
            'id', 'started_at', 'ended_at', 'duration_seconds',
            'lessons_accessed_count', 'is_active'
        ]
    
    def get_lessons_accessed_count(self, obj):
        """Get count of lessons accessed in session"""
        return obj.lessons_accessed.count()
    
    def create(self, validated_data):
        """Create study session with enrollment from context"""
        enrollment = self.context.get('enrollment')
        validated_data['enrollment'] = enrollment
        return super().create(validated_data)


class CoursePlayerSerializer(serializers.Serializer):
    """Serializer for course player data"""
    
    enrollment_id = serializers.IntegerField()
    course_title = serializers.CharField()
    current_lesson = serializers.SerializerMethodField()
    sections = serializers.SerializerMethodField()
    progress_percentage = serializers.IntegerField()
    completed_lessons = serializers.SerializerMethodField()
    
    def get_current_lesson(self, obj):
        """Get current lesson data"""
        if obj.current_lesson:
            return {
                'id': obj.current_lesson.id,
                'title': obj.current_lesson.title,
                'video_url': obj.current_lesson.video_url,
                'video_duration': obj.current_lesson.video_duration,
                'lesson_type': obj.current_lesson.lesson_type,
                'description': obj.current_lesson.description,
                'attachments': obj.current_lesson.attachments,
            }
        return None
    
    def get_sections(self, obj):
        """Get course sections with lessons"""
        sections = []
        for section in obj.course.sections.all():
            lessons = []
            for lesson in section.lessons.all():
                is_completed = obj.completed_lessons.filter(id=lesson.id).exists()
                lessons.append({
                    'id': lesson.id,
                    'title': lesson.title,
                    'lesson_type': lesson.lesson_type,
                    'duration_minutes': lesson.duration_minutes,
                    'is_preview': lesson.is_preview,
                    'is_completed': is_completed,
                    'order': lesson.order,
                })
            
            sections.append({
                'id': section.id,
                'title': section.title,
                'description': section.description,
                'order': section.order,
                'lessons': lessons,
            })
        
        return sections
    
    def get_completed_lessons(self, obj):
        """Get list of completed lesson IDs"""
        return list(obj.completed_lessons.values_list('id', flat=True))