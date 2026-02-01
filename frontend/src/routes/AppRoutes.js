import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// Layout Components
import Layout from '../components/Layout/Layout';
import PublicLayout from '../components/Layout/PublicLayout';

// Public Pages
import HomePage from '../pages/public/HomePage';
import CourseCatalog from '../pages/public/CourseCatalog';
import CourseDetail from '../pages/public/CourseDetail';
import LoginPage from '../pages/auth/LoginPage';
import SignupPage from '../pages/auth/RegisterPage';
import ForgotPasswordPage from '../pages/auth/ForgotPasswordPage';
import ResetPasswordPage from '../pages/auth/ResetPasswordPage';

// Protected Pages
import DashboardPage from '../pages/dashboard/DashboardPage';
import ProfilePage from '../pages/profile/ProfilePage';

// Role-specific Pages
import LearnerDashboard from '../pages/learner/LearnerDashboard';
import CoursePlayer from '../pages/learner/CoursePlayer';
import LearningAnalytics from '../pages/learner/LearningAnalytics';
import TeacherDashboard from '../pages/teacher/TeacherDashboard';
import TeacherProfile from '../pages/teacher/TeacherProfile';
import TeacherVerificationForm from '../pages/teacher/TeacherVerificationForm';
import TeacherVerificationStatus from '../pages/teacher/TeacherVerificationStatus';
import CourseCreation from '../pages/teacher/CourseCreation';
import CourseBuilder from '../pages/teacher/CourseBuilder';
import CourseManagement from '../pages/teacher/CourseManagement';
import AdminDashboard from '../pages/admin/AdminDashboard';
import TeacherManagement from '../pages/admin/TeacherManagement';
import LearnerManagement from '../pages/admin/LearnerManagement';
import ActivityLogs from '../pages/admin/ActivityLogs';
import CreateUser from '../pages/admin/CreateUser';

// Route Guards
import ProtectedRoute from './ProtectedRoute';
import RoleBasedRoute from './RoleBasedRoute';

const AppRoutes = () => {
  const { loading } = useAuth();

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<PublicLayout />}>
        <Route index element={<HomePage />} />
        <Route path="courses" element={<CourseCatalog />} />
        <Route path="courses/:courseId" element={<CourseDetail />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="signup" element={<SignupPage />} />
        <Route path="forgot-password" element={<ForgotPasswordPage />} />
        <Route path="reset-password/:token" element={<ResetPasswordPage />} />
      </Route>

      {/* Protected Routes */}
      <Route path="/app" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="profile" element={<ProfilePage />} />
        
        {/* Role-based Routes */}
        <Route path="learner" element={<RoleBasedRoute allowedRoles={['learner']} />}>
          <Route index element={<LearnerDashboard />} />
          <Route path="course/:enrollmentId" element={<CoursePlayer />} />
          <Route path="course/:enrollmentId/analytics" element={<LearningAnalytics />} />
        </Route>
        
        <Route path="teacher" element={<RoleBasedRoute allowedRoles={['teacher']} />}>
          <Route index element={<TeacherDashboard />} />
          <Route path="profile" element={<TeacherProfile />} />
          <Route path="verification/submit" element={<TeacherVerificationForm />} />
          <Route path="verification/status" element={<TeacherVerificationStatus />} />
          <Route path="courses" element={<CourseManagement />} />
          <Route path="courses/create" element={<CourseCreation />} />
          <Route path="courses/:courseId/edit" element={<CourseBuilder />} />
        </Route>
        
        <Route path="admin" element={<RoleBasedRoute allowedRoles={['admin']} />}>
          <Route index element={<AdminDashboard />} />
          <Route path="teachers" element={<TeacherManagement />} />
          <Route path="learners" element={<LearnerManagement />} />
          <Route path="logs" element={<ActivityLogs />} />
          <Route path="create-user" element={<CreateUser />} />
        </Route>
      </Route>

      {/* Catch all route */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default AppRoutes;