import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { Alert, LinearProgress } from '@mui/material';
import { useAuth } from '../../context/AuthContext.jsx';
import { useAuthorization } from '../../auth/withAuthorization';

export default function ProtectedRoute({ roles, permissions, actions, tenant }) {
  const { user, loading, hasRole, hasPermission } = useAuth();
  const { canAccess, tenantId } = useAuthorization();

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

  if (actions && !actions.every((action) => canAccess(action, tenant || tenantId))) {
    return (
      <Alert severity="error" data-testid="route-unauthorized">
        Access denied for this route in the current tenant scope.
      </Alert>
    );
  }

  return <Outlet />;
}
