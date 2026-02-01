from django.http import JsonResponse
from django.conf import settings
from rest_framework import status
import json


class RoleBasedAccessControlMiddleware:
    """Middleware for role-based access control"""
    
    def __init__(self, get_response):
        self.get_response = get_response
        
        # Define role-based access rules
        self.access_rules = {
            # Admin-only endpoints
            '/api/admin/': [settings.USER_ROLES['ADMIN']],
            '/api/audit/': [settings.USER_ROLES['ADMIN']],
            '/api/auth/admin/': [settings.USER_ROLES['ADMIN']],
            
            # Teacher endpoints
            '/api/teachers/': [
                settings.USER_ROLES['TEACHER'], 
                settings.USER_ROLES['ADMIN']
            ],
            
            # Learner endpoints (most endpoints are accessible to all authenticated users)
            '/api/enrollments/': [
                settings.USER_ROLES['LEARNER'], 
                settings.USER_ROLES['ADMIN']
            ],
            '/api/certificates/': [
                settings.USER_ROLES['LEARNER'], 
                settings.USER_ROLES['ADMIN']
            ],
        }
    
    def __call__(self, request):
        # Process request before view
        if hasattr(request, 'user') and request.user.is_authenticated:
            if not self.check_role_access(request):
                return JsonResponse({
                    'error': 'Access denied. Insufficient permissions.',
                    'required_role': self.get_required_roles(request.path)
                }, status=status.HTTP_403_FORBIDDEN)
        
        response = self.get_response(request)
        return response
    
    def check_role_access(self, request):
        """Check if user has required role for the endpoint"""
        path = request.path
        user_role = getattr(request.user, 'role', None)
        
        # Check each access rule
        for endpoint_pattern, allowed_roles in self.access_rules.items():
            if path.startswith(endpoint_pattern):
                if user_role not in allowed_roles:
                    return False
        
        return True
    
    def get_required_roles(self, path):
        """Get required roles for a path"""
        for endpoint_pattern, allowed_roles in self.access_rules.items():
            if path.startswith(endpoint_pattern):
                return allowed_roles
        return []