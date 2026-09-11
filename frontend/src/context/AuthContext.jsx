import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AuthContext = createContext(null);

const API_BASE = (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'))
  ? `${window.location.protocol}//${window.location.hostname}:8000`
  : '';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('sih_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [accessToken, setAccessToken] = useState(() => {
    try {
      return localStorage.getItem('sih_access_token') || null;
    } catch {
      return null;
    }
  });
  const [isLoading, setIsLoading] = useState(!user);
  const [authError, setAuthError] = useState(null);

  // Authenticated fetch wrapper that attaches Bearer token & credentials
  const authFetch = useCallback(async (url, options = {}) => {
    const fullUrl = url.startsWith('http') ? url : `${API_BASE}${url.startsWith('/') ? '' : '/'}${url}`;
    const headers = {
      ...(options.headers || {}),
    };

    const token = accessToken || (typeof localStorage !== 'undefined' ? localStorage.getItem('sih_access_token') : null);
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const config = {
      ...options,
      headers,
      credentials: 'include'
    };

    let response = await fetch(fullUrl, config);

    // If 401, try refreshing token once and retrying
    if (response.status === 401 && token) {
      try {
        const refreshRes = await fetch(`${API_BASE}/api/v1/auth/refresh`, {
          method: 'POST',
          credentials: 'include'
        });

        if (refreshRes.ok) {
          const refreshData = await refreshRes.json();
          setAccessToken(refreshData.access_token);
          setUser(refreshData.user);
          try {
            localStorage.setItem('sih_access_token', refreshData.access_token);
            localStorage.setItem('sih_user', JSON.stringify(refreshData.user));
          } catch (e) {}

          // Retry original request with new token
          headers['Authorization'] = `Bearer ${refreshData.access_token}`;
          return await fetch(fullUrl, { ...options, headers, credentials: 'include' });
        } else {
          // Refresh failed - log out
          setUser(null);
          setAccessToken(null);
          try {
            localStorage.removeItem('sih_access_token');
            localStorage.removeItem('sih_user');
          } catch (e) {}
        }
      } catch (err) {
        setUser(null);
        setAccessToken(null);
        try {
          localStorage.removeItem('sih_access_token');
          localStorage.removeItem('sih_user');
        } catch (e) {}
      }
    }

    return response;
  }, [accessToken]);

  // Initial check on mount: check if active refresh cookie exists
  const checkSession = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/auth/refresh`, {
        method: 'POST',
        credentials: 'include'
      });

      if (res.ok) {
        const data = await res.json();
        setAccessToken(data.access_token);
        setUser(data.user);
        try {
          localStorage.setItem('sih_access_token', data.access_token);
          localStorage.setItem('sih_user', JSON.stringify(data.user));
        } catch (e) {}
      }
    } catch (err) {
      // No active session
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  // Login handler
  const login = async (username, password) => {
    setAuthError(null);
    try {
      const res = await fetch(`${API_BASE}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();

      if (!res.ok) {
        const errorMsg = data.detail || 'Authentication failed. Check your credentials.';
        setAuthError(errorMsg);
        return { success: false, error: errorMsg };
      }

      setAccessToken(data.access_token);
      setUser(data.user);
      try {
        localStorage.setItem('sih_access_token', data.access_token);
        localStorage.setItem('sih_user', JSON.stringify(data.user));
      } catch (e) {}
      setAuthError(null);
      return { success: true, user: data.user };
    } catch (err) {
      const msg = 'Network error connecting to authentication server.';
      setAuthError(msg);
      return { success: false, error: msg };
    }
  };

  // Logout handler
  const logout = async () => {
    try {
      const token = accessToken || (typeof localStorage !== 'undefined' ? localStorage.getItem('sih_access_token') : null);
      if (token) {
        await fetch(`${API_BASE}/api/v1/auth/logout`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          credentials: 'include'
        });
      }
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setUser(null);
      setAccessToken(null);
      try {
        localStorage.removeItem('sih_access_token');
        localStorage.removeItem('sih_user');
      } catch (e) {}
    }
  };

  const value = {
    user,
    accessToken,
    isAuthenticated: !!user,
    isLoading,
    authError,
    login,
    logout,
    authFetch,
    hasPermission: (perm) => {
      if (!user) return false;
      if (user.role === 'ADMIN' || (user.permissions && user.permissions.includes('system:admin'))) return true;
      return user.permissions ? user.permissions.includes(perm) : false;
    }
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
