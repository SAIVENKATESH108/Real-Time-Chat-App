import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api.js';
import { disconnectSocket } from '../services/socket.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  // Check current session on mount
  useEffect(() => {
    async function checkSession() {
      try {
        setLoading(true);
        const data = await api.auth.getMe();
        if (data.success && data.user) {
          setUser(data.user);
        }
      } catch (err) {
        setUser(null);
      } finally {
        setLoading(false);
      }
    }
    checkSession();
  }, []);

  const login = async (email, password) => {
    setAuthError(null);
    try {
      const data = await api.auth.login({ email, password });
      if (data.success && data.user) {
        setUser(data.user);
        return { success: true };
      }
    } catch (err) {
      const message = err.data?.error || err.message || 'Login failed. Please check your credentials.';
      setAuthError(message);
      return { success: false, error: message };
    }
  };

  const signup = async (email, password, displayName) => {
    setAuthError(null);
    try {
      const data = await api.auth.signup({ email, password, displayName });
      if (data.success && data.user) {
        setUser(data.user);
        return { success: true };
      }
    } catch (err) {
      const message = err.data?.error || err.message || 'Registration failed.';
      setAuthError(message);
      return { success: false, error: message };
    }
  };

  const logout = async () => {
    try {
      await api.auth.logout();
    } catch (err) {
      console.warn('Logout request failed:', err.message);
    } finally {
      setUser(null);
      disconnectSocket();
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        authError,
        isAuthenticated: !!user,
        login,
        signup,
        logout,
        setAuthError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
