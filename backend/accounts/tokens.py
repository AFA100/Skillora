import secrets
import hashlib
from datetime import datetime, timedelta
from django.core.cache import cache
from django.conf import settings


class PasswordResetTokenGenerator:
    """Generate and validate password reset tokens"""
    
    def __init__(self):
        self.timeout = getattr(settings, 'PASSWORD_RESET_TIMEOUT', 3600)  # 1 hour default
    
    def generate_token(self, user):
        """Generate a secure token for password reset"""
        # Create a unique token
        token = secrets.token_urlsafe(32)
        
        # Create cache key
        cache_key = f"password_reset_{token}"
        
        # Store user ID and expiration in cache
        cache.set(cache_key, {
            'user_id': user.id,
            'email': user.email,
            'created_at': datetime.now().isoformat()
        }, timeout=self.timeout)
        
        return token
    
    def validate_token(self, token):
        """Validate token and return user if valid"""
        cache_key = f"password_reset_{token}"
        token_data = cache.get(cache_key)
        
        if not token_data:
            return None
        
        try:
            from .models import User
            user = User.objects.get(id=token_data['user_id'], is_active=True)
            return user
        except User.DoesNotExist:
            return None
    
    def invalidate_token(self, token):
        """Invalidate a token after use"""
        cache_key = f"password_reset_{token}"
        cache.delete(cache_key)


# Global instance
password_reset_token_generator = PasswordResetTokenGenerator()