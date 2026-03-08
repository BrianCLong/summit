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
exports.verifyPIN = exports.setPIN = exports.loginWithBiometric = exports.isBiometricEnabled = exports.enableBiometric = exports.isBiometricAvailable = exports.refreshAuthToken = exports.logout = exports.verifyMFA = exports.login = exports.setUserData = exports.getUserData = exports.setRefreshToken = exports.getRefreshToken = exports.setAuthToken = exports.getAuthToken = void 0;
// @ts-nocheck
const async_storage_1 = __importDefault(require("@react-native-async-storage/async-storage"));
const Keychain = __importStar(require("react-native-keychain"));
const react_native_biometrics_1 = __importDefault(require("react-native-biometrics"));
const react_native_device_info_1 = __importDefault(require("react-native-device-info"));
const axios_1 = __importDefault(require("axios"));
const config_1 = require("../config");
const AUTH_TOKEN_KEY = 'auth_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const USER_KEY = 'user_data';
const BIOMETRIC_KEY = 'biometric_enabled';
const PIN_KEY = 'user_pin';
const rnBiometrics = new react_native_biometrics_1.default();
// Get auth token
const getAuthToken = async () => {
    try {
        const token = await async_storage_1.default.getItem(AUTH_TOKEN_KEY);
        return token;
    }
    catch (error) {
        console.error('Failed to get auth token:', error);
        return null;
    }
};
exports.getAuthToken = getAuthToken;
// Set auth token
const setAuthToken = async (token) => {
    try {
        await async_storage_1.default.setItem(AUTH_TOKEN_KEY, token);
    }
    catch (error) {
        console.error('Failed to set auth token:', error);
    }
};
exports.setAuthToken = setAuthToken;
// Get refresh token
const getRefreshToken = async () => {
    try {
        const token = await async_storage_1.default.getItem(REFRESH_TOKEN_KEY);
        return token;
    }
    catch (error) {
        console.error('Failed to get refresh token:', error);
        return null;
    }
};
exports.getRefreshToken = getRefreshToken;
// Set refresh token
const setRefreshToken = async (token) => {
    try {
        await async_storage_1.default.setItem(REFRESH_TOKEN_KEY, token);
    }
    catch (error) {
        console.error('Failed to set refresh token:', error);
    }
};
exports.setRefreshToken = setRefreshToken;
// Get user data
const getUserData = async () => {
    try {
        const userData = await async_storage_1.default.getItem(USER_KEY);
        return userData ? JSON.parse(userData) : null;
    }
    catch (error) {
        console.error('Failed to get user data:', error);
        return null;
    }
};
exports.getUserData = getUserData;
// Set user data
const setUserData = async (user) => {
    try {
        await async_storage_1.default.setItem(USER_KEY, JSON.stringify(user));
    }
    catch (error) {
        console.error('Failed to set user data:', error);
    }
};
exports.setUserData = setUserData;
// Login with email and password
const login = async (credentials) => {
    try {
        const deviceId = await react_native_device_info_1.default.getUniqueId();
        const deviceName = await react_native_device_info_1.default.getDeviceName();
        const response = await axios_1.default.post(`${config_1.API_URL}/auth/login`, {
            ...credentials,
            deviceId,
            deviceName,
        });
        const { user, token, refreshToken, mfaRequired, sessionToken } = response.data;
        if (!mfaRequired) {
            await (0, exports.setAuthToken)(token);
            await (0, exports.setRefreshToken)(refreshToken);
            await (0, exports.setUserData)(user);
            // Store credentials securely for biometric login
            await Keychain.setGenericPassword(credentials.email, credentials.password, {
                service: 'intelgraph.auth',
            });
        }
        return response.data;
    }
    catch (error) {
        console.error('Login failed:', error);
        throw error;
    }
};
exports.login = login;
// Verify MFA code
const verifyMFA = async (sessionToken, code) => {
    try {
        const response = await axios_1.default.post(`${config_1.API_URL}/auth/mfa/verify`, {
            sessionToken,
            code,
        });
        const { user, token, refreshToken } = response.data;
        await (0, exports.setAuthToken)(token);
        await (0, exports.setRefreshToken)(refreshToken);
        await (0, exports.setUserData)(user);
        return response.data;
    }
    catch (error) {
        console.error('MFA verification failed:', error);
        throw error;
    }
};
exports.verifyMFA = verifyMFA;
// Logout
const logout = async () => {
    try {
        await async_storage_1.default.multiRemove([AUTH_TOKEN_KEY, REFRESH_TOKEN_KEY, USER_KEY]);
        await Keychain.resetGenericPassword({ service: 'intelgraph.auth' });
    }
    catch (error) {
        console.error('Logout failed:', error);
    }
};
exports.logout = logout;
// Refresh token
const refreshAuthToken = async () => {
    try {
        const refreshToken = await (0, exports.getRefreshToken)();
        if (!refreshToken) {
            return null;
        }
        const response = await axios_1.default.post(`${config_1.API_URL}/auth/refresh`, {
            refreshToken,
        });
        const { token } = response.data;
        await (0, exports.setAuthToken)(token);
        return token;
    }
    catch (error) {
        console.error('Token refresh failed:', error);
        await (0, exports.logout)();
        return null;
    }
};
exports.refreshAuthToken = refreshAuthToken;
// Check if biometric authentication is available
const isBiometricAvailable = async () => {
    try {
        const { available } = await rnBiometrics.isSensorAvailable();
        return available;
    }
    catch (error) {
        console.error('Failed to check biometric availability:', error);
        return false;
    }
};
exports.isBiometricAvailable = isBiometricAvailable;
// Enable biometric authentication
const enableBiometric = async () => {
    try {
        const { success } = await rnBiometrics.simplePrompt({
            promptMessage: 'Confirm your identity',
            cancelButtonText: 'Cancel',
        });
        if (success) {
            await async_storage_1.default.setItem(BIOMETRIC_KEY, 'true');
            return true;
        }
        return false;
    }
    catch (error) {
        console.error('Failed to enable biometric:', error);
        return false;
    }
};
exports.enableBiometric = enableBiometric;
// Check if biometric is enabled
const isBiometricEnabled = async () => {
    try {
        const enabled = await async_storage_1.default.getItem(BIOMETRIC_KEY);
        return enabled === 'true';
    }
    catch (error) {
        console.error('Failed to check biometric enabled:', error);
        return false;
    }
};
exports.isBiometricEnabled = isBiometricEnabled;
// Login with biometric
const loginWithBiometric = async () => {
    try {
        const { success } = await rnBiometrics.simplePrompt({
            promptMessage: 'Authenticate to login',
            cancelButtonText: 'Cancel',
        });
        if (!success) {
            return null;
        }
        // Get stored credentials
        const credentials = await Keychain.getGenericPassword({
            service: 'intelgraph.auth',
        });
        if (!credentials) {
            return null;
        }
        // Login with stored credentials
        const response = await (0, exports.login)({
            email: credentials.username,
            password: credentials.password,
        });
        return response.user;
    }
    catch (error) {
        console.error('Biometric login failed:', error);
        return null;
    }
};
exports.loginWithBiometric = loginWithBiometric;
// Set PIN
const setPIN = async (pin) => {
    try {
        await Keychain.setGenericPassword('pin', pin, {
            service: 'intelgraph.pin',
        });
    }
    catch (error) {
        console.error('Failed to set PIN:', error);
    }
};
exports.setPIN = setPIN;
// Verify PIN
const verifyPIN = async (pin) => {
    try {
        const credentials = await Keychain.getGenericPassword({
            service: 'intelgraph.pin',
        });
        if (!credentials) {
            return false;
        }
        return credentials.password === pin;
    }
    catch (error) {
        console.error('Failed to verify PIN:', error);
        return false;
    }
};
exports.verifyPIN = verifyPIN;
