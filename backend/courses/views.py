from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from django.shortcuts import get_object_or_404
from rest_framework import serializers
from accounts.permissions import IsTeacher, IsTeacherOrAdmin
from .models import Course, CourseSection, Lesson
from .serializers import (
    CourseSerializer, CourseCreateSerializer, CourseSectionSerializer,
    LessonSerializer, CourseSubmissionSerializer, LessonCreateSerializer,
    SectionCreateSerializer
)


class CourseListCreateView(generics.ListCreateAPIView):
    """List and create courses"""
    permission_classes = [IsAuthenticated, IsTeacher]
    
    def get_serializer_class(self):
        if self.request.method == 'POST':
            return CourseCreateSerializer
        return CourseSerializer
    
    def get_queryset(self):
        """Return courses for the authenticated teacher"""
        return Course.objects.filter(instructor=self.request.user)
    
    def perform_create(self, serializer):
        """Create course with current user as instructor"""
        serializer.save(instructor=self.request.user)


class CourseDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Course detail, update, delete"""
    serializer_class = CourseSerializer
    permission_classes = [IsAuthenticated, IsTeacherOrAdmin]
    
    def get_queryset(self):
        """Return courses for the authenticated teacher or all for admin"""
        if self.request.user.is_admin:
            return Course.objects.all()
        return Course.objects.filter(instructor=self.request.user)
    
    def update(self, request, *args, **kwargs):
        """Update course with validation"""
        instance = self.get_object()
        
        # Check if course can be edited
        if not instance.can_be_edited and not request.user.is_admin:
            return Response({
                'error': f'Course with status "{instance.get_status_display()}" cannot be edited'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        return super().update(request, *args, **kwargs)
    
    def destroy(self, request, *args, **kwargs):
        """Delete course with validation"""
        instance = self.get_object()
        
        # Only allow deletion of draft courses
        if instance.status != 'draft' and not request.user.is_admin:
            return Response({
                'error': 'Only draft courses can be deleted'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        return super().destroy(request, *args, **kwargs)


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsTeacher])
def submit_course(request, course_id):
    """Submit course for review"""
    try:
        course = get_object_or_404(
            Course, 
            id=course_id, 
            instructor=request.user
        )
        
        # Validate submission
        serializer = CourseSubmissionSerializer(
            data={}, 
            context={'course': course}
        )
        serializer.is_valid(raise_exception=True)
        
        # Update course status
        course.status = 'submitted'
        course.submitted_at = timezone.now()
        course.save()
        
        return Response({
            'message': 'Course submitted for review successfully',
            'course_id': course.id,
            'status': course.status,
            'submitted_at': course.submitted_at
        })
        
    except Course.DoesNotExist:
        return Response({
            'error': 'Course not found'
        }, status=status.HTTP_404_NOT_FOUND)


# Section Management Views
class SectionListCreateView(generics.ListCreateAPIView):
    """List and create sections for a course"""
    permission_classes = [IsAuthenticated, IsTeacher]
    
    def get_serializer_class(self):
        if self.request.method == 'POST':
            return SectionCreateSerializer
        return CourseSectionSerializer
    
    def get_queryset(self):
        course_id = self.kwargs['course_id']
        course = get_object_or_404(Course, id=course_id, instructor=self.request.user)
        return course.sections.all()
    
    def get_serializer_context(self):
        context = super().get_serializer_context()
        course_id = self.kwargs['course_id']
        context['course'] = get_object_or_404(Course, id=course_id, instructor=self.request.user)
        return context
    
    def perform_create(self, serializer):
        course_id = self.kwargs['course_id']
        course = get_object_or_404(Course, id=course_id, instructor=self.request.user)
        
        # Check if course can be edited
        if not course.can_be_edited:
            raise serializers.ValidationError(
                f'Course with status "{course.get_status_display()}" cannot be edited'
            )
        
        serializer.save(course=course)


class SectionDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Section detail, update, delete"""
    serializer_class = CourseSectionSerializer
    permission_classes = [IsAuthenticated, IsTeacher]
    
    def get_queryset(self):
        course_id = self.kwargs['course_id']
        course = get_object_or_404(Course, id=course_id, instructor=self.request.user)
        return course.sections.all()
    
    def get_serializer_context(self):
        context = super().get_serializer_context()
        course_id = self.kwargs['course_id']
        context['course'] = get_object_or_404(Course, id=course_id, instructor=self.request.user)
        return context
    
    def update(self, request, *args, **kwargs):
        """Update section with validation"""
        instance = self.get_object()
        
        # Check if course can be edited
        if not instance.course.can_be_edited:
            return Response({
                'error': f'Course with status "{instance.course.get_status_display()}" cannot be edited'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        return super().update(request, *args, **kwargs)


# Lesson Management Views
class LessonListCreateView(generics.ListCreateAPIView):
    """List and create lessons for a section"""
    permission_classes = [IsAuthenticated, IsTeacher]
    
    def get_serializer_class(self):
        if self.request.method == 'POST':
            return LessonCreateSerializer
        return LessonSerializer
    
    def get_queryset(self):
        course_id = self.kwargs['course_id']
        section_id = self.kwargs['section_id']
        
        # Verify ownership
        course = get_object_or_404(Course, id=course_id, instructor=self.request.user)
        section = get_object_or_404(CourseSection, id=section_id, course=course)
        
        return section.lessons.all()
    
    def get_serializer_context(self):
        context = super().get_serializer_context()
        course_id = self.kwargs['course_id']
        section_id = self.kwargs['section_id']
        
        course = get_object_or_404(Course, id=course_id, instructor=self.request.user)
        section = get_object_or_404(CourseSection, id=section_id, course=course)
        
        context['course'] = course
        context['section'] = section
        return context
    
    def perform_create(self, serializer):
        course_id = self.kwargs['course_id']
        section_id = self.kwargs['section_id']
        
        course = get_object_or_404(Course, id=course_id, instructor=self.request.user)
        section = get_object_or_404(CourseSection, id=section_id, course=course)
        
        # Check if course can be edited
        if not course.can_be_edited:
            raise serializers.ValidationError(
                f'Course with status "{course.get_status_display()}" cannot be edited'
            )
        
        serializer.save(section=section)


class LessonDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Lesson detail, update, delete"""
    serializer_class = LessonSerializer
    permission_classes = [IsAuthenticated, IsTeacher]
    
    def get_queryset(self):
        course_id = self.kwargs['course_id']
        section_id = self.kwargs['section_id']
        
        # Verify ownership
        course = get_object_or_404(Course, id=course_id, instructor=self.request.user)
        section = get_object_or_404(CourseSection, id=section_id, course=course)
        
        return section.lessons.all()
    
    def get_serializer_context(self):
        context = super().get_serializer_context()
        course_id = self.kwargs['course_id']
        section_id = self.kwargs['section_id']
        
        course = get_object_or_404(Course, id=course_id, instructor=self.request.user)
        section = get_object_or_404(CourseSection, id=section_id, course=course)
        
        context['course'] = course
        context['section'] = section
        return context
    
    def update(self, request, *args, **kwargs):
        """Update lesson with validation"""
        instance = self.get_object()
        
        # Check if course can be edited
        if not instance.course.can_be_edited:
            return Response({
                'error': f'Course with status "{instance.course.get_status_display()}" cannot be edited'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        return super().update(request, *args, **kwargs)


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsTeacher])
def reorder_sections(request, course_id):
    """Reorder course sections"""
    try:
        course = get_object_or_404(Course, id=course_id, instructor=request.user)
        
        # Check if course can be edited
        if not course.can_be_edited:
            return Response({
                'error': f'Course with status "{course.get_status_display()}" cannot be edited'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        section_orders = request.data.get('section_orders', [])
        if not section_orders:
            return Response({
                'error': 'section_orders is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Update section orders
        for item in section_orders:
            section_id = item.get('id')
            new_order = item.get('order')
            
            if section_id and new_order is not None:
                CourseSection.objects.filter(
                    id=section_id, 
                    course=course
                ).update(order=new_order)
        
        return Response({
            'message': 'Sections reordered successfully'
        })
        
    except Exception as e:
        return Response({
            'error': str(e)
        }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsTeacher])
def reorder_lessons(request, course_id, section_id):
    """Reorder lessons within a section"""
    try:
        course = get_object_or_404(Course, id=course_id, instructor=request.user)
        section = get_object_or_404(CourseSection, id=section_id, course=course)
        
        # Check if course can be edited
        if not course.can_be_edited:
            return Response({
                'error': f'Course with status "{course.get_status_display()}" cannot be edited'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        lesson_orders = request.data.get('lesson_orders', [])
        if not lesson_orders:
            return Response({
                'error': 'lesson_orders is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Update lesson orders
        for item in lesson_orders:
            lesson_id = item.get('id')
            new_order = item.get('order')
            
            if lesson_id and new_order is not None:
                Lesson.objects.filter(
                    id=lesson_id, 
                    section=section
                ).update(order=new_order)
        
        return Response({
            'message': 'Lessons reordered successfully'
        })
        
    except Exception as e:
        return Response({
            'error': str(e)
        }, status=status.HTTP_400_BAD_REQUEST)


# Public Course Views (for learners)
class PublicCourseListView(generics.ListAPIView):
    """Public course listing for learners"""
    serializer_class = CourseSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return Course.objects.filter(status='published')


class PublicCourseDetailView(generics.RetrieveAPIView):
    """Public course detail for learners"""
    serializer_class = CourseSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return Course.objects.filter(status='published')