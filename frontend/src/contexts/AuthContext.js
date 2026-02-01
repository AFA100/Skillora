import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in on app start
    const token = localStorage.getItem('accessToken');
    const userData = localStorage.getItem('user');
    
    if (token && userData) {
      setUser(JSON.parse(userData));
    }
    setLoading(false);
  }, []);

  const signup = async (userData) => {
    try {
      const response = await authAPI.signup(userData);
      const { user: newUser, tokens } = response.data;

      localStorage.setItem('accessToken', tokens.access);
      localStorage.setItem('refreshToken', tokens.refresh);
      localStorage.setItem('user', JSON.stringify(newUser));

      setUser(newUser);
      return { success: true, message: response.data.message };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data || 'Signup failed'
      };
    }
  };

  const login = async (email, password) => {
    console.log('🔍 AuthContext: Starting login process');
    console.log('Email:', email);
    console.log('Password length:', password.length);
    
    try {
      console.log('🔍 AuthContext: Making API call to authAPI.login');
      const response = await authAPI.login({ email, password });
      console.log('🔍 AuthContext: API response received', response.status);
      
      const { user: userData, tokens } = response.data;
      console.log('🔍 AuthContext: User data:', userData);
      console.log('🔍 AuthContext: Tokens received:', !!tokens.access, !!tokens.refresh);

      localStorage.setItem('accessToken', tokens.access);
      localStorage.setItem('refreshToken', tokens.refresh);
      localStorage.setItem('user', JSON.stringify(userData));

      setUser(userData);
      console.log('✅ AuthContext: Login successful');
      return { success: true, message: response.data.message };
    } catch (error) {
      console.error('❌ AuthContext: Login failed', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      
      return {
        success: false,
        error: error.response?.data?.non_field_errors?.[0] || 
               error.response?.data?.detail || 
               'Login failed'
      };
    }
  };

  const logout = async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        await authAPI.logout(refreshToken);
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      setUser(null);
    }
  };

  const updateProfile = async (profileData) => {
    try {
      const response = await authAPI.updateProfile(profileData);
      const updatedUser = response.data;
      
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);
      
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data || 'Profile update failed'
      };
    }
  };

  const requestPasswordReset = async (email) => {
    try {
      const response = await authAPI.passwordReset(email);
      return { 
        success: true, 
        message: response.data.message,
        token: response.data.token // Only in development
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.email?.[0] || 
               error.response?.data?.detail || 
               'Password reset request failed'
      };
    }
  };

  const confirmPasswordReset = async (token, password, passwordConfirm) => {
    try {
      const response = await authAPI.passwordResetConfirm({
        token,
        password,
        password_confirm: passwordConfirm
      });
      return { success: true, message: response.data.message };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.non_field_errors?.[0] ||
               error.response?.data?.password?.[0] ||
               error.response?.data?.error ||
               'Password reset failed'
      };
    }
  };

  const value = {
    user,
    signup,
    login,
    logout,
    updateProfile,
    requestPasswordReset,
    confirmPasswordReset,
    loading,
    isAuthenticated: !!user,
    isLearner: user?.role === 'learner',
    isTeacher: user?.role === 'teacher',
    isAdmin: user?.role === 'admin',
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};