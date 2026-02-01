from django.contrib import admin
from django.utils import timezone
from .models import Course, CourseSection, Lesson


class LessonInline(admin.TabularInline):
    model = Lesson
    extra = 0
    fields = ['title', 'lesson_type', 'order', 'duration_minutes', 'is_preview', 'is_required']
    ordering = ['order']


class CourseSectionInline(admin.TabularInline):
    model = CourseSection
    extra = 0
    fields = ['title', 'order']
    ordering = ['order']


@admin.register(Course)
class CourseAdmin(admin.ModelAdmin):
    list_display = [
        'title', 'instructor', 'category', 'difficulty', 'price', 
        'status', 'total_sections', 'total_lessons', 'created_at'
    ]
    list_filter = ['status', 'difficulty', 'category', 'created_at']
    search_fields = ['title', 'description', 'instructor__name', 'instructor__email']
    readonly_fields = ['total_sections', 'total_lessons', 'created_at', 'updated_at']
    inlines = [CourseSectionInline]
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('title', 'short_description', 'description', 'instructor', 'thumbnail')
        }),
        ('Course Details', {
            'fields': ('category', 'difficulty', 'price', 'language', 'duration_hours')
        }),
        ('Content', {
            'fields': ('learning_outcomes', 'prerequisites', 'tags')
        }),
        ('Status & Review', {
            'fields': ('status', 'submitted_at', 'reviewed_by', 'review_notes', 'reviewed_at')
        }),
        ('Statistics', {
            'fields': ('total_sections', 'total_lessons'),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def get_readonly_fields(self, request, obj=None):
        readonly_fields = list(self.readonly_fields)
        if obj and obj.status == 'published':
            readonly_fields.extend(['instructor', 'price'])
        return readonly_fields
    
    actions = ['approve_courses', 'reject_courses']
    
    def approve_courses(self, request, queryset):
        updated = 0
        for course in queryset.filter(status='submitted'):
            course.status = 'published'
            course.reviewed_by = request.user
            course.reviewed_at = timezone.now()
            course.save()
            updated += 1
        
        self.message_user(request, f'{updated} courses approved.')
    approve_courses.short_description = "Approve selected courses"
    
    def reject_courses(self, request, queryset):
        updated = 0
        for course in queryset.filter(status='submitted'):
            course.status = 'rejected'
            course.reviewed_by = request.user
            course.reviewed_at = timezone.now()
            course.save()
            updated += 1
        
        self.message_user(request, f'{updated} courses rejected.')
    reject_courses.short_description = "Reject selected courses"


@admin.register(CourseSection)
class CourseSectionAdmin(admin.ModelAdmin):
    list_display = ['title', 'course', 'order', 'lesson_count', 'duration_minutes', 'created_at']
    list_filter = ['course__category', 'created_at']
    search_fields = ['title', 'course__title', 'course__instructor__name']
    readonly_fields = ['lesson_count', 'duration_minutes', 'created_at', 'updated_at']
    inlines = [LessonInline]
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('course', 'course__instructor')


@admin.register(Lesson)
class LessonAdmin(admin.ModelAdmin):
    list_display = [
        'title', 'section', 'course_title', 'lesson_type', 'order', 
        'duration_minutes', 'is_preview', 'is_required', 'created_at'
    ]
    list_filter = ['lesson_type', 'is_preview', 'is_required', 'created_at']
    search_fields = ['title', 'section__title', 'section__course__title']
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('section', 'title', 'description', 'lesson_type', 'order')
        }),
        ('Content', {
            'fields': ('video_url', 'video_duration', 'text_content', 'attachments')
        }),
        ('Settings', {
            'fields': ('duration_minutes', 'is_preview', 'is_required')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def course_title(self, obj):
        return obj.section.course.title
    course_title.short_description = 'Course'
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related(
            'section', 'section__course', 'section__course__instructor'
        )