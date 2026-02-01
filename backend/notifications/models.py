from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone

User = get_user_model()


class Notification(models.Model):
    """
    User notifications model
    """
    NOTIFICATION_TYPES = [
        ('enrollment', 'Course Enrollment'),
        ('completion', 'Course Completion'),
        ('certificate', 'Certificate Generated'),
        ('payment', 'Payment Processed'),
        ('quiz_result', 'Quiz Result'),
        ('course_update', 'Course Update'),
        ('system', 'System Notification'),
        ('reminder', 'Reminder'),
    ]
    
    PRIORITY_LEVELS = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('urgent', 'Urgent'),
    ]
    
    recipient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    sender = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='sent_notifications')
    
    # Notification content
    title = models.CharField(max_length=200)
    message = models.TextField()
    notification_type = models.CharField(max_length=20, choices=NOTIFICATION_TYPES)
    priority = models.CharField(max_length=10, choices=PRIORITY_LEVELS, default='medium')
    
    # Status
    is_read = models.BooleanField(default=False)
    is_sent = models.BooleanField(default=False)
    
    # Related objects (optional)
    course_id = models.IntegerField(null=True, blank=True)
    enrollment_id = models.IntegerField(null=True, blank=True)
    quiz_id = models.IntegerField(null=True, blank=True)
    
    # Metadata
    data = models.JSONField(default=dict, blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    read_at = models.DateTimeField(null=True, blank=True)
    sent_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['recipient', 'is_read']),
            models.Index(fields=['notification_type']),
            models.Index(fields=['created_at']),
        ]
    
    def __str__(self):
        return f"{self.title} - {self.recipient.name}"
    
    def mark_as_read(self):
        """Mark notification as read"""
        if not self.is_read:
            self.is_read = True
            self.read_at = timezone.now()
            self.save(update_fields=['is_read', 'read_at'])
    
    def mark_as_sent(self):
        """Mark notification as sent"""
        if not self.is_sent:
            self.is_sent = True
            self.sent_at = timezone.now()
            self.save(update_fields=['is_sent', 'sent_at'])


class NotificationPreference(models.Model):
    """
    User notification preferences
    """
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='notification_preferences')
    
    # Email notifications
    email_enrollment = models.BooleanField(default=True)
    email_completion = models.BooleanField(default=True)
    email_certificate = models.BooleanField(default=True)
    email_payment = models.BooleanField(default=True)
    email_quiz_result = models.BooleanField(default=True)
    email_course_update = models.BooleanField(default=True)
    email_system = models.BooleanField(default=True)
    email_reminder = models.BooleanField(default=True)
    
    # In-app notifications
    app_enrollment = models.BooleanField(default=True)
    app_completion = models.BooleanField(default=True)
    app_certificate = models.BooleanField(default=True)
    app_payment = models.BooleanField(default=True)
    app_quiz_result = models.BooleanField(default=True)
    app_course_update = models.BooleanField(default=True)
    app_system = models.BooleanField(default=True)
    app_reminder = models.BooleanField(default=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"Notification preferences for {self.user.name}"