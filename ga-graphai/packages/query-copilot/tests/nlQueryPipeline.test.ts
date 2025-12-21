import { describe, expect, it } from 'vitest';
import { CostGuard } from '@ga-graphai/cost-guard';
import { SimpleProvenanceLedger } from '@ga-graphai/prov-ledger';
import { NlQueryPipeline } from '../src/nlQueryPipeline.js';

const schema = {
  nodes: [
    { label: 'Person', properties: ['name'] },
    { label: 'Company', properties: ['name'] },
  ],
  relationships: [
    { type: 'WORKS_AT', from: 'Person', to: 'Company', direction: 'out' },
  ],
};

class AllowAllGuard extends CostGuard {
  planBudget() {
    return {
      action: 'allow',
      reason: 'within budget',
      nextCheckMs: 0,
      metrics: { projectedRru: 1, projectedLatencyMs: 1, saturation: 0.1 },
    } as ReturnType<CostGuard['planBudget']>;
  }
}

describe('NlQueryPipeline', () => {
  it('produces manifest and allow decision for valid prompts', () => {
    const pipeline = new NlQueryPipeline(new AllowAllGuard(), new SimpleProvenanceLedger());
    const result = pipeline.preview({
      prompt: 'list people who worked with ACME',
      schema,
      datasetScope: 'case-123',
      tenantId: 'tenant-a',
      authorityRoles: ['analyst'],
      justification: 'investigation',
      license: 'MIT',
    });

    expect(result.valid).toBe(true);
    expect(result.decision).toBe('allow');
    expect(result.manifest?.transforms.length).toBeGreaterThan(0);
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it('denies invalid Cypher previews with guardrail reasons', () => {
    class DenyGuard extends CostGuard {
      planBudget() {
        return {
          action: 'kill',
          reason: 'plan unsafe',
          nextCheckMs: 0,
          metrics: { projectedRru: 999, projectedLatencyMs: 2000, saturation: 2 },
        } as ReturnType<CostGuard['planBudget']>;
      }
    }

    const pipeline = new NlQueryPipeline(new DenyGuard(), new SimpleProvenanceLedger());
    const result = pipeline.preview({
      prompt: 'drop database',
      schema,
      datasetScope: 'case-999',
      tenantId: 'tenant-b',
      authorityRoles: ['viewer'],
      license: 'GPL-3.0',
    });

    expect(result.decision).toBe('deny');
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/MATCH/);
  });
});
