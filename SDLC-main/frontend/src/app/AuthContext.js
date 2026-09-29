'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const AuthContext = createContext();

async function safeParseJson(res) {
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    try {
      return await res.json();
    } catch (err) {
      return { success: false, message: 'Invalid JSON response from server' };
    }
  }
  const text = await res.text().catch(() => '');
  if (!res.ok) {
    if (res.status === 404) {
      return { success: false, message: 'Backend server is not connected or endpoint not found (HTTP 404). Please check backend deployment and NEXT_PUBLIC_API_URL.' };
    }
    return { success: false, message: `Server error (HTTP ${res.status}): ${res.statusText || text || 'Unknown error'}` };
  }
  return { success: false, message: 'Server returned non-JSON response' };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Intercept global fetch to attach Authorization header if token exists in sessionStorage
    if (typeof window !== 'undefined') {
      const originalFetch = window.fetch;
      window.fetch = async function (url, options = {}) {
        let targetUrl = url;
        if (typeof url === 'string' && url.startsWith('/api/')) {
          const apiBase = process.env.NEXT_PUBLIC_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:3001' : '');
          if (apiBase) {
            targetUrl = `${apiBase.replace(/\/$/, '')}${url}`;
          }
        }
        const token = sessionStorage.getItem('token');
        if (token) {
          if (!options.headers) {
            options.headers = {};
          }
          if (options.headers instanceof Headers) {
            options.headers.set('Authorization', `Bearer ${token}`);
          } else if (Array.isArray(options.headers)) {
            const hasAuth = options.headers.some(([k]) => k.toLowerCase() === 'authorization');
            if (!hasAuth) {
              options.headers.push(['Authorization', `Bearer ${token}`]);
            }
          } else {
            options.headers['Authorization'] = `Bearer ${token}`;
          }
        }
        return originalFetch(targetUrl, options);
      };
    }
    checkUserLoggedIn();
  }, []);

  const checkUserLoggedIn = async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await safeParseJson(res);
        if (data && data.user) {
          setUser(data.user);
          if (data.token) {
            sessionStorage.setItem('token', data.token);
          }
        } else {
          setUser(null);
          sessionStorage.removeItem('token');
        }
      } else {
        setUser(null);
        sessionStorage.removeItem('token');
      }
    } catch (error) {
      console.warn('Error checking user session:', error.message || error);
      setUser(null);
      sessionStorage.removeItem('token');
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await safeParseJson(res);
      if (!res.ok || !data || data.success === false) {
        return { success: false, message: data?.message || 'Login failed - backend not responding properly' };
      }
      setUser(data.user);
      if (data.token) {
        sessionStorage.setItem('token', data.token);
      }
      router.push('/dashboard');
      return { success: true };
    } catch (error) {
      console.warn('Login attempt failed:', error.message);
      return { success: false, message: error.message || 'Login failed' };
    }
  };

  const signup = async (email, password) => {
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await safeParseJson(res);
      if (!res.ok || !data || data.success === false) {
        return { success: false, message: data?.message || 'Signup failed - backend not responding properly' };
      }
      setUser(data.user);
      if (data.token) {
        sessionStorage.setItem('token', data.token);
      }
      router.push('/dashboard');
      return { success: true };
    } catch (error) {
      console.warn('Signup attempt failed:', error.message);
      return { success: false, message: error.message || 'Signup failed' };
    }
  };


  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setUser(null);
      sessionStorage.removeItem('token');
      router.push('/login');
    } catch (error) {
      console.warn('Logout error:', error.message || error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, refreshUser: checkUserLoggedIn }}>
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
