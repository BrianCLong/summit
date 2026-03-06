import { describe, it, expect } from 'vitest';
import { APISurfaceValidator } from '../../../src/evaluator/validators/APISurfaceValidator';
import type { APISurfaceInput } from '../../../src/types';

describe('APISurfaceValidator', () => {
  const validator = new APISurfaceValidator();

  it('should detect new endpoints', async () => {
    const input: APISurfaceInput = {
      type: 'api_surface',
      apiType: 'rest',
      previous: {
        info: { version: '1.0.0' },
        paths: {
          '/users': { get: {} },
        },
      },
      current: {
        info: { version: '1.1.0' },
        paths: {
          '/users': { get: {} },
          '/users/new': { post: {} },
        },
      },
    };

    const results = await validator.validate({ type: 'api_surface', input });
    const newEndpointResult = results.find((r) => r.policy === 'pve.api.new_endpoints');

    expect(newEndpointResult).toBeDefined();
    expect(newEndpointResult?.allowed).toBe(true);
    expect(newEndpointResult?.message).toContain('Added 1 new endpoints');
  });

  it('should detect breaking changes (removed endpoint)', async () => {
    const input: APISurfaceInput = {
      type: 'api_surface',
      apiType: 'rest',
      previous: {
        info: { version: '1.0.0' },
        paths: {
          '/users': { get: {} },
        },
      },
      current: {
        info: { version: '2.0.0' },
        paths: {},
      },
    };

    const results = await validator.validate({ type: 'api_surface', input });
    const breakingChangeResult = results.find((r) => r.policy === 'pve.api.breaking_change');

    expect(breakingChangeResult).toBeDefined();
    expect(breakingChangeResult?.allowed).toBe(false);
    expect(breakingChangeResult?.message).toContain('Endpoint removed: /users');
  });

  it('should detect missing version bump', async () => {
    const input: APISurfaceInput = {
      type: 'api_surface',
      apiType: 'rest',
      previous: {
        info: { version: '1.0.0' },
        paths: {
          '/users': { get: {} },
        },
      },
      current: {
        info: { version: '1.0.0' }, // Version unchanged despite changes
        paths: {
          '/users': { get: {} },
          '/users/new': { post: {} },
        },
      },
    };

    const results = await validator.validate({ type: 'api_surface', input });
    const versionBumpResult = results.find((r) => r.policy === 'pve.api.version_bump');

    expect(versionBumpResult).toBeDefined();
    expect(versionBumpResult?.allowed).toBe(false);
  });

  it('should flag Purview DataAssets endpoints specifically', async () => {
      const input: APISurfaceInput = {
        type: 'api_surface',
        apiType: 'rest',
        previous: {
          info: { version: '1.0.0' },
          paths: {},
        },
        current: {
          info: { version: '1.1.0' },
          paths: {
            '/purview/DataAssets/create': { post: {} },
          },
        },
      };

      const results = await validator.validate({ type: 'api_surface', input });
      const purviewResult = results.find((r) => r.policy === 'pve.api.purview_data_assets');

      expect(purviewResult).toBeDefined();
      expect(purviewResult?.allowed).toBe(false); // Warning is treated as not allowed but with warning severity usually, or allowed=false depending on implementation.
      // Checking implementation: warn() calls fail() with severity 'warning', and fail sets allowed=false.
      expect(purviewResult?.severity).toBe('warning');
      expect(purviewResult?.message).toContain('New Purview DataAssets endpoint detected');
    });
});
