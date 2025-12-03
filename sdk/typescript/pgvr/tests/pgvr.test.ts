import { describe, expect, it } from 'vitest';
import { PgvrClient } from '../src/index.js';

describe('PgvrClient', () => {
  const client = new PgvrClient();

  it('returns deterministic top-k results', () => {
    const query = {
      tenantId: 'tenant_alpha',
      vector: [0.15, 0.21, 0.29],
      topK: 3,
      requestedFields: ['name'],
      jurisdiction: 'US',
      purpose: 'fraud'
    };

    const first = client.search(query);
    const second = client.search(query);

    expect(first.results).toEqual(second.results);
    expect(first.mode).toBe('live');
  });

  it('honors deny maps for requested fields', () => {
    const response = client.search({
      tenantId: 'tenant_alpha',
      vector: [0.18, 0.14, 0.33],
      topK: 5,
      requestedFields: ['email'],
      jurisdiction: 'US',
      purpose: 'support'
    });

    const blocked = response.results.find((item) => item.vectorId === 'vec-alpha-2');
    expect(blocked).toBeUndefined();
  });

  it('keeps dry-run output aligned with live mode', () => {
    const query = {
      tenantId: 'tenant_alpha',
      vector: [0.25, 0.2, 0.25],
      topK: 4,
      requestedFields: ['name'],
      jurisdiction: 'US',
      purpose: 'fraud'
    };

    const live = client.search(query);
    const dry = client.dryRun(query);

    expect(dry.mode).toBe('dryRun');
    expect(dry.results).toEqual(live.results);
  });
});
