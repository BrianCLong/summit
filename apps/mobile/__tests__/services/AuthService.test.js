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
const Keychain = __importStar(require("react-native-keychain"));
const AuthService_1 = require("../../src/services/AuthService");
jest.mock('react-native-keychain');
jest.mock('react-native-mmkv');
describe('AuthService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });
    describe('saveAuthTokens', () => {
        it('saves tokens to keychain', async () => {
            const tokens = {
                accessToken: 'test-access-token',
                refreshToken: 'test-refresh-token',
                expiresAt: Date.now() + 3600000,
            };
            await (0, AuthService_1.saveAuthTokens)(tokens);
            expect(Keychain.setGenericPassword).toHaveBeenCalledWith('auth_tokens', JSON.stringify(tokens), { service: 'intelgraph_auth' });
        });
    });
    describe('getAuthTokens', () => {
        it('returns null when no tokens exist', async () => {
            Keychain.getGenericPassword.mockResolvedValue(false);
            const result = await (0, AuthService_1.getAuthTokens)();
            expect(result).toBeNull();
        });
        it('returns tokens when they exist', async () => {
            const tokens = {
                accessToken: 'test-access-token',
                refreshToken: 'test-refresh-token',
                expiresAt: Date.now() + 3600000,
            };
            Keychain.getGenericPassword.mockResolvedValue({
                password: JSON.stringify(tokens),
            });
            const result = await (0, AuthService_1.getAuthTokens)();
            expect(result).toEqual(tokens);
        });
    });
    describe('getAuthToken', () => {
        it('returns null when no tokens exist', async () => {
            Keychain.getGenericPassword.mockResolvedValue(false);
            const result = await (0, AuthService_1.getAuthToken)();
            expect(result).toBeNull();
        });
        it('returns access token when valid', async () => {
            const tokens = {
                accessToken: 'test-access-token',
                refreshToken: 'test-refresh-token',
                expiresAt: Date.now() + 3600000, // 1 hour from now
            };
            Keychain.getGenericPassword.mockResolvedValue({
                password: JSON.stringify(tokens),
            });
            const result = await (0, AuthService_1.getAuthToken)();
            expect(result).toBe('test-access-token');
        });
    });
    describe('clearAuthToken', () => {
        it('clears tokens from keychain', async () => {
            await (0, AuthService_1.clearAuthToken)();
            expect(Keychain.resetGenericPassword).toHaveBeenCalledWith({
                service: 'intelgraph_auth',
            });
        });
    });
    describe('isAuthenticated', () => {
        it('returns false when no token exists', async () => {
            Keychain.getGenericPassword.mockResolvedValue(false);
            const result = await (0, AuthService_1.isAuthenticated)();
            expect(result).toBe(false);
        });
        it('returns true when valid token exists', async () => {
            const tokens = {
                accessToken: 'test-access-token',
                refreshToken: 'test-refresh-token',
                expiresAt: Date.now() + 3600000,
            };
            Keychain.getGenericPassword.mockResolvedValue({
                password: JSON.stringify(tokens),
            });
            const result = await (0, AuthService_1.isAuthenticated)();
            expect(result).toBe(true);
        });
    });
    describe('isBiometricsAvailable', () => {
        it('returns true when biometrics are available', async () => {
            const result = await (0, AuthService_1.isBiometricsAvailable)();
            expect(result).toBe(true);
        });
    });
});
