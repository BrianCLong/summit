"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
(0, globals_1.describe)('AuthService - Secret Rotation', () => {
    let authService;
    let config;
    const SECRET_V1 = 'secret-v1-must-be-long-enough-for-security';
    const SECRET_V2 = 'secret-v2-must-be-long-enough-for-security';
    (0, globals_1.beforeEach)(() => {
        globals_1.jest.resetModules();
        // Mock dependencies
        globals_1.jest.mock('../../src/config/database', () => ({
            getPostgresPool: globals_1.jest.fn(() => ({
                connect: globals_1.jest.fn(),
                query: globals_1.jest.fn(),
            })),
        }));
        globals_1.jest.mock('../../src/utils/logger', () => ({
            default: {
                warn: globals_1.jest.fn(),
                info: globals_1.jest.fn(),
                error: globals_1.jest.fn(),
            },
            warn: globals_1.jest.fn(),
            info: globals_1.jest.fn(),
            error: globals_1.jest.fn(),
        }));
        globals_1.jest.mock('../../src/services/SecretsService', () => ({
            secretsService: {
                getSecret: globals_1.jest.fn(),
            },
        }));
        // Import fresh modules
        const { AuthService } = require('../../src/services/AuthService');
        const configModule = require('../../src/config/index');
        config = configModule.default || configModule; // Handle both ESM and CJS
        const { secretsService } = require('../../src/services/SecretsService');
        secretsService.getSecret.mockImplementation(() => Promise.resolve(config.jwt.secret));
        // Setup DB Mocks
        const { getPostgresPool } = require('../../src/config/database');
        const mockQuery = globals_1.jest.fn();
        const mockRelease = globals_1.jest.fn();
        const mockConnect = globals_1.jest.fn();
        const mockPool = {
            connect: mockConnect,
            query: mockQuery
        };
        getPostgresPool.mockReturnValue(mockPool);
        authService = new AuthService();
        // Mock blacklist check
        mockQuery.mockImplementation(() => Promise.resolve({ rows: [] }));
        // Mock user fetch
        const mockClient = {
            query: globals_1.jest.fn(),
            release: mockRelease
        };
        mockClient.query.mockImplementation(() => Promise.resolve({
            rows: [{
                    id: 'user-123',
                    role: 'ANALYST',
                    is_active: true,
                    password_hash: 'hash',
                    email: 'test@example.com',
                    first_name: 'Test',
                    last_name: 'User',
                    created_at: new Date(),
                    updated_at: new Date()
                }]
        }));
        mockConnect.mockImplementation(() => Promise.resolve(mockClient));
    });
    (0, globals_1.it)('should verify token signed with current secret', async () => {
        config.jwt.secret = SECRET_V1;
        config.jwt.secretOld = undefined;
        process.env.JWT_SECRET = SECRET_V1;
        const token = jsonwebtoken_1.default.sign({ userId: 'user-123', role: 'ANALYST' }, SECRET_V1);
        const user = await authService.verifyToken(token);
        (0, globals_1.expect)(user).toBeTruthy();
        (0, globals_1.expect)(user.id).toBe('user-123');
    });
    (0, globals_1.it)('should reject token signed with old secret even when rotation is configured', async () => {
        config.jwt.secret = SECRET_V2;
        config.jwt.secretOld = SECRET_V1;
        process.env.JWT_SECRET = SECRET_V2;
        const tokenV1 = jsonwebtoken_1.default.sign({ userId: 'user-123', role: 'ANALYST' }, SECRET_V1);
        const user = await authService.verifyToken(tokenV1);
        (0, globals_1.expect)(user).toBeNull();
    });
    (0, globals_1.it)('should fail if token is signed with an unknown secret', async () => {
        config.jwt.secret = SECRET_V2;
        config.jwt.secretOld = SECRET_V1;
        process.env.JWT_SECRET = SECRET_V2;
        const tokenUnknown = jsonwebtoken_1.default.sign({ userId: 'user-123', role: 'ANALYST' }, 'unknown-secret');
        const user = await authService.verifyToken(tokenUnknown);
        (0, globals_1.expect)(user).toBeNull();
    });
    (0, globals_1.it)('should fail if old secret is not configured and token matches old secret', async () => {
        config.jwt.secret = SECRET_V2;
        config.jwt.secretOld = undefined; // No fallback
        process.env.JWT_SECRET = SECRET_V2;
        const tokenV1 = jsonwebtoken_1.default.sign({ userId: 'user-123', role: 'ANALYST' }, SECRET_V1);
        const user = await authService.verifyToken(tokenV1);
        (0, globals_1.expect)(user).toBeNull();
    });
});
