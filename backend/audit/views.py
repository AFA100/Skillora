from rest_framework import generics
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from accounts.permissions import IsAdmin
from .models import AuditLog


class AuditLogListView(generics.ListAPIView):
    """List audit logs (admin only)"""
    queryset = AuditLog.objects.all().order_by('-timestamp')
    permission_classes = [IsAuthenticated, IsAdmin]
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Filter by action if provided
        action = self.request.query_params.get('action')
        if action:
            queryset = queryset.filter(action=action)
        
        # Filter by resource type if provided
        resource_type = self.request.query_params.get('resource_type')
        if resource_type:
            queryset = queryset.filter(resource_type=resource_type)
        
        # Filter by user if provided
        user_id = self.request.query_params.get('user_id')
        if user_id:
            queryset = queryset.filter(user_id=user_id)
        
        # Limit to last 1000 entries for performance
        return queryset[:1000]
    
    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        
        # Serialize manually to include user info
        logs_data = []
        for log in queryset:
            log_data = {
                'id': log.id,
                'user': log.user.name if log.user else 'System',
                'user_email': log.user.email if log.user else None,
                'action': log.action,
                'resource_type': log.resource_type,
                'resource_id': log.resource_id,
                'details': log.details,
                'ip_address': log.ip_address,
                'timestamp': log.timestamp
            }
            logs_data.append(log_data)
        
        return Response({
            'count': len(logs_data),
            'results': logs_data
        })


class AuditLogDetailView(generics.RetrieveAPIView):
    """Audit log detail view (admin only)"""
    queryset = AuditLog.objects.all()
    permission_classes = [IsAuthenticated, IsAdmin]
    
    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        
        log_data = {
            'id': instance.id,
            'user': instance.user.name if instance.user else 'System',
            'user_email': instance.user.email if instance.user else None,
            'action': instance.action,
            'resource_type': instance.resource_type,
            'resource_id': instance.resource_id,
            'details': instance.details,
            'ip_address': instance.ip_address,
            'user_agent': instance.user_agent,
            'timestamp': instance.timestamp
        }
        
        return Response(log_data)