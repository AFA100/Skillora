from django.urls import path
from . import views

app_name = 'quizzes'

urlpatterns = [
    # Teacher Quiz Management
    path('', views.QuizListCreateView.as_view(), name='quiz-list-create'),
    path('<uuid:pk>/', views.QuizDetailView.as_view(), name='quiz-detail'),
    path('<uuid:quiz_id>/questions/', views.QuestionListCreateView.as_view(), name='question-list-create'),
    path('<uuid:quiz_id>/questions/<uuid:pk>/', views.QuestionDetailView.as_view(), name='question-detail'),
    
    # Teacher Analytics
    path('<uuid:quiz_id>/analytics/', views.QuizAnalyticsView.as_view(), name='quiz-analytics'),
    path('<uuid:quiz_id>/attempts/', views.quiz_attempts_list, name='quiz-attempts-list'),
    path('responses/<uuid:response_id>/grade/', views.grade_essay_response, name='grade-essay-response'),
    path('courses/<uuid:course_id>/summary/', views.course_quiz_summary, name='course-quiz-summary'),
    
    # Student Quiz Taking
    path('student/', views.StudentQuizListView.as_view(), name='student-quiz-list'),
    path('student/<uuid:pk>/', views.StudentQuizDetailView.as_view(), name='student-quiz-detail'),
    path('student/<uuid:quiz_id>/start/', views.start_quiz_attempt, name='start-quiz-attempt'),
    path('attempts/<uuid:attempt_id>/', views.QuizAttemptDetailView.as_view(), name='quiz-attempt-detail'),
    path('attempts/<uuid:attempt_id>/questions/<uuid:question_id>/respond/', views.submit_question_response, name='submit-question-response'),
    path('attempts/<uuid:attempt_id>/complete/', views.complete_quiz_attempt, name='complete-quiz-attempt'),
    path('student/attempts/', views.StudentQuizAttemptsView.as_view(), name='student-quiz-attempts'),
]