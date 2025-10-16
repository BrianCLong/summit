import { jsx as _jsx } from 'react/jsx-runtime';
import { createContext, useContext, useState, useEffect } from 'react';
import { oidcService } from '../services/oidcService';
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
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate API call
      const newAccessToken = 'new-mock-access-token-' + Date.now();
      const newIdToken = 'new-mock-id-token-' + Date.now();
      const newExpiresAt = Date.now() + 3600 * 1000; // 1 hour from now
      setAccessToken(newAccessToken);
      setIdToken(newIdToken);
      setExpiresAt(newExpiresAt);
      console.log('Token refreshed successfully.');
    } catch (error) {
      console.error('Failed to refresh token:', error);
      // On 401 or invalid refresh, log out
      logout();
    } finally {
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
        console.log(
          `Scheduling token refresh in ${Math.round(timeToRefresh / 1000)} seconds.`,
        );
        setRefreshTimer(setTimeout(refreshToken, timeToRefresh));
      } else {
        console.log(
          'Token already expired or close to expiry, refreshing now.',
        );
        refreshToken();
      }
    }
  };
  const switchTenant = async (tenant) => {
    console.log(`Attempting to switch to tenant: ${tenant}`);
    // In a real app, this would involve an API call to update the user's active tenant
    // and potentially re-fetch user info or tokens.
    // For now, simulate success and update user object
    await new Promise((resolve) => setTimeout(resolve, 500));
    if (user) {
      setUser({ ...user, tenant: tenant });
      console.log(`Switched to tenant: ${tenant}`);
    }
  };
  useEffect(() => {
    setIsAuthenticated(
      !!user &&
        !!accessToken &&
        !!idToken &&
        !!expiresAt &&
        expiresAt > Date.now(),
    );
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
        // Restore auth state from localStorage
        const storedAuth = localStorage.getItem('maestro_auth_token');
        if (storedAuth) {
          const authData = JSON.parse(storedAuth);
          // Validate token hasn't expired
          if (authData.expiresAt > Date.now()) {
            // Optionally validate token with server
            const tokenValid = oidcService.validateToken(authData.accessToken);
            if (tokenValid.valid) {
              setUser(authData.user);
              setAccessToken(authData.accessToken);
              setIdToken(authData.idToken);
              setExpiresAt(authData.expiresAt);
            } else {
              // Token invalid, clear storage
              localStorage.removeItem('maestro_auth_token');
            }
          } else {
            // Token expired, attempt refresh if refresh token available
            if (authData.refreshToken) {
              try {
                const newTokens = await oidcService.refreshTokens(
                  authData.refreshToken,
                );
                const refreshedData = {
                  ...authData,
                  accessToken: newTokens.access_token,
                  idToken: newTokens.id_token,
                  expiresAt: Date.now() + newTokens.expires_in * 1000,
                };
                setAuthData(refreshedData);
                return; // Exit early as setAuthData handles loading state
              } catch (refreshError) {
                console.error('Token refresh failed:', refreshError);
                localStorage.removeItem('maestro_auth_token');
              }
            } else {
              localStorage.removeItem('maestro_auth_token');
            }
          }
        }
      } catch (error) {
        console.error('Failed to restore session:', error);
        localStorage.removeItem('maestro_auth_token');
      } finally {
        setLoading(false);
      }
    };
    checkSession();
    // Cleanup listeners on unmount
    return () => {
      if (idleTimer) clearTimeout(idleTimer);
      if (refreshTimer) clearTimeout(refreshTimer);
      window.removeEventListener('mousemove', resetIdleTimer);
      window.removeEventListener('keydown', resetIdleTimer);
      window.removeEventListener('click', resetIdleTimer);
      window.removeEventListener('scroll', resetIdleTimer);
    };
  }, []); // Empty dependency array to run only on mount and unmount
  const login = async (provider) => {
    try {
      setLoading(true);
      // Store intended return path
      sessionStorage.setItem('auth_return_path', window.location.pathname);
      // Initiate OIDC flow
      await oidcService.initiateLogin(provider);
    } catch (error) {
      console.error('Login initiation failed:', error);
      setLoading(false);
    }
  };
  const setAuthData = (data) => {
    setUser(data.user);
    setAccessToken(data.accessToken);
    setIdToken(data.idToken);
    setExpiresAt(data.expiresAt);
    setIsAuthenticated(true);
    setLoading(false);
    // Store in localStorage for persistence
    localStorage.setItem(
      'maestro_auth_token',
      JSON.stringify({
        user: data.user,
        accessToken: data.accessToken,
        idToken: data.idToken,
        expiresAt: data.expiresAt,
        refreshToken: data.refreshToken,
      }),
    );
    // Schedule token refresh
    scheduleTokenRefresh();
  };
  const logout = async () => {
    try {
      console.log('Logging out...');
      // Clear local state
      setUser(null);
      setAccessToken(undefined);
      setIdToken(undefined);
      setExpiresAt(undefined);
      setIsAuthenticated(false);
      // Clear timers
      if (idleTimer) clearTimeout(idleTimer);
      if (refreshTimer) clearTimeout(refreshTimer);
      // Use OIDC service logout (will redirect to IdP logout)
      await oidcService.logout(accessToken);
    } catch (error) {
      console.error('Logout failed:', error);
      // Fallback: clear storage and redirect
      localStorage.removeItem('maestro_auth_token');
      window.location.href = '/auth/login';
    }
  };
  const contextValue = {
    user: user
      ? {
          id: user.id,
          email: user.email,
          roles: user.roles,
          tenant: user.tenant,
          tenants: user.tenants,
        }
      : null,
    isAuthenticated,
    loading,
    accessToken,
    idToken,
    expiresAt,
    login,
    setAuthData,
    logout,
    refreshToken,
    switchTenant,
    hasRole,
    hasTenantAccess,
  };
  return _jsx(AuthContext.Provider, {
    value: contextValue,
    children: children,
  });
};
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
