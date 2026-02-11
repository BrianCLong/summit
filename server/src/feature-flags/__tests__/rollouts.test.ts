
import { OPAFeatureFlagClient } from '../server/src/feature-flags/opaFeatureFlagClient.js';

describe('OPAFeatureFlagClient Rollout Logic', () => {
  let client: OPAFeatureFlagClient;

  beforeEach(() => {
    client = new OPAFeatureFlagClient();
  });

  it('should generate a deterministic ramp_seed based on tenant and request ID', () => {
    const context = {
      tenantId: 'tenant-1',
      requestId: 'req-123'
    };
    const input1 = client.buildInput('my-flag', context, 'eval-1');
    const input2 = client.buildInput('my-flag', context, 'eval-2'); // Different eval ID, but same request ID

    expect(input1.ramp_seed).toBe(input2.ramp_seed);
    expect(input1.ramp_seed).toBeDefined();
    expect(input1.ramp_seed.length).toBe(16);
  });

  it('should generate different seeds for different flags', () => {
    const context = { tenantId: 'tenant-1', requestId: 'req-123' };
    const input1 = client.buildInput('flag-a', context, 'eval-1');
    const input2 = client.buildInput('flag-b', context, 'eval-1');

    expect(input1.ramp_seed).not.toBe(input2.ramp_seed);
  });

  it('should generate different seeds for different tenants', () => {
    const input1 = client.buildInput('my-flag', { tenantId: 'tenant-a', requestId: 'req-1' }, 'eval-1');
    const input2 = client.buildInput('my-flag', { tenantId: 'tenant-b', requestId: 'req-1' }, 'eval-1');

    expect(input1.ramp_seed).not.toBe(input2.ramp_seed);
  });
});
