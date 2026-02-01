# Skillora - Online Learning Platform

A comprehensive online learning platform built with Django REST Framework and React.

## Tech Stack

- **Backend**: Django + Django REST Framework
- **Frontend**: React
- **Database**: PostgreSQL
- **Authentication**: JWT
- **Roles**: learner, teacher, admin

## Project Structure

```
skillora/
├── backend/
│   ├── skillora/          # Django project settings
│   ├── accounts/          # User management & authentication
│   ├── teachers/          # Teacher profiles
│   ├── courses/           # Course management
│   ├── enrollments/       # Student enrollments
│   ├── payments/          # Payment processing
│   ├── quizzes/           # Quiz system
│   ├── certificates/      # Certificate management
│   └── audit/             # Audit logging
├── frontend/
│   ├── src/
│   │   ├── components/    # Reusable components
│   │   ├── pages/         # Page components
│   │   ├── contexts/      # React contexts
│   │   ├── routes/        # Routing configuration
│   │   └── services/      # API services
│   └── public/
└── requirements.txt
```

## Setup Instructions

### Backend Setup

1. **Create virtual environment**:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Setup PostgreSQL database**:
   - Create database: `skillora_db`
   - Create user: `skillora_user` with password: `skillora_pass`

4. **Configure environment**:
   ```bash
   cd backend
   cp .env.example .env
   # Edit .env with your database credentials
   ```

5. **Run migrations**:
   ```bash
   cd backend
   python manage.py makemigrations
   python manage.py migrate
   ```

6. **Create superuser**:
   ```bash
   python manage.py createsuperuser
   ```

7. **Start development server**:
   ```bash
   python manage.py runserver
   ```

### Frontend Setup

1. **Install dependencies**:
   ```bash
   cd frontend
   npm install
   ```

2. **Configure environment**:
   ```bash
   cp .env.example .env
   # Edit .env if needed
   ```

3. **Start development server**:
   ```bash
   npm start
   ```

## Features Implemented

### Sprint 0 - Foundation & Architecture
- ✅ Django project with PostgreSQL
- ✅ Django REST Framework configuration
- ✅ JWT authentication
- ✅ Custom User model with RBAC
- ✅ Base apps: accounts, teachers, courses, enrollments, payments, quizzes, certificates, audit
- ✅ Role-based permissions
- ✅ API endpoints structure

### Sprint 1 - Authentication & User Management
- ✅ Enhanced User model with name, email, password, role, is_active, created_at, updated_at
- ✅ Robust password hashing and validation with strength requirements
- ✅ Complete JWT authentication endpoints (signup, login, refresh, password reset)
- ✅ Role-based access control middleware
- ✅ Enhanced frontend with signup, login, password reset flows
- ✅ Role-based navigation and route guarding

### Sprint 2 - Teacher Verification
- ✅ TeacherProfile model with bio, skills, profile_photo
- ✅ TeacherVerification model with government ID, portfolio, demo video, status tracking
- ✅ S3 file upload service with presigned URLs
- ✅ File validation (type, size) for different upload types
- ✅ Teacher verification form with drag-and-drop file uploads
- ✅ Verification status tracking and display
- ✅ Admin verification review system
- ✅ Restricted teacher features until verification approved

### Sprint 3 - Admin Panel
- ✅ Admin dashboard with comprehensive statistics and overview
- ✅ Teacher management system with approve/reject/suspend functionality
- ✅ Learner management with suspension and reactivation capabilities
- ✅ Activity logs with filtering and detailed view
- ✅ User creation interface for admins
- ✅ Role-based access control enforcement
- ✅ Audit logging for all admin actions
- ✅ Real-time status updates and notifications
- ✅ Responsive admin interface with data tables and modals

### Frontend
- ✅ React application setup
- ✅ Axios API client with JWT interceptors
- ✅ Authentication context
- ✅ Role-based routing
- ✅ Protected routes
- ✅ File upload component with progress tracking
- ✅ Teacher verification workflow
- ✅ Admin panel with user management
- ✅ Responsive layout

## API Endpoints

### Authentication
- `POST /api/auth/signup/` - User registration
- `POST /api/auth/login/` - User login
- `POST /api/auth/logout/` - User logout
- `GET/PATCH /api/auth/profile/` - User profile
- `POST /api/auth/refresh/` - Token refresh
- `POST /api/auth/password-reset/` - Password reset request
- `POST /api/auth/password-reset/confirm/` - Password reset confirmation

### Teacher Management
- `GET/PATCH /api/teachers/profile/` - Teacher profile management
- `GET /api/teachers/verification/status/` - Get verification status
- `POST /api/teachers/verification/upload-url/` - Generate S3 upload URL
- `POST /api/teachers/verification/submit/` - Submit verification documents
- `GET /api/teachers/verification/<id>/download/<type>/` - Download verification files

### Admin Endpoints
- `GET /api/teachers/admin/verifications/` - List all verifications
- `GET /api/teachers/admin/verifications/<id>/` - Get verification details
- `POST /api/teachers/admin/verifications/<id>/review/` - Review verification

### Admin Endpoints
- `GET /api/auth/admin/dashboard/stats/` - Dashboard statistics
- `GET /api/auth/admin/teachers/` - List all teachers with filters
- `PATCH /api/auth/admin/teachers/<id>/approve/` - Approve teacher verification
- `PATCH /api/auth/admin/teachers/<id>/reject/` - Reject teacher verification
- `PATCH /api/auth/admin/teachers/<id>/suspend/` - Suspend teacher account
- `GET /api/auth/admin/learners/` - List all learners with filters
- `PATCH /api/auth/admin/learners/<id>/suspend/` - Suspend learner account
- `PATCH /api/auth/admin/users/<id>/reactivate/` - Reactivate suspended user
- `POST /api/auth/admin/create-user/` - Create new user account
- `GET /api/audit/logs/` - List activity logs with filters

### Other Apps
- `/api/courses/` - Course management
- `/api/enrollments/` - Enrollment management
- `/api/payments/` - Payment processing
- `/api/quizzes/` - Quiz system
- `/api/certificates/` - Certificate management
- `/api/audit/` - Audit logs (admin only)

## User Roles

1. **Learner**: Can enroll in courses, take quizzes, view certificates
2. **Teacher**: Can create courses, manage students, view analytics
3. **Admin**: Full system access, user management, audit logs

## Development Notes

- All models include proper timestamps and relationships
- JWT tokens auto-refresh on API calls
- Role-based access control implemented at both backend and frontend
- Audit logging for security and compliance
- Responsive design with mobile-first approach

## Next Steps

This foundation provides:
- Complete authentication system
- Role-based access control
- Basic CRUD operations for all entities
- Secure API with JWT
- Responsive React frontend
- Database schema for all features

Ready for Sprint 1 implementation!# Skillora
This is my personal platform
