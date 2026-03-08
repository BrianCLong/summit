"use strict";
/**
 * Tests for IntelGraph Authentication Middleware
 *
 * MIT License
 * Copyright (c) 2025 IntelGraph
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const auth_js_1 = require("../auth.js");
const redis_js_1 = require("../../db/redis.js");
const postgres_js_1 = require("../../db/postgres.js");
// Mock dependencies
jest.mock('jsonwebtoken');
jest.mock('jwks-rsa');
jest.mock('../../db/redis.js');
jest.mock('../../db/postgres.js');
jest.mock('../../utils/logger.js');
jest.mock('../auditLog.js', () => ({
    auditLog: jest.fn(),
}));
describe('authMiddleware', () => {
    let mockReq;
    let mockRes;
    let mockNext;
    let statusMock;
    let jsonMock;
    beforeEach(() => {
        statusMock = jest.fn().mockReturnThis();
        jsonMock = jest.fn();
        mockReq = {
            headers: {},
            ip: '127.0.0.1',
            get: jest.fn().mockReturnValue('Mozilla/5.0'),
        };
        mockRes = {
            status: statusMock,
            json: jsonMock,
        };
        mockNext = jest.fn();
        // Reset all mocks
        jest.clearAllMocks();
    });
    describe('Missing Authorization Header', () => {
        it('should return 401 when authorization header is missing', async () => {
            await (0, auth_js_1.authMiddleware)(mockReq, mockRes, mockNext);
            expect(statusMock).toHaveBeenCalledWith(401);
            expect(jsonMock).toHaveBeenCalledWith({
                error: 'Authentication required',
                code: 'AUTH_TOKEN_MISSING',
            });
            expect(mockNext).not.toHaveBeenCalled();
        });
        it('should return 401 when authorization header does not start with Bearer', async () => {
            mockReq.headers = { authorization: 'Basic credentials' };
            await (0, auth_js_1.authMiddleware)(mockReq, mockRes, mockNext);
            expect(statusMock).toHaveBeenCalledWith(401);
            expect(jsonMock).toHaveBeenCalledWith({
                error: 'Authentication required',
                code: 'AUTH_TOKEN_MISSING',
            });
        });
    });
    describe('Token Blacklist Checks', () => {
        it('should return 401 when token is blacklisted', async () => {
            mockReq.headers = { authorization: 'Bearer test-token' };
            redis_js_1.redisClient.exists.mockResolvedValue(1);
            await (0, auth_js_1.authMiddleware)(mockReq, mockRes, mockNext);
            expect(redis_js_1.redisClient.exists).toHaveBeenCalledWith('blacklist:test-token');
            expect(statusMock).toHaveBeenCalledWith(401);
            expect(jsonMock).toHaveBeenCalledWith({
                error: 'Token has been revoked',
                code: 'AUTH_TOKEN_REVOKED',
            });
        });
    });
    describe('Token Validation', () => {
        it('should return 401 when token has invalid format', async () => {
            mockReq.headers = { authorization: 'Bearer test-token' };
            redis_js_1.redisClient.exists.mockResolvedValue(0);
            jsonwebtoken_1.default.decode.mockReturnValue(null);
            await (0, auth_js_1.authMiddleware)(mockReq, mockRes, mockNext);
            expect(statusMock).toHaveBeenCalledWith(401);
            expect(jsonMock).toHaveBeenCalledWith({
                error: 'Invalid token format',
                code: 'AUTH_TOKEN_INVALID',
            });
        });
        it('should return 401 when token is missing kid in header', async () => {
            mockReq.headers = { authorization: 'Bearer test-token' };
            redis_js_1.redisClient.exists.mockResolvedValue(0);
            jsonwebtoken_1.default.decode.mockReturnValue({
                header: {},
                payload: {},
            });
            await (0, auth_js_1.authMiddleware)(mockReq, mockRes, mockNext);
            expect(statusMock).toHaveBeenCalledWith(401);
            expect(jsonMock).toHaveBeenCalledWith({
                error: 'Invalid token format',
                code: 'AUTH_TOKEN_INVALID',
            });
        });
        it('should return 401 when token has expired', async () => {
            mockReq.headers = { authorization: 'Bearer test-token' };
            redis_js_1.redisClient.exists.mockResolvedValue(0);
            jsonwebtoken_1.default.decode.mockReturnValue({
                header: { kid: 'test-kid' },
                payload: {},
            });
            const mockError = new jsonwebtoken_1.default.TokenExpiredError('jwt expired', new Date());
            jsonwebtoken_1.default.verify.mockImplementation(() => {
                throw mockError;
            });
            await (0, auth_js_1.authMiddleware)(mockReq, mockRes, mockNext);
            expect(statusMock).toHaveBeenCalledWith(401);
            expect(jsonMock).toHaveBeenCalledWith({
                error: 'Token has expired',
                code: 'AUTH_TOKEN_EXPIRED',
            });
        });
        it('should return 401 when token signature is invalid', async () => {
            mockReq.headers = { authorization: 'Bearer test-token' };
            redis_js_1.redisClient.exists.mockResolvedValue(0);
            jsonwebtoken_1.default.decode.mockReturnValue({
                header: { kid: 'test-kid' },
                payload: {},
            });
            const mockError = new jsonwebtoken_1.default.JsonWebTokenError('invalid signature');
            jsonwebtoken_1.default.verify.mockImplementation(() => {
                throw mockError;
            });
            await (0, auth_js_1.authMiddleware)(mockReq, mockRes, mockNext);
            expect(statusMock).toHaveBeenCalledWith(401);
            expect(jsonMock).toHaveBeenCalledWith({
                error: 'Invalid token',
                code: 'AUTH_TOKEN_INVALID',
            });
        });
    });
    describe('User Validation', () => {
        it('should return 401 when user not found in database', async () => {
            mockReq.headers = { authorization: 'Bearer test-token' };
            redis_js_1.redisClient.exists.mockResolvedValue(0);
            jsonwebtoken_1.default.decode.mockReturnValue({
                header: { kid: 'test-kid' },
                payload: {},
            });
            jsonwebtoken_1.default.verify.mockReturnValue({
                sub: 'user-123',
                email: 'test@example.com',
                name: 'Test User',
                iss: 'https://auth.intelgraph.com',
                aud: 'intelgraph-api',
                exp: Math.floor(Date.now() / 1000) + 3600,
                iat: Math.floor(Date.now() / 1000),
            });
            postgres_js_1.postgresPool.findOne.mockResolvedValue(null);
            await (0, auth_js_1.authMiddleware)(mockReq, mockRes, mockNext);
            expect(statusMock).toHaveBeenCalledWith(401);
            expect(jsonMock).toHaveBeenCalledWith({
                error: 'User not found or inactive',
                code: 'AUTH_USER_NOT_FOUND',
            });
        });
    });
    describe('Successful Authentication', () => {
        it('should authenticate successfully with valid token and user', async () => {
            mockReq.headers = { authorization: 'Bearer test-token' };
            redis_js_1.redisClient.exists.mockResolvedValue(0);
            jsonwebtoken_1.default.decode.mockReturnValue({
                header: { kid: 'test-kid' },
                payload: {},
            });
            jsonwebtoken_1.default.verify.mockReturnValue({
                sub: 'user-123',
                email: 'test@example.com',
                name: 'Test User',
                role: 'analyst',
                tenant_id: 'tenant-1',
                iss: 'https://auth.intelgraph.com',
                aud: 'intelgraph-api',
                exp: Math.floor(Date.now() / 1000) + 3600,
                iat: Math.floor(Date.now() / 1000),
            });
            const mockUser = {
                id: 'user-123',
                email: 'test@example.com',
                name: 'Test User',
                tenant_id: 'tenant-1',
                role: 'analyst',
                is_active: true,
            };
            postgres_js_1.postgresPool.findOne.mockResolvedValue(mockUser);
            redis_js_1.redisClient.get.mockResolvedValue(null);
            redis_js_1.redisClient.set.mockResolvedValue('OK');
            postgres_js_1.postgresPool.update.mockResolvedValue(undefined);
            await (0, auth_js_1.authMiddleware)(mockReq, mockRes, mockNext);
            expect(mockReq.user).toBeDefined();
            expect(mockReq.user.id).toBe('user-123');
            expect(mockReq.user.email).toBe('test@example.com');
            expect(mockReq.user.role).toBe('analyst');
            expect(mockReq.token).toBe('test-token');
            expect(mockNext).toHaveBeenCalled();
            expect(postgres_js_1.postgresPool.update).toHaveBeenCalled();
        });
    });
});
describe('requirePermission', () => {
    let mockReq;
    let mockRes;
    let mockNext;
    let statusMock;
    let jsonMock;
    beforeEach(() => {
        statusMock = jest.fn().mockReturnThis();
        jsonMock = jest.fn();
        mockReq = {};
        mockRes = {
            status: statusMock,
            json: jsonMock,
        };
        mockNext = jest.fn();
        jest.clearAllMocks();
    });
    it('should return 401 when user is not authenticated', () => {
        const middleware = (0, auth_js_1.requirePermission)('entity:read');
        middleware(mockReq, mockRes, mockNext);
        expect(statusMock).toHaveBeenCalledWith(401);
        expect(jsonMock).toHaveBeenCalledWith({
            error: 'Authentication required',
            code: 'AUTH_REQUIRED',
        });
        expect(mockNext).not.toHaveBeenCalled();
    });
    it('should allow access for admin with wildcard permission', () => {
        mockReq.user = {
            id: 'user-1',
            email: 'admin@example.com',
            permissions: ['*:*'],
        };
        const middleware = (0, auth_js_1.requirePermission)('entity:delete');
        middleware(mockReq, mockRes, mockNext);
        expect(mockNext).toHaveBeenCalled();
        expect(statusMock).not.toHaveBeenCalled();
    });
    it('should allow access when user has specific permission', () => {
        mockReq.user = {
            id: 'user-1',
            email: 'analyst@example.com',
            permissions: ['entity:read', 'entity:create'],
        };
        const middleware = (0, auth_js_1.requirePermission)('entity:read');
        middleware(mockReq, mockRes, mockNext);
        expect(mockNext).toHaveBeenCalled();
    });
    it('should allow access when user has wildcard resource permission', () => {
        mockReq.user = {
            id: 'user-1',
            email: 'analyst@example.com',
            permissions: ['entity:*'],
        };
        const middleware = (0, auth_js_1.requirePermission)('entity:delete');
        middleware(mockReq, mockRes, mockNext);
        expect(mockNext).toHaveBeenCalled();
    });
    it('should deny access when user lacks required permission', () => {
        mockReq.user = {
            id: 'user-1',
            email: 'viewer@example.com',
            permissions: ['entity:read'],
        };
        const middleware = (0, auth_js_1.requirePermission)('entity:delete');
        middleware(mockReq, mockRes, mockNext);
        expect(statusMock).toHaveBeenCalledWith(403);
        expect(jsonMock).toHaveBeenCalledWith({
            error: 'Insufficient permissions',
            code: 'AUTH_INSUFFICIENT_PERMISSIONS',
            required: 'entity:delete',
        });
        expect(mockNext).not.toHaveBeenCalled();
    });
});
describe('revokeToken', () => {
    let mockReq;
    let mockRes;
    let statusMock;
    let jsonMock;
    beforeEach(() => {
        statusMock = jest.fn().mockReturnThis();
        jsonMock = jest.fn();
        mockReq = {};
        mockRes = {
            status: statusMock,
            json: jsonMock,
        };
        jest.clearAllMocks();
    });
    it('should return 400 when no token is present', async () => {
        await (0, auth_js_1.revokeToken)(mockReq, mockRes);
        expect(statusMock).toHaveBeenCalledWith(400);
        expect(jsonMock).toHaveBeenCalledWith({
            error: 'No token to revoke',
            code: 'AUTH_NO_TOKEN',
        });
    });
    it('should revoke token successfully', async () => {
        const mockToken = 'test-token';
        const futureExp = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
        mockReq.token = mockToken;
        mockReq.user = { id: 'user-123' };
        jsonwebtoken_1.default.decode.mockReturnValue({
            exp: futureExp,
        });
        redis_js_1.redisClient.set.mockResolvedValue('OK');
        await (0, auth_js_1.revokeToken)(mockReq, mockRes);
        expect(redis_js_1.redisClient.set).toHaveBeenCalledWith(`blacklist:${mockToken}`, 'revoked', expect.any(Number));
        expect(jsonMock).toHaveBeenCalledWith({
            message: 'Token revoked successfully',
        });
    });
    it('should handle revocation errors gracefully', async () => {
        mockReq.token = 'test-token';
        mockReq.user = { id: 'user-123' };
        jsonwebtoken_1.default.decode.mockImplementation(() => {
            throw new Error('Decode failed');
        });
        await (0, auth_js_1.revokeToken)(mockReq, mockRes);
        expect(statusMock).toHaveBeenCalledWith(500);
        expect(jsonMock).toHaveBeenCalledWith({
            error: 'Failed to revoke token',
            code: 'AUTH_REVOKE_FAILED',
        });
    });
});
