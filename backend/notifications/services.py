"""
Notification services for sending various types of notifications
"""
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.conf import settings
from django.utils import timezone
from .models import Notification, NotificationPreference
import logging

logger = logging.getLogger(__name__)


class NotificationService:
    """
    Service for creating and sending notifications
    """
    
    @staticmethod
    def create_notification(recipient, title, message, notification_type, 
                          sender=None, priority='medium', **kwargs):
        """
        Create a new notification
        """
        try:
            notification = Notification.objects.create(
                recipient=recipient,
                sender=sender,
                title=title,
                message=message,
                notification_type=notification_type,
                priority=priority,
                course_id=kwargs.get('course_id'),
                enrollment_id=kwargs.get('enrollment_id'),
                quiz_id=kwargs.get('quiz_id'),
                data=kwargs.get('data', {})
            )
            
            # Send notification based on user preferences
            NotificationService.send_notification(notification)
            
            return notification
            
        except Exception as e:
            logger.error(f"Error creating notification: {e}")
            return None
    
    @staticmethod
    def send_notification(notification):
        """
        Send notification via email and/or in-app based on user preferences
        """
        try:
            # Get user preferences
            preferences, created = NotificationPreference.objects.get_or_create(
                user=notification.recipient
            )
            
            # Check if email notification should be sent
            email_field = f"email_{notification.notification_type}"
            if hasattr(preferences, email_field) and getattr(preferences, email_field):
                NotificationService.send_email_notification(notification)
            
            # Mark as sent
            notification.mark_as_sent()
            
        except Exception as e:
            logger.error(f"Error sending notification: {e}")
    
    @staticmethod
    def send_email_notification(notification):
        """
        Send email notification
        """
        try:
            subject = notification.title
            message = notification.message
            recipient_email = notification.recipient.email
            
            # Use HTML template for better formatting
            html_message = render_to_string('notifications/email_notification.html', {
                'notification': notification,
                'user': notification.recipient,
                'frontend_url': settings.FRONTEND_URL,
            })
            
            send_mail(
                subject=subject,
                message=message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[recipient_email],
                html_message=html_message,
                fail_silently=False
            )
            
            logger.info(f"Email notification sent to {recipient_email}")
            
        except Exception as e:
            logger.error(f"Error sending email notification: {e}")
    
    @staticmethod
    def notify_enrollment(enrollment):
        """
        Send enrollment notification
        """
        return NotificationService.create_notification(
            recipient=enrollment.student,
            title=f"Successfully enrolled in {enrollment.course.title}",
            message=f"Welcome to {enrollment.course.title}! You can now start learning.",
            notification_type='enrollment',
            course_id=enrollment.course.id,
            enrollment_id=enrollment.id,
            data={
                'course_title': enrollment.course.title,
                'instructor_name': enrollment.course.instructor.name,
            }
        )
    
    @staticmethod
    def notify_course_completion(enrollment):
        """
        Send course completion notification
        """
        return NotificationService.create_notification(
            recipient=enrollment.student,
            title=f"Congratulations! You completed {enrollment.course.title}",
            message=f"You have successfully completed {enrollment.course.title}. Your certificate is being generated.",
            notification_type='completion',
            priority='high',
            course_id=enrollment.course.id,
            enrollment_id=enrollment.id,
            data={
                'course_title': enrollment.course.title,
                'completion_percentage': enrollment.progress_percentage,
            }
        )
    
    @staticmethod
    def notify_certificate_generated(certificate):
        """
        Send certificate generation notification
        """
        return NotificationService.create_notification(
            recipient=certificate.student,
            title=f"Your certificate for {certificate.course.title} is ready!",
            message=f"Your certificate for completing {certificate.course.title} has been generated and is ready for download.",
            notification_type='certificate',
            priority='high',
            course_id=certificate.course.id,
            data={
                'course_title': certificate.course.title,
                'certificate_number': certificate.certificate_number,
                'verification_code': certificate.verification_code,
            }
        )
    
    @staticmethod
    def notify_payment_success(payment):
        """
        Send payment success notification
        """
        return NotificationService.create_notification(
            recipient=payment.user,
            title=f"Payment successful for {payment.course.title}",
            message=f"Your payment of ${payment.amount} for {payment.course.title} has been processed successfully.",
            notification_type='payment',
            priority='high',
            course_id=payment.course.id,
            data={
                'course_title': payment.course.title,
                'amount': str(payment.amount),
                'payment_id': payment.stripe_payment_intent_id,
            }
        )
    
    @staticmethod
    def notify_quiz_result(quiz_attempt):
        """
        Send quiz result notification
        """
        passed = quiz_attempt.score >= quiz_attempt.quiz.passing_score
        status = "passed" if passed else "failed"
        
        return NotificationService.create_notification(
            recipient=quiz_attempt.student,
            title=f"Quiz result: You {status} {quiz_attempt.quiz.title}",
            message=f"You scored {quiz_attempt.score}% on {quiz_attempt.quiz.title}. " +
                   (f"Congratulations! You passed." if passed else f"You need {quiz_attempt.quiz.passing_score}% to pass."),
            notification_type='quiz_result',
            priority='medium',
            course_id=quiz_attempt.quiz.course.id,
            quiz_id=quiz_attempt.quiz.id,
            data={
                'quiz_title': quiz_attempt.quiz.title,
                'score': quiz_attempt.score,
                'passing_score': quiz_attempt.quiz.passing_score,
                'passed': passed,
            }
        )
    
    @staticmethod
    def notify_course_update(course, students, update_message):
        """
        Send course update notification to enrolled students
        """
        notifications = []
        for student in students:
            notification = NotificationService.create_notification(
                recipient=student,
                title=f"Update for {course.title}",
                message=update_message,
                notification_type='course_update',
                course_id=course.id,
                data={
                    'course_title': course.title,
                    'instructor_name': course.instructor.name,
                }
            )
            if notification:
                notifications.append(notification)
        
        return notifications
    
    @staticmethod
    def get_unread_count(user):
        """
        Get count of unread notifications for user
        """
        return Notification.objects.filter(
            recipient=user,
            is_read=False
        ).count()
    
    @staticmethod
    def mark_all_as_read(user):
        """
        Mark all notifications as read for user
        """
        return Notification.objects.filter(
            recipient=user,
            is_read=False
        ).update(
            is_read=True,
            read_at=timezone.now()
        )