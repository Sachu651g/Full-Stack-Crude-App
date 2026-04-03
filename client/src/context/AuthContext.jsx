// AuthContext.jsx — Authentication context, provider, and hook
// Stores the JWT in React state (in-memory only, never localStorage) per Requirement 2.5.
// Exposes user, token, login, logout, and register to any consumer via useAuth().

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
// setAuthRef keeps the Axios interceptor in sync with the latest token/logout
// without creating a circular import (client.js does NOT import AuthContext).
import { setAuthRef } from '../api/client.js';
import apiClient from '../api/client.js';

// Create the context with a sensible default shape so consumers can rely on it
// even before the provider mounts.
const AuthContext = createContext({
  user: null,
  token: null,
  login: async () => {},
  logout: () => {},
  register: async () => {},
});

/**
 * AuthProvider — wraps the application and manages auth state.
 * The JWT is kept in React state so it lives only for the current browser session
 * and is never written to localStorage (Requirement 2.5).
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('nexus_user') || 'null'); } catch { return null; }
  });
  const [token, setToken] = useState(() => sessionStorage.getItem('nexus_token') || null);

  /**
   * logout — clears the in-memory token and user.
   * Called explicitly by the user OR automatically by the Axios interceptor when
   * the API returns 401 (expired/invalid JWT) — Requirement 2.4.
   * Defined before login/register so it can be referenced in useEffect below.
   */
  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    sessionStorage.removeItem('nexus_token');
    sessionStorage.removeItem('nexus_user');
  }, []);

  // Keep the Axios interceptor in sync with the latest token and logout callback
  // so it can attach the Bearer header and handle 401s (Requirements 2.3, 2.4).
  useEffect(() => {
    setAuthRef({ token, logout });
  }, [token, logout]);

  /**
   * login — sends credentials to the API and stores the returned JWT.
   * @param {string} email
   * @param {string} password
   * @returns {Promise<void>} resolves on success, rejects with an error on failure
   */
  const login = useCallback(async (email, password) => {
    const response = await apiClient.post('/auth/login', { email, password });
    const { token: jwt, user: userData } = response.data;
    const resolvedUser = userData || (() => {
      try { return JSON.parse(atob(jwt.split('.')[1])); } catch { return { email }; }
    })();
    setToken(jwt);
    setUser(resolvedUser);
    sessionStorage.setItem('nexus_token', jwt);
    sessionStorage.setItem('nexus_user', JSON.stringify(resolvedUser));
  }, []);

  /**
   * register — creates a new account and stores the returned JWT.
   * @param {string} email
   * @param {string} password
   * @returns {Promise<void>}
   */
  const register = useCallback(async (email, password) => {
    const response = await apiClient.post('/auth/register', { email, password });
    const { token: jwt, user: userData } = response.data;
    const resolvedUser = userData || (() => {
      try { return JSON.parse(atob(jwt.split('.')[1])); } catch { return { email }; }
    })();
    setToken(jwt);
    setUser(resolvedUser);
    sessionStorage.setItem('nexus_token', jwt);
    sessionStorage.setItem('nexus_user', JSON.stringify(resolvedUser));
  }, []);

  const value = { user, token, login, logout, register };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * useAuth — convenience hook for consuming AuthContext.
 * Throws if used outside of AuthProvider to surface misconfiguration early.
 */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}

export default AuthContext;
