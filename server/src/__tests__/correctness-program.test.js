"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const correctness_program_js_1 = require("../correctness-program.js");
const invariants_js_1 = require("../correctness-program/invariants.js");
const migrationFactory_js_1 = require("../correctness-program/migrationFactory.js");
(0, globals_1.describe)('Correctness Program', () => {
    (0, globals_1.it)('tracks truth map, identity, and debt', () => {
        const map = correctness_program_js_1.correctnessProgram.truthMap.listTruthMap();
        (0, globals_1.expect)(map).not.toHaveLength(0);
        const debt = correctness_program_js_1.correctnessProgram.truthMap.addTruthDebt('customer', 'dual_write', 'Legacy sync still active', 'Cutover scheduled', 'owner@example.com');
        (0, globals_1.expect)(correctness_program_js_1.correctnessProgram.truthMap.listTruthDebt()).toContainEqual(debt);
        const truthCheck = correctness_program_js_1.correctnessProgram.truthMap.truthCheck('customer', '123', [
            { id: '123', name: 'Ada' },
            { id: '123', name: 'Ada' },
        ]);
        (0, globals_1.expect)(truthCheck.status).toBe('healthy');
    });
    (0, globals_1.it)('enforces invariants with quarantine and idempotency', async () => {
        const registry = correctness_program_js_1.correctnessProgram.invariants;
        registry.registerInvariant({
            id: 'must-have-customer-id',
            domain: 'customer',
            description: 'customerId required',
            severity: 'critical',
            validate: (payload) => Boolean(payload.customerId),
        });
        registry.registerStateMachine((0, invariants_js_1.buildBooleanStateMachine)('billing-enabled', 'billing', 'enabled', 'disabled'));
        (0, globals_1.expect)(() => registry.validateStateTransition('billing-enabled', 'disabled', 'enabled')).not.toThrow();
        const validation = await registry.validateWrite('customer', { name: 'Missing ID' }, 'key-1');
        (0, globals_1.expect)(validation.violations).toHaveLength(1);
        (0, globals_1.expect)(registry.getQuarantine()).toHaveLength(1);
        const idempotent = await registry.validateWrite('customer', { name: 'Missing ID' }, 'key-1');
        (0, globals_1.expect)(idempotent.idempotent).toBe(true);
    });
    (0, globals_1.it)('runs reconciliation with auto-fix for non-high risk pairs', async () => {
        correctness_program_js_1.correctnessProgram.declareDriftPair({
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
        const run = await correctness_program_js_1.correctnessProgram.reconciliation.runPair('cache-vs-db');
        (0, globals_1.expect)(run.autoFixesApplied).toContain('fixed:mismatch');
        (0, globals_1.expect)(correctness_program_js_1.correctnessProgram.reconciliation.metrics().totalRuns).toBeGreaterThan(0);
    });
    (0, globals_1.it)('advances migration factory stages with dlq capturing failures', () => {
        const manifest = (0, migrationFactory_js_1.buildManifest)('content', 'migrate-content');
        const progress = correctness_program_js_1.correctnessProgram.startMigration(manifest, 2);
        (0, globals_1.expect)(progress.stage).toBe(manifest.enableDualRun ? 'dual_run' : 'backfill');
        const updated = correctness_program_js_1.correctnessProgram.migrations.advance(manifest, [
            { id: '1', success: true },
            { id: '2', success: false, error: 'checksum mismatch' },
        ]);
        (0, globals_1.expect)(updated.dlq).toHaveLength(1);
    });
    (0, globals_1.it)('validates event contracts with compatibility and idempotency', () => {
        const orderCreated = {
            name: 'order.created',
            version: '1.0.0',
            owner: 'billing',
            piiSafe: true,
            fields: [
                { name: 'id', type: 'string', required: true },
                { name: 'amount', type: 'number', required: true },
            ],
        };
        correctness_program_js_1.correctnessProgram.registerEventSchema(orderCreated);
        const envelope = {
            id: 'evt-1',
            name: 'order.created',
            version: '1.0.0',
            occurredAt: new Date(),
            payload: { id: 'o-1', amount: 5 },
        };
        const first = correctness_program_js_1.correctnessProgram.eventContracts.validateEnvelope(envelope);
        (0, globals_1.expect)(first.idempotentHit).toBe(false);
        const second = correctness_program_js_1.correctnessProgram.eventContracts.validateEnvelope({ ...envelope, dedupeKey: 'evt-1' });
        (0, globals_1.expect)(second.idempotentHit).toBe(true);
    });
    (0, globals_1.it)('enforces approval for high-risk repairs', () => {
        const action = correctness_program_js_1.correctnessProgram.adminRepairs.queueAction({
            name: 'delete-bad-permissions',
            risk: 'high',
            payload: { subjectId: 'sub-1' },
            dryRun: false,
            diff: '-role outdated',
        });
        (0, globals_1.expect)(() => correctness_program_js_1.correctnessProgram.adminRepairs.execute(action.id, 'ops')).toThrow('Approval required');
        correctness_program_js_1.correctnessProgram.adminRepairs.approve(action.id, 'lead');
        const executed = correctness_program_js_1.correctnessProgram.adminRepairs.execute(action.id, 'ops');
        (0, globals_1.expect)(executed.executedBy).toBe('ops');
    });
});
