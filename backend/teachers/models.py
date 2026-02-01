from django.db import models
from django.conf import settings
import uuid


class TeacherProfile(models.Model):
    """Extended profile for teachers"""
    
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='teacher_profile'
    )
    bio = models.TextField(blank=True, help_text="Tell students about yourself")
    skills = models.TextField(blank=True, help_text="List your skills and expertise areas")
    profile_photo = models.ImageField(upload_to='teacher_profiles/', blank=True, null=True)
    years_of_experience = models.PositiveIntegerField(default=0)
    education = models.TextField(blank=True)
    certifications = models.TextField(blank=True)
    hourly_rate = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    is_approved = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'teacher_profiles'
        verbose_name = 'Teacher Profile'
        verbose_name_plural = 'Teacher Profiles'
    
    def __str__(self):
        return f"Teacher: {self.user.name}"


class TeacherVerification(models.Model):
    """Teacher verification documents and status"""
    
    STATUS_CHOICES = [
        ('pending', 'Pending Review'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('suspended', 'Suspended'),
    ]
    
    teacher = models.OneToOneField(
        TeacherProfile,
        on_delete=models.CASCADE,
        related_name='verification'
    )
    
    # Verification documents
    government_id = models.FileField(
        upload_to='verification/government_ids/',
        help_text="Upload a clear photo of your government-issued ID"
    )
    portfolio = models.FileField(
        upload_to='verification/portfolios/',
        help_text="Upload your portfolio or resume (PDF format preferred)"
    )
    demo_video = models.FileField(
        upload_to='verification/demo_videos/',
        help_text="Upload a short demo video showcasing your teaching skills"
    )
    
    # Verification status and metadata
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    submission_id = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    
    # Review information
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reviewed_verifications'
    )
    review_notes = models.TextField(blank=True, help_text="Admin notes about the verification")
    reviewed_at = models.DateTimeField(null=True, blank=True)
    
    # Timestamps
    submitted_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'teacher_verifications'
        verbose_name = 'Teacher Verification'
        verbose_name_plural = 'Teacher Verifications'
    
    def __str__(self):
        return f"Verification for {self.teacher.user.name} - {self.get_status_display()}"
    
    def save(self, *args, **kwargs):
        # Update teacher profile approval status based on verification
        if self.status == 'approved':
            self.teacher.is_approved = True
            self.teacher.user.is_verified = True
            self.teacher.user.save()
            self.teacher.save()
        elif self.status in ['rejected', 'suspended']:
            self.teacher.is_approved = False
            self.teacher.user.is_verified = False
            self.teacher.user.save()
            self.teacher.save()
        
        super().save(*args, **kwargs)