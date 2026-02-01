from rest_framework import permissions
from django.conf import settings


class IsOwnerOrReadOnly(permissions.BasePermission):
    """Custom permission to only allow owners of an object to edit it."""
    
    def has_object_permission(self, request, view, obj):
        # Read permissions for any request
        if request.method in permissions.SAFE_METHODS:
            return True
        # Write permissions only to the owner
        return obj == request.user


class IsLearner(permissions.BasePermission):
    """Permission class for learner role"""
    
    def has_permission(self, request, view):
        return (
            request.user.is_authenticated and 
            request.user.role == settings.USER_ROLES['LEARNER']
        )


class IsTeacher(permissions.BasePermission):
    """Permission class for teacher role"""
    
    def has_permission(self, request, view):
        return (
            request.user.is_authenticated and 
            request.user.role == settings.USER_ROLES['TEACHER']
        )


class IsAdmin(permissions.BasePermission):
    """Permission class for admin role"""
    
    def has_permission(self, request, view):
        return (
            request.user.is_authenticated and 
            request.user.role == settings.USER_ROLES['ADMIN']
        )


class IsTeacherOrAdmin(permissions.BasePermission):
    """Permission class for teacher or admin roles"""
    
    def has_permission(self, request, view):
        return (
            request.user.is_authenticated and 
            request.user.role in [settings.USER_ROLES['TEACHER'], settings.USER_ROLES['ADMIN']]
        )