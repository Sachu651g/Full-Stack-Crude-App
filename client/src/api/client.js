// client.js — Axios instance with auth and error interceptors
// Requirements: 2.3 (Bearer token on every request), 2.4 (401 → logout + redirect),
//               12.3 (loading indicator support), 12.4 (user-readable errors).

import axios from 'axios';

// Base URL for all API requests.
// In development, Vite proxies /api → http://localhost:3001 so we use a relative
// path to avoid CORS issues. In production, set VITE_API_URL env var.
const BASE_URL = import.meta.env.VITE_API_URL || '/api';

// Create a dedicated Axios instance so we don't pollute the global defaults.
const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ---------------------------------------------------------------------------
// Token accessor
// We can't import AuthContext here (circular dependency), so we use a simple
// module-level ref that AuthContext sets after it mounts.
// ---------------------------------------------------------------------------

/** @type {{ token: string | null, logout: (() => void) | null }} */
const authRef = { token: null, logout: null };

/**
 * setAuthRef — called by AuthContext to give the Axios instance access to the
 * current token and logout callback without creating a circular import.
 * @param {{ token: string | null, logout: () => void }} ref
 */
export function setAuthRef({ token, logout }) {
  authRef.token = token;
  authRef.logout = logout;
}

// ---------------------------------------------------------------------------
// Request interceptor — attach Authorization header (Requirement 2.3)
// ---------------------------------------------------------------------------
apiClient.interceptors.request.use(
  (config) => {
    if (authRef.token) {
      // Attach the JWT as a Bearer token on every outgoing request.
      config.headers['Authorization'] = `Bearer ${authRef.token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ---------------------------------------------------------------------------
// Response interceptor — handle 401 (Requirement 2.4)
// ---------------------------------------------------------------------------
apiClient.interceptors.response.use(
  // Pass successful responses straight through.
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // JWT has expired or is invalid — clear auth state and redirect to login.
      if (authRef.logout) {
        authRef.logout();
      }
      // Use window.location so we don't need to import the router here.
      window.location.href = '/login';
    }
    // Re-reject so individual call sites can still handle the error if needed.
    return Promise.reject(error);
  }
);

export default apiClient;
