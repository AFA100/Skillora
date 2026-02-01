from rest_framework import generics, status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenRefreshView
from django.contrib.auth import authenticate
from django.core.mail import send_mail
from django.conf import settings
from django.template.loader import render_to_string
from .models import User
from .serializers import (
    UserSerializer, SignupSerializer, LoginSerializer,
    PasswordResetSerializer, PasswordResetConfirmSerializer,
    AdminUserCreationSerializer
)
from .permissions import IsOwnerOrReadOnly, IsAdmin
from .tokens import password_reset_token_generator


class SignupView(generics.CreateAPIView):
    """User signup endpoint"""
    queryset = User.objects.all()
    serializer_class = SignupSerializer
    permission_classes = [permissions.AllowAny]
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        
        # Generate JWT tokens
        refresh = RefreshToken.for_user(user)
        
        return Response({
            'user': UserSerializer(user).data,
            'tokens': {
                'refresh': str(refresh),
                'access': str(refresh.access_token),
            },
            'message': 'Account created successfully'
        }, status=status.HTTP_201_CREATED)


class LoginView(APIView):
    """User login endpoint"""
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        
        # Generate JWT tokens
        refresh = RefreshToken.for_user(user)
        
        return Response({
            'user': UserSerializer(user).data,
            'tokens': {
                'refresh': str(refresh),
                'access': str(refresh.access_token),
            },
            'message': 'Login successful'
        })


class CustomTokenRefreshView(TokenRefreshView):
    """Custom token refresh view with additional data"""
    
    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        if response.status_code == 200:
            response.data['message'] = 'Token refreshed successfully'
        return response


class PasswordResetView(APIView):
    """Password reset request endpoint"""
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        serializer = PasswordResetSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        email = serializer.validated_data['email']
        user = User.objects.get(email=email, is_active=True)
        
        # Generate reset token
        token = password_reset_token_generator.generate_token(user)
        
        # Send reset email (in production, use proper email service)
        reset_url = f"{settings.FRONTEND_URL}/reset-password/{token}"
        
        try:
            send_mail(
                subject='Password Reset - Skillora',
                message=f'Click the link to reset your password: {reset_url}',
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[email],
                fail_silently=False,
            )
            message = 'Password reset email sent successfully'
        except Exception as e:
            # In development, just return the token
            message = f'Password reset token generated: {token}'
        
        return Response({
            'message': message,
            'token': token if settings.DEBUG else None  # Only in debug mode
        })


class PasswordResetConfirmView(APIView):
    """Password reset confirmation endpoint"""
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        token = serializer.validated_data['token']
        password = serializer.validated_data['password']
        
        # Validate token and get user
        user = password_reset_token_generator.validate_token(token)
        if not user:
            return Response({
                'error': 'Invalid or expired token'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Update password
        user.set_password(password)
        user.save()
        
        # Invalidate token
        password_reset_token_generator.invalidate_token(token)
        
        return Response({
            'message': 'Password reset successful'
        })


class ProfileView(generics.RetrieveUpdateAPIView):
    """User profile endpoint"""
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrReadOnly]
    
    def get_object(self):
        return self.request.user


class LogoutView(APIView):
    """User logout endpoint"""
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        try:
            refresh_token = request.data.get("refresh")
            if refresh_token:
                token = RefreshToken(refresh_token)
                token.blacklist()
            return Response({
                "message": "Successfully logged out"
            }, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({
                "error": "Invalid token"
            }, status=status.HTTP_400_BAD_REQUEST)


class AdminUserCreationView(generics.CreateAPIView):
    """Admin endpoint for creating users"""
    queryset = User.objects.all()
    serializer_class = AdminUserCreationSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdmin]
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        
        return Response({
            'user': UserSerializer(user).data,
            'message': 'User created successfully by admin'
        }, status=status.HTTP_201_CREATED)