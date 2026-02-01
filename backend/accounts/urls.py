from django.urls import path
from .views import (
    SignupView, LoginView, CustomTokenRefreshView, PasswordResetView,
    PasswordResetConfirmView, ProfileView, LogoutView, AdminUserCreationView
)
from .admin_views import (
    AdminTeacherListView, AdminLearnerListView, approve_teacher, reject_teacher,
    suspend_teacher, suspend_learner, reactivate_user, admin_dashboard_stats
)

app_name = 'accounts'

urlpatterns = [
    # Authentication endpoints
    path('signup/', SignupView.as_view(), name='signup'),
    path('login/', LoginView.as_view(), name='login'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('refresh/', CustomTokenRefreshView.as_view(), name='token_refresh'),
    
    # Password reset endpoints
    path('password-reset/', PasswordResetView.as_view(), name='password_reset'),
    path('password-reset/confirm/', PasswordResetConfirmView.as_view(), name='password_reset_confirm'),
    
    # Profile management
    path('profile/', ProfileView.as_view(), name='profile'),
    
    # Admin user management endpoints
    path('admin/create-user/', AdminUserCreationView.as_view(), name='admin_create_user'),
    path('admin/dashboard/stats/', admin_dashboard_stats, name='admin_dashboard_stats'),
    
    # Admin teacher management
    path('admin/teachers/', AdminTeacherListView.as_view(), name='admin_teachers'),
    path('admin/teachers/<int:teacher_id>/approve/', approve_teacher, name='approve_teacher'),
    path('admin/teachers/<int:teacher_id>/reject/', reject_teacher, name='reject_teacher'),
    path('admin/teachers/<int:teacher_id>/suspend/', suspend_teacher, name='suspend_teacher'),
    
    # Admin learner management
    path('admin/learners/', AdminLearnerListView.as_view(), name='admin_learners'),
    path('admin/learners/<int:learner_id>/suspend/', suspend_learner, name='suspend_learner'),
    
    # User reactivation
    path('admin/users/<int:user_id>/reactivate/', reactivate_user, name='reactivate_user'),
]