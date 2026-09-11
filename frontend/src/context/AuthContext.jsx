import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AuthContext = createContext(null);

const API_BASE = (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'))
  ? `${window.location.protocol}//${window.location.hostname}:8000`
  : '';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  // Authenticated fetch wrapper that attaches Bearer token & credentials
  const authFetch = useCallback(async (url, options = {}) => {
    const fullUrl = url.startsWith('http') ? url : `${API_BASE}${url.startsWith('/') ? '' : '/'}${url}`;
    const headers = {
      ...(options.headers || {}),
    };

    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }

    const config = {
      ...options,
      headers,
      credentials: 'include'
    };

    let response = await fetch(fullUrl, config);

    // If 401, try refreshing token once and retrying
    if (response.status === 401 && accessToken) {
      try {
        const refreshRes = await fetch(`${API_BASE}/api/v1/auth/refresh`, {
          method: 'POST',
          credentials: 'include'
        });

        if (refreshRes.ok) {
          const refreshData = await refreshRes.json();
          setAccessToken(refreshData.access_token);
          setUser(refreshData.user);

          // Retry original request with new token
          headers['Authorization'] = `Bearer ${refreshData.access_token}`;
          return await fetch(fullUrl, { ...options, headers, credentials: 'include' });
        } else {
          // Refresh failed - log out
          setUser(null);
          setAccessToken(null);
        }
      } catch (err) {
        setUser(null);
        setAccessToken(null);
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
      if (accessToken) {
        await fetch(`${API_BASE}/api/v1/auth/logout`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${accessToken}` },
          credentials: 'include'
        });
      }
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setUser(null);
      setAccessToken(null);
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
