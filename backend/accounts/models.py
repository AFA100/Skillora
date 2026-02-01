from django.contrib.auth.models import AbstractUser
from django.contrib.auth.hashers import make_password
from django.core.validators import validate_email
from django.db import models
from django.conf import settings
import re


class User(AbstractUser):
    """Custom User model with role-based access control"""
    
    ROLE_CHOICES = [
        (settings.USER_ROLES['LEARNER'], 'Learner'),
        (settings.USER_ROLES['TEACHER'], 'Teacher'),
        (settings.USER_ROLES['ADMIN'], 'Admin'),
    ]
    
    # Core fields matching Sprint 1 requirements
    name = models.CharField(max_length=150, help_text="Full name of the user")
    email = models.EmailField(unique=True)
    role = models.CharField(
        max_length=20,
        choices=ROLE_CHOICES,
        default=settings.USER_ROLES['LEARNER']
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Additional fields for enhanced functionality
    is_verified = models.BooleanField(default=False)
    profile_picture = models.ImageField(upload_to='profiles/', blank=True, null=True)
    phone_number = models.CharField(max_length=15, blank=True, null=True)
    date_of_birth = models.DateField(blank=True, null=True)
    
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['name']
    
    def save(self, *args, **kwargs):
        # Auto-generate username from email if not provided
        if not self.username:
            base_username = self.email.split('@')[0]
            username = base_username
            counter = 1
            
            # Handle username conflicts by appending numbers
            while User.objects.filter(username=username).exclude(pk=self.pk).exists():
                username = f"{base_username}{counter}"
                counter += 1
            
            self.username = username
        
        # Ensure password is hashed
        if self.password and not self.password.startswith(('pbkdf2_sha256$', 'bcrypt$', 'argon2')):
            self.password = make_password(self.password)
        
        super().save(*args, **kwargs)
    
    def clean(self):
        super().clean()
        # Validate email format
        if self.email:
            validate_email(self.email)
        
        # Validate password strength
        if self.password and not self.password.startswith(('pbkdf2_sha256$', 'bcrypt$', 'argon2')):
            self.validate_password_strength(self.password)
    
    @staticmethod
    def validate_password_strength(password):
        """Validate password meets security requirements"""
        if len(password) < 8:
            raise ValueError("Password must be at least 8 characters long")
        
        if not re.search(r'[A-Z]', password):
            raise ValueError("Password must contain at least one uppercase letter")
        
        if not re.search(r'[a-z]', password):
            raise ValueError("Password must contain at least one lowercase letter")
        
        if not re.search(r'\d', password):
            raise ValueError("Password must contain at least one digit")
        
        return True
    
    class Meta:
        db_table = 'users'
        verbose_name = 'User'
        verbose_name_plural = 'Users'
    
    def __str__(self):
        return f"{self.email} ({self.get_role_display()})"
    
    @property
    def is_learner(self):
        return self.role == settings.USER_ROLES['LEARNER']
    
    @property
    def is_teacher(self):
        return self.role == settings.USER_ROLES['TEACHER']
    
    @property
    def is_admin(self):
        return self.role == settings.USER_ROLES['ADMIN']