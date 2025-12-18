/**
 * Mobile Auth Context
 * Implements secure authentication with:
 * - Device binding
 * - Short session lifetimes
 * - PIN/Biometric gate
 * - Remote wipe capability
 */
import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import { v4 as uuidv4 } from 'uuid';
import type {
  User,
  AuthState,
  DeviceInfo,
  SecurityConfig,
  DeviceToken,
} from '@/types';
import { secureStorage } from '@/lib/secureStorage';
import { deviceManager } from '@/lib/deviceManager';

// Constants
const SESSION_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes
const MAX_PIN_ATTEMPTS = 5;
const PIN_LOCKOUT_MS = 5 * 60 * 1000; // 5 minutes

// Auth action types
type AuthAction =
  | { type: 'SET_USER'; payload: User }
  | { type: 'SET_TOKENS'; payload: { accessToken: string; refreshToken: string } }
  | { type: 'SET_DEVICE'; payload: DeviceInfo }
  | { type: 'PIN_VERIFIED' }
  | { type: 'PIN_FAILED' }
  | { type: 'LOGOUT' }
  | { type: 'SESSION_EXPIRED' }
  | { type: 'DEVICE_WIPED' }
  | { type: 'RESTORE_SESSION'; payload: Partial<AuthState> };

// Initial auth state
const initialState: AuthState = {
  user: null,
  deviceInfo: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isPinVerified: false,
  sessionExpiresAt: null,
};

// Auth reducer
function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'SET_USER':
      return {
        ...state,
        user: action.payload,
        isAuthenticated: true,
        sessionExpiresAt: Date.now() + SESSION_TIMEOUT_MS,
      };
    case 'SET_TOKENS':
      return {
        ...state,
        accessToken: action.payload.accessToken,
        refreshToken: action.payload.refreshToken,
      };
    case 'SET_DEVICE':
      return {
        ...state,
        deviceInfo: action.payload,
      };
    case 'PIN_VERIFIED':
      return {
        ...state,
        isPinVerified: true,
        sessionExpiresAt: Date.now() + SESSION_TIMEOUT_MS,
      };
    case 'PIN_FAILED':
      return state;
    case 'LOGOUT':
      return {
        ...initialState,
        deviceInfo: state.deviceInfo, // Keep device info
      };
    case 'SESSION_EXPIRED':
      return {
        ...state,
        isPinVerified: false,
        sessionExpiresAt: null,
      };
    case 'DEVICE_WIPED':
      return initialState;
    case 'RESTORE_SESSION':
      return {
        ...state,
        ...action.payload,
      };
    default:
      return state;
  }
}

// Context type
interface AuthContextType extends AuthState {
  // Auth methods
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;

  // PIN/Biometric methods
  verifyPin: (pin: string) => Promise<boolean>;
  setPin: (pin: string) => Promise<void>;
  verifyBiometric: () => Promise<boolean>;
  isBiometricAvailable: () => Promise<boolean>;

  // Device methods
  registerDevice: () => Promise<DeviceInfo>;
  deregisterDevice: () => Promise<void>;
  checkDeviceStatus: () => Promise<boolean>;

  // Security config
  securityConfig: SecurityConfig;

