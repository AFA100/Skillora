"""
Security and Quality Control Middleware for Skillora
"""
import time
import json
import logging
from django.core.cache import cache
from django.http import JsonResponse
from django.utils.deprecation import MiddlewareMixin
from django.conf import settings
from django.contrib.auth import get_user_model
from audit.models import AuditLog

User = get_user_model()
logger = logging.getLogger(__name__)


class RateLimitMiddleware(MiddlewareMixin):
    """
    Rate limiting middleware to prevent abuse
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
        super().__init__(get_response)
    
    def process_request(self, request):
        # Skip rate limiting in development mode
        if settings.DEBUG:
            return None
            
        # Skip rate limiting for admin users
        if hasattr(request, 'user') and request.user.is_authenticated and request.user.role == 'admin':
            return None
        
        # Get client IP
        ip = self.get_client_ip(request)
        
        # Different rate limits for different endpoints
        rate_limits = {
            '/api/auth/login/': {'requests': 5, 'window': 300},  # 5 requests per 5 minutes
            '/api/auth/signup/': {'requests': 3, 'window': 300},  # 3 requests per 5 minutes
            '/api/auth/password-reset/': {'requests': 3, 'window': 600},  # 3 requests per 10 minutes
            '/api/payments/': {'requests': 10, 'window': 300},  # 10 payment requests per 5 minutes
        }
        
        # Check if current path matches any rate-limited endpoint
        for path, limits in rate_limits.items():
            if request.path.startswith(path):
                cache_key = f"rate_limit:{ip}:{path}"
                current_requests = cache.get(cache_key, 0)
                
                if current_requests >= limits['requests']:
                    logger.warning(f"Rate limit exceeded for IP {ip} on path {path}")
                    return JsonResponse({
                        'error': 'Rate limit exceeded. Please try again later.',
                        'retry_after': limits['window']
                    }, status=429)
                
                # Increment counter
                cache.set(cache_key, current_requests + 1, limits['window'])
                break
        
        return None
    
    def get_client_ip(self, request):
        """Get the client's IP address"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip


