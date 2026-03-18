// ProtectedRoute.jsx — Guards routes that require authentication.
// If the user has no token (not logged in), redirects to /login (Requirement 12.2).
// Otherwise renders the child route element as normal.

import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

/**
 * ProtectedRoute — wrap any <Route> whose element should only be accessible
 * to authenticated users.
 *
 * Usage in the router:
 *   <Route element={<ProtectedRoute />}>
 *     <Route path="/dashboard" element={<Dashboard />} />
 *   </Route>
 */
function ProtectedRoute() {
  const { token } = useAuth();

  // If there is no token in memory the user is not authenticated.
  // Replace the current history entry so the back button doesn't loop.
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // Render the matched child route.
  return <Outlet />;
}

export default ProtectedRoute;
