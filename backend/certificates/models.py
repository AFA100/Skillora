from django.db import models
from django.conf import settings
from django.utils import timezone
import uuid
import hashlib
import random
import string


class Certificate(models.Model):
    """Course completion certificates with PDF generation"""
    
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='certificates'
    )
    course = models.ForeignKey(
        'courses.Course',
        on_delete=models.CASCADE,
        related_name='certificates'
    )
    enrollment = models.OneToOneField(
        'enrollments.Enrollment',
        on_delete=models.CASCADE,
        related_name='certificate',
        null=True,
        blank=True
    )
    
    # Certificate identifiers
    certificate_id = models.UUIDField(default=uuid.uuid4, unique=True)
    certificate_number = models.CharField(max_length=50, unique=True, blank=True)
    verification_code = models.CharField(max_length=20, unique=True, blank=True)
    
    # Dates
    issued_at = models.DateTimeField(auto_now_add=True)
    completion_date = models.DateTimeField(default=timezone.now)
    
    # Certificate data
    final_score = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    completion_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=100.00)
    
    # PDF file
    pdf_file = models.FileField(upload_to='certificates/', null=True, blank=True)
    
    # Status
    is_valid = models.BooleanField(default=True)
    is_verified = models.BooleanField(default=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'certificates'
        unique_together = ['student', 'course']
        ordering = ['-issued_at']
    
    def __str__(self):
        return f"Certificate {self.certificate_number or self.certificate_id} - {self.student.name}"
    
    def save(self, *args, **kwargs):
        if not self.certificate_number:
            self.certificate_number = self.generate_certificate_number()
        if not self.verification_code:
            self.verification_code = self.generate_verification_code()
        super().save(*args, **kwargs)
    
    def generate_certificate_number(self):
        """Generate unique certificate number"""
        prefix = "SKILLORA"
        year = timezone.now().year
        random_part = ''.join(random.choices(string.digits, k=6))
        return f"{prefix}-{year}-{random_part}"
    
    def generate_verification_code(self):
        """Generate unique verification code"""
        data = f"{self.student.id}-{self.course.id}-{timezone.now().timestamp()}-{random.randint(1000, 9999)}"
        return hashlib.sha256(data.encode()).hexdigest()[:20].upper()
    
    @property
    def verification_url(self):
        """Get certificate verification URL"""
        return f"{settings.FRONTEND_URL}/certificates/verify/{self.verification_code}"
    
    def generate_pdf(self):
        """Generate PDF certificate"""
        from .services import CertificateGenerator
        generator = CertificateGenerator()
        pdf_content = generator.generate_certificate_pdf(self)
        
        # Save PDF file
        from django.core.files.base import ContentFile
        filename = f"certificate_{self.certificate_number}.pdf"
        self.pdf_file.save(filename, ContentFile(pdf_content), save=True)
        
        return self.pdf_file.url