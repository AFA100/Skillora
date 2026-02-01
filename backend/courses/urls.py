from django.urls import path
from .views import (
    CourseListCreateView, CourseDetailView, submit_course,
    SectionListCreateView, SectionDetailView, 
    LessonListCreateView, LessonDetailView,
    reorder_sections, reorder_lessons,
    PublicCourseListView, PublicCourseDetailView
)

app_name = 'courses'

urlpatterns = [
    # Teacher Course Management
    path('', CourseListCreateView.as_view(), name='course-list-create'),
    path('<int:pk>/', CourseDetailView.as_view(), name='course-detail'),
    path('<int:course_id>/submit/', submit_course, name='submit-course'),
    
    # Section Management
    path('<int:course_id>/sections/', SectionListCreateView.as_view(), name='section-list-create'),
    path('<int:course_id>/sections/<int:pk>/', SectionDetailView.as_view(), name='section-detail'),
    path('<int:course_id>/sections/reorder/', reorder_sections, name='reorder-sections'),
    
    # Lesson Management
    path('<int:course_id>/sections/<int:section_id>/lessons/', LessonListCreateView.as_view(), name='lesson-list-create'),
    path('<int:course_id>/sections/<int:section_id>/lessons/<int:pk>/', LessonDetailView.as_view(), name='lesson-detail'),
    path('<int:course_id>/sections/<int:section_id>/lessons/reorder/', reorder_lessons, name='reorder-lessons'),
    
    # Public Course Views (for learners)
    path('public/', PublicCourseListView.as_view(), name='public-course-list'),
    path('public/<int:pk>/', PublicCourseDetailView.as_view(), name='public-course-detail'),
]