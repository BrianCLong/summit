import { jest, describe, it, expect, beforeAll } from '@jest/globals';
import { FcrService } from '../fcr/fcr-service.js';
import { FcrSignal } from '../fcr/types.js';

// Mock fs to return a valid schema
const mockSchema = JSON.stringify({
  type: "object",
  properties: {
    entity_id: { type: "string" },
    tenant_id: { type: "string" },
    observed_at: { type: "string" },
    signal_type: { type: "string" },
    narrative_claim_hash: { type: "string" },
    confidence_local: { type: "number" },
    privacy_budget_cost: {
      type: "object",
      properties: {
        epsilon: { type: "number" },
        delta: { type: "number" }
      }
    },
    version: { type: "string" }
  },
  required: ["entity_id", "tenant_id", "observed_at", "signal_type"]
});

jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn().mockResolvedValue(mockSchema)
  }
}));

const baseSignal = (overrides: Partial<FcrSignal> = {}): FcrSignal => ({
  entity_id: '11111111-1111-1111-1111-111111111111',
  tenant_id: 'tenant-a',
  observed_at: new Date('2026-01-10T00:00:00Z').toISOString(),
  signal_type: 'claim',
  narrative_claim_hash: 'hash-abc',
  confidence_local: 0.6,
  privacy_budget_cost: { epsilon: 0.5, delta: 0.01 },
  version: 'v1',
  ...overrides,
});

describe('FcrService', () => {
  it('enforces privacy budgets', async () => {
    const service = new FcrService();
    service.configureTenantBudget('tenant-a', 0.1, 0.001);

    const result = await service.ingestSignals('tenant-a', [baseSignal()]);
    expect(result.ok).toBe(false);
  });

  it('rejects signals with mismatched tenant_id', async () => {
    const service = new FcrService();
    service.configureTenantBudget('tenant-a', 10, 0.1);

    const result = await service.ingestSignals('tenant-a', [
      baseSignal({ tenant_id: 'tenant-b' }),
    ]);
    expect(result.ok).toBe(false);
  });

  it('rejects empty payloads', async () => {
    const service = new FcrService();
    service.configureTenantBudget('tenant-a', 10, 0.1);

    const result = await service.ingestSignals('tenant-a', []);
    expect(result.ok).toBe(false);
  });

  it('clusters signals and generates alerts', async () => {
    const service = new FcrService();
    service.configureTenantBudget('tenant-a', 10, 0.1);

    const signals = [
      baseSignal({ entity_id: '22222222-2222-2222-2222-222222222222' }),
      baseSignal({ entity_id: '33333333-3333-3333-3333-333333333333' }),
      baseSignal({
        entity_id: '44444444-4444-4444-4444-444444444444',
        narrative_claim_hash: 'hash-xyz',
        confidence_local: 0.9,
      }),
    ];

    const pipeline = await service.runPipeline('tenant-a', signals);
    expect(pipeline.ok).toBe(true);

    if (pipeline.ok) {
      expect(pipeline.clusters.length).toBeGreaterThan(0);
      expect(pipeline.alerts.length).toBeGreaterThan(0);
    }
  });
});
