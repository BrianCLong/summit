import { authGuard } from '../../utils/auth.js';
import { GraphQLError } from 'graphql';
import { describe, it, expect, jest } from '@jest/globals';

describe('authGuard', () => {
  it('should throw if context.user is missing', async () => {
    const resolver = jest.fn();
    const guarded = authGuard(resolver);
    await expect(guarded({}, {}, {} as any, {})).rejects.toThrow('Not authenticated');
  });

  it('should throw if tenantId is missing', async () => {
    const resolver = jest.fn();
    const guarded = authGuard(resolver);
    const context = { user: { id: '1' } };
    await expect(guarded({}, {}, context as any, {})).rejects.toThrow('Tenant context missing');
  });

  it('should call resolver if authorized', async () => {
    const resolver = jest.fn().mockReturnValue('success');
    const guarded = authGuard(resolver);
    const context = { user: { id: '1', tenantId: 't1' } };
    const result = await guarded({}, {}, context as any, {});
    expect(result).toBe('success');
    expect(resolver).toHaveBeenCalled();
  });

  it('should check permissions if required', async () => {
    const resolver = jest.fn().mockReturnValue('success');
    const guarded = authGuard(resolver, 'read:entities');
    const context = {
        user: {
            id: '1',
            tenantId: 't1',
            permissions: ['read:entities']
        }
    };
    await expect(guarded({}, {}, context as any, {})).resolves.toBe('success');
  });

  it('should deny if permission missing', async () => {
    const resolver = jest.fn();
    const guarded = authGuard(resolver, 'write:entities');
    const context = {
        user: {
            id: '1',
            tenantId: 't1',
            permissions: ['read:entities']
        }
    };
    await expect(guarded({}, {}, context as any, {})).rejects.toThrow('Missing permission');
  });
});
