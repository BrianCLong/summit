import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import AuthLogin from '../pages/AuthLogin';

interface ProtectedRouteProps {
  children: React.ReactNode;
  roles?: string[]; // Changed from requiredRole to roles array
  tenant?: string;
  fallback?: React.ComponentType;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  roles,
  tenant,
  fallback: FallbackComponent,
}) => {
  const { isAuthenticated, loading, user, hasRole, hasTenantAccess } =
    useAuth();

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-slate-600">Authenticating...</p>
        </div>
      </div>
    );
  }

  // Show login if not authenticated
  if (!isAuthenticated || !user) {
    return <AuthLogin />;
  }

  // Check role requirement
  if (roles && roles.length > 0) {
    const hasAnyRequiredRole = roles.some((role) => hasRole(role));
    if (!hasAnyRequiredRole) {
      if (FallbackComponent) {
        return <FallbackComponent />;
      }
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <div className="text-center max-w-md">
            <div className="bg-red-100 rounded-full h-16 w-16 flex items-center justify-center mx-auto mb-4">
              <span className="text-red-600 text-2xl">⚠️</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">
              Access Denied
            </h2>
            <p className="text-slate-600 mb-4">
              You don't have the required role(s) to access this resource.
            </p>
            <p className="text-sm text-slate-500">
              Required roles:{' '}
              <code className="bg-slate-100 px-1 py-0.5 rounded text-sm">
                {roles.join(', ')}
              </code>
              <br />
              Your current roles: {user.roles.join(', ') || 'None'}
            </p>
          </div>
        </div>
      );
    }
  }

  // Check tenant requirement
  if (tenant && !hasTenantAccess(tenant)) {
    if (FallbackComponent) {
      return <FallbackComponent />;
    }
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center max-w-md">
          <div className="bg-yellow-100 rounded-full h-16 w-16 flex items-center justify-center mx-auto mb-4">
            <span className="text-yellow-600 text-2xl">🏢</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">
            Tenant Access Required
          </h2>
          <p className="text-slate-600 mb-4">
            You don't have access to tenant{' '}
            <code className="bg-slate-100 px-1 py-0.5 rounded text-sm">
              {tenant}
            </code>
            .
          </p>
          <p className="text-sm text-slate-500">
            Your available tenants: {user.tenants?.join(', ') || 'None'}
          </p>
        </div>
      </div>
    );
  }

  // Render protected content
  return <>{children}</>;
};

export default ProtectedRoute;
