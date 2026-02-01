from rest_framework import serializers
from decimal import Decimal
from .models import Payment, PaymentMethod, PaymentAttempt


class PaymentMethodSerializer(serializers.ModelSerializer):
    """Serializer for payment methods"""
    
    display_name = serializers.SerializerMethodField()
    
    class Meta:
        model = PaymentMethod
        fields = [
            'id', 'type', 'display_name', 'card_last_four', 'card_brand',
            'card_exp_month', 'card_exp_year', 'is_default', 'is_active',
            'created_at'
        ]
        read_only_fields = [
            'id', 'card_last_four', 'card_brand', 'card_exp_month',
            'card_exp_year', 'created_at'
        ]
    
    def get_display_name(self, obj):
        """Get display name for payment method"""
        return str(obj)


class PaymentSerializer(serializers.ModelSerializer):
    """Serializer for payment details"""
    
    user_name = serializers.CharField(source='user.name', read_only=True)
    user_email = serializers.CharField(source='user.email', read_only=True)
    course_title = serializers.CharField(source='course.title', read_only=True)
    payment_method_display = serializers.CharField(source='payment_method', read_only=True)
    
    class Meta:
        model = Payment
        fields = [
            'id', 'user_name', 'user_email', 'course', 'course_title',
            'payment_type', 'amount', 'currency', 'status', 'description',
            'payment_method', 'payment_method_display', 'refunded_amount',
            'refund_reason', 'is_successful', 'can_be_refunded',
            'created_at', 'updated_at', 'completed_at', 'refunded_at'
        ]
        read_only_fields = [
            'id', 'user_name', 'user_email', 'course_title', 'status',
            'payment_method_display', 'refunded_amount', 'refund_reason',
            'is_successful', 'can_be_refunded', 'created_at', 'updated_at',
            'completed_at', 'refunded_at'
        ]


class PaymentCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating payments"""
    
    class Meta:
        model = Payment
        fields = ['course', 'payment_type', 'amount', 'currency', 'description']
    
    def validate_course(self, value):
        """Validate course for payment"""
        if value.status != 'published':
            raise serializers.ValidationError("Course is not available for purchase")
        return value
    
    def validate_amount(self, value):
        """Validate payment amount"""
        if value <= 0:
            raise serializers.ValidationError("Amount must be greater than 0")
        return value
    
    def create(self, validated_data):
        """Create payment with user from request"""
        request = self.context.get('request')
        validated_data['user'] = request.user
        return super().create(validated_data)


class StripePaymentIntentSerializer(serializers.Serializer):
    """Serializer for creating Stripe payment intent"""
    
    course_id = serializers.IntegerField()
    payment_method_id = serializers.CharField(required=False)
    save_payment_method = serializers.BooleanField(default=False)
    
    def validate_course_id(self, value):
        """Validate course exists and is available"""
        from courses.models import Course
        
        try:
            course = Course.objects.get(id=value, status='published')
        except Course.DoesNotExist:
            raise serializers.ValidationError("Course not found or not available")
        
        # Check if user is already enrolled
        from enrollments.models import Enrollment
        request = self.context.get('request')
        if Enrollment.objects.filter(student=request.user, course=course).exists():
            raise serializers.ValidationError("Already enrolled in this course")
        
        return value


class PaymentConfirmationSerializer(serializers.Serializer):
    """Serializer for confirming payment"""
    
    payment_intent_id = serializers.CharField()
    
    def validate_payment_intent_id(self, value):
        """Validate payment intent exists"""
        try:
            payment = Payment.objects.get(stripe_payment_intent_id=value)
        except Payment.DoesNotExist:
            raise serializers.ValidationError("Payment intent not found")
        
        # Check if payment belongs to current user
        request = self.context.get('request')
        if payment.user != request.user:
            raise serializers.ValidationError("Payment intent does not belong to current user")
        
        return value


class RefundRequestSerializer(serializers.Serializer):
    """Serializer for refund requests"""
    
    amount = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)
    reason = serializers.CharField(max_length=500, required=False)
    
    def validate_amount(self, value):
        """Validate refund amount"""
        payment = self.context.get('payment')
        if not payment:
            raise serializers.ValidationError("Payment not found")
        
        if value and value > (payment.amount - payment.refunded_amount):
            raise serializers.ValidationError("Refund amount exceeds available amount")
        
        return value


class PaymentAttemptSerializer(serializers.ModelSerializer):
    """Serializer for payment attempts"""
    
    class Meta:
        model = PaymentAttempt
        fields = [
            'id', 'stripe_payment_intent_id', 'error_code',
            'error_message', 'attempted_at'
        ]
        read_only_fields = ['id', 'attempted_at']


class PaymentStatsSerializer(serializers.Serializer):
    """Serializer for payment statistics"""
    
    total_payments = serializers.IntegerField()
    successful_payments = serializers.IntegerField()
    failed_payments = serializers.IntegerField()
    total_revenue = serializers.DecimalField(max_digits=12, decimal_places=2)
    refunded_amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    success_rate = serializers.FloatField()
    average_payment = serializers.DecimalField(max_digits=10, decimal_places=2)