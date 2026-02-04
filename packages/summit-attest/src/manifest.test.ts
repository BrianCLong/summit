import { describe, it, expect } from 'vitest';
import { createManifest } from './manifest.js';

describe('manifest', () => {
  it('should create a valid manifest', () => {
    const manifest = createManifest({
      tenant: 'test-tenant',
      namespace: 'test-ns',
      job: 'test-job',
    });

    expect(manifest.runId).toBeDefined();
    expect(manifest.runUri).toContain('openlineage://test-tenant/test-ns/test-job/runs/');
    expect(manifest.schemaVersion).toBe('v1');
  });

  it('should use provided runId', () => {
    const myRunId = 'my-custom-id';
    const manifest = createManifest({
      tenant: 'test-tenant',
      namespace: 'test-ns',
      job: 'test-job',
      runId: myRunId,
    });

    expect(manifest.runId).toBe(myRunId);
    expect(manifest.runUri).toContain(myRunId);
  });
});
