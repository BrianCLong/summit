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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSessionInfo = exports.isAuthenticated = exports.authenticateWithBiometrics = exports.clearBiometricEnabled = exports.isBiometricEnabled = exports.enableBiometrics = exports.getBiometricType = exports.isBiometricsAvailable = exports.logout = exports.login = exports.clearUser = exports.getUser = exports.saveUser = exports.clearAuthToken = exports.refreshAuthToken = exports.getAuthToken = exports.getAuthTokens = exports.saveAuthTokens = void 0;
const react_native_mmkv_1 = require("react-native-mmkv");
const Keychain = __importStar(require("react-native-keychain"));
const react_native_biometrics_1 = __importDefault(require("react-native-biometrics"));
const config_1 = require("@/config");
const storage = new react_native_mmkv_1.MMKV({ id: 'auth' });
const rnBiometrics = new react_native_biometrics_1.default();
// ============================================
// Token Management
// ============================================
const saveAuthTokens = async (tokens) => {
    await Keychain.setGenericPassword('auth_tokens', JSON.stringify(tokens), { service: 'intelgraph_auth' });
    storage.set('token_expiry', tokens.expiresAt);
};
exports.saveAuthTokens = saveAuthTokens;
const getAuthTokens = async () => {
    try {
        const credentials = await Keychain.getGenericPassword({ service: 'intelgraph_auth' });
        if (credentials) {
            return JSON.parse(credentials.password);
        }
        return null;
    }
    catch {
        return null;
    }
};
exports.getAuthTokens = getAuthTokens;
const getAuthToken = async () => {
    const tokens = await (0, exports.getAuthTokens)();
    if (!tokens)
        return null;
    // Check if token is about to expire
    const now = Date.now();
    if (tokens.expiresAt - now < config_1.AUTH_CONFIG.tokenRefreshBuffer) {
        // Token is about to expire, try to refresh
        const newToken = await (0, exports.refreshAuthToken)();
        return newToken;
    }
    return tokens.accessToken;
};
exports.getAuthToken = getAuthToken;
const refreshAuthToken = async () => {
    const tokens = await (0, exports.getAuthTokens)();
    if (!tokens?.refreshToken)
        return null;
    try {
        const response = await fetch(`${config_1.API_CONFIG.baseUrl}/auth/refresh`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ refreshToken: tokens.refreshToken }),
        });
        if (!response.ok) {
            throw new Error('Token refresh failed');
        }
        const data = await response.json();
        const newTokens = {
            accessToken: data.accessToken,
            refreshToken: data.refreshToken || tokens.refreshToken,
            expiresAt: Date.now() + (data.expiresIn * 1000),
        };
        await (0, exports.saveAuthTokens)(newTokens);
        return newTokens.accessToken;
    }
    catch (error) {
        console.error('[AuthService] Token refresh failed:', error);
        return null;
    }
};
exports.refreshAuthToken = refreshAuthToken;
const clearAuthToken = async () => {
    await Keychain.resetGenericPassword({ service: 'intelgraph_auth' });
    storage.delete('token_expiry');
};
exports.clearAuthToken = clearAuthToken;
// ============================================
// User Management
// ============================================
const saveUser = (user) => {
    storage.set(config_1.AUTH_CONFIG.userKey, JSON.stringify(user));
};
exports.saveUser = saveUser;
const getUser = () => {
    const data = storage.getString(config_1.AUTH_CONFIG.userKey);
    if (!data)
        return null;
    try {
        return JSON.parse(data);
    }
    catch {
        return null;
    }
};
exports.getUser = getUser;
const clearUser = () => {
    storage.delete(config_1.AUTH_CONFIG.userKey);
};
exports.clearUser = clearUser;
const login = async (credentials) => {
    const response = await fetch(`${config_1.API_CONFIG.baseUrl}/auth/login`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Login failed');
    }
    const data = await response.json();
    // Save tokens
    await (0, exports.saveAuthTokens)({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        expiresAt: Date.now() + (data.expiresIn * 1000),
    });
    // Save user
    (0, exports.saveUser)(data.user);
    return data.user;
};
exports.login = login;
const logout = async () => {
    try {
        const token = await (0, exports.getAuthToken)();
        if (token) {
            await fetch(`${config_1.API_CONFIG.baseUrl}/auth/logout`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
        }
    }
    catch (error) {
        console.error('[AuthService] Logout request failed:', error);
    }
    await (0, exports.clearAuthToken)();
    (0, exports.clearUser)();
    (0, exports.clearBiometricEnabled)();
};
exports.logout = logout;
// ============================================
// Biometric Authentication
// ============================================
const isBiometricsAvailable = async () => {
    const { available } = await rnBiometrics.isSensorAvailable();
    return available;
};
exports.isBiometricsAvailable = isBiometricsAvailable;
const getBiometricType = async () => {
    const { biometryType } = await rnBiometrics.isSensorAvailable();
    return biometryType || null;
};
exports.getBiometricType = getBiometricType;
const enableBiometrics = async () => {
    try {
        const { success } = await rnBiometrics.simplePrompt({
            promptMessage: 'Confirm your identity to enable biometric login',
        });
        if (success) {
            storage.set(config_1.AUTH_CONFIG.biometricKey, 'true');
            return true;
        }
        return false;
    }
    catch {
        return false;
    }
};
exports.enableBiometrics = enableBiometrics;
const isBiometricEnabled = () => {
    return storage.getString(config_1.AUTH_CONFIG.biometricKey) === 'true';
};
exports.isBiometricEnabled = isBiometricEnabled;
const clearBiometricEnabled = () => {
    storage.delete(config_1.AUTH_CONFIG.biometricKey);
};
exports.clearBiometricEnabled = clearBiometricEnabled;
const authenticateWithBiometrics = async () => {
    try {
        const { success } = await rnBiometrics.simplePrompt({
            promptMessage: 'Authenticate to access IntelGraph',
        });
        return success;
    }
    catch {
        return false;
    }
};
exports.authenticateWithBiometrics = authenticateWithBiometrics;
// ============================================
// Session Management
// ============================================
const isAuthenticated = async () => {
    const token = await (0, exports.getAuthToken)();
    return token !== null;
};
exports.isAuthenticated = isAuthenticated;
const getSessionInfo = async () => {
    const user = (0, exports.getUser)();
    const tokens = await (0, exports.getAuthTokens)();
    return {
        user,
        isAuthenticated: !!tokens?.accessToken,
        expiresAt: tokens?.expiresAt,
        biometricEnabled: (0, exports.isBiometricEnabled)(),
    };
};
exports.getSessionInfo = getSessionInfo;
