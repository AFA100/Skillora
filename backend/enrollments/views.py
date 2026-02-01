from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.db import transaction
from django.db import models
from accounts.permissions import IsLearner
from courses.models import Course, Lesson
from .models import Enrollment, LessonProgress, CourseReview
from .serializers import (
    EnrollmentSerializer, EnrollmentCreateSerializer, LearnerDashboardSerializer,
    ProgressUpdateSerializer, CourseReviewSerializer, LessonProgressSerializer
)


class EnrollmentListCreateView(generics.ListCreateAPIView):
    """List user enrollments and create new enrollments"""
    permission_classes = [IsAuthenticated, IsLearner]
    
    def get_serializer_class(self):
        if self.request.method == 'POST':
            return EnrollmentCreateSerializer
        return LearnerDashboardSerializer
    
    def get_queryset(self):
        """Return enrollments for the authenticated learner"""
        return Enrollment.objects.filter(student=self.request.user).select_related(
            'course', 'course__instructor'
        ).prefetch_related('completed_lessons')
    
    def perform_create(self, serializer):
        """Create enrollment and handle payment if required"""
        course = serializer.validated_data['course']
        
        # For free courses, create enrollment directly
        if course.price == 0:
            enrollment = serializer.save()
            return Response({
                'message': 'Successfully enrolled in free course',
                'enrollment_id': enrollment.id
            }, status=status.HTTP_201_CREATED)
        
        # For paid courses, create pending enrollment
        # Payment will be handled separately
        enrollment = serializer.save()
        return Response({
            'message': 'Enrollment created. Payment required to activate.',
            'enrollment_id': enrollment.id,
            'payment_required': True,
            'amount': str(course.price)
        }, status=status.HTTP_201_CREATED)


class EnrollmentDetailView(generics.RetrieveUpdateAPIView):
    """Get and update enrollment details"""
    serializer_class = EnrollmentSerializer
    permission_classes = [IsAuthenticated, IsLearner]
    
    def get_queryset(self):
        return Enrollment.objects.filter(student=self.request.user).select_related(
            'course', 'current_lesson'
        ).prefetch_related('completed_lessons')


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsLearner])
def update_progress(request, enrollment_id):
    """Update lesson progress for an enrollment"""
    try:
        enrollment = get_object_or_404(
            Enrollment,
            id=enrollment_id,
            student=request.user,
            status='active'
        )
        
        serializer = ProgressUpdateSerializer(
            data=request.data,
            context={'request': request, 'enrollment': enrollment}
        )
        serializer.is_valid(raise_exception=True)
        
        lesson_id = serializer.validated_data['lesson_id']
        watch_time = serializer.validated_data.get('watch_time_seconds', 0)
        completed = serializer.validated_data.get('completed', True)
        
        lesson = get_object_or_404(Lesson, id=lesson_id)
        
        with transaction.atomic():
            if completed:
                # Mark lesson as completed
                progress, created = LessonProgress.objects.get_or_create(
                    enrollment=enrollment,
                    lesson=lesson,
                    defaults={'watch_time_seconds': watch_time}
                )
                
                if not created:
                    progress.watch_time_seconds = max(progress.watch_time_seconds, watch_time)
                    progress.save()
                
                # Update current lesson to next lesson
                next_lesson = lesson.get_next_lesson()
                if next_lesson:
                    enrollment.current_lesson = next_lesson
                
            # Update last accessed time
            enrollment.last_accessed_at = timezone.now()
            enrollment.save()
            
            # Recalculate progress
            enrollment.update_progress()
        
        return Response({
            'message': 'Progress updated successfully',
            'progress_percentage': enrollment.progress_percentage,
            'is_completed': enrollment.is_completed,
            'current_lesson_id': enrollment.current_lesson.id if enrollment.current_lesson else None
        })
        
    except Exception as e:
        return Response({
            'error': str(e)
        }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsLearner])
