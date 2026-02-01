from django.contrib import admin
from .models import Notification, NotificationPreference


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = [
        'title',
        'recipient',
        'notification_type',
        'priority',
        'is_read',
        'is_sent',
        'created_at'
    ]
    list_filter = [
        'notification_type',
        'priority',
        'is_read',
        'is_sent',
        'created_at'
    ]
    search_fields = [
        'title',
        'message',
        'recipient__name',
        'recipient__email'
    ]
    readonly_fields = [
        'created_at',
        'read_at',
        'sent_at'
    ]
    ordering = ['-created_at']


@admin.register(NotificationPreference)
class NotificationPreferenceAdmin(admin.ModelAdmin):
    list_display = [
        'user',
        'email_enrollment',
        'email_completion',
        'email_certificate',
        'app_enrollment',
        'app_completion',
        'app_certificate'
    ]
    search_fields = [
        'user__name',
        'user__email'
    ]