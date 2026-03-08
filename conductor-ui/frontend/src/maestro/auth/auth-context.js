"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthProvider = AuthProvider;
exports.useAuth = useAuth;
exports.ProtectedRoute = ProtectedRoute;
const react_1 = __importStar(require("react"));
const auth_service_1 = require("./auth-service");
const AuthContext = (0, react_1.createContext)(undefined);
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
function AuthProvider({ children, config }) {
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
    const authService = new auth_service_1.AuthService(authConfig);
    const [state, dispatch] = (0, react_1.useReducer)(authReducer, {
        isAuthenticated: false,
        isLoading: true,
        user: null,
        tenant: null,
        accessToken: null,
        refreshToken: null,
        error: null,
    });
    // Initialize authentication state
    (0, react_1.useEffect)(() => {
        const initAuth = async () => {
            try {
                // Check if we're on the callback page
                if (window.location.pathname === '/maestro/auth/callback') {
                    const authState = await authService.handleCallback(window.location.href);
                    dispatch({ type: 'SET_AUTHENTICATED', payload: authState });
                    // Redirect to original page or home
                    const params = new URLSearchParams(window.location.search);
                    const state = params.get('state');
                    let returnUrl = '/maestro';
                    if (state) {
                        try {
                            const stateData = JSON.parse(atob(state));
                            returnUrl = stateData.returnUrl || '/maestro';
                        }
                        catch (error) {
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
                }
                else {
                    dispatch({ type: 'SET_UNAUTHENTICATED' });
                }
            }
            catch (error) {
                console.error('Authentication initialization failed:', error);
                dispatch({
                    type: 'SET_ERROR',
                    payload: error instanceof Error ? error.message : 'Authentication failed',
                });
            }
        };
        initAuth();
    }, []);
    // Set up token refresh
    (0, react_1.useEffect)(() => {
        if (!state.isAuthenticated || !state.accessToken)
            return;
        const refreshInterval = setInterval(async () => {
            try {
                const refreshedAuth = await authService.refreshTokens();
                if (refreshedAuth) {
                    dispatch({ type: 'SET_AUTHENTICATED', payload: refreshedAuth });
                }
                else {
                    dispatch({ type: 'SET_UNAUTHENTICATED' });
                }
            }
            catch (error) {
                console.error('Token refresh failed:', error);
                dispatch({ type: 'SET_UNAUTHENTICATED' });
            }
        }, 5 * 60 * 1000); // Refresh every 5 minutes
        return () => clearInterval(refreshInterval);
    }, [state.isAuthenticated, state.accessToken]);
    const login = async () => {
        dispatch({ type: 'SET_LOADING' });
        try {
            await authService.login();
        }
        catch (error) {
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
        }
        catch (error) {
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
            }
            else {
                dispatch({ type: 'SET_UNAUTHENTICATED' });
            }
        }
        catch (error) {
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
    return (<AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>);
}
function useAuth() {
    const context = (0, react_1.useContext)(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
function ProtectedRoute({ children, roles, permissions, fallback, }) {
    const { isAuthenticated, isLoading, user, hasRole, hasPermission } = useAuth();
    if (isLoading) {
        return (<div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
          <p className="mt-2 text-sm text-slate-600">Loading...</p>
        </div>
      </div>);
    }
    if (!isAuthenticated) {
        return (fallback || (<div className="flex h-screen items-center justify-center bg-slate-50">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">
              Authentication Required
            </h2>
            <p className="text-slate-600 mb-6">
              Please sign in to access Maestro.
            </p>
            <button onClick={() => (window.location.href = '/maestro/login')} className="rounded bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700">
              Sign In
            </button>
          </div>
        </div>));
    }
    // Check role requirements
    if (roles && roles.length > 0) {
        const hasRequiredRole = roles.some((role) => hasRole(role));
        if (!hasRequiredRole) {
            return (fallback || (<div className="flex h-screen items-center justify-center bg-slate-50">
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
          </div>));
        }
    }
    // Check permission requirements
    if (permissions && permissions.length > 0) {
        const hasRequiredPermission = permissions.some((permission) => hasPermission(permission));
        if (!hasRequiredPermission) {
            return (fallback || (<div className="flex h-screen items-center justify-center bg-slate-50">
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
          </div>));
        }
    }
    return <>{children}</>;
}