def enrollment_progress(request, enrollment_id):
    """Get detailed progress for an enrollment"""
    try:
        enrollment = get_object_or_404(
            Enrollment,
            id=enrollment_id,
            student=request.user
        )
        
        # Get all lessons with progress
        lessons = Lesson.objects.filter(
            section__course=enrollment.course
        ).select_related('section').order_by('section__order', 'order')
        
        progress_data = []
        for lesson in lessons:
            try:
                progress = LessonProgress.objects.get(
                    enrollment=enrollment,
                    lesson=lesson
                )
                is_completed = True
                completed_at = progress.completed_at
                watch_time = progress.watch_time_seconds
            except LessonProgress.DoesNotExist:
                is_completed = False
                completed_at = None
                watch_time = 0
            
            progress_data.append({
                'lesson_id': lesson.id,
                'lesson_title': lesson.title,
                'section_title': lesson.section.title,
                'lesson_type': lesson.lesson_type,
                'duration_minutes': lesson.duration_minutes,
                'is_completed': is_completed,
                'completed_at': completed_at,
                'watch_time_seconds': watch_time,
                'is_current': enrollment.current_lesson_id == lesson.id if enrollment.current_lesson else False
            })
        
        return Response({
            'enrollment_id': enrollment.id,
            'course_title': enrollment.course.title,
            'progress_percentage': enrollment.progress_percentage,
            'status': enrollment.status,
            'lessons': progress_data
        })
        
    except Exception as e:
        return Response({
            'error': str(e)
        }, status=status.HTTP_400_BAD_REQUEST)


class CourseReviewListCreateView(generics.ListCreateAPIView):
    """List and create course reviews"""
    serializer_class = CourseReviewSerializer
    permission_classes = [IsAuthenticated, IsLearner]
    
    def get_queryset(self):
        course_id = self.kwargs.get('course_id')
        return CourseReview.objects.filter(
            enrollment__course_id=course_id,
            is_public=True
        ).select_related('enrollment__student', 'enrollment__course')
    
    def perform_create(self, serializer):
        """Create review for enrolled course"""
        course_id = self.kwargs.get('course_id')
        
        try:
            enrollment = Enrollment.objects.get(
                course_id=course_id,
                student=self.request.user,
                status__in=['active', 'completed']
            )
        except Enrollment.DoesNotExist:
            from rest_framework import serializers
            raise serializers.ValidationError("Must be enrolled in course to leave a review")
        
        # Check if review already exists
        if hasattr(enrollment, 'review'):
            from rest_framework import serializers
            raise serializers.ValidationError("Review already exists for this course")
        
        serializer.save(enrollment=enrollment)


class CourseReviewDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Get, update, or delete course review"""
    serializer_class = CourseReviewSerializer
    permission_classes = [IsAuthenticated, IsLearner]
    
    def get_queryset(self):
        return CourseReview.objects.filter(
            enrollment__student=self.request.user
        ).select_related('enrollment__course')


# Public views for course discovery
class PublicCourseListView(generics.ListAPIView):
    """Public course listing for discovery"""
    from courses.serializers import CourseSerializer
    serializer_class = CourseSerializer
    permission_classes = []  # Public access
    
    def get_queryset(self):
        queryset = Course.objects.filter(status='published').select_related('instructor')
        
        # Search functionality
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                models.Q(title__icontains=search) |
                models.Q(description__icontains=search) |
                models.Q(tags__icontains=search)
            )
        
        # Category filter
        category = self.request.query_params.get('category')
        if category:
            queryset = queryset.filter(category=category)
        
        # Difficulty filter
        difficulty = self.request.query_params.get('difficulty')
        if difficulty:
            queryset = queryset.filter(difficulty=difficulty)
        
        # Price filter
        price_filter = self.request.query_params.get('price')
        if price_filter == 'free':
            queryset = queryset.filter(price=0)
        elif price_filter == 'paid':
            queryset = queryset.filter(price__gt=0)
        
        # Sorting
        sort_by = self.request.query_params.get('sort', '-created_at')
        if sort_by in ['title', '-title', 'price', '-price', 'created_at', '-created_at']:
            queryset = queryset.order_by(sort_by)
        
        return queryset


class PublicCourseDetailView(generics.RetrieveAPIView):
    """Public course detail view"""
    from courses.serializers import CourseSerializer
    serializer_class = CourseSerializer
    permission_classes = []  # Public access
    
    def get_queryset(self):
        return Course.objects.filter(status='published').select_related(
            'instructor'
        ).prefetch_related('sections__lessons')
    
    def retrieve(self, request, *args, **kwargs):
        """Add enrollment status and reviews to response"""
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        data = serializer.data
        
        # Add enrollment status if user is authenticated
        if request.user.is_authenticated:
            enrollment = Enrollment.objects.filter(
                student=request.user,
                course=instance
            ).first()
            data['is_enrolled'] = enrollment is not None
            data['enrollment_status'] = enrollment.status if enrollment else None
        else:
            data['is_enrolled'] = False
            data['enrollment_status'] = None
        
        # Add course statistics
        enrollments = Enrollment.objects.filter(course=instance)
        reviews = CourseReview.objects.filter(
            enrollment__course=instance,
            is_public=True
        )
        
        data['stats'] = {
            'total_enrollments': enrollments.count(),
            'active_enrollments': enrollments.filter(status='active').count(),
            'completion_rate': enrollments.filter(status='completed').count(),
            'average_rating': reviews.aggregate(
                avg_rating=models.Avg('rating')
            )['avg_rating'] or 0,
            'total_reviews': reviews.count()
        }
        
        # Add recent reviews
        recent_reviews = CourseReviewSerializer(
            reviews.order_by('-created_at')[:5],
            many=True
        ).data
        data['recent_reviews'] = recent_reviews
        
        return Response(data)
from .player_models import StudentNote, LessonBookmark, VideoProgress, LessonInteraction, StudySession
from .serializers import (
    StudentNoteSerializer, LessonBookmarkSerializer, VideoProgressSerializer,
    LessonInteractionSerializer, StudySessionSerializer, CoursePlayerSerializer
)


# Course Player Views
@api_view(['GET'])
@permission_classes([IsAuthenticated, IsLearner])
def course_player(request, enrollment_id):
    """Get course player data"""
    try:
        enrollment = get_object_or_404(
            Enrollment,
            id=enrollment_id,
            student=request.user,
            status='active'
        )
        
        serializer = CoursePlayerSerializer(enrollment)
        return Response(serializer.data)
        
    except Exception as e:
        return Response({
            'error': str(e)
        }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsLearner])
def start_lesson(request, enrollment_id, lesson_id):
    """Start a lesson and update current lesson"""
    try:
        enrollment = get_object_or_404(
            Enrollment,
            id=enrollment_id,
            student=request.user,
            status='active'
        )
        
        lesson = get_object_or_404(Lesson, id=lesson_id)
        
        # Verify lesson belongs to enrolled course
        if lesson.section.course != enrollment.course:
            return Response({
                'error': 'Lesson does not belong to enrolled course'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Update current lesson
        enrollment.current_lesson = lesson
        enrollment.last_accessed_at = timezone.now()
        enrollment.save()
        
        # Create interaction record
        LessonInteraction.objects.create(
            enrollment=enrollment,
            lesson=lesson,
            interaction_type='play',
            metadata=request.data.get('metadata', {})
        )
        
        # Get or create video progress
        video_progress, created = VideoProgress.objects.get_or_create(
            enrollment=enrollment,
            lesson=lesson
        )
        
        return Response({
            'message': 'Lesson started successfully',
            'current_time': video_progress.current_time_seconds,
            'watch_percentage': video_progress.watch_percentage
        })
        
    except Exception as e:
        return Response({
            'error': str(e)
        }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsLearner])
def update_video_progress(request, enrollment_id, lesson_id):
    """Update video watching progress"""
    try:
        enrollment = get_object_or_404(
            Enrollment,
            id=enrollment_id,
            student=request.user,
            status='active'
        )
        
        lesson = get_object_or_404(Lesson, id=lesson_id)
        
        current_time = request.data.get('current_time', 0)
        duration = request.data.get('duration')
        
        # Get or create video progress
        video_progress, created = VideoProgress.objects.get_or_create(
            enrollment=enrollment,
            lesson=lesson
        )
        
        # Update progress
        video_progress.update_progress(current_time, duration)
        
        # Check if lesson should be marked as completed
        completion_threshold = 0.8  # 80% watched
        if video_progress.watch_percentage >= completion_threshold * 100:
            # Mark lesson as completed
            progress_data = {
                'lesson_id': lesson.id,
                'watch_time_seconds': video_progress.total_watched_seconds,
                'completed': True
            }
            
            # Use existing progress update logic
            progress_serializer = ProgressUpdateSerializer(
                data=progress_data,
                context={'request': request, 'enrollment': enrollment}
            )
            
            if progress_serializer.is_valid():
                # Update progress using existing function
                return update_progress(request, enrollment_id)
        
        return Response({
            'current_time': video_progress.current_time_seconds,
            'watch_percentage': video_progress.watch_percentage,
            'total_watched': video_progress.total_watched_seconds
        })
        
    except Exception as e:
        return Response({
            'error': str(e)
        }, status=status.HTTP_400_BAD_REQUEST)


# Student Notes Views
class StudentNoteListCreateView(generics.ListCreateAPIView):
    """List and create student notes"""
    serializer_class = StudentNoteSerializer
    permission_classes = [IsAuthenticated, IsLearner]
    
    def get_queryset(self):
        enrollment_id = self.kwargs['enrollment_id']
        enrollment = get_object_or_404(
            Enrollment,
            id=enrollment_id,
            student=self.request.user
        )
        
        queryset = StudentNote.objects.filter(enrollment=enrollment)
        
        # Filter by lesson if specified
        lesson_id = self.request.query_params.get('lesson_id')
        if lesson_id:
            queryset = queryset.filter(lesson_id=lesson_id)
        
        return queryset.select_related('lesson')
    
    def get_serializer_context(self):
        context = super().get_serializer_context()
        enrollment_id = self.kwargs['enrollment_id']
        context['enrollment'] = get_object_or_404(
            Enrollment,
            id=enrollment_id,
            student=self.request.user
        )
        return context


class StudentNoteDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Get, update, delete student notes"""
    serializer_class = StudentNoteSerializer
    permission_classes = [IsAuthenticated, IsLearner]
    
    def get_queryset(self):
        enrollment_id = self.kwargs['enrollment_id']
        enrollment = get_object_or_404(
            Enrollment,
            id=enrollment_id,
            student=self.request.user
        )
        return StudentNote.objects.filter(enrollment=enrollment)


