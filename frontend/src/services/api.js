import axios from 'axios';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => {
    console.log('🔍 API Response:', response.config.url, response.status);
    return response;
  },
  async (error) => {
    console.error('🔍 API Error:', error.config?.url, error.response?.status);
    console.error('🔍 API Error Details:', error.response?.data);
    
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          const response = await axios.post(
            `${process.env.REACT_APP_API_URL || 'http://localhost:8000/api'}/auth/refresh/`,
            { refresh: refreshToken }
          );

          const { access } = response.data;
          localStorage.setItem('accessToken', access);

          // Retry original request with new token
          originalRequest.headers.Authorization = `Bearer ${access}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed, redirect to login
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

// Auth API methods
export const authAPI = {
  signup: (userData) => api.post('/auth/signup/', userData),
  login: (credentials) => {
    console.log('🔍 API Service: Login called with:', credentials);
    console.log('🔍 API Service: Base URL:', api.defaults.baseURL);
    return api.post('/auth/login/', credentials);
  },
  logout: (refreshToken) => api.post('/auth/logout/', { refresh: refreshToken }),
  refreshToken: (refreshToken) => api.post('/auth/refresh/', { refresh: refreshToken }),
  passwordReset: (email) => api.post('/auth/password-reset/', { email }),
  passwordResetConfirm: (data) => api.post('/auth/password-reset/confirm/', data),
  getProfile: () => api.get('/auth/profile/'),
  updateProfile: (data) => api.patch('/auth/profile/', data),
};

// Course API methods
export const courseAPI = {
  // Course management
  getCourses: () => api.get('/courses/'),
  createCourse: (data) => api.post('/courses/', data),
  getCourse: (id) => api.get(`/courses/${id}/`),
  updateCourse: (id, data) => api.put(`/courses/${id}/`, data),
  deleteCourse: (id) => api.delete(`/courses/${id}/`),
  submitCourse: (id) => api.post(`/courses/${id}/submit/`),
  
  // Section management
  getSections: (courseId) => api.get(`/courses/${courseId}/sections/`),
  createSection: (courseId, data) => api.post(`/courses/${courseId}/sections/`, data),
  updateSection: (courseId, sectionId, data) => api.put(`/courses/${courseId}/sections/${sectionId}/`, data),
  deleteSection: (courseId, sectionId) => api.delete(`/courses/${courseId}/sections/${sectionId}/`),
  reorderSections: (courseId, sectionOrders) => api.post(`/courses/${courseId}/sections/reorder/`, { section_orders: sectionOrders }),
  
  // Lesson management
  getLessons: (courseId, sectionId) => api.get(`/courses/${courseId}/sections/${sectionId}/lessons/`),
  createLesson: (courseId, sectionId, data) => api.post(`/courses/${courseId}/sections/${sectionId}/lessons/`, data),
  updateLesson: (courseId, sectionId, lessonId, data) => api.put(`/courses/${courseId}/sections/${sectionId}/lessons/${lessonId}/`, data),
  deleteLesson: (courseId, sectionId, lessonId) => api.delete(`/courses/${courseId}/sections/${sectionId}/lessons/${lessonId}/`),
  reorderLessons: (courseId, sectionId, lessonOrders) => api.post(`/courses/${courseId}/sections/${sectionId}/lessons/reorder/`, { lesson_orders: lessonOrders }),
  
  // Public courses (for learners)
  getPublicCourses: (params = {}) => api.get('/courses/public/', { params }),
  getPublicCourse: (id) => api.get(`/courses/public/${id}/`),
};

// Enrollment API methods
export const enrollmentAPI = {
  // Enrollment management
  getEnrollments: () => api.get('/enrollments/'),
  createEnrollment: (data) => api.post('/enrollments/', data),
  getEnrollment: (id) => api.get(`/enrollments/${id}/`),
  updateEnrollment: (id, data) => api.patch(`/enrollments/${id}/`, data),
  
  // Progress tracking
  updateProgress: (enrollmentId, data) => api.post(`/enrollments/${enrollmentId}/progress/`, data),
  getProgress: (enrollmentId) => api.get(`/enrollments/${enrollmentId}/progress/detail/`),
  
  // Course player
  getCoursePlayer: (enrollmentId) => api.get(`/enrollments/${enrollmentId}/player/`),
  startLesson: (enrollmentId, lessonId, data = {}) => api.post(`/enrollments/${enrollmentId}/lessons/${lessonId}/start/`, data),
  updateVideoProgress: (enrollmentId, lessonId, data) => api.post(`/enrollments/${enrollmentId}/lessons/${lessonId}/progress/`, data),
  
  // Student notes
  getNotes: (enrollmentId, params = {}) => api.get(`/enrollments/${enrollmentId}/notes/`, { params }),
  createNote: (enrollmentId, data) => api.post(`/enrollments/${enrollmentId}/notes/`, data),
  updateNote: (enrollmentId, noteId, data) => api.patch(`/enrollments/${enrollmentId}/notes/${noteId}/`, data),
  deleteNote: (enrollmentId, noteId) => api.delete(`/enrollments/${enrollmentId}/notes/${noteId}/`),
  
  // Lesson bookmarks
  getBookmarks: (enrollmentId, params = {}) => api.get(`/enrollments/${enrollmentId}/bookmarks/`, { params }),
  createBookmark: (enrollmentId, data) => api.post(`/enrollments/${enrollmentId}/bookmarks/`, data),
  updateBookmark: (enrollmentId, bookmarkId, data) => api.patch(`/enrollments/${enrollmentId}/bookmarks/${bookmarkId}/`, data),
  deleteBookmark: (enrollmentId, bookmarkId) => api.delete(`/enrollments/${enrollmentId}/bookmarks/${bookmarkId}/`),
  
  // Study sessions
  startStudySession: (enrollmentId, data = {}) => api.post(`/enrollments/${enrollmentId}/sessions/start/`, data),
  endStudySession: (enrollmentId, sessionId) => api.post(`/enrollments/${enrollmentId}/sessions/${sessionId}/end/`),
  getLearningAnalytics: (enrollmentId) => api.get(`/enrollments/${enrollmentId}/analytics/`),
  
  // Course reviews
  getCourseReviews: (courseId) => api.get(`/enrollments/courses/${courseId}/reviews/`),
  createReview: (courseId, data) => api.post(`/enrollments/courses/${courseId}/reviews/`, data),
  updateReview: (reviewId, data) => api.patch(`/enrollments/reviews/${reviewId}/`, data),
  deleteReview: (reviewId) => api.delete(`/enrollments/reviews/${reviewId}/`),
  
  // Public course discovery
  getPublicCourses: (params = {}) => api.get('/enrollments/courses/public/', { params }),
  getPublicCourse: (id) => api.get(`/enrollments/courses/public/${id}/`),
};

// Payment API methods
export const paymentAPI = {
  // Payment management
  getPayments: () => api.get('/payments/'),
  getPayment: (id) => api.get(`/payments/${id}/`),
  
  // Stripe integration
  createPaymentIntent: (data) => api.post('/payments/create-intent/', data),
  confirmPayment: (data) => api.post('/payments/confirm/', data),
  requestRefund: (paymentId, data) => api.post(`/payments/${paymentId}/refund/`, data),
  
  // Payment methods
  getPaymentMethods: () => api.get('/payments/methods/'),
  savePaymentMethod: (data) => api.post('/payments/methods/save/', data),
  
  // Analytics
  getPaymentStats: (params = {}) => api.get('/payments/stats/', { params }),
  getRevenueChart: (params = {}) => api.get('/payments/revenue-chart/', { params }),
};

// Teacher API methods
export const teacherAPI = {
  getProfile: () => api.get('/teachers/profile/'),
  updateProfile: (data) => api.patch('/teachers/profile/', data),
  getVerificationStatus: () => api.get('/teachers/verification/status/'),
  submitVerification: (data) => api.post('/teachers/verification/submit/', data),
  getUploadUrl: (data) => api.post('/teachers/verification/upload-url/', data),
  downloadVerificationFile: (submissionId, fileType) => 
    api.get(`/teachers/verification/${submissionId}/download/${fileType}/`),
  
  // Payout System
  getBankAccount: () => api.get('/teachers/bank-account/'),
  createBankAccount: (data) => api.post('/teachers/bank-account/create/', data),
  updateBankAccount: (data) => api.patch('/teachers/bank-account/', data),
  getEarnings: () => api.get('/teachers/earnings/'),
  getEarningsDashboard: () => api.get('/teachers/earnings/dashboard/'),
  
  // Payout Requests
  getPayoutRequests: () => api.get('/teachers/payouts/'),
  createPayoutRequest: (data) => api.post('/teachers/payouts/', data),
  getPayoutRequest: (id) => api.get(`/teachers/payouts/${id}/`),
  cancelPayoutRequest: (id) => api.patch(`/teachers/payouts/${id}/`, { status: 'cancelled' }),
  getTransactions: () => api.get('/teachers/transactions/'),
};

// Admin API methods
export const adminAPI = {
  // User creation
  createUser: (userData) => api.post('/auth/admin/create-user/', userData),
  
  // Dashboard stats
  getDashboardStats: () => api.get('/auth/admin/dashboard/stats/'),
  
  // Teacher management
  getTeachers: (params = {}) => api.get('/auth/admin/teachers/', { params }),
  approveTeacher: (teacherId, data = {}) => api.patch(`/auth/admin/teachers/${teacherId}/approve/`, data),
  rejectTeacher: (teacherId, data) => api.patch(`/auth/admin/teachers/${teacherId}/reject/`, data),
  suspendTeacher: (teacherId, data) => api.patch(`/auth/admin/teachers/${teacherId}/suspend/`, data),
  
  // Learner management
  getLearners: (params = {}) => api.get('/auth/admin/learners/', { params }),
  suspendLearner: (learnerId, data) => api.patch(`/auth/admin/learners/${learnerId}/suspend/`, data),
  
  // User reactivation
  reactivateUser: (userId) => api.patch(`/auth/admin/users/${userId}/reactivate/`),
  
  // Audit logs
  getAuditLogs: (params = {}) => api.get('/audit/logs/', { params }),
  getAuditLogDetail: (logId) => api.get(`/audit/logs/${logId}/`),
  
  // Teacher verifications
  getVerifications: () => api.get('/teachers/admin/verifications/'),
  getVerificationDetail: (submissionId) => api.get(`/teachers/admin/verifications/${submissionId}/`),
  reviewVerification: (submissionId, data) => api.post(`/teachers/admin/verifications/${submissionId}/review/`, data),
  
  // Payout Management
  getPayoutDashboard: () => api.get('/teachers/admin/payouts/dashboard/'),
  getPayoutRequests: (params = {}) => api.get('/teachers/admin/payouts/', { params }),
  getPayoutRequest: (id) => api.get(`/teachers/admin/payouts/${id}/`),
  updatePayoutRequest: (id, data) => api.patch(`/teachers/admin/payouts/${id}/`, data),
  verifyBankAccount: (teacherId) => api.post(`/teachers/admin/bank-accounts/${teacherId}/verify/`),
};

// Quiz API methods
export const quizAPI = {
  // Teacher Quiz Management
  getQuizzes: () => api.get('/quizzes/'),
  createQuiz: (data) => api.post('/quizzes/', data),
  getQuiz: (id) => api.get(`/quizzes/${id}/`),
  updateQuiz: (id, data) => api.put(`/quizzes/${id}/`, data),
  deleteQuiz: (id) => api.delete(`/quizzes/${id}/`),
  
  // Question Management
  getQuestions: (quizId) => api.get(`/quizzes/${quizId}/questions/`),
  createQuestion: (quizId, data) => api.post(`/quizzes/${quizId}/questions/`, data),
  updateQuestion: (quizId, questionId, data) => api.put(`/quizzes/${quizId}/questions/${questionId}/`, data),
  deleteQuestion: (quizId, questionId) => api.delete(`/quizzes/${quizId}/questions/${questionId}/`),
  
  // Teacher Analytics
  getQuizAnalytics: (quizId, refresh = false) => api.get(`/quizzes/${quizId}/analytics/`, { params: { refresh } }),
  getQuizAttempts: (quizId, params = {}) => api.get(`/quizzes/${quizId}/attempts/`, { params }),
  gradeEssayResponse: (responseId, data) => api.post(`/quizzes/responses/${responseId}/grade/`, data),
  getCourseQuizSummary: (courseId) => api.get(`/quizzes/courses/${courseId}/summary/`),
  
  // Student Quiz Taking
  getStudentQuizzes: () => api.get('/quizzes/student/'),
  getStudentQuiz: (id) => api.get(`/quizzes/student/${id}/`),
  startQuizAttempt: (quizId) => api.post(`/quizzes/student/${quizId}/start/`),
  getQuizAttempt: (attemptId) => api.get(`/quizzes/attempts/${attemptId}/`),
  submitQuestionResponse: (attemptId, questionId, data) => api.post(`/quizzes/attempts/${attemptId}/questions/${questionId}/respond/`, data),
  completeQuizAttempt: (attemptId) => api.post(`/quizzes/attempts/${attemptId}/complete/`),
  getStudentQuizAttempts: () => api.get('/quizzes/student/attempts/'),
};

export default api;