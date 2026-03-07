import test from 'node:test';
import assert from 'node:assert/strict';

import {
  canUseSpeculativeMode,
  loadSpeculativeConfigFromEnv,
  parseSpeculativeConfig,
} from '../../../../src/agents/inference/spec/SpeculativeConfig.mjs';

test('keeps speculative mode disabled by default', () => {
  const config = parseSpeculativeConfig({});
  assert.equal(config.enabled, false);
  assert.equal(config.backend, 'none');
  assert.equal(canUseSpeculativeMode(config, 'tenant-a'), false);
});

test('rejects enabled configuration without allowlist and evidence thresholds', () => {
  assert.throws(
    () =>
      parseSpeculativeConfig({
        enabled: true,
        backend: 'http',
      }),
    /allowlist/i,
  );
});

test('allows enabled mode only for allowlisted tenant with evidence requirements', () => {
  const config = parseSpeculativeConfig({
    enabled: true,
    backend: 'http',
    tenantAllowlist: ['tenant-1'],
    evidenceId: 'EVD-DFLASH-SPEC-001',
    thresholds: {
      minAcceptanceLength: 2,
      minSpeedup: 1.1,
    },
  });

  assert.equal(canUseSpeculativeMode(config, 'tenant-1'), true);
  assert.equal(canUseSpeculativeMode(config, 'tenant-2'), false);
  assert.equal(canUseSpeculativeMode(config), false);
});

test('parses environment variables into governed config', () => {
  const config = loadSpeculativeConfigFromEnv({
    SUMMIT_SPECULATIVE_ENABLED: 'true',
    SUMMIT_SPECULATIVE_BACKEND: 'http',
    SUMMIT_SPECULATIVE_TENANT_ALLOWLIST: 'tenant-1, tenant-2',
    SUMMIT_SPECULATIVE_EVIDENCE_ID: 'EVD-DFLASH-SPEC-001',
    SUMMIT_SPECULATIVE_MIN_ACCEPTANCE_LENGTH: '3',
    SUMMIT_SPECULATIVE_MIN_SPEEDUP: '1.25',
  });

  assert.deepEqual(config.tenantAllowlist, ['tenant-1', 'tenant-2']);
  assert.deepEqual(config.thresholds, {
    minAcceptanceLength: 3,
    minSpeedup: 1.25,
  });
});
