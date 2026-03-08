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
/**
 * Mobile Auth Context
 * Implements secure authentication with:
 * - Device binding
 * - Short session lifetimes
 * - PIN/Biometric gate
 * - Remote wipe capability
 */
const react_1 = __importStar(require("react"));
const uuid_1 = require("uuid");
const secureStorage_1 = require("@/lib/secureStorage");
const deviceManager_1 = require("@/lib/deviceManager");
// Constants
const SESSION_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes
const MAX_PIN_ATTEMPTS = 5;
const PIN_LOCKOUT_MS = 5 * 60 * 1000; // 5 minutes
// Initial auth state
const initialState = {
    user: null,
    deviceInfo: null,
    accessToken: null,
    refreshToken: null,
    isAuthenticated: false,
    isPinVerified: false,
    sessionExpiresAt: null,
};
// Auth reducer
function authReducer(state, action) {
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
const AuthContext = (0, react_1.createContext)(undefined);
// Provider component
function AuthProvider({ children }) {
    const [state, dispatch] = (0, react_1.useReducer)(authReducer, initialState);
    const [pinAttempts, setPinAttempts] = react_1.default.useState(0);
    const [lockoutUntil, setLockoutUntil] = react_1.default.useState(null);
    // Security configuration
    const securityConfig = {
        requirePin: true,
        requireBiometric: false, // Set based on user preference
        sessionTimeoutMinutes: 15,
        maxFailedAttempts: MAX_PIN_ATTEMPTS,
        enableScreenshotPrevention: true,
        enableCopyPrevention: true,
    };
    // Check if locked out
    const isLocked = (0, react_1.useMemo)(() => {
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
    (0, react_1.useEffect)(() => {
        if (!state.sessionExpiresAt)
            return;
        const checkSession = () => {
            if (Date.now() >= state.sessionExpiresAt) {
                dispatch({ type: 'SESSION_EXPIRED' });
            }
        };
        const interval = setInterval(checkSession, 30000); // Check every 30s
        return () => clearInterval(interval);
    }, [state.sessionExpiresAt]);
    // Restore session on mount
    (0, react_1.useEffect)(() => {
        const restoreSession = async () => {
            try {
                const savedSession = await secureStorage_1.secureStorage.getSession();
                if (savedSession) {
                    // Verify device token is still valid
                    const isValid = await checkDeviceStatus();
                    if (isValid) {
                        dispatch({ type: 'RESTORE_SESSION', payload: savedSession });
                    }
                    else {
                        // Device token revoked - wipe local data
                        await handleDeviceWipe();
                    }
                }
                // Get or register device
                let deviceInfo = await deviceManager_1.deviceManager.getDeviceInfo();
                if (!deviceInfo) {
                    deviceInfo = await registerDevice();
                }
                dispatch({ type: 'SET_DEVICE', payload: deviceInfo });
            }
            catch (error) {
                console.error('Failed to restore session:', error);
            }
        };
        restoreSession();
    }, []);
    // Login
    const login = (0, react_1.useCallback)(async (email, password) => {
        try {
            const deviceInfo = await deviceManager_1.deviceManager.getDeviceInfo();
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
            await secureStorage_1.secureStorage.setDeviceToken(deviceToken);
            // Store tokens
            await secureStorage_1.secureStorage.setTokens(accessToken, refreshToken);
            dispatch({ type: 'SET_TOKENS', payload: { accessToken, refreshToken } });
            dispatch({ type: 'SET_USER', payload: user });
            // Save session
            await secureStorage_1.secureStorage.saveSession({
                user,
                accessToken,
                refreshToken,
                isAuthenticated: true,
            });
        }
        catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    }, []);
    // Logout
    const logout = (0, react_1.useCallback)(async () => {
        try {
            const deviceInfo = await deviceManager_1.deviceManager.getDeviceInfo();
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
            }
            catch {
                // Ignore network errors on logout
            }
            // Clear local data
            await secureStorage_1.secureStorage.clearSession();
            await secureStorage_1.secureStorage.clearTokens();
            dispatch({ type: 'LOGOUT' });
        }
        catch (error) {
            console.error('Logout error:', error);
            // Still clear local state
            dispatch({ type: 'LOGOUT' });
        }
    }, [state.accessToken]);
    // Refresh session
    const refreshSession = (0, react_1.useCallback)(async () => {
        if (!state.refreshToken) {
            throw new Error('No refresh token');
        }
        try {
            const deviceInfo = await deviceManager_1.deviceManager.getDeviceInfo();
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
            await secureStorage_1.secureStorage.setTokens(accessToken, refreshToken);
            dispatch({ type: 'SET_TOKENS', payload: { accessToken, refreshToken } });
        }
        catch (error) {
            console.error('Token refresh error:', error);
            // Force re-login
            dispatch({ type: 'SESSION_EXPIRED' });
            throw error;
        }
    }, [state.refreshToken]);
    // PIN verification
    const verifyPin = (0, react_1.useCallback)(async (pin) => {
        if (isLocked) {
            throw new Error('Account locked. Please wait.');
        }
        try {
            const isValid = await secureStorage_1.secureStorage.verifyPin(pin);
            if (isValid) {
                setPinAttempts(0);
                dispatch({ type: 'PIN_VERIFIED' });
                return true;
            }
            else {
                const newAttempts = pinAttempts + 1;
                setPinAttempts(newAttempts);
                if (newAttempts >= MAX_PIN_ATTEMPTS) {
                    setLockoutUntil(Date.now() + PIN_LOCKOUT_MS);
                }
                dispatch({ type: 'PIN_FAILED' });
                return false;
            }
        }
        catch (error) {
            console.error('PIN verification error:', error);
            return false;
        }
    }, [isLocked, pinAttempts]);
    // Set PIN
    const setPin = (0, react_1.useCallback)(async (pin) => {
        await secureStorage_1.secureStorage.setPin(pin);
    }, []);
    // Biometric verification
    const verifyBiometric = (0, react_1.useCallback)(async () => {
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
        }
        catch (error) {
            console.error('Biometric verification error:', error);
            return false;
        }
    }, []);
    // Check biometric availability
    const isBiometricAvailable = (0, react_1.useCallback)(async () => {
        try {
            if (!window.PublicKeyCredential) {
                return false;
            }
            return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
        }
        catch {
            return false;
        }
    }, []);
    // Register device
    const registerDevice = (0, react_1.useCallback)(async () => {
        const deviceId = (0, uuid_1.v4)();
        const platform = detectPlatform();
        const deviceInfo = {
            deviceId,
            platform,
            model: navigator.userAgent,
            osVersion: navigator.platform,
            appVersion: '1.0.0',
            registeredAt: new Date().toISOString(),
            lastActiveAt: new Date().toISOString(),
        };
        await deviceManager_1.deviceManager.saveDeviceInfo(deviceInfo);
        // Register with server
        try {
            await fetch('/api/devices/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(deviceInfo),
            });
        }
        catch {
            // Continue offline registration
        }
        return deviceInfo;
    }, []);
    // Deregister device
    const deregisterDevice = (0, react_1.useCallback)(async () => {
        const deviceInfo = await deviceManager_1.deviceManager.getDeviceInfo();
        if (!deviceInfo)
            return;
        try {
            await fetch('/api/devices/deregister', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${state.accessToken}`,
                },
                body: JSON.stringify({ deviceId: deviceInfo.deviceId }),
            });
        }
        catch {
            // Best effort
        }
        await deviceManager_1.deviceManager.clearDeviceInfo();
        await handleDeviceWipe();
    }, [state.accessToken]);
    // Check device status (for remote wipe)
    const checkDeviceStatus = (0, react_1.useCallback)(async () => {
        const deviceInfo = await deviceManager_1.deviceManager.getDeviceInfo();
        if (!deviceInfo)
            return false;
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
        }
        catch {
            // Assume valid when offline
            return true;
        }
    }, [state.accessToken]);
    // Handle device wipe
    const handleDeviceWipe = async () => {
        // Clear all local data
        await secureStorage_1.secureStorage.clearAll();
        await deviceManager_1.deviceManager.clearDeviceInfo();
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
    const contextValue = {
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
    return (<AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>);
}
// Hook
function useAuth() {
    const context = (0, react_1.useContext)(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
// Helpers
function detectPlatform() {
    const ua = navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(ua)) {
        return 'ios';
    }
    if (/android/.test(ua)) {
        return 'android';
    }
    return 'web';
}
