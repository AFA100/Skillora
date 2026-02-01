from django.urls import path
from .views import (
    PaymentListView, PaymentDetailView, create_payment_intent,
    confirm_payment, request_refund, PaymentMethodListView,
    save_payment_method, payment_stats, revenue_chart
)

app_name = 'payments'

urlpatterns = [
    # Payment management
    path('', PaymentListView.as_view(), name='payment-list'),
    path('<uuid:pk>/', PaymentDetailView.as_view(), name='payment-detail'),
    
    # Stripe integration
    path('create-intent/', create_payment_intent, name='create-payment-intent'),
    path('confirm/', confirm_payment, name='confirm-payment'),
    path('<uuid:payment_id>/refund/', request_refund, name='request-refund'),
    
    # Payment methods
    path('methods/', PaymentMethodListView.as_view(), name='payment-methods'),
    path('methods/save/', save_payment_method, name='save-payment-method'),
    
    # Analytics
    path('stats/', payment_stats, name='payment-stats'),
    path('revenue-chart/', revenue_chart, name='revenue-chart'),
]