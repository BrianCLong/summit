"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const SSOService_js_1 = require("../SSOService.js");
const axios_1 = __importDefault(require("axios"));
// Mock dependencies
const mockPool = {
    connect: globals_1.jest.fn(),
    query: globals_1.jest.fn(),
    release: globals_1.jest.fn()
};
const mockClient = {
    query: globals_1.jest.fn(),
    release: globals_1.jest.fn()
};
globals_1.jest.mock('../../config/database.js', () => ({
    getPostgresPool: () => mockPool
}));
globals_1.jest.mock('../../services/AuthService.js', () => ({
    AuthService: globals_1.jest.fn().mockImplementation(() => ({
        generateTokens: globals_1.jest.fn().mockResolvedValue({ token: 'mock-jwt', refreshToken: 'mock-refresh' })
    }))
}));
globals_1.jest.mock('axios');
(0, globals_1.describe)('SSOService', () => {
    let ssoService;
    (0, globals_1.beforeEach)(() => {
        globals_1.jest.clearAllMocks();
        mockPool.connect.mockResolvedValue(mockClient);
        mockPool.query.mockResolvedValue({ rows: [] });
        mockClient.query.mockResolvedValue({ rows: [] });
        ssoService = new SSOService_js_1.SSOService();
    });
    (0, globals_1.describe)('configureSSO', () => {
        (0, globals_1.it)('should validate and save valid OIDC config', async () => {
            const config = {
                tenantId: 'tenant-1',
                providerType: 'oidc',
                issuerUrl: 'https://accounts.google.com',
                clientId: 'client-id',
                clientSecret: 'client-secret',
                authorizationUrl: 'https://auth',
                tokenUrl: 'https://token',
                isActive: true
            };
            // Mock validation success
            axios_1.default.get.mockResolvedValue({ status: 200, data: { authorization_endpoint: 'https://auth' } });
            await ssoService.configureSSO(config);
            (0, globals_1.expect)(mockClient.query).toHaveBeenCalledWith(globals_1.expect.stringContaining('INSERT INTO tenant_sso_config'), globals_1.expect.any(Array));
        });
        (0, globals_1.it)('should throw on invalid config', async () => {
            const config = {
                tenantId: 'tenant-1',
                providerType: 'oidc',
                issuerUrl: 'https://bad-url',
                clientId: 'client-id',
                isActive: true
            };
            // Mock validation failure
            axios_1.default.get.mockRejectedValue(new Error('Network error'));
            await (0, globals_1.expect)(ssoService.configureSSO(config)).rejects.toThrow('Invalid SSO configuration');
        });
    });
    (0, globals_1.describe)('generateAuthUrl', () => {
        (0, globals_1.it)('should return auth url if configured', async () => {
            mockPool.query.mockResolvedValueOnce({
                rows: [{
                        tenant_id: 'tenant-1',
                        provider_type: 'oidc',
                        issuer_url: 'https://issuer',
                        client_id: 'client',
                        authorization_url: 'https://auth',
                        token_url: 'https://token',
                        is_active: true
                    }]
            });
            const url = await ssoService.generateAuthUrl('tenant-1', 'http://cb');
            (0, globals_1.expect)(url).toContain('https://auth');
            (0, globals_1.expect)(url).toContain('client_id=client');
            (0, globals_1.expect)(mockPool.query).toHaveBeenCalledWith(globals_1.expect.stringContaining('INSERT INTO sso_states'), globals_1.expect.any(Array));
        });
    });
});