  // Status
  pinAttempts: number;
  isLocked: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider component
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState);
  const [pinAttempts, setPinAttempts] = React.useState(0);
  const [lockoutUntil, setLockoutUntil] = React.useState<number | null>(null);

  // Security configuration
  const securityConfig: SecurityConfig = {
    requirePin: true,
    requireBiometric: false, // Set based on user preference
    sessionTimeoutMinutes: 15,
    maxFailedAttempts: MAX_PIN_ATTEMPTS,
    enableScreenshotPrevention: true,
    enableCopyPrevention: true,
  };

  // Check if locked out
  const isLocked = useMemo(() => {
    if (lockoutUntil && Date.now() < lockoutUntil) {
      return true;
    }
    if (lockoutUntil && Date.now() >= lockoutUntil) {
      setLockoutUntil(null);
      setPinAttempts(0);
    }
    return false;
  }, [lockoutUntil]);

  // Session timeout check
  useEffect(() => {
    if (!state.sessionExpiresAt) return;

    const checkSession = () => {
      if (Date.now() >= state.sessionExpiresAt!) {
        dispatch({ type: 'SESSION_EXPIRED' });
      }
    };

    const interval = setInterval(checkSession, 30000); // Check every 30s
    return () => clearInterval(interval);
  }, [state.sessionExpiresAt]);

  // Restore session on mount
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const savedSession = await secureStorage.getSession();
        if (savedSession) {
          // Verify device token is still valid
          const isValid = await checkDeviceStatus();
          if (isValid) {
            dispatch({ type: 'RESTORE_SESSION', payload: savedSession });
          } else {
            // Device token revoked - wipe local data
            await handleDeviceWipe();
          }
        }

        // Get or register device
        let deviceInfo = await deviceManager.getDeviceInfo();
        if (!deviceInfo) {
          deviceInfo = await registerDevice();
        }
        dispatch({ type: 'SET_DEVICE', payload: deviceInfo });
      } catch (error) {
        console.error('Failed to restore session:', error);
      }
    };

    restoreSession();
  }, []);

  // Login
  const login = useCallback(async (email: string, password: string) => {
    try {
      const deviceInfo = await deviceManager.getDeviceInfo();
      if (!deviceInfo) {
        throw new Error('Device not registered');
      }

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Device-Id': deviceInfo.deviceId,
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Login failed');
      }

      const { user, accessToken, refreshToken, deviceToken } = await response.json();

      // Store device token for binding
      await secureStorage.setDeviceToken(deviceToken);

      // Store tokens
      await secureStorage.setTokens(accessToken, refreshToken);

      dispatch({ type: 'SET_TOKENS', payload: { accessToken, refreshToken } });
      dispatch({ type: 'SET_USER', payload: user });

      // Save session
      await secureStorage.saveSession({
        user,
        accessToken,
        refreshToken,
        isAuthenticated: true,
      });
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }, []);

  // Logout
  const logout = useCallback(async () => {
    try {
      const deviceInfo = await deviceManager.getDeviceInfo();

      // Notify server (best effort)
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${state.accessToken}`,
            'X-Device-Id': deviceInfo?.deviceId || '',
          },
        });
      } catch {
        // Ignore network errors on logout
      }

      // Clear local data
      await secureStorage.clearSession();
      await secureStorage.clearTokens();

      dispatch({ type: 'LOGOUT' });
    } catch (error) {
      console.error('Logout error:', error);
      // Still clear local state
      dispatch({ type: 'LOGOUT' });
    }
  }, [state.accessToken]);

  // Refresh session
  const refreshSession = useCallback(async () => {
    if (!state.refreshToken) {
      throw new Error('No refresh token');
    }

    try {
      const deviceInfo = await deviceManager.getDeviceInfo();

      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Device-Id': deviceInfo?.deviceId || '',
        },
        body: JSON.stringify({ refreshToken: state.refreshToken }),
      });

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      const { accessToken, refreshToken } = await response.json();

      await secureStorage.setTokens(accessToken, refreshToken);
      dispatch({ type: 'SET_TOKENS', payload: { accessToken, refreshToken } });
    } catch (error) {
      console.error('Token refresh error:', error);
      // Force re-login
      dispatch({ type: 'SESSION_EXPIRED' });
      throw error;
    }
  }, [state.refreshToken]);

  // PIN verification
  const verifyPin = useCallback(async (pin: string): Promise<boolean> => {
    if (isLocked) {
      throw new Error('Account locked. Please wait.');
    }

    try {
      const isValid = await secureStorage.verifyPin(pin);

      if (isValid) {
        setPinAttempts(0);
        dispatch({ type: 'PIN_VERIFIED' });
        return true;
      } else {
        const newAttempts = pinAttempts + 1;
        setPinAttempts(newAttempts);

        if (newAttempts >= MAX_PIN_ATTEMPTS) {
          setLockoutUntil(Date.now() + PIN_LOCKOUT_MS);
        }

        dispatch({ type: 'PIN_FAILED' });
        return false;
      }
    } catch (error) {
      console.error('PIN verification error:', error);
      return false;
    }
  }, [isLocked, pinAttempts]);

  // Set PIN
  const setPin = useCallback(async (pin: string) => {
    await secureStorage.setPin(pin);
  }, []);

  // Biometric verification
  const verifyBiometric = useCallback(async (): Promise<boolean> => {
    try {
      // WebAuthn / Platform authenticator
      if (!window.PublicKeyCredential) {
        return false;
      }

      const credential = await navigator.credentials.get({
        publicKey: {
          challenge: new Uint8Array(32),
          timeout: 60000,
          userVerification: 'required',
          rpId: window.location.hostname,
        },
      });

      if (credential) {
        dispatch({ type: 'PIN_VERIFIED' });
        return true;
      }
      return false;
    } catch (error) {
      console.error('Biometric verification error:', error);
      return false;
    }
  }, []);

  // Check biometric availability
  const isBiometricAvailable = useCallback(async (): Promise<boolean> => {
    try {
      if (!window.PublicKeyCredential) {
        return false;
      }
      return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    } catch {
      return false;
    }
  }, []);

  // Register device
  const registerDevice = useCallback(async (): Promise<DeviceInfo> => {
    const deviceId = uuidv4();
    const platform = detectPlatform();

    const deviceInfo: DeviceInfo = {
      deviceId,
      platform,
      model: navigator.userAgent,
      osVersion: navigator.platform,
      appVersion: '1.0.0',
      registeredAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString(),
    };

    await deviceManager.saveDeviceInfo(deviceInfo);

    // Register with server
    try {
      await fetch('/api/devices/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(deviceInfo),
      });
    } catch {
      // Continue offline registration
    }

    return deviceInfo;
  }, []);

  // Deregister device
  const deregisterDevice = useCallback(async () => {
    const deviceInfo = await deviceManager.getDeviceInfo();
    if (!deviceInfo) return;

    try {
      await fetch('/api/devices/deregister', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${state.accessToken}`,
        },
        body: JSON.stringify({ deviceId: deviceInfo.deviceId }),
      });
    } catch {
      // Best effort
    }

    await deviceManager.clearDeviceInfo();
    await handleDeviceWipe();
  }, [state.accessToken]);

  // Check device status (for remote wipe)
  const checkDeviceStatus = useCallback(async (): Promise<boolean> => {
    const deviceInfo = await deviceManager.getDeviceInfo();
    if (!deviceInfo) return false;

    try {
      const response = await fetch(`/api/devices/${deviceInfo.deviceId}/status`, {
        headers: {
          'Authorization': `Bearer ${state.accessToken}`,
        },
      });

      if (!response.ok) {
        return false;
      }

      const { isActive, shouldWipe } = await response.json();

      if (shouldWipe) {
        await handleDeviceWipe();
        return false;
      }

      return isActive;
    } catch {
      // Assume valid when offline
      return true;
    }
  }, [state.accessToken]);

  // Handle device wipe
  const handleDeviceWipe = async () => {
    // Clear all local data
    await secureStorage.clearAll();
    await deviceManager.clearDeviceInfo();

    // Clear IndexedDB
    const databases = await indexedDB.databases();
    for (const db of databases) {
      if (db.name) {
        indexedDB.deleteDatabase(db.name);
      }
    }

    // Clear caches
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map((name) => caches.delete(name)));
    }

    dispatch({ type: 'DEVICE_WIPED' });
  };

  const contextValue: AuthContextType = {
    ...state,
    login,
    logout,
    refreshSession,
    verifyPin,
    setPin,
    verifyBiometric,
    isBiometricAvailable,
    registerDevice,
    deregisterDevice,
    checkDeviceStatus,
    securityConfig,
    pinAttempts,
    isLocked,
  };

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
}

// Hook
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Helpers
function detectPlatform(): 'ios' | 'android' | 'web' {
  const ua = navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) {
    return 'ios';
  }
  if (/android/.test(ua)) {
    return 'android';
  }
  return 'web';
}
