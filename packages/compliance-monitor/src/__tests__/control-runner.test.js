"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const promises_1 = __importDefault(require("fs/promises"));
const os_1 = __importDefault(require("os"));
const path_1 = __importDefault(require("path"));
const alerting_js_1 = require("../alerting.js");
const control_registry_js_1 = require("../control-registry.js");
const control_runner_js_1 = require("../control-runner.js");
const evidence_store_js_1 = require("../evidence-store.js");
const control = {
    id: 'control.evidence.logs',
    title: 'Collect API Gateway Logs',
    category: 'availability',
    objective: 'Capture gateway audit logs with immutable hashes',
    owner: { primary: 'observability@example.com' },
    check: { type: 'automated', script: './scripts/logs.sh' },
    schedule: { frequencyMinutes: 30, toleranceMinutes: 10 },
    rtoMinutes: 120,
    evidence: { path: '/tmp', retentionDays: 30, ttlDays: 7, signer: 'obs-bot' },
    tags: ['soc2', 'logging'],
};
describe('ControlRunner and Scheduler', () => {
    it('runs controls, stores evidence, and alerts on failure or staleness', async () => {
        const baseDir = await promises_1.default.mkdtemp(path_1.default.join(os_1.default.tmpdir(), 'evidence-'));
        const registry = control_registry_js_1.ControlRegistry.fromDefinitions([{ ...control, evidence: { ...control.evidence, path: baseDir } }]);
        const evidenceStore = new evidence_store_js_1.EvidenceStore(baseDir);
        const alertBroker = new alerting_js_1.AlertBroker();
        const alerts = [];
        alertBroker.subscribe(alert => alerts.push(`${alert.type}:${alert.controlId}`));
        const runner = new control_runner_js_1.ControlRunner({
            evidenceStore,
            alertBroker,
            handlers: {
                [control.id]: async () => ({
                    status: 'pass',
                    evidencePayload: JSON.stringify({ ok: true }),
                }),
            },
        });
        const scheduler = new control_runner_js_1.ControlScheduler(registry.list(), runner);
        const now = new Date('2024-01-01T00:00:00Z');
        const [firstRun] = await scheduler.tick(now);
        expect(firstRun.evidence).toBeDefined();
        // simulate drift
        const later = new Date(now.getTime() + 60 * 60 * 1000);
        await scheduler.tick(later);
        expect(alerts).toContain(`stale-evidence:${control.id}`);
    });
    it('emits failure alerts when control handler fails', async () => {
        const baseDir = await promises_1.default.mkdtemp(path_1.default.join(os_1.default.tmpdir(), 'evidence-'));
        const evidenceStore = new evidence_store_js_1.EvidenceStore(baseDir);
        const alertBroker = new alerting_js_1.AlertBroker();
        const alerts = [];
        alertBroker.subscribe(alert => alerts.push(alert.type));
        const runner = new control_runner_js_1.ControlRunner({
            evidenceStore,
            alertBroker,
            handlers: {
                [control.id]: async () => ({ status: 'fail', notes: 'Gateway unreachable' }),
            },
        });
        await runner.run(control);
        expect(alerts).toContain('failure');
    });
});
