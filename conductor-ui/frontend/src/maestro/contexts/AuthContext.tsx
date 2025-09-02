import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';

export interface User {
  id: string;
  email: string;
  name: string;
  roles: string[];
  tenants: string[];
  preferredTenant?: string;
  idpProvider: 'auth0' | 'azure' | 'google';
  groups?: string[];
}

export interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  token: string | null;
  error: string | null;
}

interface AuthContextType extends AuthState {
  login: (provider: 'auth0' | 'azure' | 'google') => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
  switchTenant: (tenantId: string) => void;
  hasRole: (role: string) => boolean;
  hasTenantAccess: (tenantId: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

// OIDC configuration
const OIDC_CONFIG = {
  auth0: {
    issuer: process.env.REACT_APP_AUTH0_DOMAIN || 'https://dev-maestro.auth0.com',
    clientId: process.env.REACT_APP_AUTH0_CLIENT_ID || 'maestro_client_id',
    redirectUri: `${window.location.origin}/maestro/auth/callback`,
    scope: 'openid profile email',
  },
  azure: {
    issuer: process.env.REACT_APP_AZURE_TENANT_ID || 'common',
    clientId: process.env.REACT_APP_AZURE_CLIENT_ID || 'azure_client_id',
    redirectUri: `${window.location.origin}/maestro/auth/callback`,
    scope: 'openid profile email',
  },
  google: {
    issuer: 'https://accounts.google.com',
    clientId: process.env.REACT_APP_GOOGLE_CLIENT_ID || 'google_client_id',
    redirectUri: `${window.location.origin}/maestro/auth/callback`,
    scope: 'openid profile email',
  },
};

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: true,
    user: null,
    token: null,
    error: null,
  });

  // Generate PKCE challenge
  const generateCodeChallenge = async (codeVerifier: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(codeVerifier);
    const digest = await crypto.subtle.digest('SHA-256', data);
    const base64String = btoa(String.fromCharCode(...new Uint8Array(digest)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    return base64String;
  };

  const generateCodeVerifier = (): string => {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return btoa(String.fromCharCode(...array))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  };

  // Login function with PKCE flow
  const login = async (provider: 'auth0' | 'azure' | 'google'): Promise<void> => {
    try {
      const config = OIDC_CONFIG[provider];
      const codeVerifier = generateCodeVerifier();
      const codeChallenge = await generateCodeChallenge(codeVerifier);
      const state = btoa(JSON.stringify({ provider, timestamp: Date.now() }));
      
      // Store PKCE verifier and state
      sessionStorage.setItem('pkce_code_verifier', codeVerifier);
      sessionStorage.setItem('auth_state', state);
      
      const params = new URLSearchParams({
        response_type: 'code',
        client_id: config.clientId,
        redirect_uri: config.redirectUri,
        scope: config.scope,
        state,
        code_challenge: codeChallenge,
        code_challenge_method: 'S256',
        ...(provider === 'azure' && { prompt: 'select_account' }),
      });

      let authUrl: string;
      switch (provider) {
        case 'auth0':
          authUrl = `${config.issuer}/authorize?${params}`;
          break;
        case 'azure':
          authUrl = `https://login.microsoftonline.com/${config.issuer}/oauth2/v2.0/authorize?${params}`;
          break;
        case 'google':
          authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
          break;
        default:
          throw new Error(`Unsupported provider: ${provider}`);
      }

      window.location.href = authUrl;
    } catch (error) {
      setAuthState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Login failed',
        isLoading: false,
      }));
    }
  };

  // Handle OAuth callback
  const handleCallback = async (code: string, state: string): Promise<void> => {
    try {
      const storedState = sessionStorage.getItem('auth_state');
      const codeVerifier = sessionStorage.getItem('pkce_code_verifier');
      
      if (!storedState || storedState !== state || !codeVerifier) {
        throw new Error('Invalid state or missing PKCE verifier');
      }
      
      const stateData = JSON.parse(atob(state));
      const provider = stateData.provider;
      const config = OIDC_CONFIG[provider];
      
      // Exchange code for tokens
      const tokenResponse = await fetch('/api/maestro/v1/auth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          code,
          codeVerifier,
          redirectUri: config.redirectUri,
        }),
      });
      
      if (!tokenResponse.ok) {
        throw new Error('Token exchange failed');
      }
      
      const tokens = await tokenResponse.json();
      
      // Store tokens securely (using httpOnly cookies is preferred in production)
      sessionStorage.setItem('access_token', tokens.accessToken);
      sessionStorage.setItem('refresh_token', tokens.refreshToken);
      
      // Clean up PKCE data
      sessionStorage.removeItem('pkce_code_verifier');
      sessionStorage.removeItem('auth_state');
      
      // Fetch user info
      await fetchUserInfo(tokens.accessToken);
      
    } catch (error) {
      setAuthState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Authentication failed',
        isLoading: false,
      }));
    }
  };

  // Fetch user information
  const fetchUserInfo = async (token: string): Promise<void> => {
    try {
      const response = await fetch('/api/maestro/v1/auth/userinfo', {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch user info');
      }
      
      const user = await response.json();
      
      setAuthState({
        isAuthenticated: true,
        isLoading: false,
        user,
        token,
        error: null,
      });
    } catch (error) {
      setAuthState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to fetch user info',
        isLoading: false,
      }));
    }
  };

  // Logout function
  const logout = async (): Promise<void> => {
    try {
      const token = sessionStorage.getItem('access_token');
      if (token) {
        await fetch('/api/maestro/v1/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    } catch (error) {
      console.error('Logout API call failed:', error);
    } finally {
      // Clear local storage
      sessionStorage.removeItem('access_token');
      sessionStorage.removeItem('refresh_token');
      
      setAuthState({
        isAuthenticated: false,
        isLoading: false,
        user: null,
        token: null,
        error: null,
      });
      
      // Redirect to logout URL if needed
      window.location.href = '/maestro/auth/login';
    }
  };

  // Refresh token
  const refreshToken = async (): Promise<void> => {
    try {
      const refresh = sessionStorage.getItem('refresh_token');
      if (!refresh) {
        throw new Error('No refresh token available');
      }
      
      const response = await fetch('/api/maestro/v1/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: refresh }),
      });
      
      if (!response.ok) {
        throw new Error('Token refresh failed');
      }
      
      const tokens = await response.json();
      sessionStorage.setItem('access_token', tokens.accessToken);
      
      await fetchUserInfo(tokens.accessToken);
    } catch (error) {
      console.error('Token refresh failed:', error);
      await logout();
    }
  };

  // Switch tenant
  const switchTenant = (tenantId: string): void => {
    if (authState.user && authState.user.tenants.includes(tenantId)) {
      setAuthState(prev => ({
        ...prev,
        user: prev.user ? { ...prev.user, preferredTenant: tenantId } : null,
      }));
    }
  };

  // Check if user has specific role
  const hasRole = (role: string): boolean => {
    return authState.user?.roles.includes(role) ?? false;
  };

  // Check if user has access to specific tenant
  const hasTenantAccess = (tenantId: string): boolean => {
    return authState.user?.tenants.includes(tenantId) ?? false;
  };

  // Initialize auth state on mount
  useEffect(() => {
    const initializeAuth = async () => {
      const token = sessionStorage.getItem('access_token');
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const state = urlParams.get('state');
      
      if (code && state) {
        // Handle OAuth callback
        await handleCallback(code, state);
        // Clean URL
        window.history.replaceState({}, document.title, window.location.pathname);
      } else if (token) {
        // Try to restore session
        await fetchUserInfo(token);
      } else {
        setAuthState(prev => ({ ...prev, isLoading: false }));
      }
    };
    
    initializeAuth();
  }, []);

  // Set up token refresh interval
  useEffect(() => {
    if (authState.isAuthenticated && authState.token) {
      const interval = setInterval(() => {
        refreshToken();
      }, 14 * 60 * 1000); // Refresh every 14 minutes
      
      return () => clearInterval(interval);
    }
  }, [authState.isAuthenticated, authState.token]);

  // Handle idle timeout (15 minutes)
  useEffect(() => {
    if (authState.isAuthenticated) {
      let idleTimer: NodeJS.Timeout;
      
      const resetIdleTimer = () => {
        clearTimeout(idleTimer);
        idleTimer = setTimeout(() => {
          logout();
        }, 15 * 60 * 1000); // 15 minutes
      };
      
      const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
      events.forEach(event => {
        document.addEventListener(event, resetIdleTimer, true);
      });
      
      resetIdleTimer();
      
      return () => {
        clearTimeout(idleTimer);
        events.forEach(event => {
          document.removeEventListener(event, resetIdleTimer, true);
        });
      };
    }
  }, [authState.isAuthenticated]);

  const contextValue: AuthContextType = {
    ...authState,
    login,
    logout,
    refreshToken,
    switchTenant,
    hasRole,
    hasTenantAccess,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};