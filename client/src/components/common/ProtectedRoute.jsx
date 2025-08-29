import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { LinearProgress } from '@mui/material';
import { useAuth } from '../../context/AuthContext.jsx';

export default function ProtectedRoute({ roles, permissions }) {
  const { user, loading, hasRole, hasPermission } = useAuth();

  if (loading) {
    return <LinearProgress />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (roles && !roles.some((r) => hasRole(r))) {
    return <Navigate to="/login" replace />;
  }

  if (permissions && !permissions.some((p) => hasPermission(p))) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
