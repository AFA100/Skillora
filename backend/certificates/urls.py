from django.urls import path
from . import views

app_name = 'certificates'

urlpatterns = [
    # Certificate management
    path('', views.CertificateListView.as_view(), name='certificate-list'),
    path('<uuid:certificate_id>/', views.CertificateDetailView.as_view(), name='certificate-detail'),
    path('generate/<int:enrollment_id>/', views.generate_certificate, name='generate-certificate'),
    path('download/<uuid:certificate_id>/', views.download_certificate, name='download-certificate'),
    
    # Certificate verification (public)
    path('verify/<str:verification_code>/', views.verify_certificate_view, name='verify-certificate'),
    
    # Admin endpoints
    path('admin/list/', views.AdminCertificateListView.as_view(), name='admin-certificate-list'),
    path('admin/revoke/<uuid:certificate_id>/', views.revoke_certificate, name='revoke-certificate'),
]