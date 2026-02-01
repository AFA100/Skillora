from django.db import models
from django.conf import settings
from django.utils import timezone
from decimal import Decimal


class Enrollment(models.Model):
    """Enhanced student enrollment in courses"""
    
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('completed', 'Completed'),
        ('dropped', 'Dropped'),
        ('suspended', 'Suspended'),
    ]
    
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='enrollments',
        limit_choices_to={'role': 'learner'}
    )
    course = models.ForeignKey(
        'courses.Course',
        on_delete=models.CASCADE,
        related_name='enrollments'
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    progress_percentage = models.PositiveIntegerField(default=0)
    
    # Progress Tracking
    current_lesson = models.ForeignKey(
        'courses.Lesson',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='current_enrollments'
    )
    completed_lessons = models.ManyToManyField(
        'courses.Lesson',
        through='LessonProgress',
        related_name='completed_by'
    )
    
    # Timestamps
    enrolled_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    last_accessed_at = models.DateTimeField(null=True, blank=True)
    
    # Payment Reference
    payment = models.ForeignKey(
        'payments.Payment',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='enrollments'
    )
    
    class Meta:
        db_table = 'enrollments'
        unique_together = ['student', 'course']
        indexes = [
            models.Index(fields=['student', 'status']),
            models.Index(fields=['course', 'status']),
        ]
    
    def __str__(self):
        return f"{self.student.email} - {self.course.title}"
    
    def update_progress(self):
        """Calculate and update progress percentage"""
        total_lessons = self.course.total_lessons
        if total_lessons == 0:
            self.progress_percentage = 0
        else:
            completed_count = self.completed_lessons.count()
            self.progress_percentage = min(100, int((completed_count / total_lessons) * 100))
        
        # Mark as completed if 100% progress
        if self.progress_percentage == 100 and not self.completed_at:
            self.completed_at = timezone.now()
            self.status = 'completed'
        
        self.save()
    
    @property
    def is_completed(self):
        return self.status == 'completed'
    
    @property
    def days_since_enrollment(self):
        return (timezone.now() - self.enrolled_at).days


class LessonProgress(models.Model):
    """Track individual lesson completion"""
    
    enrollment = models.ForeignKey(Enrollment, on_delete=models.CASCADE)
    lesson = models.ForeignKey('courses.Lesson', on_delete=models.CASCADE)
    completed_at = models.DateTimeField(auto_now_add=True)
    watch_time_seconds = models.PositiveIntegerField(default=0)
    
    class Meta:
        db_table = 'lesson_progress'
        unique_together = ['enrollment', 'lesson']
        indexes = [
            models.Index(fields=['enrollment', 'completed_at']),
        ]
    
    def __str__(self):
        return f"{self.enrollment.student.email} - {self.lesson.title}"


class CourseReview(models.Model):
    """Course reviews and ratings"""
    
    enrollment = models.OneToOneField(
        Enrollment,
        on_delete=models.CASCADE,
        related_name='review'
    )
    rating = models.PositiveIntegerField(
        choices=[(i, i) for i in range(1, 6)],
        help_text="Rating from 1 to 5 stars"
    )
    review_text = models.TextField(blank=True)
    is_public = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'course_reviews'
        indexes = [
            models.Index(fields=['enrollment']),
        ]
    
    def __str__(self):
        return f"{self.enrollment.course.title} - {self.rating} stars"
    
    @property
    def reviewer_name(self):
        return self.enrollment.student.name
    
    @property
    def course(self):
        return self.enrollment.course

# Import player models
from .player_models import StudentNote, LessonBookmark, VideoProgress, LessonInteraction, StudySession