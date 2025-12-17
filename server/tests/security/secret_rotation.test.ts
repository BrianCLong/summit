// @ts-nocheck
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import jwt from 'jsonwebtoken';

describe('AuthService - Secret Rotation', () => {
  let authService;
  let config;
  const SECRET_V1 = 'secret-v1-must-be-long-enough-for-security';
  const SECRET_V2 = 'secret-v2-must-be-long-enough-for-security';

  beforeEach(() => {
    jest.resetModules();

    // Mock dependencies
    jest.mock('../../src/config/database', () => ({
      getPostgresPool: jest.fn(() => ({
        connect: jest.fn(),
        query: jest.fn(),
      })),
    }));

    jest.mock('../../src/utils/logger', () => ({
        default: {
            warn: jest.fn(),
            info: jest.fn(),
            error: jest.fn(),
        },
        warn: jest.fn(),
        info: jest.fn(),
        error: jest.fn(),
    }));

    // Import fresh modules
    const { AuthService } = require('../../src/services/AuthService');
    const configModule = require('../../src/config/index');
    config = configModule.default || configModule; // Handle both ESM and CJS

    // Setup DB Mocks
    const { getPostgresPool } = require('../../src/config/database');
    const mockQuery = jest.fn();
    const mockRelease = jest.fn();
    const mockConnect = jest.fn();

    const mockPool = {
        connect: mockConnect,
        query: mockQuery
    };
    getPostgresPool.mockReturnValue(mockPool);

    authService = new AuthService();

    // Mock blacklist check
    mockQuery.mockResolvedValue({ rows: [] });

    // Mock user fetch
    const mockClient = {
        query: jest.fn(),
        release: mockRelease
    };

    mockClient.query.mockResolvedValue({
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
    });

    mockConnect.mockResolvedValue(mockClient);
  });

  it('should verify token signed with current secret', async () => {
    config.jwt.secret = SECRET_V1;
    config.jwt.secretOld = undefined;

    const token = jwt.sign({ userId: 'user-123', role: 'ANALYST' }, SECRET_V1);

    const user = await authService.verifyToken(token);
    expect(user).toBeTruthy();
    expect(user.id).toBe('user-123');
  });

  it('should verify token signed with old secret when rotation is active', async () => {
    config.jwt.secret = SECRET_V2;
    config.jwt.secretOld = SECRET_V1;

    const tokenV1 = jwt.sign({ userId: 'user-123', role: 'ANALYST' }, SECRET_V1);

    const user = await authService.verifyToken(tokenV1);
    expect(user).toBeTruthy();
    expect(user.id).toBe('user-123');
  });

  it('should fail if token is signed with an unknown secret', async () => {
    config.jwt.secret = SECRET_V2;
    config.jwt.secretOld = SECRET_V1;

    const tokenUnknown = jwt.sign({ userId: 'user-123', role: 'ANALYST' }, 'unknown-secret');

    const user = await authService.verifyToken(tokenUnknown);
    expect(user).toBeNull();
  });

  it('should fail if old secret is not configured and token matches old secret', async () => {
    config.jwt.secret = SECRET_V2;
    config.jwt.secretOld = undefined; // No fallback

    const tokenV1 = jwt.sign({ userId: 'user-123', role: 'ANALYST' }, SECRET_V1);

    const user = await authService.verifyToken(tokenV1);
    expect(user).toBeNull();
  });
});
