from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.db import transaction
from decimal import Decimal
from accounts.permissions import IsTeacher, IsAdmin
from .payout_models import TeacherBankAccount, TeacherEarnings, PayoutRequest, PayoutTransaction
from .payout_serializers import (
    TeacherBankAccountSerializer, TeacherBankAccountCreateSerializer,
    TeacherEarningsSerializer, PayoutRequestSerializer, PayoutRequestCreateSerializer,
    PayoutTransactionSerializer, AdminPayoutRequestSerializer
)


# Teacher Bank Account Views

class TeacherBankAccountView(generics.RetrieveUpdateAPIView):
    """Get and update teacher bank account information"""
    
    permission_classes = [IsAuthenticated, IsTeacher]
    
    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return TeacherBankAccountCreateSerializer
        return TeacherBankAccountSerializer
    
    def get_object(self):
        """Get or create bank account for current teacher"""
        bank_account, created = TeacherBankAccount.objects.get_or_create(
            teacher=self.request.user
        )
        return bank_account
    
    def perform_update(self, serializer):
        """Update bank account and reset verification status"""
        # Reset verification when bank details change
        serializer.save(is_verified=False, verified_at=None)


class TeacherBankAccountCreateView(generics.CreateAPIView):
    """Create teacher bank account"""
    
    serializer_class = TeacherBankAccountCreateSerializer
    permission_classes = [IsAuthenticated, IsTeacher]
    
    def perform_create(self, serializer):
        serializer.save(teacher=self.request.user)


# Teacher Earnings Views

class TeacherEarningsView(generics.RetrieveAPIView):
    """Get teacher earnings summary"""
    
    serializer_class = TeacherEarningsSerializer
    permission_classes = [IsAuthenticated, IsTeacher]
    
    def get_object(self):
        """Get or create earnings record for current teacher"""
        earnings, created = TeacherEarnings.objects.get_or_create(
            teacher=self.request.user
        )
        return earnings


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsTeacher])
def teacher_earnings_dashboard(request):
    """Get comprehensive earnings dashboard data"""
    
    try:
        earnings = request.user.earnings
    except TeacherEarnings.DoesNotExist:
        earnings = TeacherEarnings.objects.create(teacher=request.user)
    
    # Get recent transactions
    recent_transactions = PayoutTransaction.objects.filter(
        teacher=request.user
    ).select_related('course', 'payment').order_by('-created_at')[:10]
    
    # Get pending payout requests
    pending_payouts = PayoutRequest.objects.filter(
        teacher=request.user,
        status__in=['requested', 'processing']
    ).order_by('-requested_at')
    
    # Calculate monthly earnings (last 12 months)
    from django.db.models import Sum
    from datetime import datetime, timedelta
    
    monthly_earnings = []
    for i in range(12):
        month_start = (datetime.now().replace(day=1) - timedelta(days=30*i)).replace(day=1)
        month_end = (month_start + timedelta(days=32)).replace(day=1) - timedelta(days=1)
        
        month_total = PayoutTransaction.objects.filter(
            teacher=request.user,
            created_at__range=[month_start, month_end]
        ).aggregate(total=Sum('net_amount'))['total'] or Decimal('0.00')
        
        monthly_earnings.append({
            'month': month_start.strftime('%Y-%m'),
            'earnings': float(month_total)
        })
    
    monthly_earnings.reverse()  # Oldest to newest
    
    return Response({
        'earnings_summary': TeacherEarningsSerializer(earnings).data,
        'recent_transactions': PayoutTransactionSerializer(recent_transactions, many=True).data,
        'pending_payouts': PayoutRequestSerializer(pending_payouts, many=True).data,
        'monthly_earnings': monthly_earnings,
        'has_bank_account': hasattr(request.user, 'bank_account'),
        'bank_account_verified': hasattr(request.user, 'bank_account') and request.user.bank_account.is_verified
    })


# Payout Request Views

