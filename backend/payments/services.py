import stripe
from django.conf import settings
from django.utils import timezone
from decimal import Decimal
from .models import Payment, PaymentMethod, PaymentAttempt
from enrollments.models import Enrollment

# Configure Stripe
stripe.api_key = getattr(settings, 'STRIPE_SECRET_KEY', '')


class StripePaymentService:
    """Service for handling Stripe payments"""
    
    @staticmethod
    def create_payment_intent(user, course, payment_method_id=None, save_payment_method=False):
        """Create a Stripe payment intent"""
        try:
            # Create payment record
            payment = Payment.objects.create(
                user=user,
                course=course,
                amount=course.price,
                currency='USD',
                payment_type='course_purchase',
                description=f'Purchase of course: {course.title}'
            )
            
            # Prepare Stripe payment intent data
            intent_data = {
                'amount': int(course.price * 100),  # Convert to cents
                'currency': 'usd',
                'metadata': {
                    'payment_id': str(payment.id),
                    'course_id': course.id,
                    'user_id': user.id,
                    'course_title': course.title
                },
                'description': f'Course: {course.title}'
            }
            
            # Add customer if exists
            if hasattr(user, 'stripe_customer_id') and user.stripe_customer_id:
                intent_data['customer'] = user.stripe_customer_id
            
            # Add payment method if provided
            if payment_method_id:
                intent_data['payment_method'] = payment_method_id
                intent_data['confirmation_method'] = 'manual'
                intent_data['confirm'] = True
                
                if save_payment_method:
                    intent_data['setup_future_usage'] = 'off_session'
            
            # Create payment intent
            payment_intent = stripe.PaymentIntent.create(**intent_data)
            
            # Update payment with Stripe data
            payment.stripe_payment_intent_id = payment_intent.id
            payment.status = 'processing'
            payment.save()
            
            return {
                'payment_intent': payment_intent,
                'payment': payment,
                'client_secret': payment_intent.client_secret
            }
            
        except stripe.error.StripeError as e:
            # Log payment attempt
            if 'payment' in locals():
                PaymentAttempt.objects.create(
                    payment=payment,
                    error_code=e.code if hasattr(e, 'code') else 'unknown',
                    error_message=str(e)
                )
                payment.status = 'failed'
                payment.save()
            
            raise Exception(f"Stripe error: {str(e)}")
        
        except Exception as e:
            if 'payment' in locals():
                payment.status = 'failed'
                payment.save()
            raise e
    
    @staticmethod
    def confirm_payment(payment_intent_id):
        """Confirm a payment and create enrollment"""
        try:
            # Get payment intent from Stripe
            payment_intent = stripe.PaymentIntent.retrieve(payment_intent_id)
            
            # Get payment record
            payment = Payment.objects.get(stripe_payment_intent_id=payment_intent_id)
            
            if payment_intent.status == 'succeeded':
                # Mark payment as completed
                payment.status = 'completed'
                payment.completed_at = timezone.now()
                payment.stripe_charge_id = payment_intent.charges.data[0].id if payment_intent.charges.data else ''
                payment.save()
                
                # Create enrollment
                enrollment, created = Enrollment.objects.get_or_create(
                    student=payment.user,
                    course=payment.course,
                    defaults={
                        'payment': payment,
                        'status': 'active'
                    }
                )
                
                if not created:
                    # Update existing enrollment
                    enrollment.payment = payment
                    enrollment.status = 'active'
                    enrollment.save()
                
                # Create earning transaction for teacher
                from teachers.payout_models import TeacherEarnings, PayoutTransaction
                
                # Get or create teacher earnings record
                earnings, created = TeacherEarnings.objects.get_or_create(
                    teacher=payment.course.instructor
                )
                
                # Add sale to earnings
                net_amount = earnings.add_sale(payment.amount)
                
                # Create transaction record
                PayoutTransaction.objects.create(
                    teacher=payment.course.instructor,
                    course=payment.course,
                    payment=payment,
                    gross_amount=payment.amount,
                    commission_rate=earnings.commission_rate,
                    commission_amount=payment.amount - net_amount,
                    net_amount=net_amount
                )
                
                return {
                    'success': True,
                    'payment': payment,
                    'enrollment': enrollment,
                    'message': 'Payment successful and enrollment created'
                }
            
            elif payment_intent.status == 'requires_action':
                return {
                    'success': False,
                    'requires_action': True,
                    'client_secret': payment_intent.client_secret,
                    'message': 'Additional authentication required'
                }
            
            else:
                payment.status = 'failed'
                payment.save()
                
                PaymentAttempt.objects.create(
                    payment=payment,
                    stripe_payment_intent_id=payment_intent_id,
                    error_code='payment_failed',
                    error_message=f'Payment intent status: {payment_intent.status}'
                )
                
                return {
                    'success': False,
                    'message': 'Payment failed'
                }
                
        except Payment.DoesNotExist:
            return {
                'success': False,
                'message': 'Payment record not found'
            }
        
        except stripe.error.StripeError as e:
            return {
                'success': False,
                'message': f'Stripe error: {str(e)}'
            }
        
        except Exception as e:
            return {
                'success': False,
                'message': f'Error confirming payment: {str(e)}'
            }
    
    @staticmethod
    def create_refund(payment, amount=None, reason=''):
        """Create a refund for a payment"""
        try:
            if not payment.can_be_refunded:
                raise ValueError("Payment cannot be refunded")
            
            refund_amount = amount or (payment.amount - payment.refunded_amount)
            
            # Create refund in Stripe
            refund = stripe.Refund.create(
                charge=payment.stripe_charge_id,
                amount=int(refund_amount * 100),  # Convert to cents
                reason='requested_by_customer',
                metadata={
                    'payment_id': str(payment.id),
                    'refund_reason': reason
                }
            )
            
            # Update payment record
            payment.process_refund(refund_amount, reason)
            
            # Update enrollment status if fully refunded
            if payment.status == 'refunded':
                enrollments = Enrollment.objects.filter(payment=payment)
                enrollments.update(status='dropped')
            
            return {
                'success': True,
                'refund': refund,
                'payment': payment,
                'message': 'Refund processed successfully'
            }
            
        except stripe.error.StripeError as e:
            return {
                'success': False,
                'message': f'Stripe error: {str(e)}'
            }
        
        except Exception as e:
            return {
                'success': False,
                'message': f'Error processing refund: {str(e)}'
            }
    
    @staticmethod
    def save_payment_method(user, payment_method_id):
        """Save a payment method for future use"""
        try:
            # Get payment method from Stripe
            payment_method = stripe.PaymentMethod.retrieve(payment_method_id)
            
            # Create or get customer
            if not hasattr(user, 'stripe_customer_id') or not user.stripe_customer_id:
                customer = stripe.Customer.create(
                    email=user.email,
                    name=user.name,
                    metadata={'user_id': user.id}
                )
                user.stripe_customer_id = customer.id
                user.save()
            
            # Attach payment method to customer
            payment_method.attach(customer=user.stripe_customer_id)
            
            # Save payment method record
            pm_record = PaymentMethod.objects.create(
                user=user,
                type='card',
                stripe_payment_method_id=payment_method_id,
                card_last_four=payment_method.card.last4,
                card_brand=payment_method.card.brand,
                card_exp_month=payment_method.card.exp_month,
                card_exp_year=payment_method.card.exp_year
            )
            
            return {
                'success': True,
                'payment_method': pm_record,
                'message': 'Payment method saved successfully'
            }
            
        except stripe.error.StripeError as e:
            return {
                'success': False,
                'message': f'Stripe error: {str(e)}'
            }
        
        except Exception as e:
            return {
                'success': False,
                'message': f'Error saving payment method: {str(e)}'
            }


