from rest_framework import generics, status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.db import transaction
from django.db.models import Q, Avg, Count
from .models import Quiz, Question, Answer, QuizAttempt, QuestionResponse, QuizAnalytics
from .serializers import (
    QuizSerializer, QuizCreateSerializer, QuizSummarySerializer,
    QuestionSerializer, QuestionCreateSerializer,
    QuizAttemptSerializer, QuizAttemptDetailSerializer,
    QuestionResponseSerializer, QuizAnalyticsSerializer,
    StudentQuizAttemptSerializer
)
from courses.models import Course, Lesson
from enrollments.models import Enrollment
from accounts.permissions import IsTeacher, IsLearner, IsOwnerOrReadOnly


class QuizListCreateView(generics.ListCreateAPIView):
    """List and create quizzes for teachers"""
    
    permission_classes = [permissions.IsAuthenticated, IsTeacher]
    
    def get_serializer_class(self):
        if self.request.method == 'POST':
            return QuizCreateSerializer
        return QuizSummarySerializer
    
    def get_queryset(self):
        # Teachers can only see their own course quizzes
        return Quiz.objects.filter(
            course__instructor=self.request.user
        ).select_related('course', 'lesson')
    
    def perform_create(self, serializer):
        # Ensure teacher owns the course
        course = serializer.validated_data['course']
        if course.instructor != self.request.user:
            raise permissions.PermissionDenied("You can only create quizzes for your own courses")
        
        serializer.save()


class QuizDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Retrieve, update, and delete quizzes"""
    
    permission_classes = [permissions.IsAuthenticated, IsTeacher]
    
    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return QuizCreateSerializer
        return QuizSerializer
    
    def get_queryset(self):
        return Quiz.objects.filter(
            course__instructor=self.request.user
        ).prefetch_related('questions__answers')
    
    def perform_update(self, serializer):
        # Ensure teacher owns the course
        course = serializer.validated_data.get('course', serializer.instance.course)
        if course.instructor != self.request.user:
            raise permissions.PermissionDenied("You can only update your own course quizzes")
        
        serializer.save()


class QuestionListCreateView(generics.ListCreateAPIView):
    """List and create questions for a quiz"""
    
    permission_classes = [permissions.IsAuthenticated, IsTeacher]
    serializer_class = QuestionCreateSerializer
    
    def get_queryset(self):
        quiz_id = self.kwargs['quiz_id']
        quiz = get_object_or_404(
            Quiz.objects.filter(course__instructor=self.request.user),
            id=quiz_id
        )
        return quiz.questions.all().prefetch_related('answers')
    
    def perform_create(self, serializer):
        quiz_id = self.kwargs['quiz_id']
        quiz = get_object_or_404(
            Quiz.objects.filter(course__instructor=self.request.user),
            id=quiz_id
        )
        serializer.save(quiz=quiz)


class QuestionDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Retrieve, update, and delete questions"""
    
    permission_classes = [permissions.IsAuthenticated, IsTeacher]
    serializer_class = QuestionCreateSerializer
    
    def get_queryset(self):
        quiz_id = self.kwargs['quiz_id']
        return Question.objects.filter(
            quiz_id=quiz_id,
            quiz__course__instructor=self.request.user
        ).prefetch_related('answers')


# Student Quiz Views

class StudentQuizListView(generics.ListAPIView):
    """List available quizzes for students"""
    
    permission_classes = [permissions.IsAuthenticated, IsLearner]
    serializer_class = QuizSummarySerializer
    
    def get_queryset(self):
        # Get quizzes from enrolled courses
        enrolled_courses = Enrollment.objects.filter(
            student=self.request.user,
            status='active'
        ).values_list('course_id', flat=True)
        
        return Quiz.objects.filter(
            course_id__in=enrolled_courses,
            is_active=True
        ).select_related('course', 'lesson')


