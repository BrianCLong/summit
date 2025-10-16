import { describe, expect, it } from 'vitest';
import { ProvenanceLedger } from '../src/index';

describe('ProvenanceLedger', () => {
  it('appends entries and maintains a valid hash chain', () => {
    const ledger = new ProvenanceLedger();
    const first = ledger.append({
      id: '1',
      category: 'deployment',
      actor: 'ci-bot',
      action: 'promote',
      resource: 'service-api',
      payload: { version: '1.0.0' },
    });

    const second = ledger.append({
      id: '2',
      category: 'deployment',
      actor: 'ci-bot',
      action: 'promote',
      resource: 'service-api',
      payload: { version: '1.0.1' },
    });

    expect(first.hash).toBeTruthy();
    expect(second.previousHash).toBe(first.hash);
    expect(ledger.verify()).toBe(true);
  });

  it('filters entries by category and limit', () => {
    const ledger = new ProvenanceLedger();
    ledger.append({
      id: '1',
      category: 'policy',
      actor: 'compliance',
      action: 'approve',
      resource: 'llm',
      payload: { policy: 'safe' },
    });
    ledger.append({
      id: '2',
      category: 'deployment',
      actor: 'ci-bot',
      action: 'promote',
      resource: 'service-api',
      payload: { version: '1.0.0' },
    });

    const filtered = ledger.list({ category: 'deployment', limit: 1 });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].category).toBe('deployment');
  });

  it('exports evidence bundles with the latest head hash', () => {
    const ledger = new ProvenanceLedger();
    ledger.append({
      id: '1',
      category: 'evaluation',
      actor: 'eval-service',
      action: 'score',
      resource: 'rag-output',
      payload: { score: 0.95 },
    });

    const bundle = ledger.exportEvidence();
    expect(bundle.entries).toHaveLength(1);
    expect(bundle.headHash).toBe(bundle.entries[0].hash);
  });
});
