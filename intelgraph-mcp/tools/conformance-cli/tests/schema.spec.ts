import { describe, expect, it } from 'vitest';
import { validateDiscoveryPayloads } from '../src/checks/schema';

describe('schema check', () => {
  it('accepts valid manifests and tolerates unknown fields', () => {
    const out = validateDiscoveryPayloads({
      tools: [
        {
          name: 'echo',
          description: 'Echo tool',
          scopes: ['read'],
          x_vendor_field: { enabled: true },
        },
      ],
      resources: [{ name: 'health', version: 'v1' }],
      prompts: [{ name: 'quickstart', version: 'v1' }],
    });

    expect(out.errors).toEqual([]);
    expect(out.warnings.length).toBeGreaterThan(0);
    expect(out.counts.tools).toBe(1);
  });

  it('rejects invalid manifest structures', () => {
    const out = validateDiscoveryPayloads({
      tools: [{ scopes: ['read'] }],
      resources: [{ name: 123 }],
      prompts: [{ name: 'p1' }],
    });

    expect(out.errors.length).toBeGreaterThan(0);
  });
});
