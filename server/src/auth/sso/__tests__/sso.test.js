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
const globals_1 = require("@jest/globals");
// Mock dependencies of AuthService to prevent them from crashing
globals_1.jest.mock('argon2', () => ({
    default: {
        hash: globals_1.jest.fn(),
        verify: globals_1.jest.fn(),
    },
    hash: globals_1.jest.fn(),
    verify: globals_1.jest.fn(),
}));
globals_1.jest.mock('pg', () => ({
    Pool: globals_1.jest.fn(),
}));
// Hoist mock for AuthService - Using regex string for module matching in case of relative path issues
// But unstable_mockModule requires exact specifier or one that matches what is imported.
globals_1.jest.mock('../../../services/AuthService.js', () => {
    class MockAuthService {
        externalLogin() {
            return Promise.resolve({
                user: { id: 'u1', defaultTenantId: 't1' },
                token: 'tok',
                refreshToken: 'refresh',
                expiresIn: 3600,
            });
        }
    }
    return {
        AuthService: MockAuthService,
        default: MockAuthService,
    };
});
describe('SSOService', () => {
    let ssoService;
    let SSOServiceClass;
    beforeAll(async () => {
        const module = await Promise.resolve().then(() => __importStar(require('../SSOService.js')));
        SSOServiceClass = module.SSOService;
    });
    beforeEach(() => {
        globals_1.jest.clearAllMocks();
        ssoService = new SSOServiceClass();
    });
    it('should list providers', async () => {
        const providers = await ssoService.getAllProviders();
        expect(providers).toHaveLength(1);
        expect(providers[0].provider).toBe('local-stub');
    });
    it('should handle login flow', async () => {
        const { url } = await ssoService.handleLogin('local-stub', 'http://cb');
        expect(url).toContain('stub_code_123');
    });
    it('should handle callback success', async () => {
        const result = await ssoService.handleCallback('local-stub', { code: 'stub_code_123' }, 'http://cb');
        expect(result.token).toBe('tok');
    });
    it('should enforce MFA if unverified', async () => {
        // Mock provider callback to return mfaVerified: false
        const provider = ssoService.getProvider('local-stub');
        globals_1.jest.spyOn(provider, 'callback').mockResolvedValue({
            email: 'test@example.com',
            mfaVerified: false
        });
        await expect(ssoService.handleCallback('local-stub', { code: 'stub_code_123' }, 'http://cb'))
            .rejects.toThrow('MFA required');
    });
});
