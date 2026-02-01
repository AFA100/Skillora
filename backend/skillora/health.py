"""
Health check endpoints for monitoring
"""
from django.http import JsonResponse
from django.db import connection
from django.core.cache import cache
from django.conf import settings
import time
import logging

logger = logging.getLogger(__name__)


def health_check(request):
    """
    Basic health check endpoint
    """
    return JsonResponse({
        'status': 'healthy',
        'timestamp': time.time(),
        'version': '1.0.0'
    })


def detailed_health_check(request):
    """
    Detailed health check with database and cache status
    """
    health_status = {
        'status': 'healthy',
        'timestamp': time.time(),
        'version': '1.0.0',
        'checks': {}
    }
    
    # Database check
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            cursor.fetchone()
        health_status['checks']['database'] = {
            'status': 'healthy',
            'message': 'Database connection successful'
        }
    except Exception as e:
        health_status['status'] = 'unhealthy'
        health_status['checks']['database'] = {
            'status': 'unhealthy',
            'message': f'Database connection failed: {str(e)}'
        }
        logger.error(f"Database health check failed: {e}")
    
    # Cache check
    try:
        test_key = 'health_check_test'
        test_value = 'test_value'
        cache.set(test_key, test_value, 30)
        cached_value = cache.get(test_key)
        
        if cached_value == test_value:
            health_status['checks']['cache'] = {
                'status': 'healthy',
                'message': 'Cache is working'
            }
        else:
            health_status['status'] = 'unhealthy'
            health_status['checks']['cache'] = {
                'status': 'unhealthy',
                'message': 'Cache read/write failed'
            }
    except Exception as e:
        health_status['status'] = 'unhealthy'
        health_status['checks']['cache'] = {
            'status': 'unhealthy',
            'message': f'Cache check failed: {str(e)}'
        }
        logger.error(f"Cache health check failed: {e}")
    
    # Storage check (if using S3)
    if hasattr(settings, 'AWS_STORAGE_BUCKET_NAME') and settings.AWS_STORAGE_BUCKET_NAME:
        try:
            import boto3
            from botocore.exceptions import ClientError
            
            s3_client = boto3.client(
                's3',
                aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
                region_name=settings.AWS_S3_REGION_NAME
            )
            
            # Check if bucket exists and is accessible
            s3_client.head_bucket(Bucket=settings.AWS_STORAGE_BUCKET_NAME)
            
            health_status['checks']['storage'] = {
                'status': 'healthy',
                'message': 'S3 storage is accessible'
            }
        except ClientError as e:
            health_status['status'] = 'unhealthy'
            health_status['checks']['storage'] = {
                'status': 'unhealthy',
                'message': f'S3 storage check failed: {str(e)}'
            }
            logger.error(f"S3 health check failed: {e}")
        except Exception as e:
            health_status['checks']['storage'] = {
                'status': 'warning',
                'message': f'Storage check skipped: {str(e)}'
            }
    
    # Memory usage check
    try:
        import psutil
        memory = psutil.virtual_memory()
        memory_usage = memory.percent
        
        if memory_usage < 80:
            status = 'healthy'
            message = f'Memory usage: {memory_usage}%'
        elif memory_usage < 90:
            status = 'warning'
            message = f'High memory usage: {memory_usage}%'
        else:
            status = 'unhealthy'
            message = f'Critical memory usage: {memory_usage}%'
            health_status['status'] = 'unhealthy'
        
        health_status['checks']['memory'] = {
            'status': status,
            'message': message,
            'usage_percent': memory_usage
        }
    except ImportError:
        health_status['checks']['memory'] = {
            'status': 'skipped',
            'message': 'psutil not available'
        }
    except Exception as e:
        health_status['checks']['memory'] = {
            'status': 'error',
            'message': f'Memory check failed: {str(e)}'
        }
    
    # Disk usage check
    try:
        import shutil
        disk_usage = shutil.disk_usage('/')
        used_percent = (disk_usage.used / disk_usage.total) * 100
        
        if used_percent < 80:
            status = 'healthy'
            message = f'Disk usage: {used_percent:.1f}%'
        elif used_percent < 90:
            status = 'warning'
            message = f'High disk usage: {used_percent:.1f}%'
        else:
            status = 'unhealthy'
            message = f'Critical disk usage: {used_percent:.1f}%'
            health_status['status'] = 'unhealthy'
        
        health_status['checks']['disk'] = {
            'status': status,
            'message': message,
            'usage_percent': round(used_percent, 1)
        }
    except Exception as e:
        health_status['checks']['disk'] = {
            'status': 'error',
            'message': f'Disk check failed: {str(e)}'
        }
    
    # Set appropriate HTTP status code
    status_code = 200 if health_status['status'] == 'healthy' else 503
    
    return JsonResponse(health_status, status=status_code)


def readiness_check(request):
    """
    Readiness check for Kubernetes/container orchestration
    """
    try:
        # Check if the application is ready to serve requests
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            cursor.fetchone()
        
        return JsonResponse({
            'status': 'ready',
            'timestamp': time.time()
        })
    except Exception as e:
        logger.error(f"Readiness check failed: {e}")
        return JsonResponse({
            'status': 'not ready',
            'error': str(e),
            'timestamp': time.time()
        }, status=503)


def liveness_check(request):
    """
    Liveness check for Kubernetes/container orchestration
    """
    return JsonResponse({
        'status': 'alive',
        'timestamp': time.time()
    })