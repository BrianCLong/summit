"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const promises_1 = __importDefault(require("fs/promises"));
const os_1 = __importDefault(require("os"));
const path_1 = __importDefault(require("path"));
const alerting_js_1 = require("../alerting.js");
const audit_exporter_js_1 = require("../audit-exporter.js");
const control_registry_js_1 = require("../control-registry.js");
const control_runner_js_1 = require("../control-runner.js");
const evidence_store_js_1 = require("../evidence-store.js");
const exception_registry_js_1 = require("../exception-registry.js");
const control = {
    id: 'control.ledger.proof',
    title: 'Provenance Ledger Hash Mirror',
    category: 'security',
    objective: 'Mirror evidence hashes to provenance ledger',
    owner: { primary: 'compliance@example.com' },
    check: { type: 'automated', script: './mirror.sh' },
    schedule: { frequencyMinutes: 15, toleranceMinutes: 5 },
    rtoMinutes: 60,
    evidence: { path: '/tmp', retentionDays: 60, ttlDays: 14, signer: 'ledger-bot' },
    tags: ['evidence', 'ledger'],
};
describe('AuditExporter', () => {
    it('bundles controls, evidence, narratives, and exceptions', async () => {
        const baseDir = await promises_1.default.mkdtemp(path_1.default.join(os_1.default.tmpdir(), 'audit-'));
        const registry = control_registry_js_1.ControlRegistry.fromDefinitions([{ ...control, evidence: { ...control.evidence, path: baseDir } }]);
        const evidenceStore = new evidence_store_js_1.EvidenceStore(baseDir);
        const runner = new control_runner_js_1.ControlRunner({
            evidenceStore,
            alertBroker: new alerting_js_1.AlertBroker(),
            handlers: {
                [control.id]: async () => ({ status: 'pass', evidencePayload: 'ledger-ok' }),
            },
        });
        await runner.run(registry.list()[0]);
        const exceptions = new exception_registry_js_1.ExceptionRegistry();
        exceptions.add({
            id: 'ex-1',
            controlId: control.id,
            owner: 'risk@example.com',
            scope: 'ledger outage',
            compensatingControls: ['manual checksum'],
            expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        });
        const exporter = new audit_exporter_js_1.AuditExporter({
            registry,
            runner,
            evidenceStore,
            exceptions,
        });
        const outputDir = path_1.default.join(baseDir, 'bundle');
        const manifest = await exporter.exportBundle(outputDir);
        expect(manifest.controlsCount).toBe(1);
        expect(manifest.evidenceCount).toBe(1);
        const files = await promises_1.default.readdir(outputDir);
        expect(files).toEqual(expect.arrayContaining(['controls.json', 'evidence.json', 'narratives.md', 'exceptions.json', 'manifest.json']));
    });
});