class SecurityHeadersMiddleware(MiddlewareMixin):
    """
    Add security headers to all responses
    """
    
    def process_response(self, request, response):
        # Security headers
        response['X-Content-Type-Options'] = 'nosniff'
        response['X-Frame-Options'] = 'DENY'
        response['X-XSS-Protection'] = '1; mode=block'
        response['Referrer-Policy'] = 'strict-origin-when-cross-origin'
        response['Permissions-Policy'] = 'geolocation=(), microphone=(), camera=()'
        
        # HSTS header for HTTPS
        if request.is_secure():
            response['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
        
        # CSP header for API responses
        if request.path.startswith('/api/'):
            response['Content-Security-Policy'] = "default-src 'none'; frame-ancestors 'none';"
        
        return response


class RequestLoggingMiddleware(MiddlewareMixin):
    """
    Log sensitive operations for audit purposes
    """
    
    SENSITIVE_PATHS = [
        '/api/auth/',
        '/api/admin/',
        '/api/payments/',
        '/api/teachers/payouts/',
        '/api/teachers/admin/',
    ]
    
    def process_request(self, request):
        # Store request start time
        request._start_time = time.time()
        
        # Log sensitive operations
        if any(request.path.startswith(path) for path in self.SENSITIVE_PATHS):
            self.log_request(request)
    
    def process_response(self, request, response):
        # Calculate response time
        if hasattr(request, '_start_time'):
            response_time = time.time() - request._start_time
            
            # Log slow requests (> 2 seconds)
            if response_time > 2.0:
                logger.warning(f"Slow request: {request.method} {request.path} took {response_time:.2f}s")
        
        return response
    
    def log_request(self, request):
        """Log sensitive requests"""
        try:
            user = request.user if hasattr(request, 'user') and request.user.is_authenticated else None
            
            # Don't log passwords or sensitive data
            safe_data = {}
            if hasattr(request, 'data'):
                safe_data = {k: v for k, v in request.data.items() 
                           if k not in ['password', 'account_number', 'routing_number']}
            
            AuditLog.objects.create(
                user=user,
                action=f"{request.method} {request.path}",
                resource_type='api_request',
                ip_address=self.get_client_ip(request),
                user_agent=request.META.get('HTTP_USER_AGENT', ''),
                details={
                    'method': request.method,
                    'path': request.path,
                    'data': safe_data,
                    'query_params': dict(request.GET)
                }
            )
        except Exception as e:
            logger.error(f"Failed to log request: {e}")
    
    def get_client_ip(self, request):
        """Get the client's IP address"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip


class VideoSkipPreventionMiddleware(MiddlewareMixin):
    """
    Prevent video skipping by tracking watch time
    """
    
    def process_request(self, request):
        # Only apply to video progress endpoints
        if '/lessons/' in request.path and '/progress/' in request.path:
            if request.method == 'POST':
                self.validate_video_progress(request)
    
    def validate_video_progress(self, request):
        """Validate video progress to prevent skipping"""
        try:
            if hasattr(request, 'data'):
                current_time = request.data.get('current_time', 0)
                watch_percentage = request.data.get('watch_percentage', 0)
                
                # Get previous progress from cache/database
                user_id = request.user.id if hasattr(request, 'user') else None
                lesson_id = request.resolver_match.kwargs.get('lesson_id')
                
                if user_id and lesson_id:
                    cache_key = f"video_progress:{user_id}:{lesson_id}"
                    last_progress = cache.get(cache_key, {'time': 0, 'percentage': 0})
                    
                    # Check for suspicious jumps (more than 30 seconds or 10% jump)
                    time_jump = current_time - last_progress.get('time', 0)
                    percentage_jump = watch_percentage - last_progress.get('percentage', 0)
                    
                    if time_jump > 30 or percentage_jump > 10:
                        logger.warning(f"Suspicious video progress jump detected for user {user_id}, lesson {lesson_id}")
                        # Could implement stricter validation here
                    
                    # Update cache with current progress
                    cache.set(cache_key, {
                        'time': current_time,
                        'percentage': watch_percentage,
                        'timestamp': time.time()
                    }, 3600)  # 1 hour cache
                    
        except Exception as e:
            logger.error(f"Error validating video progress: {e}")


class InputSanitizationMiddleware(MiddlewareMixin):
    """
    Sanitize input data to prevent XSS and injection attacks
    """
    
    def process_request(self, request):
        if request.method in ['POST', 'PUT', 'PATCH']:
            self.sanitize_request_data(request)
    
    def sanitize_request_data(self, request):
        """Sanitize request data"""
        try:
            if hasattr(request, 'data') and isinstance(request.data, dict):
                self.sanitize_dict(request.data)
        except Exception as e:
            logger.error(f"Error sanitizing request data: {e}")
    
    def sanitize_dict(self, data):
        """Recursively sanitize dictionary data"""
        import html
        import re
        
        for key, value in data.items():
            if isinstance(value, str):
                # Remove potentially dangerous HTML tags
                value = re.sub(r'<script[^>]*>.*?</script>', '', value, flags=re.IGNORECASE | re.DOTALL)
                value = re.sub(r'<iframe[^>]*>.*?</iframe>', '', value, flags=re.IGNORECASE | re.DOTALL)
                value = re.sub(r'javascript:', '', value, flags=re.IGNORECASE)
                
                # Escape HTML entities
                data[key] = html.escape(value)
            elif isinstance(value, dict):
                self.sanitize_dict(value)
            elif isinstance(value, list):
                for i, item in enumerate(value):
                    if isinstance(item, str):
                        value[i] = html.escape(item)
                    elif isinstance(item, dict):
                        self.sanitize_dict(item)