# Bookmark Views
class LessonBookmarkListCreateView(generics.ListCreateAPIView):
    """List and create lesson bookmarks"""
    serializer_class = LessonBookmarkSerializer
    permission_classes = [IsAuthenticated, IsLearner]
    
    def get_queryset(self):
        enrollment_id = self.kwargs['enrollment_id']
        enrollment = get_object_or_404(
            Enrollment,
            id=enrollment_id,
            student=self.request.user
        )
        
        queryset = LessonBookmark.objects.filter(enrollment=enrollment)
        
        # Filter by lesson if specified
        lesson_id = self.request.query_params.get('lesson_id')
        if lesson_id:
            queryset = queryset.filter(lesson_id=lesson_id)
        
        return queryset.select_related('lesson')
    
    def get_serializer_context(self):
        context = super().get_serializer_context()
        enrollment_id = self.kwargs['enrollment_id']
        context['enrollment'] = get_object_or_404(
            Enrollment,
            id=enrollment_id,
            student=self.request.user
        )
        return context


class LessonBookmarkDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Get, update, delete lesson bookmarks"""
    serializer_class = LessonBookmarkSerializer
    permission_classes = [IsAuthenticated, IsLearner]
    
    def get_queryset(self):
        enrollment_id = self.kwargs['enrollment_id']
        enrollment = get_object_or_404(
            Enrollment,
            id=enrollment_id,
            student=self.request.user
        )
        return LessonBookmark.objects.filter(enrollment=enrollment)


# Study Session Views
@api_view(['POST'])
@permission_classes([IsAuthenticated, IsLearner])
def start_study_session(request, enrollment_id):
    """Start a new study session"""
    try:
        enrollment = get_object_or_404(
            Enrollment,
            id=enrollment_id,
            student=request.user,
            status='active'
        )
        
        # End any existing active sessions
        active_sessions = StudySession.objects.filter(
            enrollment=enrollment,
            ended_at__isnull=True
        )
        for session in active_sessions:
            session.end_session()
        
        # Create new session
        session_data = {
            'device_type': request.data.get('device_type', ''),
            'user_agent': request.META.get('HTTP_USER_AGENT', '')
        }
        
        serializer = StudySessionSerializer(
            data=session_data,
            context={'enrollment': enrollment}
        )
        serializer.is_valid(raise_exception=True)
        session = serializer.save()
        
        return Response({
            'session_id': session.id,
            'started_at': session.started_at
        })
        
    except Exception as e:
        return Response({
            'error': str(e)
        }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsLearner])
def end_study_session(request, enrollment_id, session_id):
    """End a study session"""
    try:
        enrollment = get_object_or_404(
            Enrollment,
            id=enrollment_id,
            student=request.user
        )
        
        session = get_object_or_404(
            StudySession,
            id=session_id,
            enrollment=enrollment
        )
        
        session.end_session()
        
        return Response({
            'session_id': session.id,
            'duration_seconds': session.duration_seconds,
            'ended_at': session.ended_at
        })
        
    except Exception as e:
        return Response({
            'error': str(e)
        }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsLearner])
def learning_analytics(request, enrollment_id):
    """Get learning analytics for enrollment"""
    try:
        enrollment = get_object_or_404(
            Enrollment,
            id=enrollment_id,
            student=request.user
        )
        
        # Calculate analytics
        total_study_time = StudySession.objects.filter(
            enrollment=enrollment,
            ended_at__isnull=False
        ).aggregate(
            total=models.Sum('duration_seconds')
        )['total'] or 0
        
        total_sessions = StudySession.objects.filter(
            enrollment=enrollment
        ).count()
        
        notes_count = StudentNote.objects.filter(
            enrollment=enrollment
        ).count()
        
        bookmarks_count = LessonBookmark.objects.filter(
            enrollment=enrollment
        ).count()
        
        # Recent activity
        recent_interactions = LessonInteraction.objects.filter(
            enrollment=enrollment
        ).order_by('-created_at')[:10]
        
        interaction_serializer = LessonInteractionSerializer(
            recent_interactions,
            many=True
        )
        
        return Response({
            'total_study_time_seconds': total_study_time,
            'total_study_sessions': total_sessions,
            'average_session_duration': total_study_time / total_sessions if total_sessions > 0 else 0,
            'notes_count': notes_count,
            'bookmarks_count': bookmarks_count,
            'recent_interactions': interaction_serializer.data,
            'progress_percentage': enrollment.progress_percentage,
            'days_since_enrollment': enrollment.days_since_enrollment
        })
        
    except Exception as e:
        return Response({
            'error': str(e)
        }, status=status.HTTP_400_BAD_REQUEST)