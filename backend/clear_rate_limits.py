#!/usr/bin/env python
import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'skillora.settings')
django.setup()

from django.core.cache import cache

def clear_rate_limits():
    """Clear all rate limiting cache entries"""
    
    # Get all cache keys (this is a simple approach)
    # In production, you'd want a more targeted approach
    
    # Clear specific rate limit patterns
    patterns = [
        'rate_limit:*:/api/auth/login/',
        'rate_limit:*:/api/auth/signup/',
        'rate_limit:*:/api/auth/password-reset/',
        'rate_limit:*:/api/payments/',
    ]
    
    print("🧹 Clearing rate limit cache...")
    
    # Since we can't easily iterate cache keys in Django's default cache,
    # let's clear the entire cache (safe for development)
    cache.clear()
    
    print("✅ Rate limit cache cleared!")
    print("You can now try logging in again.")

if __name__ == '__main__':
    clear_rate_limits()