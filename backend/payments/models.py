from django.db import models
from django.conf import settings
from django.utils import timezone
from decimal import Decimal
import uuid


class PaymentMethod(models.Model):
    """Stored payment methods for users"""
    
    TYPE_CHOICES = [
        ('card', 'Credit/Debit Card'),
        ('paypal', 'PayPal'),
        ('bank_transfer', 'Bank Transfer'),
    ]
    
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='payment_methods'
    )
    type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    stripe_payment_method_id = models.CharField(max_length=100, blank=True)
    
    # Card details (masked)
    card_last_four = models.CharField(max_length=4, blank=True)
    card_brand = models.CharField(max_length=20, blank=True)
    card_exp_month = models.PositiveIntegerField(null=True, blank=True)
    card_exp_year = models.PositiveIntegerField(null=True, blank=True)
    
    is_default = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'payment_methods'
        indexes = [
            models.Index(fields=['user', 'is_default']),
        ]
    
    def __str__(self):
        if self.type == 'card' and self.card_last_four:
            return f"{self.card_brand} ****{self.card_last_four}"
        return f"{self.get_type_display()}"


class Payment(models.Model):
    """Enhanced payment transactions with Stripe integration"""
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('cancelled', 'Cancelled'),
        ('refunded', 'Refunded'),
        ('partially_refunded', 'Partially Refunded'),
    ]
    
    PAYMENT_TYPE_CHOICES = [
        ('course_purchase', 'Course Purchase'),
        ('subscription', 'Subscription'),
        ('refund', 'Refund'),
    ]
    
    # Basic Information
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='payments'
    )
    course = models.ForeignKey(
        'courses.Course',
        on_delete=models.CASCADE,
        related_name='payments',
        null=True,
        blank=True
    )
    
    # Payment Details
    payment_type = models.CharField(max_length=20, choices=PAYMENT_TYPE_CHOICES, default='course_purchase')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=3, default='USD')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    
    # Stripe Integration
    stripe_payment_intent_id = models.CharField(max_length=100, blank=True)
    stripe_charge_id = models.CharField(max_length=100, blank=True)
    payment_method = models.ForeignKey(
        PaymentMethod,
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    
    # Legacy fields for backward compatibility
    transaction_id = models.CharField(max_length=100, blank=True)
    payment_method_type = models.CharField(max_length=50, blank=True)
    
    # Additional Information
    description = models.TextField(blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    
    # Refund Information
    refunded_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    refund_reason = models.TextField(blank=True)
    refunded_at = models.DateTimeField(null=True, blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'payments'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'status']),
            models.Index(fields=['course', 'status']),
            models.Index(fields=['stripe_payment_intent_id']),
        ]
    
    def __str__(self):
        return f"Payment {self.id} - {self.amount} {self.currency}"
    
    @property
    def is_successful(self):
        return self.status == 'completed'
    
    @property
    def can_be_refunded(self):
        return self.status == 'completed' and self.refunded_amount < self.amount
    
    def mark_completed(self):
        """Mark payment as completed"""
        self.status = 'completed'
        self.completed_at = timezone.now()
        self.save()
    
    def process_refund(self, amount=None, reason=''):
        """Process a refund for this payment"""
        if not self.can_be_refunded:
            raise ValueError("Payment cannot be refunded")
        
        refund_amount = amount or (self.amount - self.refunded_amount)
        if refund_amount > (self.amount - self.refunded_amount):
            raise ValueError("Refund amount exceeds available amount")
        
        self.refunded_amount += refund_amount
        self.refund_reason = reason
        self.refunded_at = timezone.now()
        
        if self.refunded_amount >= self.amount:
            self.status = 'refunded'
        else:
            self.status = 'partially_refunded'
        
        self.save()


class PaymentAttempt(models.Model):
    """Track payment attempts for analytics"""
    
    payment = models.ForeignKey(Payment, on_delete=models.CASCADE, related_name='attempts')
    stripe_payment_intent_id = models.CharField(max_length=100, blank=True)
    error_code = models.CharField(max_length=50, blank=True)
    error_message = models.TextField(blank=True)
    attempted_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'payment_attempts'
        ordering = ['-attempted_at']
    
    def __str__(self):
        return f"Attempt for {self.payment.id} at {self.attempted_at}"