from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from django.core.exceptions import ValidationError
from accounts.permissions import IsTeacher, IsAdmin
from .models import TeacherProfile, TeacherVerification
from .serializers import (
    TeacherProfileSerializer, TeacherVerificationSerializer,
    FileUploadRequestSerializer, VerificationSubmissionSerializer,
    VerificationReviewSerializer
)
from .services import s3_service


class TeacherProfileView(generics.RetrieveUpdateAPIView):
    """Teacher profile management"""
    serializer_class = TeacherProfileSerializer
    permission_classes = [IsAuthenticated, IsTeacher]
    
    def get_object(self):
        profile, created = TeacherProfile.objects.get_or_create(user=self.request.user)
        return profile


class TeacherVerificationStatusView(generics.RetrieveAPIView):
    """Get teacher verification status"""
    serializer_class = TeacherVerificationSerializer
    permission_classes = [IsAuthenticated, IsTeacher]
    
    def get_object(self):
        try:
            teacher_profile = TeacherProfile.objects.get(user=self.request.user)
            return teacher_profile.verification
        except (TeacherProfile.DoesNotExist, TeacherVerification.DoesNotExist):
            return None
    
    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance is None:
            return Response({
                'status': 'not_submitted',
                'message': 'Verification not yet submitted'
            })
        
        serializer = self.get_serializer(instance)
        return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsTeacher])
def generate_upload_url(request):
    """Generate presigned URL for file upload"""
    serializer = FileUploadRequestSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    
    try:
        upload_data = s3_service.generate_presigned_url(
            file_name=serializer.validated_data['file_name'],
            file_type=serializer.validated_data['file_type'],
            upload_type=serializer.validated_data['upload_type'],
            user_id=request.user.id
        )
        
        return Response({
            'upload_url': upload_data['upload_url'],
            's3_key': upload_data['s3_key'],
            'message': 'Upload URL generated successfully'
        })
        
    except ValidationError as e:
        return Response({
            'error': str(e)
        }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsTeacher])
def submit_verification(request):
    """Submit teacher verification documents"""
    serializer = VerificationSubmissionSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    
    try:
        # Get or create teacher profile
        teacher_profile, created = TeacherProfile.objects.get_or_create(user=request.user)
        
        # Check if verification already exists
        if hasattr(teacher_profile, 'verification'):
            if teacher_profile.verification.status == 'pending':
                return Response({
                    'error': 'Verification already submitted and pending review'
                }, status=status.HTTP_400_BAD_REQUEST)
            elif teacher_profile.verification.status == 'approved':
                return Response({
                    'error': 'You are already verified'
                }, status=status.HTTP_400_BAD_REQUEST)
        
        # Create or update verification
        verification_data = {
            'teacher': teacher_profile,
            'government_id': serializer.validated_data['government_id_key'],
            'portfolio': serializer.validated_data['portfolio_key'],
            'demo_video': serializer.validated_data['demo_video_key'],
            'status': 'pending'
        }
        
        if hasattr(teacher_profile, 'verification'):
            # Update existing verification
            for key, value in verification_data.items():
                if key != 'teacher':
                    setattr(teacher_profile.verification, key, value)
            teacher_profile.verification.save()
            verification = teacher_profile.verification
        else:
            # Create new verification
            verification = TeacherVerification.objects.create(**verification_data)
        
        return Response({
            'message': 'Verification submitted successfully',
            'submission_id': str(verification.submission_id),
            'status': verification.status
        }, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        return Response({
            'error': f'Failed to submit verification: {str(e)}'
        }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def download_verification_file(request, submission_id, file_type):
    """Generate download URL for verification files"""
    try:
        # Check if user is admin or the teacher who submitted
        verification = TeacherVerification.objects.get(submission_id=submission_id)
        
        if not (request.user.is_admin or verification.teacher.user == request.user):
            return Response({
                'error': 'Permission denied'
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Get the appropriate file field
        file_field_map = {
            'government_id': verification.government_id,
            'portfolio': verification.portfolio,
            'demo_video': verification.demo_video
        }
        
        if file_type not in file_field_map:
            return Response({
                'error': 'Invalid file type'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        file_field = file_field_map[file_type]
        if not file_field:
            return Response({
                'error': 'File not found'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Generate download URL
        download_url = s3_service.generate_presigned_download_url(file_field.name)
        
        return Response({
            'download_url': download_url,
            'expires_in': 3600
        })
        
    except TeacherVerification.DoesNotExist:
        return Response({
            'error': 'Verification not found'
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({
            'error': str(e)
        }, status=status.HTTP_400_BAD_REQUEST)


# Admin Views
class AdminVerificationListView(generics.ListAPIView):
    """Admin view to list all verifications"""
    queryset = TeacherVerification.objects.all().order_by('-submitted_at')
    serializer_class = TeacherVerificationSerializer
    permission_classes = [IsAuthenticated, IsAdmin]


class AdminVerificationDetailView(generics.RetrieveUpdateAPIView):
    """Admin view to review verification"""
    queryset = TeacherVerification.objects.all()
    serializer_class = TeacherVerificationSerializer
    permission_classes = [IsAuthenticated, IsAdmin]
    lookup_field = 'submission_id'


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsAdmin])
def review_verification(request, submission_id):
    """Admin endpoint to review verification"""
    try:
        verification = TeacherVerification.objects.get(submission_id=submission_id)
        serializer = VerificationReviewSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Update verification
        verification.status = serializer.validated_data['status']
        verification.review_notes = serializer.validated_data.get('review_notes', '')
        verification.reviewed_by = request.user
        verification.reviewed_at = timezone.now()
        verification.save()  # This will trigger the save method to update user verification status
        
        return Response({
            'message': f'Verification {verification.status}',
            'status': verification.status,
            'reviewed_at': verification.reviewed_at
        })
        
    except TeacherVerification.DoesNotExist:
        return Response({
            'error': 'Verification not found'
        }, status=status.HTTP_404_NOT_FOUND)