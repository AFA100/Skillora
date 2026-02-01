from django.urls import path
from .views import (
    EnrollmentListCreateView, EnrollmentDetailView, update_progress,
    enrollment_progress, CourseReviewListCreateView, CourseReviewDetailView,
    PublicCourseListView, PublicCourseDetailView,
    # Player views
    course_player, start_lesson, update_video_progress,
    StudentNoteListCreateView, StudentNoteDetailView,
    LessonBookmarkListCreateView, LessonBookmarkDetailView,
    start_study_session, end_study_session, learning_analytics
)

app_name = 'enrollments'

urlpatterns = [
    # Enrollment management
    path('', EnrollmentListCreateView.as_view(), name='enrollment-list-create'),
    path('<int:pk>/', EnrollmentDetailView.as_view(), name='enrollment-detail'),
    path('<int:enrollment_id>/progress/', update_progress, name='update-progress'),
    path('<int:enrollment_id>/progress/detail/', enrollment_progress, name='enrollment-progress'),
    
    # Course player
    path('<int:enrollment_id>/player/', course_player, name='course-player'),
    path('<int:enrollment_id>/lessons/<int:lesson_id>/start/', start_lesson, name='start-lesson'),
    path('<int:enrollment_id>/lessons/<int:lesson_id>/progress/', update_video_progress, name='update-video-progress'),
    
    # Student notes
    path('<int:enrollment_id>/notes/', StudentNoteListCreateView.as_view(), name='student-notes'),
    path('<int:enrollment_id>/notes/<int:pk>/', StudentNoteDetailView.as_view(), name='student-note-detail'),
    
    # Lesson bookmarks
    path('<int:enrollment_id>/bookmarks/', LessonBookmarkListCreateView.as_view(), name='lesson-bookmarks'),
    path('<int:enrollment_id>/bookmarks/<int:pk>/', LessonBookmarkDetailView.as_view(), name='lesson-bookmark-detail'),
    
    # Study sessions
    path('<int:enrollment_id>/sessions/start/', start_study_session, name='start-study-session'),
    path('<int:enrollment_id>/sessions/<int:session_id>/end/', end_study_session, name='end-study-session'),
    path('<int:enrollment_id>/analytics/', learning_analytics, name='learning-analytics'),
    
    # Course reviews
    path('courses/<int:course_id>/reviews/', CourseReviewListCreateView.as_view(), name='course-reviews'),
    path('reviews/<int:pk>/', CourseReviewDetailView.as_view(), name='review-detail'),
    
    # Public course discovery
    path('courses/public/', PublicCourseListView.as_view(), name='public-course-list'),
    path('courses/public/<int:pk>/', PublicCourseDetailView.as_view(), name='public-course-detail'),
]