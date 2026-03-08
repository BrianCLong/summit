"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthProvider = AuthProvider;
exports.useAuth = useAuth;
exports.withAuth = withAuth;
exports.usePermissions = usePermissions;
// @ts-nocheck - API client type compatibility
const react_1 = require("react");
const router_1 = require("next/router");
const api_1 = require("@/services/api");
const react_hot_toast_1 = __importDefault(require("react-hot-toast"));
const AuthContext = (0, react_1.createContext)(undefined);
function AuthProvider({ children }) {
    const [user, setUser] = (0, react_1.useState)(null);
    const [isLoading, setIsLoading] = (0, react_1.useState)(true);
    const router = (0, router_1.useRouter)();
    const isAuthenticated = !!user;
    // Initialize auth state
    (0, react_1.useEffect)(() => {
        initializeAuth();
    }, []);
    const initializeAuth = async () => {
        try {
            const token = localStorage.getItem('auth_token');
            if (!token) {
                setIsLoading(false);
                return;
            }
            api_1.apiClient.setAuthToken(token);
            const userData = await api_1.apiClient.getCurrentUser();
            setUser(userData);
        }
        catch (error) {
            console.error('Auth initialization failed:', error);
            localStorage.removeItem('auth_token');
            localStorage.removeItem('refresh_token');
        }
        finally {
            setIsLoading(false);
        }
    };
    const signIn = async (email, password) => {
        try {
            setIsLoading(true);
            const response = await api_1.apiClient.signIn(email, password);
            const { user: userData, token, refreshToken } = response;
            localStorage.setItem('auth_token', token);
            localStorage.setItem('refresh_token', refreshToken);
            api_1.apiClient.setAuthToken(token);
            setUser(userData);
            react_hot_toast_1.default.success(`Welcome back, ${userData.firstName}!`);
            // Redirect to intended page or dashboard
            const returnUrl = router.query.returnUrl;
            await router.push(returnUrl || '/');
        }
        catch (error) {
            const message = error.response
                ?.data?.message || 'Sign in failed';
            react_hot_toast_1.default.error(message);
            throw error;
        }
        finally {
            setIsLoading(false);
        }
    };
    const signOut = (0, react_1.useCallback)(async () => {
        try {
            setIsLoading(true);
            await api_1.apiClient.signOut();
        }
        catch (error) {
            console.error('Sign out error:', error);
        }
        finally {
            localStorage.removeItem('auth_token');
            localStorage.removeItem('refresh_token');
            api_1.apiClient.setAuthToken(null);
            setUser(null);
            setIsLoading(false);
            router.push('/auth/signin');
        }
    }, [router]);
    const updateProfile = async (data) => {
        try {
            const updatedUser = await api_1.apiClient.updateProfile(data);
            setUser(updatedUser);
            react_hot_toast_1.default.success('Profile updated successfully');
        }
        catch (error) {
            const message = error.response
                ?.data?.message || 'Profile update failed';
            react_hot_toast_1.default.error(message);
            throw error;
        }
    };
    const refreshToken = (0, react_1.useCallback)(async () => {
        try {
            const refreshTokenValue = localStorage.getItem('refresh_token');
            if (!refreshTokenValue) {
                throw new Error('No refresh token available');
            }
            const response = await api_1.apiClient.refreshToken(refreshTokenValue);
            const { token, refreshToken: newRefreshToken } = response;
            localStorage.setItem('auth_token', token);
            localStorage.setItem('refresh_token', newRefreshToken);
            api_1.apiClient.setAuthToken(token);
        }
        catch (error) {
            console.error('Token refresh failed:', error);
            await signOut();
            throw error;
        }
    }, [signOut]);
    // Auto refresh token before expiry
    (0, react_1.useEffect)(() => {
        if (!user)
            return;
        const refreshInterval = setInterval(async () => {
            try {
                await refreshToken();
            }
            catch (error) {
                console.error('Auto refresh failed:', error);
            }
        }, 14 * 60 * 1000); // Refresh every 14 minutes (assuming 15 min token expiry)
        return () => clearInterval(refreshInterval);
    }, [user, refreshToken]);
    // Handle offline/online auth state
    (0, react_1.useEffect)(() => {
        const handleOnline = () => {
            if (user) {
                refreshToken().catch(console.error);
            }
        };
        window.addEventListener('online', handleOnline);
        return () => window.removeEventListener('online', handleOnline);
    }, [user, refreshToken]);
    const value = {
        user,
        isLoading,
        isAuthenticated,
        signIn,
        signOut,
        updateProfile,
        refreshToken,
    };
    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
function useAuth() {
    const context = (0, react_1.useContext)(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
// HOC for protected routes
function withAuth(WrappedComponent) {
    const AuthenticatedComponent = (props) => {
        const { isAuthenticated, isLoading } = useAuth();
        const router = (0, router_1.useRouter)();
        (0, react_1.useEffect)(() => {
            if (!isLoading && !isAuthenticated) {
                void router.push(`/auth/signin?returnUrl=${encodeURIComponent(router.asPath)}`);
            }
        }, [isAuthenticated, isLoading, router]);
        if (isLoading) {
            return (<div className="min-h-screen bg-intel-50 dark:bg-intel-900 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
            <p className="text-intel-600 dark:text-intel-400">Loading...</p>
          </div>
        </div>);
        }
        if (!isAuthenticated) {
            return null; // Will redirect to sign in
        }
        return <WrappedComponent {...props}/>;
    };
    AuthenticatedComponent.displayName = `withAuth(${WrappedComponent.displayName || WrappedComponent.name || 'Component'})`;
    return AuthenticatedComponent;
}
// Hook for checking permissions
function usePermissions() {
    const { user } = useAuth();
    const hasPermission = (permission) => {
        if (!user)
            return false;
        return user.permissions.includes(permission) || user.role === 'admin';
    };
    const hasRole = (role) => {
        if (!user)
            return false;
        return user.role === role;
    };
    const hasAnyPermission = (permissions) => {
        return permissions.some((permission) => hasPermission(permission));
    };
    const hasAllPermissions = (permissions) => {
        return permissions.every((permission) => hasPermission(permission));
    };
    return {
        hasPermission,
        hasRole,
        hasAnyPermission,
        hasAllPermissions,
        permissions: user?.permissions || [],
        role: user?.role,
    };
}
