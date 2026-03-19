import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getToken, setToken, clearToken } from '../utils/auth';
import { api } from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const isAuthenticated = !!user;

  // Verify existing token on mount
  useEffect(() => {
    if (!getToken()) { setLoading(false); return; }
    api.me()
      .then(r => {
        if (r.ok) return r.json();
        clearToken();
        return null;
      })
      .then(data => { if (data) setUser(data); })
      .catch(() => { clearToken(); })
      .finally(() => setLoading(false));
  }, []);

  // Listen for forced logout (401 from authFetch)
  useEffect(() => {
    const handleLogout = () => { setUser(null); };
    window.addEventListener('voxbharat-logout', handleLogout);
    return () => window.removeEventListener('voxbharat-logout', handleLogout);
  }, []);

  const login = useCallback(async (email, password) => {
    const { token } = await api.login(email, password);
    setToken(token);
    const res = await api.me();
    if (res.ok) setUser(await res.json());
    else setUser({ email });
  }, []);

  const loginWithGoogle = useCallback(async (credential) => {
    const { token } = await api.googleAuth(credential);
    setToken(token);
    const res = await api.me();
    if (res.ok) setUser(await res.json());
    else setUser({});
  }, []);

  const signup = useCallback(async (email, password, name) => {
    const { token } = await api.signup(email, password, name);
    setToken(token);
    const res = await api.me();
    if (res.ok) setUser(await res.json());
    else setUser({ email, name });
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, isAuthenticated, login, loginWithGoogle, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
