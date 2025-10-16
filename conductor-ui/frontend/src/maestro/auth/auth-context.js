import {
  jsx as _jsx,
  jsxs as _jsxs,
  Fragment as _Fragment,
} from 'react/jsx-runtime';
import { createContext, useContext, useEffect, useReducer } from 'react';
import { AuthService } from './auth-service';
const AuthContext = createContext(undefined);
function authReducer(state, action) {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: true, error: null };
    case 'SET_AUTHENTICATED':
      return {
        ...state,
        isLoading: false,
        isAuthenticated: true,
        user: action.payload.user,
        tenant: action.payload.tenant,
        accessToken: action.payload.accessToken,
        refreshToken: action.payload.refreshToken,
        error: null,
      };
    case 'SET_ERROR':
      return {
        ...state,
        isLoading: false,
        error: action.payload,
      };
    case 'SET_UNAUTHENTICATED':
      return {
        isAuthenticated: false,
        isLoading: false,
        user: null,
        tenant: null,
        accessToken: null,
        refreshToken: null,
        error: null,
      };
    default:
      return state;
  }
}
export function AuthProvider({ children, config }) {
  const defaultConfig = {
    issuer: process.env.VITE_OIDC_ISSUER || 'https://auth.topicality.co',
    clientId: process.env.VITE_OIDC_CLIENT_ID || 'maestro-ui',
    redirectUri: `${window.location.origin}/maestro/auth/callback`,
    scopes: [
      'openid',
      'profile',
      'email',
      'maestro:roles',
      'maestro:permissions',
    ],
    responseType: 'code',
    responseMode: 'query',
  };
  const authConfig = config || defaultConfig;
  const authService = new AuthService(authConfig);
  const [state, dispatch] = useReducer(authReducer, {
    isAuthenticated: false,
    isLoading: true,
    user: null,
    tenant: null,
    accessToken: null,
    refreshToken: null,
    error: null,
  });
  // Initialize authentication state
  useEffect(() => {
    const initAuth = async () => {
      try {
        // Check if we're on the callback page
        if (window.location.pathname === '/maestro/auth/callback') {
          const authState = await authService.handleCallback(
            window.location.href,
          );
          dispatch({ type: 'SET_AUTHENTICATED', payload: authState });
          // Redirect to original page or home
          const params = new URLSearchParams(window.location.search);
          const state = params.get('state');
          let returnUrl = '/maestro';
          if (state) {
            try {
              const stateData = JSON.parse(atob(state));
              returnUrl = stateData.returnUrl || '/maestro';
            } catch (error) {
              console.warn('Failed to parse state parameter:', error);
            }
          }
          window.history.replaceState({}, '', returnUrl);
          return;
        }
        // Try to restore authentication from storage
        const storedAuth = authService.getStoredAuthState();
        if (storedAuth) {
          dispatch({ type: 'SET_AUTHENTICATED', payload: storedAuth });
        } else {
          dispatch({ type: 'SET_UNAUTHENTICATED' });
        }
      } catch (error) {
        console.error('Authentication initialization failed:', error);
        dispatch({
          type: 'SET_ERROR',
          payload:
            error instanceof Error ? error.message : 'Authentication failed',
        });
      }
    };
    initAuth();
  }, []);
  // Set up token refresh
  useEffect(() => {
    if (!state.isAuthenticated || !state.accessToken) return;
    const refreshInterval = setInterval(
      async () => {
        try {
          const refreshedAuth = await authService.refreshTokens();
          if (refreshedAuth) {
            dispatch({ type: 'SET_AUTHENTICATED', payload: refreshedAuth });
          } else {
            dispatch({ type: 'SET_UNAUTHENTICATED' });
          }
        } catch (error) {
          console.error('Token refresh failed:', error);
          dispatch({ type: 'SET_UNAUTHENTICATED' });
        }
      },
      5 * 60 * 1000,
    ); // Refresh every 5 minutes
    return () => clearInterval(refreshInterval);
  }, [state.isAuthenticated, state.accessToken]);
  const login = async () => {
    dispatch({ type: 'SET_LOADING' });
    try {
      await authService.login();
    } catch (error) {
      dispatch({
        type: 'SET_ERROR',
        payload: error instanceof Error ? error.message : 'Login failed',
      });
    }
  };
  const logout = async () => {
    dispatch({ type: 'SET_LOADING' });
    try {
      await authService.logout();
      dispatch({ type: 'SET_UNAUTHENTICATED' });
    } catch (error) {
      dispatch({
        type: 'SET_ERROR',
        payload: error instanceof Error ? error.message : 'Logout failed',
      });
    }
  };
  const refreshAuth = async () => {
    try {
      const refreshedAuth = await authService.refreshTokens();
      if (refreshedAuth) {
        dispatch({ type: 'SET_AUTHENTICATED', payload: refreshedAuth });
      } else {
        dispatch({ type: 'SET_UNAUTHENTICATED' });
      }
    } catch (error) {
      console.error('Auth refresh failed:', error);
      dispatch({ type: 'SET_UNAUTHENTICATED' });
    }
  };
  const hasPermission = (permission) => {
    return authService.hasPermission(permission);
  };
  const hasRole = (role) => {
    return authService.hasRole(role);
  };
  const contextValue = {
    ...state,
    login,
    logout,
    refreshAuth,
    hasPermission,
    hasRole,
  };
  return _jsx(AuthContext.Provider, {
    value: contextValue,
    children: children,
  });
}
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
export function ProtectedRoute({ children, roles, permissions, fallback }) {
  const { isAuthenticated, isLoading, user, hasRole, hasPermission } =
    useAuth();
  if (isLoading) {
    return _jsx('div', {
      className: 'flex h-screen items-center justify-center',
      children: _jsxs('div', {
        className: 'text-center',
        children: [
          _jsx('div', {
            className:
              'h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent',
          }),
          _jsx('p', {
            className: 'mt-2 text-sm text-slate-600',
            children: 'Loading...',
          }),
        ],
      }),
    });
  }
  if (!isAuthenticated) {
    return (
      fallback ||
      _jsx('div', {
        className: 'flex h-screen items-center justify-center bg-slate-50',
        children: _jsxs('div', {
          className: 'text-center',
          children: [
            _jsx('h2', {
              className: 'text-2xl font-bold text-slate-900 mb-4',
              children: 'Authentication Required',
            }),
            _jsx('p', {
              className: 'text-slate-600 mb-6',
              children: 'Please sign in to access Maestro.',
            }),
            _jsx('button', {
              onClick: () => (window.location.href = '/maestro/login'),
              className:
                'rounded bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700',
              children: 'Sign In',
            }),
          ],
        }),
      })
    );
  }
  // Check role requirements
  if (roles && roles.length > 0) {
    const hasRequiredRole = roles.some((role) => hasRole(role));
    if (!hasRequiredRole) {
      return (
        fallback ||
        _jsx('div', {
          className: 'flex h-screen items-center justify-center bg-slate-50',
          children: _jsxs('div', {
            className: 'text-center',
            children: [
              _jsx('h2', {
                className: 'text-2xl font-bold text-slate-900 mb-4',
                children: 'Access Denied',
              }),
              _jsx('p', {
                className: 'text-slate-600 mb-6',
                children:
                  "You don't have the required role to access this resource.",
              }),
              _jsxs('p', {
                className: 'text-xs text-slate-500',
                children: [
                  'Required roles: ',
                  roles.join(', '),
                  _jsx('br', {}),
                  'Your roles: ',
                  user?.roles.join(', ') || 'None',
                ],
              }),
            ],
          }),
        })
      );
    }
  }
  // Check permission requirements
  if (permissions && permissions.length > 0) {
    const hasRequiredPermission = permissions.some((permission) =>
      hasPermission(permission),
    );
    if (!hasRequiredPermission) {
      return (
        fallback ||
        _jsx('div', {
          className: 'flex h-screen items-center justify-center bg-slate-50',
          children: _jsxs('div', {
            className: 'text-center',
            children: [
              _jsx('h2', {
                className: 'text-2xl font-bold text-slate-900 mb-4',
                children: 'Access Denied',
              }),
              _jsx('p', {
                className: 'text-slate-600 mb-6',
                children:
                  "You don't have the required permissions to access this resource.",
              }),
              _jsxs('p', {
                className: 'text-xs text-slate-500',
                children: [
                  'Required permissions: ',
                  permissions.join(', '),
                  _jsx('br', {}),
                  'Your permissions: ',
                  user?.permissions.join(', ') || 'None',
                ],
              }),
            ],
          }),
        })
      );
    }
  }
  return _jsx(_Fragment, { children: children });
}
