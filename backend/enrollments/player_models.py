from django.db import models
from django.conf import settings
from django.utils import timezone


class StudentNote(models.Model):
    """Student notes for lessons"""
    
    enrollment = models.ForeignKey(
        'Enrollment',
        on_delete=models.CASCADE,
        related_name='notes'
    )
    lesson = models.ForeignKey(
        'courses.Lesson',
        on_delete=models.CASCADE,
        related_name='student_notes'
    )
    content = models.TextField()
    timestamp_seconds = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text="Video timestamp in seconds"
    )
    is_private = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'student_notes'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['enrollment', 'lesson']),
            models.Index(fields=['lesson', 'timestamp_seconds']),
        ]
    
    def __str__(self):
        return f"Note by {self.enrollment.student.name} on {self.lesson.title}"


class LessonBookmark(models.Model):
    """Bookmarks for specific moments in lessons"""
    
    enrollment = models.ForeignKey(
        'Enrollment',
        on_delete=models.CASCADE,
        related_name='bookmarks'
    )
    lesson = models.ForeignKey(
        'courses.Lesson',
        on_delete=models.CASCADE,
        related_name='bookmarks'
    )
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    timestamp_seconds = models.PositiveIntegerField()
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'lesson_bookmarks'
        ordering = ['timestamp_seconds']
        unique_together = ['enrollment', 'lesson', 'timestamp_seconds']
        indexes = [
            models.Index(fields=['enrollment', 'lesson']),
        ]
    
    def __str__(self):
        return f"Bookmark: {self.title} at {self.timestamp_seconds}s"


class VideoProgress(models.Model):
    """Detailed video watching progress"""
    
    enrollment = models.ForeignKey(
        'Enrollment',
        on_delete=models.CASCADE,
        related_name='video_progress'
    )
    lesson = models.ForeignKey(
        'courses.Lesson',
        on_delete=models.CASCADE,
        related_name='video_progress'
    )
    current_time_seconds = models.PositiveIntegerField(default=0)
    total_watched_seconds = models.PositiveIntegerField(default=0)
    watch_percentage = models.FloatField(default=0.0)
    last_watched_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'video_progress'
        unique_together = ['enrollment', 'lesson']
        indexes = [
            models.Index(fields=['enrollment', 'last_watched_at']),
        ]
    
    def __str__(self):
        return f"Video progress for {self.lesson.title}: {self.watch_percentage:.1f}%"
    
    def update_progress(self, current_time, duration=None):
        """Update video watching progress"""
        self.current_time_seconds = current_time
        
        if duration and duration > 0:
            self.watch_percentage = min(100.0, (current_time / duration) * 100)
        
        # Update total watched time (simplified - in reality would track segments)
        if current_time > self.current_time_seconds:
            self.total_watched_seconds += (current_time - self.current_time_seconds)
        
        self.save()


class LessonInteraction(models.Model):
    """Track student interactions with lessons"""
    
    INTERACTION_TYPES = [
        ('play', 'Play Video'),
        ('pause', 'Pause Video'),
        ('seek', 'Seek Video'),
        ('speed_change', 'Change Playback Speed'),
        ('fullscreen', 'Enter Fullscreen'),
        ('note_create', 'Create Note'),
        ('bookmark_create', 'Create Bookmark'),
        ('quiz_start', 'Start Quiz'),
        ('quiz_complete', 'Complete Quiz'),
    ]
    
    enrollment = models.ForeignKey(
        'Enrollment',
        on_delete=models.CASCADE,
        related_name='interactions'
    )
    lesson = models.ForeignKey(
        'courses.Lesson',
        on_delete=models.CASCADE,
        related_name='interactions'
    )
    interaction_type = models.CharField(max_length=20, choices=INTERACTION_TYPES)
    timestamp_seconds = models.PositiveIntegerField(null=True, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'lesson_interactions'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['enrollment', 'lesson', 'interaction_type']),
            models.Index(fields=['created_at']),
        ]
    
    def __str__(self):
        return f"{self.get_interaction_type_display()} - {self.lesson.title}"


class StudySession(models.Model):
    """Track study sessions for analytics"""
    
    enrollment = models.ForeignKey(
        'Enrollment',
        on_delete=models.CASCADE,
        related_name='study_sessions'
    )
    started_at = models.DateTimeField(auto_now_add=True)
    ended_at = models.DateTimeField(null=True, blank=True)
    duration_seconds = models.PositiveIntegerField(default=0)
    lessons_accessed = models.ManyToManyField(
        'courses.Lesson',
        related_name='study_sessions'
    )
    device_type = models.CharField(max_length=50, blank=True)
    user_agent = models.TextField(blank=True)
    
    class Meta:
        db_table = 'study_sessions'
        ordering = ['-started_at']
        indexes = [
            models.Index(fields=['enrollment', 'started_at']),
        ]
    
    def __str__(self):
        return f"Study session for {self.enrollment.student.name} - {self.duration_seconds}s"
    
    def end_session(self):
        """End the study session and calculate duration"""
        if not self.ended_at:
            self.ended_at = timezone.now()
            self.duration_seconds = int((self.ended_at - self.started_at).total_seconds())
            self.save()
    
    @property
    def is_active(self):
        return self.ended_at is None