class StudentQuizDetailView(generics.RetrieveAPIView):
    """Get quiz details for students (before taking)"""
    
    permission_classes = [permissions.IsAuthenticated, IsLearner]
    serializer_class = QuizSerializer
    
    def get_queryset(self):
        enrolled_courses = Enrollment.objects.filter(
            student=self.request.user,
            status='active'
        ).values_list('course_id', flat=True)
        
        return Quiz.objects.filter(
            course_id__in=enrolled_courses,
            is_active=True
        ).select_related('course', 'lesson')
    
    def get_serializer_context(self):
        context = super().get_serializer_context()
        # Hide correct answers and explanations for students
        context['request'].hide_correct_answers = True
        context['request'].hide_explanations = True
        return context


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated, IsLearner])
def start_quiz_attempt(request, quiz_id):
    """Start a new quiz attempt"""
    
    # Get quiz and validate access
    quiz = get_object_or_404(Quiz, id=quiz_id)
    
    # Check if student is enrolled in the course
    enrollment = get_object_or_404(
        Enrollment,
        student=request.user,
        course=quiz.course,
        status='active'
    )
    
    # Check if quiz is available
    if not quiz.is_available:
        return Response(
            {'error': 'Quiz is not currently available'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Check attempt limits
    existing_attempts = QuizAttempt.objects.filter(
        quiz=quiz,
        student=request.user
    ).count()
    
    if existing_attempts >= quiz.max_attempts:
        return Response(
            {'error': f'Maximum attempts ({quiz.max_attempts}) reached'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Check for existing in-progress attempt
    in_progress_attempt = QuizAttempt.objects.filter(
        quiz=quiz,
        student=request.user,
        status='in_progress'
    ).first()
    
    if in_progress_attempt:
        # Check if expired
        if in_progress_attempt.is_expired:
            in_progress_attempt.status = 'time_expired'
            in_progress_attempt.save()
        else:
            # Return existing attempt
            serializer = QuizAttemptDetailSerializer(in_progress_attempt)
            return Response(serializer.data)
    
    # Create new attempt
    with transaction.atomic():
        attempt = QuizAttempt.objects.create(
            quiz=quiz,
            student=request.user,
            enrollment=enrollment,
            attempt_number=existing_attempts + 1
        )
        
        # Start the attempt
        attempt.start_attempt()
    
    serializer = QuizAttemptDetailSerializer(attempt)
    return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated, IsLearner])
def submit_question_response(request, attempt_id, question_id):
    """Submit response to a question"""
    
    # Get attempt and validate ownership
    attempt = get_object_or_404(
        QuizAttempt,
        id=attempt_id,
        student=request.user,
        status='in_progress'
    )
    
    # Check if attempt is expired
    if attempt.is_expired:
        attempt.status = 'time_expired'
        attempt.save()
        return Response(
            {'error': 'Quiz attempt has expired'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Get question
    question = get_object_or_404(
        Question,
        id=question_id,
        quiz=attempt.quiz
    )
    
    # Create or update response
    response, created = QuestionResponse.objects.get_or_create(
        attempt=attempt,
        question=question,
        defaults=request.data
    )
    
    if not created:
        # Update existing response
        serializer = QuestionResponseSerializer(
            response,
            data=request.data,
            partial=True
        )
        if serializer.is_valid():
            serializer.save()
        else:
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    else:
        # Validate new response
        serializer = QuestionResponseSerializer(response)
    
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated, IsLearner])
def complete_quiz_attempt(request, attempt_id):
    """Complete a quiz attempt"""
    
    # Get attempt and validate ownership
    attempt = get_object_or_404(
        QuizAttempt,
        id=attempt_id,
        student=request.user,
        status__in=['in_progress', 'time_expired']
    )
    
    # Complete the attempt
    with transaction.atomic():
        attempt.complete_attempt()
        
        # Update quiz analytics
        analytics, created = QuizAnalytics.objects.get_or_create(
            quiz=attempt.quiz
        )
        analytics.calculate_analytics()
    
    serializer = QuizAttemptDetailSerializer(attempt)
    return Response(serializer.data)


class QuizAttemptDetailView(generics.RetrieveAPIView):
    """Get detailed quiz attempt results"""
    
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = QuizAttemptDetailSerializer
    
    def get_queryset(self):
        if hasattr(self.request.user, 'role') and self.request.user.role == 'teacher':
            # Teachers can see attempts for their course quizzes
            return QuizAttempt.objects.filter(
                quiz__course__instructor=self.request.user
            ).select_related('quiz', 'student', 'enrollment')
        else:
            # Students can only see their own attempts
            return QuizAttempt.objects.filter(
                student=self.request.user
            ).select_related('quiz', 'enrollment')


class StudentQuizAttemptsView(generics.ListAPIView):
    """List student's quiz attempts"""
    
    permission_classes = [permissions.IsAuthenticated, IsLearner]
    serializer_class = StudentQuizAttemptSerializer
    
    def get_queryset(self):
        return QuizAttempt.objects.filter(
            student=self.request.user
        ).select_related('quiz__course').order_by('-created_at')


# Teacher Analytics Views

class QuizAnalyticsView(generics.RetrieveAPIView):
    """Get quiz analytics for teachers"""
    
    permission_classes = [permissions.IsAuthenticated, IsTeacher]
    serializer_class = QuizAnalyticsSerializer
    
    def get_object(self):
        quiz_id = self.kwargs['quiz_id']
        quiz = get_object_or_404(
            Quiz.objects.filter(course__instructor=self.request.user),
            id=quiz_id
        )
        
        # Get or create analytics
        analytics, created = QuizAnalytics.objects.get_or_create(
            quiz=quiz
        )
        
        # Recalculate if requested or if stale
        if (self.request.query_params.get('refresh') == 'true' or 
            created or 
            (timezone.now() - analytics.last_calculated).days > 1):
            analytics.calculate_analytics()
        
        return analytics


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated, IsTeacher])
def quiz_attempts_list(request, quiz_id):
    """List all attempts for a quiz (teacher view)"""
    
    quiz = get_object_or_404(
        Quiz.objects.filter(course__instructor=request.user),
        id=quiz_id
    )
    
    attempts = QuizAttempt.objects.filter(
        quiz=quiz
    ).select_related('student', 'enrollment').order_by('-created_at')
    
    # Filter by status if provided
    status_filter = request.query_params.get('status')
    if status_filter:
        attempts = attempts.filter(status=status_filter)
    
    # Filter by student if provided
    student_id = request.query_params.get('student')
    if student_id:
        attempts = attempts.filter(student_id=student_id)
    
    serializer = QuizAttemptSerializer(attempts, many=True)
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated, IsTeacher])
def grade_essay_response(request, response_id):
    """Grade an essay response manually"""
    
    response = get_object_or_404(
        QuestionResponse.objects.filter(
            question__quiz__course__instructor=request.user,
            question__question_type='essay'
        ),
        id=response_id
    )
    
    points_earned = request.data.get('points_earned', 0)
    feedback = request.data.get('feedback', '')
    
    # Validate points
    if points_earned < 0 or points_earned > response.question.points:
        return Response(
            {'error': f'Points must be between 0 and {response.question.points}'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Update response
    response.points_earned = points_earned
    response.is_correct = points_earned == response.question.points
    
    # Store feedback in response_data
    if not response.response_data:
        response.response_data = {}
    response.response_data['feedback'] = feedback
    response.response_data['graded_by'] = request.user.name
    response.response_data['graded_at'] = timezone.now().isoformat()
    
    response.save()
    
    # Recalculate attempt score
    response.attempt.calculate_score()
    response.attempt.save()
    
    serializer = QuestionResponseSerializer(response)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated, IsTeacher])
def course_quiz_summary(request, course_id):
    """Get quiz summary for a course"""
    
    course = get_object_or_404(
        Course.objects.filter(instructor=request.user),
        id=course_id
    )
    
    quizzes = Quiz.objects.filter(course=course).annotate(
        attempt_count=Count('attempts'),
        avg_score=Avg('attempts__score_percentage')
    )
    
    summary_data = []
    for quiz in quizzes:
        quiz_data = QuizSummarySerializer(quiz).data
        quiz_data['attempt_count'] = quiz.attempt_count
        quiz_data['average_score'] = quiz.avg_score or 0
        summary_data.append(quiz_data)
    
    return Response(summary_data)