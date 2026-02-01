from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from django.db.models import Q
from accounts.permissions import IsLearner, IsTeacherOrAdmin
from courses.models import Course
from .models import Payment, PaymentMethod
from .serializers import (
    PaymentSerializer, PaymentCreateSerializer, PaymentMethodSerializer,
    StripePaymentIntentSerializer, PaymentConfirmationSerializer,
    RefundRequestSerializer, PaymentStatsSerializer
)
from .services import StripePaymentService, PaymentAnalyticsService


class PaymentListView(generics.ListAPIView):
    """List user payments"""
    serializer_class = PaymentSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Return payments for the authenticated user"""
        return Payment.objects.filter(user=self.request.user).select_related('course')


class PaymentDetailView(generics.RetrieveAPIView):
    """Get payment details"""
    serializer_class = PaymentSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return Payment.objects.filter(user=self.request.user).select_related('course')


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsLearner])
def create_payment_intent(request):
    """Create a Stripe payment intent for course purchase"""
    serializer = StripePaymentIntentSerializer(
        data=request.data,
        context={'request': request}
    )
    serializer.is_valid(raise_exception=True)
    
    course_id = serializer.validated_data['course_id']
    payment_method_id = serializer.validated_data.get('payment_method_id')
    save_payment_method = serializer.validated_data.get('save_payment_method', False)
    
    try:
        course = get_object_or_404(Course, id=course_id, status='published')
        
        # Check if course is free
        if course.price == 0:
            return Response({
                'error': 'Free courses do not require payment'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        result = StripePaymentService.create_payment_intent(
            user=request.user,
            course=course,
            payment_method_id=payment_method_id,
            save_payment_method=save_payment_method
        )
        
        return Response({
            'payment_id': str(result['payment'].id),
            'client_secret': result['client_secret'],
            'amount': str(course.price),
            'currency': 'USD',
            'course_title': course.title
        })
        
    except Exception as e:
        return Response({
            'error': str(e)
        }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsLearner])
def confirm_payment(request):
    """Confirm payment and create enrollment"""
    serializer = PaymentConfirmationSerializer(
        data=request.data,
        context={'request': request}
    )
    serializer.is_valid(raise_exception=True)
    
    payment_intent_id = serializer.validated_data['payment_intent_id']
    
    try:
        result = StripePaymentService.confirm_payment(payment_intent_id)
        
        if result['success']:
            return Response({
                'success': True,
                'message': result['message'],
                'enrollment_id': result['enrollment'].id,
                'course_title': result['enrollment'].course.title
            })
        else:
            return Response({
                'success': False,
                'message': result['message'],
                'requires_action': result.get('requires_action', False),
                'client_secret': result.get('client_secret')
            }, status=status.HTTP_400_BAD_REQUEST)
            
    except Exception as e:
        return Response({
            'success': False,
            'message': f'Error confirming payment: {str(e)}'
        }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def request_refund(request, payment_id):
    """Request a refund for a payment"""
    try:
        payment = get_object_or_404(
            Payment,
            id=payment_id,
            user=request.user,
            status='completed'
        )
        
        serializer = RefundRequestSerializer(
            data=request.data,
            context={'payment': payment}
        )
        serializer.is_valid(raise_exception=True)
        
        amount = serializer.validated_data.get('amount')
        reason = serializer.validated_data.get('reason', '')
        
        result = StripePaymentService.create_refund(
            payment=payment,
            amount=amount,
            reason=reason
        )
        
        if result['success']:
            return Response({
                'success': True,
                'message': result['message'],
                'refunded_amount': str(payment.refunded_amount),
                'status': payment.status
            })
        else:
            return Response({
                'success': False,
                'message': result['message']
            }, status=status.HTTP_400_BAD_REQUEST)
            
    except Exception as e:
        return Response({
            'success': False,
            'message': f'Error processing refund: {str(e)}'
        }, status=status.HTTP_400_BAD_REQUEST)


class PaymentMethodListView(generics.ListAPIView):
    """List user payment methods"""
    serializer_class = PaymentMethodSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return PaymentMethod.objects.filter(
            user=self.request.user,
            is_active=True
        ).order_by('-is_default', '-created_at')


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def save_payment_method(request):
    """Save a payment method for future use"""
    payment_method_id = request.data.get('payment_method_id')
    
    if not payment_method_id:
        return Response({
            'error': 'payment_method_id is required'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        result = StripePaymentService.save_payment_method(
            user=request.user,
            payment_method_id=payment_method_id
        )
        
        if result['success']:
            serializer = PaymentMethodSerializer(result['payment_method'])
            return Response({
                'success': True,
                'message': result['message'],
                'payment_method': serializer.data
            })
        else:
            return Response({
                'success': False,
                'message': result['message']
            }, status=status.HTTP_400_BAD_REQUEST)
            
    except Exception as e:
        return Response({
            'success': False,
            'message': f'Error saving payment method: {str(e)}'
        }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsTeacherOrAdmin])
def payment_stats(request):
    """Get payment statistics"""
    try:
        # Get query parameters
        course_id = request.query_params.get('course_id')
        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')
        
        course = None
        if course_id:
            course = get_object_or_404(Course, id=course_id)
            
            # Check if user owns the course (for teachers)
            if request.user.role == 'teacher' and course.instructor != request.user:
                return Response({
                    'error': 'Access denied'
                }, status=status.HTTP_403_FORBIDDEN)
        
        # For teachers, only show stats for their courses
        user_filter = None
        if request.user.role == 'teacher':
            user_filter = request.user
        
        stats = PaymentAnalyticsService.get_payment_stats(
            user=user_filter,
            course=course,
            date_from=date_from,
            date_to=date_to
        )
        
        serializer = PaymentStatsSerializer(stats)
        return Response(serializer.data)
        
    except Exception as e:
        return Response({
            'error': str(e)
        }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsTeacherOrAdmin])
def revenue_chart(request):
    """Get revenue data for charts"""
    try:
        period = request.query_params.get('period', 'month')
        course_id = request.query_params.get('course_id')
        
        course = None
        if course_id:
            course = get_object_or_404(Course, id=course_id)
            
            # Check if user owns the course (for teachers)
            if request.user.role == 'teacher' and course.instructor != request.user:
                return Response({
                    'error': 'Access denied'
                }, status=status.HTTP_403_FORBIDDEN)
        
        # For teachers, only show revenue for their courses
        user_filter = None
        if request.user.role == 'teacher':
            user_filter = request.user
        
        revenue_data = PaymentAnalyticsService.get_revenue_by_period(
            period=period,
            user=user_filter,
            course=course
        )
        
        return Response({
            'period': period,
            'data': list(revenue_data)
        })
        
    except Exception as e:
        return Response({
            'error': str(e)
        }, status=status.HTTP_400_BAD_REQUEST)