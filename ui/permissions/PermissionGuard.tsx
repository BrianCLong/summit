import React from 'react';
import { hasRole, type Role, type UserContext } from './index';

export interface PermissionGuardProps {
  /** Current user context */
  user: UserContext;
  /** Minimum role required to view children */
  requiredRole: Role;
  /** Fallback UI when access is denied */
  fallback?: React.ReactNode;
  /** Children to render when access is granted */
  children: React.ReactNode;
}

/**
 * PermissionGuard — Role-based UI guard component.
 *
 * Wraps UI surfaces to enforce role-based access control.
 * Renders children only when the user meets the minimum role requirement.
 */
export const PermissionGuard: React.FC<PermissionGuardProps> = ({ user, requiredRole, fallback, children }) => {
  if (!hasRole(user.role, requiredRole)) {
    if (fallback) return <>{fallback}</>;

    return (
      <div className="flex items-center justify-center h-full min-h-64">
        <div className="text-center p-8">
          <svg className="w-12 h-12 mx-auto mb-4 text-fg-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <h3 className="text-sm font-semibold text-fg-secondary mb-1">Access Restricted</h3>
          <p className="text-xs text-fg-tertiary">
            This section requires <span className="font-semibold text-fg-secondary">{requiredRole}</span> role or higher.
          </p>
          <p className="text-xs text-fg-muted mt-2">
            Your current role: <span className="font-semibold">{user.role}</span>
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