class PaymentAnalyticsService:
    """Service for payment analytics"""
    
    @staticmethod
    def get_payment_stats(user=None, course=None, date_from=None, date_to=None):
        """Get payment statistics"""
        from django.db.models import Count, Sum, Avg, Q
        
        queryset = Payment.objects.all()
        
        if user:
            queryset = queryset.filter(user=user)
        
        if course:
            queryset = queryset.filter(course=course)
        
        if date_from:
            queryset = queryset.filter(created_at__gte=date_from)
        
        if date_to:
            queryset = queryset.filter(created_at__lte=date_to)
        
        stats = queryset.aggregate(
            total_payments=Count('id'),
            successful_payments=Count('id', filter=Q(status='completed')),
            failed_payments=Count('id', filter=Q(status='failed')),
            total_revenue=Sum('amount', filter=Q(status='completed')) or Decimal('0'),
            refunded_amount=Sum('refunded_amount') or Decimal('0'),
            average_payment=Avg('amount', filter=Q(status='completed')) or Decimal('0')
        )
        
        # Calculate success rate
        if stats['total_payments'] > 0:
            stats['success_rate'] = (stats['successful_payments'] / stats['total_payments']) * 100
        else:
            stats['success_rate'] = 0
        
        return stats
    
    @staticmethod
    def get_revenue_by_period(period='month', user=None, course=None):
        """Get revenue grouped by time period"""
        from django.db.models import Sum
        from django.db.models.functions import TruncMonth, TruncWeek, TruncDay
        
        queryset = Payment.objects.filter(status='completed')
        
        if user:
            queryset = queryset.filter(user=user)
        
        if course:
            queryset = queryset.filter(course=course)
        
        if period == 'day':
            trunc_func = TruncDay
        elif period == 'week':
            trunc_func = TruncWeek
        else:
            trunc_func = TruncMonth
        
        return queryset.annotate(
            period=trunc_func('created_at')
        ).values('period').annotate(
            revenue=Sum('amount'),
            payment_count=Count('id')
        ).order_by('period')