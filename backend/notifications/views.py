from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.db.models import Count, Q
from .models import Notification, NotificationPreference
from .serializers import (
    NotificationSerializer,
    NotificationPreferenceSerializer,
    NotificationStatsSerializer
)
from .services import NotificationService
import logging

logger = logging.getLogger(__name__)


class NotificationListView(generics.ListAPIView):
    """
    List notifications for authenticated user
    """
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        queryset = Notification.objects.filter(recipient=self.request.user)
        
        # Filter by type
        notification_type = self.request.query_params.get('type')
        if notification_type:
            queryset = queryset.filter(notification_type=notification_type)
        
        # Filter by read status
        is_read = self.request.query_params.get('is_read')
        if is_read is not None:
            is_read_bool = is_read.lower() == 'true'
            queryset = queryset.filter(is_read=is_read_bool)
        
        return queryset.select_related('sender')


class NotificationDetailView(generics.RetrieveUpdateAPIView):
    """
    Get and update notification details
    """
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return Notification.objects.filter(recipient=self.request.user)
    
    def perform_update(self, serializer):
        """Mark notification as read when updated"""
        notification = serializer.instance
        if not notification.is_read and 'is_read' in serializer.validated_data:
            if serializer.validated_data['is_read']:
                notification.mark_as_read()


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mark_as_read(request, notification_id):
    """
    Mark specific notification as read
    """
    try:
        notification = get_object_or_404(
            Notification,
            id=notification_id,
            recipient=request.user
        )
        
        notification.mark_as_read()
        
        return Response({'message': 'Notification marked as read'})
        
    except Exception as e:
        logger.error(f"Error marking notification as read: {e}")
        return Response(
            {'error': 'Failed to mark notification as read'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mark_all_as_read(request):
    """
    Mark all notifications as read for user
    """
    try:
        count = NotificationService.mark_all_as_read(request.user)
        
        return Response({
            'message': f'{count} notifications marked as read'
        })
        
    except Exception as e:
        logger.error(f"Error marking all notifications as read: {e}")
        return Response(
            {'error': 'Failed to mark notifications as read'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def notification_stats(request):
    """
    Get notification statistics for user
    """
    try:
        user_notifications = Notification.objects.filter(recipient=request.user)
        
        total_count = user_notifications.count()
        unread_count = user_notifications.filter(is_read=False).count()
        
        # Group by type
        by_type = dict(
            user_notifications.values('notification_type')
            .annotate(count=Count('id'))
            .values_list('notification_type', 'count')
        )
        
        # Group by priority
        by_priority = dict(
            user_notifications.values('priority')
            .annotate(count=Count('id'))
            .values_list('priority', 'count')
        )
        
        stats = {
            'total_count': total_count,
            'unread_count': unread_count,
            'by_type': by_type,
            'by_priority': by_priority
        }
        
        serializer = NotificationStatsSerializer(stats)
        return Response(serializer.data)
        
    except Exception as e:
        logger.error(f"Error getting notification stats: {e}")
        return Response(
            {'error': 'Failed to get notification statistics'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


class NotificationPreferenceView(generics.RetrieveUpdateAPIView):
    """
    Get and update notification preferences
    """
    serializer_class = NotificationPreferenceSerializer
    permission_classes = [IsAuthenticated]
    
    def get_object(self):
        preferences, created = NotificationPreference.objects.get_or_create(
            user=self.request.user
        )
        return preferences


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_notification(request, notification_id):
    """
    Delete specific notification
    """
    try:
        notification = get_object_or_404(
            Notification,
            id=notification_id,
            recipient=request.user
        )
        
        notification.delete()
        
        return Response({'message': 'Notification deleted successfully'})
        
    except Exception as e:
        logger.error(f"Error deleting notification: {e}")
        return Response(
            {'error': 'Failed to delete notification'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_all_read(request):
    """
    Delete all read notifications for user
    """
    try:
        count, _ = Notification.objects.filter(
            recipient=request.user,
            is_read=True
        ).delete()
        
        return Response({
            'message': f'{count} read notifications deleted'
        })
        
    except Exception as e:
        logger.error(f"Error deleting read notifications: {e}")
        return Response(
            {'error': 'Failed to delete notifications'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )