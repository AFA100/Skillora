from rest_framework import serializers
from .models import Notification, NotificationPreference


class NotificationSerializer(serializers.ModelSerializer):
    """Serializer for Notification model"""
    
    sender_name = serializers.CharField(source='sender.name', read_only=True)
    time_ago = serializers.SerializerMethodField()
    
    class Meta:
        model = Notification
        fields = [
            'id',
            'title',
            'message',
            'notification_type',
            'priority',
            'is_read',
            'sender_name',
            'course_id',
            'enrollment_id',
            'quiz_id',
            'data',
            'created_at',
            'read_at',
            'time_ago'
        ]
        read_only_fields = [
            'id',
            'created_at',
            'read_at',
            'sender_name',
            'time_ago'
        ]
    
    def get_time_ago(self, obj):
        """Get human-readable time ago"""
        from django.utils import timezone
        from datetime import timedelta
        
        now = timezone.now()
        diff = now - obj.created_at
        
        if diff < timedelta(minutes=1):
            return "Just now"
        elif diff < timedelta(hours=1):
            minutes = int(diff.total_seconds() / 60)
            return f"{minutes} minute{'s' if minutes != 1 else ''} ago"
        elif diff < timedelta(days=1):
            hours = int(diff.total_seconds() / 3600)
            return f"{hours} hour{'s' if hours != 1 else ''} ago"
        elif diff < timedelta(days=7):
            days = diff.days
            return f"{days} day{'s' if days != 1 else ''} ago"
        else:
            return obj.created_at.strftime("%b %d, %Y")


class NotificationPreferenceSerializer(serializers.ModelSerializer):
    """Serializer for NotificationPreference model"""
    
    class Meta:
        model = NotificationPreference
        fields = [
            'email_enrollment',
            'email_completion',
            'email_certificate',
            'email_payment',
            'email_quiz_result',
            'email_course_update',
            'email_system',
            'email_reminder',
            'app_enrollment',
            'app_completion',
            'app_certificate',
            'app_payment',
            'app_quiz_result',
            'app_course_update',
            'app_system',
            'app_reminder',
        ]


class NotificationStatsSerializer(serializers.Serializer):
    """Serializer for notification statistics"""
    
    total_count = serializers.IntegerField()
    unread_count = serializers.IntegerField()
    by_type = serializers.DictField()
    by_priority = serializers.DictField()