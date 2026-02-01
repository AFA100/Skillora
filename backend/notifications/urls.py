from django.urls import path
from . import views

app_name = 'notifications'

urlpatterns = [
    # Notification management
    path('', views.NotificationListView.as_view(), name='notification-list'),
    path('<int:notification_id>/', views.NotificationDetailView.as_view(), name='notification-detail'),
    path('stats/', views.notification_stats, name='notification-stats'),
    
    # Notification actions
    path('<int:notification_id>/read/', views.mark_as_read, name='mark-as-read'),
    path('mark-all-read/', views.mark_all_as_read, name='mark-all-as-read'),
    path('<int:notification_id>/delete/', views.delete_notification, name='delete-notification'),
    path('delete-all-read/', views.delete_all_read, name='delete-all-read'),
    
    # Preferences
    path('preferences/', views.NotificationPreferenceView.as_view(), name='notification-preferences'),
]