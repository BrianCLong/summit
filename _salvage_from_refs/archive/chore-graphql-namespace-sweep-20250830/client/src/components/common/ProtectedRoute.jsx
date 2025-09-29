import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';

const ProtectedRoute = ({ roles = [], permissions = [] }) => {
  const { isAuthenticated, hasRole, hasPermission } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (roles.length > 0 && !roles.some(role => hasRole(role))) {
    return <Navigate to="/dashboard" replace />;
  }

  if (permissions.length > 0 && !permissions.some(permission => hasPermission(permission))) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
