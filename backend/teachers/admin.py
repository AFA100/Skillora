from django.contrib import admin
from django.utils.html import format_html
from .models import TeacherProfile, TeacherVerification


@admin.register(TeacherProfile)
class TeacherProfileAdmin(admin.ModelAdmin):
    list_display = ['user', 'skills', 'years_of_experience', 'is_approved', 'created_at']
    list_filter = ['is_approved', 'created_at']
    search_fields = ['user__email', 'user__name', 'skills']
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('user', 'bio', 'skills', 'profile_photo')
        }),
        ('Professional Details', {
            'fields': ('years_of_experience', 'education', 'certifications', 'hourly_rate')
        }),
        ('Status', {
            'fields': ('is_approved',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(TeacherVerification)
class TeacherVerificationAdmin(admin.ModelAdmin):
    list_display = [
        'teacher_name', 'status', 'submission_id', 'submitted_at', 
        'reviewed_by', 'reviewed_at'
    ]
    list_filter = ['status', 'submitted_at', 'reviewed_at']
    search_fields = ['teacher__user__name', 'teacher__user__email', 'submission_id']
    readonly_fields = ['submission_id', 'submitted_at', 'updated_at']
    
    fieldsets = (
        ('Teacher Information', {
            'fields': ('teacher', 'submission_id')
        }),
        ('Verification Documents', {
            'fields': ('government_id', 'portfolio', 'demo_video')
        }),
        ('Review Status', {
            'fields': ('status', 'review_notes', 'reviewed_by', 'reviewed_at')
        }),
        ('Timestamps', {
            'fields': ('submitted_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def teacher_name(self, obj):
        return obj.teacher.user.name
    teacher_name.short_description = 'Teacher Name'
    
    def get_readonly_fields(self, request, obj=None):
        readonly_fields = list(self.readonly_fields)
        if obj and obj.status != 'pending':
            readonly_fields.extend(['government_id', 'portfolio', 'demo_video'])
        return readonly_fields
    
    actions = ['approve_verification', 'reject_verification']
    
    def approve_verification(self, request, queryset):
        updated = 0
        for verification in queryset.filter(status='pending'):
            verification.status = 'approved'
            verification.reviewed_by = request.user
            verification.save()
            updated += 1
        
        self.message_user(request, f'{updated} verifications approved.')
    approve_verification.short_description = "Approve selected verifications"
    
    def reject_verification(self, request, queryset):
        updated = 0
        for verification in queryset.filter(status='pending'):
            verification.status = 'rejected'
            verification.reviewed_by = request.user
            verification.save()
            updated += 1
        
        self.message_user(request, f'{updated} verifications rejected.')
    reject_verification.short_description = "Reject selected verifications"