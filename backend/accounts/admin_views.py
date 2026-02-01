from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from django.db.models import Q, Count
from .models import User
from teachers.models import TeacherProfile, TeacherVerification
from audit.models import AuditLog
from .permissions import IsAdmin
from .serializers import UserSerializer
from teachers.serializers import TeacherProfileSerializer, TeacherVerificationSerializer


class AdminTeacherListView(generics.ListAPIView):
    """Admin view to list all teachers with their verification status"""
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated, IsAdmin]
    
    def get_queryset(self):
        queryset = User.objects.filter(role='teacher').select_related('teacher_profile')
        
        # Filter by verification status if provided
        status_filter = self.request.query_params.get('status')
        if status_filter:
            if status_filter == 'verified':
                queryset = queryset.filter(is_verified=True)
            elif status_filter == 'unverified':
                queryset = queryset.filter(is_verified=False)
            elif status_filter == 'pending':
                queryset = queryset.filter(
                    teacher_profile__verification__status='pending'
                )
        
        # Search by name or email
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search) | Q(email__icontains=search)
            )
        
        return queryset.order_by('-created_at')
    
    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        
        # Add verification status and profile info to each teacher
        teachers_data = []
        for teacher_data in serializer.data:
            teacher = User.objects.get(id=teacher_data['id'])
            
            # Get teacher profile if exists
            profile_data = None
            verification_data = None
            
            if hasattr(teacher, 'teacher_profile'):
                profile_serializer = TeacherProfileSerializer(teacher.teacher_profile)
                profile_data = profile_serializer.data
                
                # Get verification data if exists
                if hasattr(teacher.teacher_profile, 'verification'):
                    verification_serializer = TeacherVerificationSerializer(
                        teacher.teacher_profile.verification
                    )
                    verification_data = verification_serializer.data
            
            teacher_info = {
                **teacher_data,
                'profile': profile_data,
                'verification': verification_data
            }
            teachers_data.append(teacher_info)
        
        return Response({
            'count': len(teachers_data),
            'results': teachers_data
        })


class AdminLearnerListView(generics.ListAPIView):
    """Admin view to list all learners"""
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated, IsAdmin]
    
    def get_queryset(self):
        queryset = User.objects.filter(role='learner')
        
        # Filter by active status if provided
        active_filter = self.request.query_params.get('active')
        if active_filter:
            if active_filter == 'true':
                queryset = queryset.filter(is_active=True)
            elif active_filter == 'false':
                queryset = queryset.filter(is_active=False)
        
        # Search by name or email
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search) | Q(email__icontains=search)
            )
        
        return queryset.order_by('-created_at')


