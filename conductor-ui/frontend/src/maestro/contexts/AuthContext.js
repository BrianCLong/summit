import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext, useState, useEffect } from 'react';
const AuthContext = createContext(undefined);
export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false); // Managed internally
    const [loading, setLoading] = useState(true);
    const [accessToken, setAccessToken] = useState(undefined);
    const [idToken, setIdToken] = useState(undefined);
    const [expiresAt, setExpiresAt] = useState(undefined);
    const [idleTimer, setIdleTimer] = useState(null);
    const [refreshTimer, setRefreshTimer] = useState(null);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const hasRole = (role) => {
        return user?.roles?.includes(role) ?? false;
    };
    const hasTenantAccess = (tenant) => {
        return !!(user?.tenants?.includes(tenant) || user?.tenant === tenant);
    };
    const resetIdleTimer = () => {
        if (idleTimer) {
            clearTimeout(idleTimer);
        }
        setIdleTimer(setTimeout(logout, 15 * 60 * 1000)); // 15 minutes
    };
    const refreshToken = async () => {
        if (isRefreshing) {
            console.log('Refresh already in progress, skipping.');
            return;
        }
        setIsRefreshing(true);
        try {
            console.log('Attempting to refresh token...');
            // In a real app, this would call a backend endpoint to refresh the token
            // For now, simulate success after a delay
            await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
            const newAccessToken = 'new-mock-access-token-' + Date.now();
            const newIdToken = 'new-mock-id-token-' + Date.now();
            const newExpiresAt = Date.now() + (3600 * 1000); // 1 hour from now
            setAccessToken(newAccessToken);
            setIdToken(newIdToken);
            setExpiresAt(newExpiresAt);
            console.log('Token refreshed successfully.');
        }
        catch (error) {
            console.error('Failed to refresh token:', error);
            // On 401 or invalid refresh, log out
            logout();
        }
        finally {
            setIsRefreshing(false);
        }
    };
    const scheduleTokenRefresh = () => {
        if (refreshTimer) {
            clearTimeout(refreshTimer);
        }
        if (expiresAt) {
            const refreshBuffer = 60 * 1000; // 1 minute before expiry
            const jitter = Math.random() * 10 * 1000; // Up to 10 seconds jitter
            const timeToRefresh = expiresAt - Date.now() - refreshBuffer + jitter;
            if (timeToRefresh > 0) {
                console.log(`Scheduling token refresh in ${Math.round(timeToRefresh / 1000)} seconds.`);
                setRefreshTimer(setTimeout(refreshToken, timeToRefresh));
            }
            else {
                console.log('Token already expired or close to expiry, refreshing now.');
                refreshToken();
            }
        }
    };
    const switchTenant = async (tenant) => {
        console.log(`Attempting to switch to tenant: ${tenant}`);
        // In a real app, this would involve an API call to update the user's active tenant
        // and potentially re-fetch user info or tokens.
        // For now, simulate success and update user object
        await new Promise(resolve => setTimeout(resolve, 500));
        if (user) {
            setUser({ ...user, tenant: tenant });
            console.log(`Switched to tenant: ${tenant}`);
        }
    };
    useEffect(() => {
        setIsAuthenticated(!!user && !!accessToken && !!idToken && !!expiresAt && expiresAt > Date.now());
        scheduleTokenRefresh();
    }, [user, accessToken, idToken, expiresAt]);
    useEffect(() => {
        // Attach activity listeners for idle timeout
        window.addEventListener('mousemove', resetIdleTimer);
        window.addEventListener('keydown', resetIdleTimer);
        window.addEventListener('click', resetIdleTimer);
        window.addEventListener('scroll', resetIdleTimer);
        resetIdleTimer(); // Initialize timer on mount
        const checkSession = async () => {
            try {
                // In a real application, this would make an API call to validate the session
                // and fetch user info from the backend (e.g., /api/maestro/v1/auth/userinfo)
                // For this stub, we'll simulate a successful session check if a token exists
                // This part will be replaced by actual API calls later
                const mockUser = {
                    id: 'mock-user-123',
                    email: 'user@example.com',
                    roles: ['viewer', 'operator'],
                    tenant: 'acme',
                    tenants: ['acme', 'globex'], // Example tenants
                };
                const mockAccessToken = 'mock-access-token-initial';
                const mockIdToken = 'mock-id-token-initial';
                const mockExpiresAt = Date.now() + (3600 * 1000); // Expires in 1 hour
                setUser(mockUser);
                setAccessToken(mockAccessToken);
                setIdToken(mockIdToken);
                setExpiresAt(mockExpiresAt);
            }
            catch (error) {
                console.error('Failed to check session:', error);
                setUser(null);
                setAccessToken(undefined);
                setIdToken(undefined);
                setExpiresAt(undefined);
            }
            finally {
                setLoading(false);
            }
        };
        checkSession();
        // Cleanup listeners on unmount
        return () => {
            if (idleTimer)
                clearTimeout(idleTimer);
            if (refreshTimer)
                clearTimeout(refreshTimer);
            window.removeEventListener('mousemove', resetIdleTimer);
            window.removeEventListener('keydown', resetIdleTimer);
            window.removeEventListener('click', resetIdleTimer);
            window.removeEventListener('scroll', resetIdleTimer);
        };
    }, []); // Empty dependency array to run only on mount and unmount
    const login = (provider) => {
        console.log(`Login function called for provider: ${provider}. This will trigger OIDC flow.`);
        // Actual OIDC redirect logic will be handled by AuthLogin component and oidc.ts
    };
    const logout = async () => {
        try {
            console.log('Logging out...');
            // In a real app, this would call a backend logout endpoint
            // await fetch('/api/maestro/v1/auth/logout', { method: 'POST' });
            setUser(null);
            setAccessToken(undefined);
            setIdToken(undefined);
            setExpiresAt(undefined);
            setIsAuthenticated(false);
            if (idleTimer)
                clearTimeout(idleTimer);
            if (refreshTimer)
                clearTimeout(refreshTimer);
            window.location.href = '/'; // Redirect to home or login page
        }
        catch (error) {
            console.error('Logout failed:', error);
        }
    };
    const contextValue = {
        user: user ? { id: user.id, email: user.email, roles: user.roles, tenant: user.tenant, tenants: user.tenants } : null,
        isAuthenticated,
        loading,
        accessToken,
        idToken,
        expiresAt,
        login,
        logout,
        refreshToken,
        switchTenant,
        hasRole,
        hasTenantAccess,
    };
    return (_jsx(AuthContext.Provider, { value: contextValue, children: children }));
};
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
