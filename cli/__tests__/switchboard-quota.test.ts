/**
 * Switchboard Quota Tests
 */

import { assertRun, assertAction, canExport } from '../src/lib/switchboard-quota.js';

describe('Switchboard Quota', () => {
  const tenantId = 'test-tenant-' + Date.now();

  it('enforces run quota on community tier', () => {
    // 10 runs allowed
    for (let i = 0; i < 10; i++) {
      assertRun(tenantId, 'community');
    }
    expect(() => assertRun(tenantId, 'community')).toThrow(/Daily run quota exceeded/);
  });

  it('allows more runs on pro tier', () => {
    // 11th run on pro should be fine (100 allowed)
    expect(() => assertRun(tenantId, 'pro')).not.toThrow();
  });

  it('enforces action quota on community tier', () => {
    // 100 actions allowed
    const actionTenantId = 'test-action-tenant-' + Date.now();
    for (let i = 0; i < 100; i++) {
      assertAction(actionTenantId, 'community');
    }
    expect(() => assertAction(actionTenantId, 'community')).toThrow(/Daily action quota exceeded/);
  });

  it('gates evidence bundle export', () => {
    expect(canExport('community')).toBe(false);
    expect(canExport('pro')).toBe(true);
    expect(canExport('power')).toBe(true);
  });
});
