import {
  jsx as _jsx,
  jsxs as _jsxs,
  Fragment as _Fragment,
} from 'react/jsx-runtime';
import { useAuth } from '../contexts/AuthContext';
import AuthLogin from '../pages/AuthLogin';
const ProtectedRoute = ({
  children,
  roles,
  tenant,
  fallback: FallbackComponent,
}) => {
  const { isAuthenticated, loading, user, hasRole, hasTenantAccess } =
    useAuth();
  // Show loading state
  if (loading) {
    return _jsx('div', {
      className: 'min-h-screen flex items-center justify-center bg-slate-50',
      children: _jsxs('div', {
        className: 'text-center',
        children: [
          _jsx('div', {
            className:
              'animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto',
          }),
          _jsx('p', {
            className: 'mt-4 text-slate-600',
            children: 'Authenticating...',
          }),
        ],
      }),
    });
  }
  // Show login if not authenticated
  if (!isAuthenticated || !user) {
    return _jsx(AuthLogin, {});
  }
  // Check role requirement
  if (roles && roles.length > 0) {
    const hasAnyRequiredRole = roles.some((role) => hasRole(role));
    if (!hasAnyRequiredRole) {
      if (FallbackComponent) {
        return _jsx(FallbackComponent, {});
      }
      return _jsx('div', {
        className: 'min-h-screen flex items-center justify-center bg-slate-50',
        children: _jsxs('div', {
          className: 'text-center max-w-md',
          children: [
            _jsx('div', {
              className:
                'bg-red-100 rounded-full h-16 w-16 flex items-center justify-center mx-auto mb-4',
              children: _jsx('span', {
                className: 'text-red-600 text-2xl',
                children: '\u26A0\uFE0F',
              }),
            }),
            _jsx('h2', {
              className: 'text-2xl font-bold text-slate-900 mb-2',
              children: 'Access Denied',
            }),
            _jsx('p', {
              className: 'text-slate-600 mb-4',
              children:
                "You don't have the required role(s) to access this resource.",
            }),
            _jsxs('p', {
              className: 'text-sm text-slate-500',
              children: [
                'Required roles:',
                ' ',
                _jsx('code', {
                  className: 'bg-slate-100 px-1 py-0.5 rounded text-sm',
                  children: roles.join(', '),
                }),
                _jsx('br', {}),
                'Your current roles: ',
                user.roles.join(', ') || 'None',
              ],
            }),
          ],
        }),
      });
    }
  }
  // Check tenant requirement
  if (tenant && !hasTenantAccess(tenant)) {
    if (FallbackComponent) {
      return _jsx(FallbackComponent, {});
    }
    return _jsx('div', {
      className: 'min-h-screen flex items-center justify-center bg-slate-50',
      children: _jsxs('div', {
        className: 'text-center max-w-md',
        children: [
          _jsx('div', {
            className:
              'bg-yellow-100 rounded-full h-16 w-16 flex items-center justify-center mx-auto mb-4',
            children: _jsx('span', {
              className: 'text-yellow-600 text-2xl',
              children: '\uD83C\uDFE2',
            }),
          }),
          _jsx('h2', {
            className: 'text-2xl font-bold text-slate-900 mb-2',
            children: 'Tenant Access Required',
          }),
          _jsxs('p', {
            className: 'text-slate-600 mb-4',
            children: [
              "You don't have access to tenant",
              ' ',
              _jsx('code', {
                className: 'bg-slate-100 px-1 py-0.5 rounded text-sm',
                children: tenant,
              }),
              '.',
            ],
          }),
          _jsxs('p', {
            className: 'text-sm text-slate-500',
            children: [
              'Your available tenants: ',
              user.tenants?.join(', ') || 'None',
            ],
          }),
        ],
      }),
    });
  }
  // Render protected content
  return _jsx(_Fragment, { children: children });
};
export default ProtectedRoute;
