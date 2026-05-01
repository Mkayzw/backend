import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI } from '../api/auth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    const token = localStorage.getItem('rpm_token');
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const userData = await authAPI.getMe();
      setUser(userData);
    } catch {
      localStorage.removeItem('rpm_token');
      localStorage.removeItem('rpm_user');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async (email, password) => {
    const data = await authAPI.login(email, password);
    localStorage.setItem('rpm_token', data.token);
    localStorage.setItem('rpm_user', JSON.stringify(data));
    setUser(data);
    return data;
  };

  const signup = async (formData) => {
    const data = await authAPI.signup(formData);
    localStorage.setItem('rpm_token', data.token);
    localStorage.setItem('rpm_user', JSON.stringify(data));
    setUser(data);
    return data;
  };

  const logout = () => {
    localStorage.removeItem('rpm_token');
    localStorage.removeItem('rpm_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