class PayoutRequestListCreateView(generics.ListCreateAPIView):
    """List and create payout requests"""
    
    permission_classes = [IsAuthenticated, IsTeacher]
    
    def get_serializer_class(self):
        if self.request.method == 'POST':
            return PayoutRequestCreateSerializer
        return PayoutRequestSerializer
    
    def get_queryset(self):
        """Return payout requests for current teacher"""
        return PayoutRequest.objects.filter(
            teacher=self.request.user
        ).select_related('bank_account', 'processed_by').order_by('-requested_at')
    
    def perform_create(self, serializer):
        """Create payout request and update earnings"""
        with transaction.atomic():
            # Get teacher's bank account
            try:
                bank_account = self.request.user.bank_account
                if not bank_account.is_verified:
                    return Response(
                        {'error': 'Bank account must be verified before requesting payout'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            except TeacherBankAccount.DoesNotExist:
                return Response(
                    {'error': 'Bank account information required'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Create payout request
            payout_request = serializer.save(
                teacher=self.request.user,
                bank_account=bank_account
            )
            
            # Update pending balance (reserve the amount)
            earnings = self.request.user.earnings
            earnings.pending_balance -= payout_request.amount
            earnings.save()


class PayoutRequestDetailView(generics.RetrieveUpdateAPIView):
    """Get and update payout request details"""
    
    serializer_class = PayoutRequestSerializer
    permission_classes = [IsAuthenticated, IsTeacher]
    
    def get_queryset(self):
        return PayoutRequest.objects.filter(teacher=self.request.user)
    
    def update(self, request, *args, **kwargs):
        """Only allow cancellation by teacher"""
        instance = self.get_object()
        
        if 'status' in request.data and request.data['status'] == 'cancelled':
            if not instance.can_be_cancelled:
                return Response(
                    {'error': 'Cannot cancel this payout request'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            with transaction.atomic():
                # Return amount to pending balance
                earnings = request.user.earnings
                earnings.pending_balance += instance.amount
                earnings.save()
                
                # Update payout request
                instance.status = 'cancelled'
                instance.save()
            
            return Response(PayoutRequestSerializer(instance).data)
        
        return Response(
            {'error': 'Only cancellation is allowed'},
            status=status.HTTP_400_BAD_REQUEST
        )


# Transaction Views

class PayoutTransactionListView(generics.ListAPIView):
    """List teacher's earning transactions"""
    
    serializer_class = PayoutTransactionSerializer
    permission_classes = [IsAuthenticated, IsTeacher]
    
    def get_queryset(self):
        return PayoutTransaction.objects.filter(
            teacher=self.request.user
        ).select_related('course', 'payment').order_by('-created_at')


# Admin Views

class AdminPayoutRequestListView(generics.ListAPIView):
    """Admin view of all payout requests"""
    
    serializer_class = AdminPayoutRequestSerializer
    permission_classes = [IsAuthenticated, IsAdmin]
    
    def get_queryset(self):
        queryset = PayoutRequest.objects.select_related(
            'teacher', 'bank_account', 'processed_by'
        ).order_by('-requested_at')
        
        # Filter by status if provided
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        return queryset


class AdminPayoutRequestDetailView(generics.RetrieveUpdateAPIView):
    """Admin view for managing individual payout requests"""
    
    serializer_class = AdminPayoutRequestSerializer
    permission_classes = [IsAuthenticated, IsAdmin]
    queryset = PayoutRequest.objects.select_related('teacher', 'bank_account', 'processed_by')
    
    def perform_update(self, serializer):
        """Update payout request with admin processing"""
        instance = serializer.instance
        old_status = instance.status
        
        serializer.save()
        
        # If status changed to paid, create earning transactions
        if (serializer.validated_data.get('status') == 'paid' and 
            old_status != 'paid'):
            self._mark_transactions_as_paid(instance)
    
    def _mark_transactions_as_paid(self, payout_request):
        """Mark related transactions as paid out"""
        # This is a simplified approach - in production you might want
        # to track which specific transactions are included in each payout
        PayoutTransaction.objects.filter(
            teacher=payout_request.teacher,
            is_paid_out=False
        ).update(
            is_paid_out=True,
            payout_request=payout_request
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsAdmin])
def verify_bank_account(request, teacher_id):
    """Admin endpoint to verify teacher bank account"""
    
    try:
        teacher = get_object_or_404(
            TeacherBankAccount,
            teacher_id=teacher_id
        )
        
        teacher.is_verified = True
        teacher.verified_at = timezone.now()
        teacher.save()
        
        return Response({
            'message': 'Bank account verified successfully',
            'verified_at': teacher.verified_at
        })
        
    except TeacherBankAccount.DoesNotExist:
        return Response(
            {'error': 'Bank account not found'},
            status=status.HTTP_404_NOT_FOUND
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdmin])
def admin_payout_dashboard(request):
    """Admin dashboard for payout management"""
    
    from django.db.models import Sum, Count
    
    # Get summary statistics
    stats = {
        'pending_requests': PayoutRequest.objects.filter(status='requested').count(),
        'processing_requests': PayoutRequest.objects.filter(status='processing').count(),
        'total_pending_amount': PayoutRequest.objects.filter(
            status__in=['requested', 'processing']
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00'),
        'total_paid_out': PayoutRequest.objects.filter(
            status='paid'
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00'),
        'unverified_accounts': TeacherBankAccount.objects.filter(
            is_verified=False
        ).count()
    }
    
    # Get recent requests
    recent_requests = PayoutRequest.objects.select_related(
        'teacher', 'bank_account'
    ).order_by('-requested_at')[:10]
    
    return Response({
        'stats': stats,
        'recent_requests': AdminPayoutRequestSerializer(recent_requests, many=True).data
    })