@api_view(['PATCH'])
@permission_classes([IsAuthenticated, IsAdmin])
def approve_teacher(request, teacher_id):
    """Approve a teacher's verification"""
    try:
        teacher = User.objects.get(id=teacher_id, role='teacher')
        
        # Get or create teacher profile
        teacher_profile, created = TeacherProfile.objects.get_or_create(user=teacher)
        
        # Update verification status if exists
        if hasattr(teacher_profile, 'verification'):
            verification = teacher_profile.verification
            verification.status = 'approved'
            verification.reviewed_by = request.user
            verification.reviewed_at = timezone.now()
            verification.review_notes = request.data.get('review_notes', 'Approved by admin')
            verification.save()  # This will trigger user verification update
        else:
            # Manually approve if no verification exists
            teacher.is_verified = True
            teacher.save()
            teacher_profile.is_approved = True
            teacher_profile.save()
        
        # Log the action
        AuditLog.objects.create(
            user=request.user,
            action='approve',
            resource_type='teacher',
            resource_id=str(teacher.id),
            details={
                'teacher_email': teacher.email,
                'teacher_name': teacher.name,
                'review_notes': request.data.get('review_notes', '')
            },
            ip_address=request.META.get('REMOTE_ADDR'),
            user_agent=request.META.get('HTTP_USER_AGENT', '')
        )
        
        return Response({
            'message': f'Teacher {teacher.name} has been approved',
            'teacher_id': teacher.id,
            'status': 'approved'
        })
        
    except User.DoesNotExist:
        return Response({
            'error': 'Teacher not found'
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({
            'error': str(e)
        }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated, IsAdmin])
def reject_teacher(request, teacher_id):
    """Reject a teacher's verification"""
    try:
        teacher = User.objects.get(id=teacher_id, role='teacher')
        review_notes = request.data.get('review_notes', 'Rejected by admin')
        
        if not review_notes.strip():
            return Response({
                'error': 'Review notes are required for rejection'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Get or create teacher profile
        teacher_profile, created = TeacherProfile.objects.get_or_create(user=teacher)
        
        # Update verification status if exists
        if hasattr(teacher_profile, 'verification'):
            verification = teacher_profile.verification
            verification.status = 'rejected'
            verification.reviewed_by = request.user
            verification.reviewed_at = timezone.now()
            verification.review_notes = review_notes
            verification.save()  # This will trigger user verification update
        else:
            # Manually reject if no verification exists
            teacher.is_verified = False
            teacher.save()
            teacher_profile.is_approved = False
            teacher_profile.save()
        
        # Log the action
        AuditLog.objects.create(
            user=request.user,
            action='reject',
            resource_type='teacher',
            resource_id=str(teacher.id),
            details={
                'teacher_email': teacher.email,
                'teacher_name': teacher.name,
                'review_notes': review_notes
            },
            ip_address=request.META.get('REMOTE_ADDR'),
            user_agent=request.META.get('HTTP_USER_AGENT', '')
        )
        
        return Response({
            'message': f'Teacher {teacher.name} has been rejected',
            'teacher_id': teacher.id,
            'status': 'rejected',
            'review_notes': review_notes
        })
        
    except User.DoesNotExist:
        return Response({
            'error': 'Teacher not found'
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({
            'error': str(e)
        }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated, IsAdmin])
def suspend_teacher(request, teacher_id):
    """Suspend a teacher account"""
    try:
        teacher = User.objects.get(id=teacher_id, role='teacher')
        reason = request.data.get('reason', 'Suspended by admin')
        
        if not reason.strip():
            return Response({
                'error': 'Suspension reason is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Suspend the teacher
        teacher.is_active = False
        teacher.is_verified = False
        teacher.save()
        
        # Update teacher profile
        if hasattr(teacher, 'teacher_profile'):
            teacher.teacher_profile.is_approved = False
            teacher.teacher_profile.save()
            
            # Update verification status if exists
            if hasattr(teacher.teacher_profile, 'verification'):
                verification = teacher.teacher_profile.verification
                verification.status = 'suspended'
                verification.reviewed_by = request.user
                verification.reviewed_at = timezone.now()
                verification.review_notes = reason
                verification.save()
        
        # Log the action
        AuditLog.objects.create(
            user=request.user,
            action='suspend',
            resource_type='teacher',
            resource_id=str(teacher.id),
            details={
                'teacher_email': teacher.email,
                'teacher_name': teacher.name,
                'reason': reason
            },
            ip_address=request.META.get('REMOTE_ADDR'),
            user_agent=request.META.get('HTTP_USER_AGENT', '')
        )
        
        return Response({
            'message': f'Teacher {teacher.name} has been suspended',
            'teacher_id': teacher.id,
            'status': 'suspended',
            'reason': reason
        })
        
    except User.DoesNotExist:
        return Response({
            'error': 'Teacher not found'
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({
            'error': str(e)
        }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated, IsAdmin])
def suspend_learner(request, learner_id):
    """Suspend a learner account"""
    try:
        learner = User.objects.get(id=learner_id, role='learner')
        reason = request.data.get('reason', 'Suspended by admin')
        
        if not reason.strip():
            return Response({
                'error': 'Suspension reason is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Suspend the learner
        learner.is_active = False
        learner.save()
        
        # Log the action
        AuditLog.objects.create(
            user=request.user,
            action='suspend',
            resource_type='learner',
            resource_id=str(learner.id),
            details={
                'learner_email': learner.email,
                'learner_name': learner.name,
                'reason': reason
            },
            ip_address=request.META.get('REMOTE_ADDR'),
            user_agent=request.META.get('HTTP_USER_AGENT', '')
        )
        
        return Response({
            'message': f'Learner {learner.name} has been suspended',
            'learner_id': learner.id,
            'status': 'suspended',
            'reason': reason
        })
        
    except User.DoesNotExist:
        return Response({
            'error': 'Learner not found'
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({
            'error': str(e)
        }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated, IsAdmin])
def reactivate_user(request, user_id):
    """Reactivate a suspended user account"""
    try:
        user = User.objects.get(id=user_id)
        
        # Reactivate the user
        user.is_active = True
        user.save()
        
        # Log the action
        AuditLog.objects.create(
            user=request.user,
            action='reactivate',
            resource_type=user.role,
            resource_id=str(user.id),
            details={
                'user_email': user.email,
                'user_name': user.name,
                'user_role': user.role
            },
            ip_address=request.META.get('REMOTE_ADDR'),
            user_agent=request.META.get('HTTP_USER_AGENT', '')
        )
        
        return Response({
            'message': f'User {user.name} has been reactivated',
            'user_id': user.id,
            'status': 'active'
        })
        
    except User.DoesNotExist:
        return Response({
            'error': 'User not found'
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({
            'error': str(e)
        }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdmin])
def admin_dashboard_stats(request):
    """Get dashboard statistics for admin"""
    try:
        # User statistics
        total_users = User.objects.count()
        total_teachers = User.objects.filter(role='teacher').count()
        total_learners = User.objects.filter(role='learner').count()
        verified_teachers = User.objects.filter(role='teacher', is_verified=True).count()
        pending_verifications = TeacherVerification.objects.filter(status='pending').count()
        
        # Activity statistics (last 30 days)
        from datetime import datetime, timedelta
        thirty_days_ago = timezone.now() - timedelta(days=30)
        
        new_users_30d = User.objects.filter(created_at__gte=thirty_days_ago).count()
        new_teachers_30d = User.objects.filter(
            role='teacher', created_at__gte=thirty_days_ago
        ).count()
        
        # Recent activity logs
        recent_activities = AuditLog.objects.select_related('user').order_by('-timestamp')[:10]
        activities_data = []
        
        for activity in recent_activities:
            activities_data.append({
                'id': activity.id,
                'user': activity.user.name if activity.user else 'System',
                'action': activity.action,
                'resource_type': activity.resource_type,
                'resource_id': activity.resource_id,
                'timestamp': activity.timestamp,
                'details': activity.details
            })
        
        return Response({
            'user_stats': {
                'total_users': total_users,
                'total_teachers': total_teachers,
                'total_learners': total_learners,
                'verified_teachers': verified_teachers,
                'pending_verifications': pending_verifications
            },
            'activity_stats': {
                'new_users_30d': new_users_30d,
                'new_teachers_30d': new_teachers_30d
            },
            'recent_activities': activities_data
        })
        
    except Exception as e:
        return Response({
            'error': str(e)
        }, status=status.HTTP_400_BAD_REQUEST)