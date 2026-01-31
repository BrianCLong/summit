import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import { correctnessProgram } from '../correctness-program.js';
import { buildBooleanStateMachine } from '../correctness-program/invariants.js';
import { buildManifest } from '../correctness-program/migrationFactory.js';
import { EventEnvelope, EventSchema } from '../correctness-program/types.js';

describe('Correctness Program', () => {
  it('tracks truth map, identity, and debt', () => {
    const map = correctnessProgram.truthMap.listTruthMap();
    expect(map).not.toHaveLength(0);

    const debt = correctnessProgram.truthMap.addTruthDebt(
      'customer',
      'dual_write',
      'Legacy sync still active',
      'Cutover scheduled',
      'owner@example.com',
    );
    expect(correctnessProgram.truthMap.listTruthDebt()).toContainEqual(debt);

    const truthCheck = correctnessProgram.truthMap.truthCheck('customer', '123', [
      { id: '123', name: 'Ada' },
      { id: '123', name: 'Ada' },
    ]);
    expect(truthCheck.status).toBe('healthy');
  });

  it('enforces invariants with quarantine and idempotency', async () => {
    const registry = correctnessProgram.invariants;
    registry.registerInvariant({
      id: 'must-have-customer-id',
      domain: 'customer',
      description: 'customerId required',
      severity: 'critical',
      validate: (payload: any) => Boolean(payload.customerId),
    });
    registry.registerStateMachine(buildBooleanStateMachine('billing-enabled', 'billing', 'enabled', 'disabled'));
    expect(() => registry.validateStateTransition('billing-enabled', 'disabled', 'enabled')).not.toThrow();

    const validation = await registry.validateWrite('customer', { name: 'Missing ID' }, 'key-1');
    expect(validation.violations).toHaveLength(1);
    expect(registry.getQuarantine()).toHaveLength(1);

    const idempotent = await registry.validateWrite('customer', { name: 'Missing ID' }, 'key-1');
    expect(idempotent.idempotent).toBe(true);
  });

  it('runs reconciliation with auto-fix for non-high risk pairs', async () => {
    correctnessProgram.declareDriftPair({
      id: 'cache-vs-db',
      domain: 'usage',
      sourceLabel: 'cache',
      targetLabel: 'db',
      loadSource: () => [{ id: 'a', value: 1 }],
      loadTarget: () => [{ id: 'a', value: 2 }],
      diff: (source, target) => (source[0].value === target[0].value ? [] : ['mismatch']),
      riskTier: 'low',
      autoFix: (diffs) => diffs.map((d) => `fixed:${d}`),
    });

    const run = await correctnessProgram.reconciliation.runPair('cache-vs-db');
    expect(run.autoFixesApplied).toContain('fixed:mismatch');
    expect(correctnessProgram.reconciliation.metrics().totalRuns).toBeGreaterThan(0);
  });

  it('advances migration factory stages with dlq capturing failures', () => {
    const manifest = buildManifest('content', 'migrate-content');
    const progress = correctnessProgram.startMigration(manifest, 2);
    expect(progress.stage).toBe(manifest.enableDualRun ? 'dual_run' : 'backfill');

    const updated = correctnessProgram.migrations.advance(manifest, [
      { id: '1', success: true },
      { id: '2', success: false, error: 'checksum mismatch' },
    ]);
    expect(updated.dlq).toHaveLength(1);
  });

  it('validates event contracts with compatibility and idempotency', () => {
    const orderCreated: EventSchema = {
      name: 'order.created',
      version: '1.0.0',
      owner: 'billing',
      piiSafe: true,
      fields: [
        { name: 'id', type: 'string', required: true },
        { name: 'amount', type: 'number', required: true },
      ],
    };
    correctnessProgram.registerEventSchema(orderCreated);

    const envelope: EventEnvelope = {
      id: 'evt-1',
      name: 'order.created',
      version: '1.0.0',
      occurredAt: new Date(),
      payload: { id: 'o-1', amount: 5 },
    };

    const first = correctnessProgram.eventContracts.validateEnvelope(envelope);
    expect(first.idempotentHit).toBe(false);

    const second = correctnessProgram.eventContracts.validateEnvelope({ ...envelope, dedupeKey: 'evt-1' });
    expect(second.idempotentHit).toBe(true);
  });

  it('enforces approval for high-risk repairs', () => {
    const action = correctnessProgram.adminRepairs.queueAction({
      name: 'delete-bad-permissions',
      risk: 'high',
      payload: { subjectId: 'sub-1' },
      dryRun: false,
      diff: '-role outdated',
    });

    expect(() => correctnessProgram.adminRepairs.execute(action.id, 'ops')).toThrow('Approval required');
    correctnessProgram.adminRepairs.approve(action.id, 'lead');
    const executed = correctnessProgram.adminRepairs.execute(action.id, 'ops');
    expect(executed.executedBy).toBe('ops');
  });
});
