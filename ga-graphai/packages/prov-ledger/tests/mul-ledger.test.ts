import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import supertest from 'supertest';
import express from 'express';
import {
  ModelUsageLedger,
  MulLedgerSdk,
  createLedgerRouter,
  CompliancePackSigner
} from '../src/mul-ledger';

const signer: CompliancePackSigner = {
  keyId: 'test-key',
  secret: 'secret'
};

describe('ModelUsageLedger', () => {
  it('maintains hash integrity across appended events', () => {
    const ledger = new ModelUsageLedger(':memory:');
    const first = ledger.appendEvent({
      model: 'gaia',
      version: '1.0.0',
      datasetLineageId: 'dl-001',
      consentScope: 'research',
      dpBudgetSpend: 2.5,
      policyHash: 'policy-a',
      outputArtifactIds: ['art-1']
    });
    const second = ledger.appendEvent({
      model: 'gaia',
      version: '1.0.1',
      datasetLineageId: 'dl-001',
      consentScope: 'research',
      dpBudgetSpend: 1.5,
      policyHash: 'policy-b',
      outputArtifactIds: ['art-2']
    });

    expect(second.previousHash).toBe(first.hash);
    const integrity = ledger.verifyIntegrity();
    expect(integrity.ok).toBe(true);
  });

  it('detects tampering via integrity check', () => {
    const ledger = new ModelUsageLedger(':memory:');
    const record = ledger.appendEvent({
      model: 'gaia',
      version: '1.0.0',
      datasetLineageId: 'dl-001',
      consentScope: 'research',
      dpBudgetSpend: 1,
      policyHash: 'policy',
      outputArtifactIds: []
    });

    const db = (ledger as any).db;
    db.prepare('UPDATE ledger_entries SET dp_budget_spend = 99 WHERE event_id = ?').run(record.eventId);

    const integrity = ledger.verifyIntegrity();
    expect(integrity.ok).toBe(false);
    expect(integrity.failure?.reason).toBe('HASH_MISMATCH');
  });

  it('exports monthly compliance pack with exact totals', () => {
    const ledger = new ModelUsageLedger(':memory:');
    ledger.appendEvent({
      model: 'gaia',
      version: '1.0.0',
      datasetLineageId: 'dl-001',
      consentScope: 'research',
      dpBudgetSpend: 2,
      policyHash: 'policy-a',
      outputArtifactIds: [],
      timestamp: '2024-05-05T00:00:00.000Z'
    });
    ledger.appendEvent({
      model: 'gaia',
      version: '1.0.1',
      datasetLineageId: 'dl-002',
      consentScope: 'analytics',
      dpBudgetSpend: 3,
      policyHash: 'policy-b',
      outputArtifactIds: [],
      timestamp: '2024-05-06T00:00:00.000Z'
    });

    const pack = ledger.exportMonthlyCompliancePack('2024-05', signer);
    expect(pack.pack.totals.events).toBe(2);
    expect(pack.pack.totals.dpBudgetSpend).toBe(5);
    expect(pack.pack.digest).toBeDefined();
    const digestRecalc = createHash('sha256')
      .update(JSON.stringify(pack.pack.events))
      .digest('hex');
    expect(pack.pack.digest).toBe(digestRecalc);
  });
});

describe('Ledger API', () => {
  it('accepts writes and queries through HTTP', async () => {
    const ledger = new ModelUsageLedger(':memory:');
    const app = express();
    app.use('/', createLedgerRouter(ledger, { signer }));
    const request = supertest(app);

    const response = await request.post('/events').send({
      model: 'gaia',
      version: '1.0.0',
      datasetLineageId: 'dl-001',
      consentScope: 'research',
      dpBudgetSpend: 1.2,
      policyHash: 'policy',
      outputArtifactIds: []
    });
    expect(response.status).toBe(201);

    const list = await request.get('/events');
    expect(list.body.events.length).toBe(1);

    const integrity = await request.get('/integrity');
    expect(integrity.body.ok).toBe(true);

    const pack = await request.get('/compliance-pack').query({ month: '2024-05' });
    expect(pack.status).toBe(200);
    expect(pack.body.signature.value).toBeDefined();
  });
});

describe('MulLedgerSdk', () => {
  it('logs events with negligible overhead', () => {
    const ledger = new ModelUsageLedger(':memory:');
    const sdk = new MulLedgerSdk(ledger);
    const average = sdk.benchmark(30, () => ({
      model: 'gaia',
      version: '1.0.0',
      datasetLineageId: 'dl-001',
      consentScope: 'research',
      dpBudgetSpend: 0.5,
      policyHash: 'policy',
      outputArtifactIds: []
    }));
    expect(average).toBeLessThan(5);
  });
});
