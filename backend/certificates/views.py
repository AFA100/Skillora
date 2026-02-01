from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.http import HttpResponse, Http404
from .models import Certificate
from .serializers import (
    CertificateSerializer, 
    CertificateVerificationSerializer,
    CertificateListSerializer
)
from .services import verify_certificate, generate_certificate_for_enrollment
from enrollments.models import Enrollment
import logging

logger = logging.getLogger(__name__)


class CertificateListView(generics.ListAPIView):
    """
    List certificates for authenticated user
    """
    serializer_class = CertificateListSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return Certificate.objects.filter(
            student=self.request.user,
            is_valid=True
        ).select_related('course', 'student')


class CertificateDetailView(generics.RetrieveAPIView):
    """
    Get certificate details
    """
    serializer_class = CertificateSerializer
    permission_classes = [IsAuthenticated]
    lookup_field = 'certificate_id'
    
    def get_queryset(self):
        return Certificate.objects.filter(
            student=self.request.user,
            is_valid=True
        ).select_related('course', 'student')


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def generate_certificate(request, enrollment_id):
    """
    Generate certificate for completed enrollment
    """
    try:
        enrollment = get_object_or_404(
            Enrollment,
            id=enrollment_id,
            student=request.user,
            is_completed=True
        )
        
        # Check if certificate already exists
        if hasattr(enrollment, 'certificate'):
            certificate = enrollment.certificate
        else:
            certificate = generate_certificate_for_enrollment(enrollment)
        
        serializer = CertificateSerializer(certificate, context={'request': request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)
        
    except Enrollment.DoesNotExist:
        return Response(
            {'error': 'Enrollment not found or not completed'},
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        logger.error(f"Error generating certificate: {e}")
        return Response(
            {'error': 'Failed to generate certificate'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([AllowAny])
def verify_certificate_view(request, verification_code):
    """
    Verify certificate by verification code
    """
    try:
        result = verify_certificate(verification_code)
        
        if result['valid']:
            return Response({
                'valid': True,
                'certificate': {
                    'student_name': result['student_name'],
                    'course_title': result['course_title'],
                    'completion_date': result['completion_date'],
                    'certificate_number': result['certificate_number'],
                }
            })
        else:
            return Response(
                {'valid': False, 'error': result['error']},
                status=status.HTTP_404_NOT_FOUND
            )
            
    except Exception as e:
        logger.error(f"Error verifying certificate: {e}")
        return Response(
            {'valid': False, 'error': 'Verification failed'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def download_certificate(request, certificate_id):
    """
    Download certificate PDF
    """
    try:
        certificate = get_object_or_404(
            Certificate,
            certificate_id=certificate_id,
            student=request.user,
            is_valid=True
        )
        
        if not certificate.pdf_file:
            # Generate PDF if it doesn't exist
            certificate.generate_pdf()
        
        # Return PDF file
        response = HttpResponse(
            certificate.pdf_file.read(),
            content_type='application/pdf'
        )
        response['Content-Disposition'] = f'attachment; filename="certificate_{certificate.certificate_number}.pdf"'
        return response
        
    except Certificate.DoesNotExist:
        raise Http404("Certificate not found")
    except Exception as e:
        logger.error(f"Error downloading certificate: {e}")
        return Response(
            {'error': 'Failed to download certificate'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


# Admin views
class AdminCertificateListView(generics.ListAPIView):
    """
    Admin view to list all certificates
    """
    serializer_class = CertificateSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        # Only allow admin users
        if not self.request.user.role == 'admin':
            return Certificate.objects.none()
        
        return Certificate.objects.all().select_related('course', 'student')


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def revoke_certificate(request, certificate_id):
    """
    Admin endpoint to revoke certificate
    """
    if request.user.role != 'admin':
        return Response(
            {'error': 'Permission denied'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    try:
        certificate = get_object_or_404(Certificate, certificate_id=certificate_id)
        certificate.is_valid = False
        certificate.save()
        
        return Response({'message': 'Certificate revoked successfully'})
        
    except Exception as e:
        logger.error(f"Error revoking certificate: {e}")
        return Response(
            {'error': 'Failed to revoke certificate'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )