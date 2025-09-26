import { describe, it, expect, beforeEach, jest } from '@jest/globals';

const listKeys = jest.fn();
const createKey = jest.fn();
const revokeKey = jest.fn();

jest.mock('../../../services/ApiKeyService.js', () => {
  return jest.fn().mockImplementation(() => ({
    listKeys,
    createKey,
    revokeKey,
  }));
});

const { apiKeyResolvers } = require('../apiKey');

describe('apiKeyResolvers', () => {
  beforeEach(() => {
    listKeys.mockReset();
    createKey.mockReset();
    revokeKey.mockReset();
  });

  it('requires admin role for listing keys', async () => {
    await expect(
      apiKeyResolvers.Query.apiKeys({}, {}, { user: { role: 'VIEWER' } }),
    ).rejects.toThrow('forbidden');
  });

  it('lists keys for admins scoped to tenant', async () => {
    listKeys.mockResolvedValueOnce([{ id: 'key-1' }]);
    const result = await apiKeyResolvers.Query.apiKeys(
      {},
      {},
      { user: { role: 'ADMIN', tenantId: 'tenant-123' } },
    );

    expect(listKeys).toHaveBeenCalledWith({ tenantId: 'tenant-123', includeRevoked: undefined });
    expect(result).toEqual([{ id: 'key-1' }]);
  });

  it('prevents non-admins from creating keys', async () => {
    await expect(
      apiKeyResolvers.Mutation.createApiKey(
        {},
        { input: { name: 'Test', scope: 'VIEWER', expiresAt: new Date().toISOString() } },
        { user: { role: 'VIEWER' } },
      ),
    ).rejects.toThrow('forbidden');
  });

  it('creates keys for admins and returns secret payload', async () => {
    createKey.mockResolvedValueOnce({ secret: 'sk_secret', apiKey: { id: 'key-1' } });
    const expiresAt = new Date().toISOString();

    const result = await apiKeyResolvers.Mutation.createApiKey(
      {},
      { input: { name: 'Prod', scope: 'VIEWER', expiresAt } },
      { user: { role: 'ADMIN', id: 'admin-1', tenantId: 'tenant-1' } },
    );

    expect(createKey).toHaveBeenCalledWith({
      name: 'Prod',
      scope: 'VIEWER',
      expiresAt: expect.any(Date),
      createdBy: 'admin-1',
      tenantId: 'tenant-1',
    });
    expect(result).toEqual({ key: 'sk_secret', apiKey: { id: 'key-1' } });
  });

  it('rejects invalid expiration date input', async () => {
    await expect(
      apiKeyResolvers.Mutation.createApiKey(
        {},
        { input: { name: 'Prod', scope: 'VIEWER', expiresAt: 'not-a-date' } },
        { user: { role: 'ADMIN', id: 'admin-1' } },
      ),
    ).rejects.toThrow('Invalid expiration date');
  });

  it('revokes keys with admin context', async () => {
    revokeKey.mockResolvedValueOnce({ id: 'key-1', revokedBy: 'admin-1' });

    const result = await apiKeyResolvers.Mutation.revokeApiKey(
      {},
      { id: 'key-1' },
      { user: { role: 'ADMIN', id: 'admin-1' } },
    );

    expect(revokeKey).toHaveBeenCalledWith('key-1', 'admin-1');
    expect(result).toEqual({ id: 'key-1', revokedBy: 'admin-1' });
  });
});
