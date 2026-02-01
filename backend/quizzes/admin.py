from django.contrib import admin
from .models import Quiz, Question, Answer, QuizAttempt, QuestionResponse, QuizAnalytics


@admin.register(Quiz)
class QuizAdmin(admin.ModelAdmin):
    list_display = ['title', 'course', 'quiz_type', 'is_active', 'created_at']
    list_filter = ['quiz_type', 'is_active', 'course']
    search_fields = ['title', 'course__title']
    readonly_fields = ['total_points', 'created_at', 'updated_at']


@admin.register(Question)
class QuestionAdmin(admin.ModelAdmin):
    list_display = ['question_text', 'quiz', 'question_type', 'points', 'order']
    list_filter = ['question_type', 'quiz']
    search_fields = ['question_text', 'quiz__title']


@admin.register(Answer)
class AnswerAdmin(admin.ModelAdmin):
    list_display = ['answer_text', 'question', 'is_correct', 'order']
    list_filter = ['is_correct', 'question__quiz']
    search_fields = ['answer_text', 'question__question_text']


@admin.register(QuizAttempt)
class QuizAttemptAdmin(admin.ModelAdmin):
    list_display = ['student', 'quiz', 'attempt_number', 'status', 'score_percentage', 'created_at']
    list_filter = ['status', 'passed', 'quiz']
    search_fields = ['student__name', 'student__email', 'quiz__title']
    readonly_fields = ['score_points', 'score_percentage', 'passed', 'created_at', 'updated_at']


@admin.register(QuestionResponse)
class QuestionResponseAdmin(admin.ModelAdmin):
    list_display = ['attempt', 'question', 'is_correct', 'points_earned', 'answered_at']
    list_filter = ['is_correct', 'question__question_type']
    search_fields = ['attempt__student__name', 'question__question_text']


@admin.register(QuizAnalytics)
class QuizAnalyticsAdmin(admin.ModelAdmin):
    list_display = ['quiz', 'total_attempts', 'completed_attempts', 'average_score', 'pass_rate']
    readonly_fields = ['last_calculated']