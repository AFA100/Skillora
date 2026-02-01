from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator
from decimal import Decimal
import uuid


class TeacherBankAccount(models.Model):
    """Teacher bank account information for payouts"""
    
    ACCOUNT_TYPE_CHOICES = [
        ('checking', 'Checking Account'),
        ('savings', 'Savings Account'),
    ]
    
    teacher = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='bank_account',
        limit_choices_to={'role': 'teacher'}
    )
    
    # Bank Details (encrypted in production)
    bank_name = models.CharField(max_length=100)
    account_holder_name = models.CharField(max_length=100)
    account_number = models.CharField(max_length=50)  # Should be encrypted
    routing_number = models.CharField(max_length=20)
    account_type = models.CharField(max_length=20, choices=ACCOUNT_TYPE_CHOICES, default='checking')
    
    # Address Information
    address_line1 = models.CharField(max_length=200)
    address_line2 = models.CharField(max_length=200, blank=True)
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=50)
    postal_code = models.CharField(max_length=20)
    country = models.CharField(max_length=50, default='US')
    
    # Verification
    is_verified = models.BooleanField(default=False)
    verified_at = models.DateTimeField(null=True, blank=True)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'teacher_bank_accounts'
        verbose_name = 'Teacher Bank Account'
        verbose_name_plural = 'Teacher Bank Accounts'
    
    def __str__(self):
        return f"{self.teacher.name} - {self.bank_name} ****{self.account_number[-4:]}"
    
    @property
    def masked_account_number(self):
        """Return masked account number for display"""
        if len(self.account_number) > 4:
            return f"****{self.account_number[-4:]}"
        return "****"


class TeacherEarnings(models.Model):
    """Track teacher earnings from course sales"""
    
    teacher = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='earnings',
        limit_choices_to={'role': 'teacher'}
    )
    
    # Earnings Summary
    total_gross_revenue = models.DecimalField(
        max_digits=12, 
        decimal_places=2, 
        default=Decimal('0.00'),
        help_text="Total revenue from all course sales"
    )
    total_net_earnings = models.DecimalField(
        max_digits=12, 
        decimal_places=2, 
        default=Decimal('0.00'),
        help_text="Net earnings after platform commission"
    )
    total_paid_out = models.DecimalField(
        max_digits=12, 
        decimal_places=2, 
        default=Decimal('0.00'),
        help_text="Total amount paid out to teacher"
    )
    pending_balance = models.DecimalField(
        max_digits=12, 
        decimal_places=2, 
        default=Decimal('0.00'),
        help_text="Available balance for payout"
    )
    
    # Platform Settings
    commission_rate = models.DecimalField(
        max_digits=5, 
        decimal_places=2, 
        default=Decimal('30.00'),
        help_text="Platform commission percentage"
    )
    
    # Metadata
    last_updated = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'teacher_earnings'
        verbose_name = 'Teacher Earnings'
        verbose_name_plural = 'Teacher Earnings'
    
    def __str__(self):
        return f"{self.teacher.name} - Pending: ${self.pending_balance}"
    
    def calculate_net_from_gross(self, gross_amount):
        """Calculate net earnings from gross revenue"""
        commission = gross_amount * (self.commission_rate / 100)
        return gross_amount - commission
    
    def add_sale(self, gross_amount):
        """Add a new sale to earnings"""
        net_amount = self.calculate_net_from_gross(gross_amount)
        
        self.total_gross_revenue += gross_amount
        self.total_net_earnings += net_amount
        self.pending_balance += net_amount
        self.save()
        
        return net_amount


class PayoutRequest(models.Model):
    """Teacher payout requests"""
    
    STATUS_CHOICES = [
        ('requested', 'Requested'),
        ('processing', 'Processing'),
        ('paid', 'Paid'),
        ('failed', 'Failed'),
        ('cancelled', 'Cancelled'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    teacher = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='payout_requests',
        limit_choices_to={'role': 'teacher'}
    )
    
    # Payout Details
    amount = models.DecimalField(
        max_digits=10, 
        decimal_places=2,
        validators=[MinValueValidator(Decimal('10.00'))]
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='requested')
    
    # Bank Account (snapshot at time of request)
    bank_account = models.ForeignKey(
        TeacherBankAccount,
        on_delete=models.PROTECT,
        related_name='payout_requests'
    )
    
    # Processing Information
    processed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='processed_payouts',
        limit_choices_to={'role': 'admin'}
    )
    processed_at = models.DateTimeField(null=True, blank=True)
    
    # External References
    external_transaction_id = models.CharField(max_length=100, blank=True)
    failure_reason = models.TextField(blank=True)
    
    # Notes
    admin_notes = models.TextField(blank=True)
    
    # Metadata
    requested_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'payout_requests'
        ordering = ['-requested_at']
        indexes = [
            models.Index(fields=['teacher', 'status']),
            models.Index(fields=['status', 'requested_at']),
        ]
    
    def __str__(self):
        return f"Payout {self.id} - {self.teacher.name} - ${self.amount} ({self.status})"
    
    @property
    def can_be_cancelled(self):
        """Check if payout can be cancelled"""
        return self.status in ['requested', 'processing']
    
    @property
    def is_completed(self):
        """Check if payout is completed"""
        return self.status in ['paid', 'failed', 'cancelled']


class PayoutTransaction(models.Model):
    """Individual course sale transactions for earnings tracking"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    teacher = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='earning_transactions',
        limit_choices_to={'role': 'teacher'}
    )
    course = models.ForeignKey(
        'courses.Course',
        on_delete=models.CASCADE,
        related_name='earning_transactions'
    )
    payment = models.OneToOneField(
        'payments.Payment',
        on_delete=models.CASCADE,
        related_name='earning_transaction'
    )
    
    # Transaction Details
    gross_amount = models.DecimalField(max_digits=10, decimal_places=2)
    commission_rate = models.DecimalField(max_digits=5, decimal_places=2)
    commission_amount = models.DecimalField(max_digits=10, decimal_places=2)
    net_amount = models.DecimalField(max_digits=10, decimal_places=2)
    
    # Status
    is_paid_out = models.BooleanField(default=False)
    payout_request = models.ForeignKey(
        PayoutRequest,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='transactions'
    )
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'payout_transactions'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['teacher', 'is_paid_out']),
            models.Index(fields=['course', 'created_at']),
        ]
    
    def __str__(self):
        return f"Transaction {self.id} - {self.course.title} - ${self.net_amount}"