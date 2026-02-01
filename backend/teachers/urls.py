from django.urls import path
from .views import (
    TeacherProfileView, TeacherVerificationStatusView,
    generate_upload_url, submit_verification, download_verification_file,
    AdminVerificationListView, AdminVerificationDetailView, review_verification
)
from . import payout_views

app_name = 'teachers'

urlpatterns = [
    # Teacher profile
    path('profile/', TeacherProfileView.as_view(), name='profile'),
    
    # Verification endpoints
    path('verification/status/', TeacherVerificationStatusView.as_view(), name='verification_status'),
    path('verification/upload-url/', generate_upload_url, name='generate_upload_url'),
    path('verification/submit/', submit_verification, name='submit_verification'),
    path('verification/<uuid:submission_id>/download/<str:file_type>/', 
         download_verification_file, name='download_verification_file'),
    
    # Admin verification endpoints
    path('admin/verifications/', AdminVerificationListView.as_view(), name='admin_verification_list'),
    path('admin/verifications/<uuid:submission_id>/', 
         AdminVerificationDetailView.as_view(), name='admin_verification_detail'),
    path('admin/verifications/<uuid:submission_id>/review/', 
         review_verification, name='review_verification'),
    
    # Teacher Payout System
    path('bank-account/', payout_views.TeacherBankAccountView.as_view(), name='teacher-bank-account'),
    path('bank-account/create/', payout_views.TeacherBankAccountCreateView.as_view(), name='create-bank-account'),
    path('earnings/', payout_views.TeacherEarningsView.as_view(), name='teacher-earnings'),
    path('earnings/dashboard/', payout_views.teacher_earnings_dashboard, name='earnings-dashboard'),
    
    # Payout Requests
    path('payouts/', payout_views.PayoutRequestListCreateView.as_view(), name='payout-requests'),
    path('payouts/<uuid:pk>/', payout_views.PayoutRequestDetailView.as_view(), name='payout-request-detail'),
    path('transactions/', payout_views.PayoutTransactionListView.as_view(), name='payout-transactions'),
    
    # Admin Payout Management
    path('admin/payouts/', payout_views.AdminPayoutRequestListView.as_view(), name='admin-payout-requests'),
    path('admin/payouts/<uuid:pk>/', payout_views.AdminPayoutRequestDetailView.as_view(), name='admin-payout-detail'),
    path('admin/payouts/dashboard/', payout_views.admin_payout_dashboard, name='admin-payout-dashboard'),
    path('admin/bank-accounts/<int:teacher_id>/verify/', payout_views.verify_bank_account, name='verify-bank-account'),
]