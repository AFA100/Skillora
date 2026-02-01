from django.contrib import admin
from .models import Certificate


@admin.register(Certificate)
class CertificateAdmin(admin.ModelAdmin):
    list_display = ['certificate_id', 'student', 'course', 'issued_at', 'is_valid']
    list_filter = ['is_valid', 'issued_at']
    search_fields = ['student__email', 'course__title', 'certificate_id']
    readonly_fields = ['certificate_id', 'issued_at']