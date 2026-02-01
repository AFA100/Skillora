"""
Certificate generation services
"""
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Image
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.colors import HexColor
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader
from io import BytesIO
from django.conf import settings
from django.utils import timezone
import os


class CertificateGenerator:
    """
    Service for generating PDF certificates
    """
    
    def __init__(self):
        self.page_width, self.page_height = A4
        self.margin = 0.75 * inch
        
    def generate_certificate_pdf(self, certificate):
        """Generate PDF certificate"""
        buffer = BytesIO()
        
        # Create PDF document
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=self.margin,
            leftMargin=self.margin,
            topMargin=self.margin,
            bottomMargin=self.margin
        )
        
        # Build certificate content
        story = []
        styles = getSampleStyleSheet()
        
        # Custom styles
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=28,
            spaceAfter=30,
            alignment=TA_CENTER,
            textColor=HexColor('#2C3E50')
        )
        
        subtitle_style = ParagraphStyle(
            'CustomSubtitle',
            parent=styles['Heading2'],
            fontSize=18,
            spaceAfter=20,
            alignment=TA_CENTER,
            textColor=HexColor('#34495E')
        )
        
        body_style = ParagraphStyle(
            'CustomBody',
            parent=styles['Normal'],
            fontSize=14,
            spaceAfter=15,
            alignment=TA_CENTER,
            textColor=HexColor('#2C3E50')
        )
        
        name_style = ParagraphStyle(
            'CustomName',
            parent=styles['Heading1'],
            fontSize=24,
            spaceAfter=20,
            alignment=TA_CENTER,
            textColor=HexColor('#E74C3C'),
            fontName='Helvetica-Bold'
        )
        
        # Certificate header
        story.append(Spacer(1, 0.5 * inch))
        
        # Title
        title = Paragraph("CERTIFICATE OF COMPLETION", title_style)
        story.append(title)
        story.append(Spacer(1, 0.3 * inch))
        
        # Subtitle
        subtitle = Paragraph("This is to certify that", subtitle_style)
        story.append(subtitle)
        story.append(Spacer(1, 0.2 * inch))
        
        # Student name
        student_name = Paragraph(certificate.student.name, name_style)
        story.append(student_name)
        story.append(Spacer(1, 0.3 * inch))
        
        # Course completion text
        completion_text = f"""
        has successfully completed the course<br/>
        <b>"{certificate.course.title}"</b><br/>
        offered by Skillora Learning Platform
        """
        completion_para = Paragraph(completion_text, body_style)
        story.append(completion_para)
        story.append(Spacer(1, 0.3 * inch))
        
        # Completion details
        if certificate.final_score:
            score_text = f"Final Score: {certificate.final_score}%"
            score_para = Paragraph(score_text, body_style)
            story.append(score_para)
        
        completion_date = certificate.completion_date.strftime("%B %d, %Y")
        date_text = f"Completed on: {completion_date}"
        date_para = Paragraph(date_text, body_style)
        story.append(date_para)
        story.append(Spacer(1, 0.4 * inch))
        
        # Certificate details
        cert_details = f"""
        Certificate Number: {certificate.certificate_number}<br/>
        Verification Code: {certificate.verification_code}<br/>
        Issued Date: {certificate.issued_at.strftime("%B %d, %Y")}
        """
        details_para = Paragraph(cert_details, body_style)
        story.append(details_para)
        story.append(Spacer(1, 0.3 * inch))
        
        # Verification URL
        verification_text = f"""
        Verify this certificate at:<br/>
        <link href="{certificate.verification_url}">{certificate.verification_url}</link>
        """
        verification_para = Paragraph(verification_text, body_style)
        story.append(verification_para)
        story.append(Spacer(1, 0.5 * inch))
        
        # Signature section
        signature_style = ParagraphStyle(
            'Signature',
            parent=styles['Normal'],
            fontSize=12,
            alignment=TA_CENTER,
            textColor=HexColor('#7F8C8D')
        )
        
        signature_text = """
        ________________________________<br/>
        Skillora Learning Platform<br/>
        Digital Signature
        """
        signature_para = Paragraph(signature_text, signature_style)
        story.append(signature_para)
        
        # Build PDF
        doc.build(story, onFirstPage=self._add_border, onLaterPages=self._add_border)
        
        # Get PDF content
        pdf_content = buffer.getvalue()
        buffer.close()
        
        return pdf_content
    
    def _add_border(self, canvas, doc):
        """Add decorative border to certificate"""
        canvas.saveState()
        
        # Draw border
        border_color = HexColor('#3498DB')
        canvas.setStrokeColor(border_color)
        canvas.setLineWidth(3)
        
        # Outer border
        canvas.rect(
            0.5 * inch, 0.5 * inch,
            self.page_width - 1 * inch,
            self.page_height - 1 * inch
        )
        
        # Inner border
        canvas.setLineWidth(1)
        canvas.rect(
            0.6 * inch, 0.6 * inch,
            self.page_width - 1.2 * inch,
            self.page_height - 1.2 * inch
        )
        
        # Corner decorations
        self._draw_corner_decorations(canvas)
        
        canvas.restoreState()
    
    def _draw_corner_decorations(self, canvas):
        """Draw decorative corners"""
        corner_size = 0.3 * inch
        margin = 0.5 * inch
        
        # Top-left corner
        canvas.circle(margin + corner_size/2, self.page_height - margin - corner_size/2, corner_size/4, fill=1)
        
        # Top-right corner
        canvas.circle(self.page_width - margin - corner_size/2, self.page_height - margin - corner_size/2, corner_size/4, fill=1)
        
        # Bottom-left corner
        canvas.circle(margin + corner_size/2, margin + corner_size/2, corner_size/4, fill=1)
        
        # Bottom-right corner
        canvas.circle(self.page_width - margin - corner_size/2, margin + corner_size/2, corner_size/4, fill=1)


def generate_certificate_for_enrollment(enrollment):
    """
    Generate certificate for completed enrollment
    """
    from .models import Certificate
    
    # Check if certificate already exists
    certificate, created = Certificate.objects.get_or_create(
        student=enrollment.student,
        course=enrollment.course,
        defaults={
            'enrollment': enrollment,
            'completion_date': timezone.now(),
            'completion_percentage': enrollment.progress_percentage,
        }
    )
    
    if created or not certificate.pdf_file:
        # Generate PDF
        certificate.generate_pdf()
    
    return certificate


def verify_certificate(verification_code):
    """
    Verify certificate by verification code
    """
    from .models import Certificate
    
    try:
        certificate = Certificate.objects.get(
            verification_code=verification_code,
            is_valid=True,
            is_verified=True
        )
        return {
            'valid': True,
            'certificate': certificate,
            'student_name': certificate.student.name,
            'course_title': certificate.course.title,
            'completion_date': certificate.completion_date,
            'certificate_number': certificate.certificate_number,
        }
    except Certificate.DoesNotExist:
        return {
            'valid': False,
            'error': 'Certificate not found or invalid'
        }