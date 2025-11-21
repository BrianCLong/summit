/**
 * Policy Enforcer Tests
 */

import { PolicyEnforcer } from '../src/policy/enforcer.js';
import { ExtensionPermission } from '../src/types.js';

// Mock fetch for testing
const originalFetch = global.fetch;

describe('PolicyEnforcer', () => {
  let enforcer: PolicyEnforcer;

  beforeEach(() => {
    enforcer = new PolicyEnforcer('http://localhost:8181');
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('checkPermissions', () => {
    it('should allow extensions in dev mode when OPA is not available', async () => {
      // In dev mode without OPA, permissions should be allowed
      const result = await enforcer.checkPermissions('test-extension', [
        ExtensionPermission.READ_ENTITIES,
      ]);
      expect(result).toBe(true);
    });

    it('should check permissions via OPA when available', async () => {
      // Set OPA_URL to simulate production mode
      process.env.OPA_URL = 'http://localhost:8181';

      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ result: { allowed: true } }),
      });
      global.fetch = mockFetch as unknown as typeof fetch;

      const result = await enforcer.checkPermissions('test-extension', [
        ExtensionPermission.READ_ENTITIES,
      ]);

      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8181/v1/data/summit/extensions/allow',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      );

      delete process.env.OPA_URL;
    });

    it('should deny permissions when OPA returns allowed: false', async () => {
      process.env.OPA_URL = 'http://localhost:8181';

      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ result: { allowed: false, reason: 'Denied by policy' } }),
      });
      global.fetch = mockFetch as unknown as typeof fetch;

      const result = await enforcer.checkPermissions('test-extension', [
        ExtensionPermission.EXECUTE_COMMANDS,
      ]);

      expect(result).toBe(false);

      delete process.env.OPA_URL;
    });

    it('should fail closed on OPA errors', async () => {
      process.env.OPA_URL = 'http://localhost:8181';

      const mockFetch = jest.fn().mockRejectedValue(new Error('Network error'));
      global.fetch = mockFetch as unknown as typeof fetch;

      const result = await enforcer.checkPermissions('test-extension', [
        ExtensionPermission.READ_ENTITIES,
      ]);

      expect(result).toBe(false);

      delete process.env.OPA_URL;
    });
  });

  describe('checkAction', () => {
    it('should allow actions in dev mode', async () => {
      const result = await enforcer.checkAction('test-extension', 'read', 'entities');
      expect(result).toBe(true);
    });
  });

  describe('loadPolicy', () => {
    it('should load policy via OPA API', async () => {
      const mockFetch = jest.fn().mockResolvedValue({ ok: true });
      global.fetch = mockFetch as unknown as typeof fetch;

      await enforcer.loadPolicy('package test\ndefault allow = false');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8181/v1/policies/summit-extensions',
        expect.objectContaining({
          method: 'PUT',
          headers: { 'Content-Type': 'text/plain' },
          body: 'package test\ndefault allow = false',
        })
      );
    });

    it('should throw on policy load failure', async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: false,
        statusText: 'Bad Request',
      });
      global.fetch = mockFetch as unknown as typeof fetch;

      await expect(enforcer.loadPolicy('invalid policy')).rejects.toThrow(
        'Failed to load policy: Bad Request'
      );
    });
  });
});
