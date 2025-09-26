import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import * as crypto from 'crypto';
import ApiKeyService from '../src/services/ApiKeyService.js';

jest.mock('../src/db/postgres.js', () => ({
  getPostgresPool: jest.fn(),
}));

describe('ApiKeyService', () => {
  let service: ApiKeyService;
  let mockPool: { query: jest.Mock };

  beforeEach(() => {
    const { getPostgresPool } = require('../src/db/postgres.js');
    mockPool = {
      query: jest.fn(),
    };
    getPostgresPool.mockReturnValue(mockPool);
    service = new ApiKeyService();
  });

  afterEach(() => {
    const { getPostgresPool } = require('../src/db/postgres.js');
    jest.clearAllMocks();
    jest.restoreAllMocks();
    getPostgresPool.mockReset();
  });

  it('creates API keys with hashed secrets', async () => {
    const randomSpy = jest
      .spyOn(crypto, 'randomBytes')
      .mockReturnValue(Buffer.from('fixture-secret'));

    const now = new Date('2025-09-01T00:00:00Z');

    mockPool.query.mockResolvedValueOnce({
      rows: [
        {
          id: 'key-123',
          name: 'Integration',
          scope: 'VIEWER',
          tenant_id: null,
          created_by: 'admin-user',
          created_at: now,
          expires_at: now,
          revoked_at: null,
          revoked_by: null,
          last_used_at: null,
        },
      ],
    });

    const result = await service.createKey({
      name: 'Integration',
      scope: 'VIEWER',
      expiresAt: now,
      createdBy: 'admin-user',
      tenantId: null,
    });

    const expectedSecret = `sk_${Buffer.from('fixture-secret').toString('hex')}`;
    const expectedHash = crypto.createHash('sha256').update(expectedSecret).digest('hex');
    const insertArgs = mockPool.query.mock.calls[0][1];

    expect(randomSpy).toHaveBeenCalled();
    expect(insertArgs[2]).toEqual(expectedHash);
    expect(result.secret).toEqual(expectedSecret);
    expect(result.apiKey).toMatchObject({
      id: 'key-123',
      name: 'Integration',
      scope: 'VIEWER',
    });
  });

  it('validates active API keys and updates last used timestamp', async () => {
    const expires = new Date(Date.now() + 3600_000);
    mockPool.query
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'key-abc',
            name: 'Partner',
            scope: 'VIEWER',
            tenant_id: 'tenant-1',
            created_by: 'admin',
            created_at: new Date(),
            expires_at: expires,
            revoked_at: null,
            revoked_by: null,
            last_used_at: null,
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [] });

    const result = await service.validateKey('sk_sample');

    expect(result).not.toBeNull();
    expect(result?.id).toEqual('key-abc');
    expect(mockPool.query).toHaveBeenCalledWith('UPDATE api_keys SET last_used_at = NOW() WHERE id = $1', ['key-abc']);
  });

  it('rejects expired keys without updating usage metadata', async () => {
    const expires = new Date(Date.now() - 60_000);
    mockPool.query.mockResolvedValueOnce({
      rows: [
        {
          id: 'expired-key',
          name: 'Legacy',
          scope: 'VIEWER',
          tenant_id: null,
          created_by: 'admin',
          created_at: new Date(),
          expires_at: expires,
          revoked_at: null,
          revoked_by: null,
          last_used_at: null,
        },
      ],
    });

    const result = await service.validateKey('sk_expired');

    expect(result).toBeNull();
    expect(mockPool.query).toHaveBeenCalledTimes(1);
  });

  it('revokes keys and returns updated record', async () => {
    const now = new Date();
    mockPool.query.mockResolvedValueOnce({
      rows: [
        {
          id: 'key-to-revoke',
          name: 'Integration',
          scope: 'VIEWER',
          tenant_id: null,
          created_by: 'admin',
          created_at: now,
          expires_at: new Date(now.getTime() + 3600_000),
          revoked_at: now,
          revoked_by: 'admin',
          last_used_at: null,
        },
      ],
    });

    const result = await service.revokeKey('key-to-revoke', 'admin');

    expect(mockPool.query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE api_keys'),
      ['key-to-revoke', 'admin'],
    );
    expect(result.revokedBy).toEqual('admin');
    expect(result.revokedAt).toBeInstanceOf(Date);
  });
});
