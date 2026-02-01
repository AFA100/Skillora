from rest_framework import serializers
from django.utils import timezone
from decimal import Decimal
from .payout_models import TeacherBankAccount, TeacherEarnings, PayoutRequest, PayoutTransaction


class TeacherBankAccountSerializer(serializers.ModelSerializer):
    """Serializer for teacher bank account information"""
    
    masked_account_number = serializers.ReadOnlyField()
    
    class Meta:
        model = TeacherBankAccount
        fields = [
            'id', 'bank_name', 'account_holder_name', 'masked_account_number',
            'routing_number', 'account_type', 'address_line1', 'address_line2',
            'city', 'state', 'postal_code', 'country', 'is_verified',
            'verified_at', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'is_verified', 'verified_at', 'created_at', 'updated_at']
    
    def create(self, validated_data):
        validated_data['teacher'] = self.context['request'].user
        return super().create(validated_data)
    
    def to_representation(self, instance):
        """Hide sensitive information in API responses"""
        data = super().to_representation(instance)
        # Remove actual account number from response
        data.pop('account_number', None)
        return data


class TeacherBankAccountCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating bank account with full account number"""
    
    class Meta:
        model = TeacherBankAccount
        fields = [
            'bank_name', 'account_holder_name', 'account_number',
            'routing_number', 'account_type', 'address_line1', 'address_line2',
            'city', 'state', 'postal_code', 'country'
        ]
    
    def validate_account_number(self, value):
        """Validate account number format"""
        if not value.isdigit():
            raise serializers.ValidationError("Account number must contain only digits")
        if len(value) < 8 or len(value) > 17:
            raise serializers.ValidationError("Account number must be between 8 and 17 digits")
        return value
    
    def validate_routing_number(self, value):
        """Validate routing number format"""
        if not value.isdigit():
            raise serializers.ValidationError("Routing number must contain only digits")
        if len(value) != 9:
            raise serializers.ValidationError("Routing number must be exactly 9 digits")
        return value


class TeacherEarningsSerializer(serializers.ModelSerializer):
    """Serializer for teacher earnings summary"""
    
    teacher_name = serializers.CharField(source='teacher.name', read_only=True)
    available_for_payout = serializers.SerializerMethodField()
    
    class Meta:
        model = TeacherEarnings
        fields = [
            'teacher_name', 'total_gross_revenue', 'total_net_earnings',
            'total_paid_out', 'pending_balance', 'available_for_payout',
            'commission_rate', 'last_updated'
        ]
        read_only_fields = ['last_updated']
    
    def get_available_for_payout(self, obj):
        """Calculate amount available for payout (minimum $10)"""
        return max(Decimal('0.00'), obj.pending_balance - Decimal('10.00'))


class PayoutRequestSerializer(serializers.ModelSerializer):
    """Serializer for payout requests"""
    
    teacher_name = serializers.CharField(source='teacher.name', read_only=True)
    bank_account_info = serializers.SerializerMethodField()
    can_be_cancelled = serializers.ReadOnlyField()
    is_completed = serializers.ReadOnlyField()
    processed_by_name = serializers.CharField(source='processed_by.name', read_only=True)
    
    class Meta:
        model = PayoutRequest
        fields = [
            'id', 'teacher_name', 'amount', 'status', 'bank_account_info',
            'processed_by_name', 'processed_at', 'external_transaction_id',
            'failure_reason', 'admin_notes', 'requested_at', 'updated_at',
            'can_be_cancelled', 'is_completed'
        ]
        read_only_fields = [
            'id', 'status', 'processed_by_name', 'processed_at',
            'external_transaction_id', 'failure_reason', 'admin_notes',
            'requested_at', 'updated_at'
        ]
    
    def get_bank_account_info(self, obj):
        """Get masked bank account information"""
        if obj.bank_account:
            return {
                'bank_name': obj.bank_account.bank_name,
                'account_holder_name': obj.bank_account.account_holder_name,
                'masked_account_number': obj.bank_account.masked_account_number,
                'account_type': obj.bank_account.get_account_type_display()
            }
        return None
    
    def validate_amount(self, value):
        """Validate payout amount"""
        if value < Decimal('10.00'):
            raise serializers.ValidationError("Minimum payout amount is $10.00")
        
        # Check if teacher has sufficient balance
        teacher = self.context['request'].user
        try:
            earnings = teacher.earnings
            if value > earnings.pending_balance:
                raise serializers.ValidationError(
                    f"Insufficient balance. Available: ${earnings.pending_balance}"
                )
        except TeacherEarnings.DoesNotExist:
            raise serializers.ValidationError("No earnings record found")
        
        return value
    
    def create(self, validated_data):
        teacher = self.context['request'].user
        
        # Get teacher's bank account
        try:
            bank_account = teacher.bank_account
            if not bank_account.is_verified:
                raise serializers.ValidationError("Bank account must be verified before requesting payout")
        except TeacherBankAccount.DoesNotExist:
            raise serializers.ValidationError("Bank account information required")
        
        validated_data['teacher'] = teacher
        validated_data['bank_account'] = bank_account
        
        return super().create(validated_data)


class PayoutRequestCreateSerializer(serializers.ModelSerializer):
    """Simplified serializer for creating payout requests"""
    
    class Meta:
        model = PayoutRequest
        fields = ['amount']
    
    def validate_amount(self, value):
        """Validate payout amount"""
        if value < Decimal('10.00'):
            raise serializers.ValidationError("Minimum payout amount is $10.00")
        
        # Check if teacher has sufficient balance
        teacher = self.context['request'].user
        try:
            earnings = teacher.earnings
            if value > earnings.pending_balance:
                raise serializers.ValidationError(
                    f"Insufficient balance. Available: ${earnings.pending_balance}"
                )
        except TeacherEarnings.DoesNotExist:
            raise serializers.ValidationError("No earnings record found")
        
        return value


class PayoutTransactionSerializer(serializers.ModelSerializer):
    """Serializer for payout transactions"""
    
    course_title = serializers.CharField(source='course.title', read_only=True)
    payment_date = serializers.DateTimeField(source='payment.created_at', read_only=True)
    
    class Meta:
        model = PayoutTransaction
        fields = [
            'id', 'course_title', 'gross_amount', 'commission_rate',
            'commission_amount', 'net_amount', 'is_paid_out',
            'payment_date', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class AdminPayoutRequestSerializer(serializers.ModelSerializer):
    """Admin serializer for managing payout requests"""
    
    teacher_name = serializers.CharField(source='teacher.name', read_only=True)
    teacher_email = serializers.CharField(source='teacher.email', read_only=True)
    bank_account_details = serializers.SerializerMethodField()
    
    class Meta:
        model = PayoutRequest
        fields = [
            'id', 'teacher_name', 'teacher_email', 'amount', 'status',
            'bank_account_details', 'processed_by', 'processed_at',
            'external_transaction_id', 'failure_reason', 'admin_notes',
            'requested_at', 'updated_at'
        ]
        read_only_fields = ['id', 'teacher_name', 'teacher_email', 'requested_at']
    
    def get_bank_account_details(self, obj):
        """Get full bank account details for admin"""
        if obj.bank_account:
            return {
                'bank_name': obj.bank_account.bank_name,
                'account_holder_name': obj.bank_account.account_holder_name,
                'account_number': obj.bank_account.account_number,
                'routing_number': obj.bank_account.routing_number,
                'account_type': obj.bank_account.get_account_type_display(),
                'address': f"{obj.bank_account.address_line1}, {obj.bank_account.city}, {obj.bank_account.state} {obj.bank_account.postal_code}"
            }
        return None
    
    def update(self, instance, validated_data):
        """Update payout request status"""
        status = validated_data.get('status')
        
        if status and status != instance.status:
            if status in ['paid', 'failed', 'cancelled']:
                validated_data['processed_by'] = self.context['request'].user
                validated_data['processed_at'] = timezone.now()
                
                # If marking as paid, update teacher earnings
                if status == 'paid' and instance.status != 'paid':
                    earnings = instance.teacher.earnings
                    earnings.pending_balance -= instance.amount
                    earnings.total_paid_out += instance.amount
                    earnings.save()
        
        return super().update(instance, validated_data)