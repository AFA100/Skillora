from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator
import uuid


class Course(models.Model):
    """Enhanced Course model with comprehensive fields"""
    
    DIFFICULTY_CHOICES = [
        ('beginner', 'Beginner'),
        ('intermediate', 'Intermediate'),
        ('advanced', 'Advanced'),
    ]
    
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('submitted', 'Submitted for Review'),
        ('published', 'Published'),
        ('rejected', 'Rejected'),
        ('archived', 'Archived'),
    ]
    
    CATEGORY_CHOICES = [
        ('programming', 'Programming'),
        ('design', 'Design'),
        ('business', 'Business'),
        ('marketing', 'Marketing'),
        ('data_science', 'Data Science'),
        ('photography', 'Photography'),
        ('music', 'Music'),
        ('language', 'Language'),
        ('health', 'Health & Fitness'),
        ('other', 'Other'),
    ]
    
    # Basic Information
    title = models.CharField(max_length=200, help_text="Course title")
    description = models.TextField(help_text="Detailed course description")
    short_description = models.CharField(max_length=500, help_text="Brief course summary")
    
    # Course Details
    instructor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='courses',
        limit_choices_to={'role': 'teacher', 'is_verified': True}
    )
    thumbnail = models.ImageField(upload_to='course_thumbnails/', blank=True, null=True)
    price = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0)])
    difficulty = models.CharField(max_length=20, choices=DIFFICULTY_CHOICES)
    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES)
    tags = models.CharField(max_length=500, blank=True, help_text="Comma-separated tags")
    
    # Learning Outcomes
    learning_outcomes = models.TextField(help_text="What students will learn (one per line)")
    prerequisites = models.TextField(blank=True, help_text="Course prerequisites")
    
    # Course Metadata
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    duration_hours = models.PositiveIntegerField(default=0, help_text="Estimated course duration")
    language = models.CharField(max_length=50, default='English')
    
    # Review Information
    submitted_at = models.DateTimeField(null=True, blank=True)
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reviewed_courses'
    )
    review_notes = models.TextField(blank=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'courses'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status', 'category']),
            models.Index(fields=['instructor', 'status']),
        ]
    
    def __str__(self):
        return self.title
    
    @property
    def is_published(self):
        return self.status == 'published'
    
    @property
    def can_be_edited(self):
        return self.status in ['draft', 'rejected']
    
    @property
    def total_lessons(self):
        return Lesson.objects.filter(section__course=self).count()
    
    @property
    def total_sections(self):
        return self.sections.count()


class CourseSection(models.Model):
    """Course sections to organize lessons"""
    
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='sections')
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'course_sections'
        ordering = ['order']
        unique_together = ['course', 'order']
    
    def __str__(self):
        return f"{self.course.title} - {self.title}"
    
    @property
    def lesson_count(self):
        return self.lessons.count()
    
    @property
    def duration_minutes(self):
        return sum(lesson.duration_minutes or 0 for lesson in self.lessons.all())


class Lesson(models.Model):
    """Individual lessons within course sections"""
    
    LESSON_TYPES = [
        ('video', 'Video'),
        ('text', 'Text'),
        ('quiz', 'Quiz'),
        ('assignment', 'Assignment'),
    ]
    
    section = models.ForeignKey(CourseSection, on_delete=models.CASCADE, related_name='lessons')
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    lesson_type = models.CharField(max_length=20, choices=LESSON_TYPES, default='video')
    order = models.PositiveIntegerField(default=0)
    
    # Content Fields
    video_url = models.URLField(blank=True, help_text="Video file URL (S3 or external)")
    video_duration = models.PositiveIntegerField(null=True, blank=True, help_text="Duration in seconds")
    text_content = models.TextField(blank=True, help_text="Text lesson content")
    
    # Lesson Metadata
    duration_minutes = models.PositiveIntegerField(null=True, blank=True)
    is_preview = models.BooleanField(default=False, help_text="Can be viewed without enrollment")
    is_required = models.BooleanField(default=True, help_text="Required for course completion")
    
    # File Attachments
    attachments = models.JSONField(default=list, blank=True, help_text="List of attachment URLs")
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'lessons'
        ordering = ['order']
        unique_together = ['section', 'order']
        indexes = [
            models.Index(fields=['section', 'order']),
        ]
    
    def __str__(self):
        return f"{self.section.course.title} - {self.section.title} - {self.title}"
    
    @property
    def course(self):
        return self.section.course
    
    def get_next_lesson(self):
        """Get the next lesson in sequence"""
        try:
            return Lesson.objects.filter(
                section=self.section,
                order__gt=self.order
            ).first()
        except Lesson.DoesNotExist:
            # Try next section's first lesson
            next_section = CourseSection.objects.filter(
                course=self.section.course,
                order__gt=self.section.order
            ).first()
            if next_section:
                return next_section.lessons.first()
            return None
    
    def get_previous_lesson(self):
        """Get the previous lesson in sequence"""
        try:
            return Lesson.objects.filter(
                section=self.section,
                order__lt=self.order
            ).last()
        except Lesson.DoesNotExist:
            # Try previous section's last lesson
            prev_section = CourseSection.objects.filter(
                course=self.section.course,
                order__lt=self.section.order
            ).last()
            if prev_section:
                return prev_section.lessons.last()
            return None