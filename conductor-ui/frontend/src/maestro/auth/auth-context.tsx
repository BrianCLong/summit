import React, {
  createContext,
  useContext,
  useEffect,
  useReducer,
  ReactNode,
} from 'react';
import { AuthService, AuthState, AuthConfig } from './auth-service';

interface AuthContextType extends AuthState {
  login: () => Promise<void>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string) => boolean;
}

interface AuthAction {
  type:
    | 'SET_LOADING'
    | 'SET_AUTHENTICATED'
    | 'SET_ERROR'
    | 'SET_UNAUTHENTICATED';
  payload?: any;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function authReducer(state: AuthState, action: AuthAction): AuthState {
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

interface AuthProviderProps {
  children: ReactNode;
  config?: AuthConfig;
}

export function AuthProvider({ children, config }: AuthProviderProps) {
  const defaultConfig: AuthConfig = {
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

  const login = async (): Promise<void> => {
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

  const logout = async (): Promise<void> => {
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

  const refreshAuth = async (): Promise<void> => {
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

  const hasPermission = (permission: string): boolean => {
    return authService.hasPermission(permission);
  };

  const hasRole = (role: string): boolean => {
    return authService.hasRole(role);
  };

  const contextValue: AuthContextType = {
    ...state,
    login,
    logout,
    refreshAuth,
    hasPermission,
    hasRole,
  };

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Higher-order component for route protection
export interface ProtectedRouteProps {
  children: ReactNode;
  roles?: string[];
  permissions?: string[];
  fallback?: ReactNode;
}

export function ProtectedRoute({
  children,
  roles,
  permissions,
  fallback,
}: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user, hasRole, hasPermission } =
    useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
          <p className="mt-2 text-sm text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      fallback || (
        <div className="flex h-screen items-center justify-center bg-slate-50">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">
              Authentication Required
            </h2>
            <p className="text-slate-600 mb-6">
              Please sign in to access Maestro.
            </p>
            <button
              onClick={() => (window.location.href = '/maestro/login')}
              className="rounded bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700"
            >
              Sign In
            </button>
          </div>
        </div>
      )
    );
  }

  // Check role requirements
  if (roles && roles.length > 0) {
    const hasRequiredRole = roles.some((role) => hasRole(role));
    if (!hasRequiredRole) {
      return (
        fallback || (
          <div className="flex h-screen items-center justify-center bg-slate-50">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">
                Access Denied
              </h2>
              <p className="text-slate-600 mb-6">
                You don't have the required role to access this resource.
              </p>
              <p className="text-xs text-slate-500">
                Required roles: {roles.join(', ')}
                <br />
                Your roles: {user?.roles.join(', ') || 'None'}
              </p>
            </div>
          </div>
        )
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
        fallback || (
          <div className="flex h-screen items-center justify-center bg-slate-50">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">
                Access Denied
              </h2>
              <p className="text-slate-600 mb-6">
                You don't have the required permissions to access this resource.
              </p>
              <p className="text-xs text-slate-500">
                Required permissions: {permissions.join(', ')}
                <br />
                Your permissions: {user?.permissions.join(', ') || 'None'}
              </p>
            </div>
          </div>
        )
      );
    }
  }

  return <>{children}</>;
}
