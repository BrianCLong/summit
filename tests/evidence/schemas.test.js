"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const promises_1 = require("node:fs/promises");
const node_path_1 = __importDefault(require("node:path"));
const ajv_1 = __importDefault(require("ajv"));
const ajv_formats_1 = __importDefault(require("ajv-formats"));
const schemaDir = node_path_1.default.resolve(process.cwd(), 'docs/api');
const loadSchema = async (filename) => {
    const raw = await (0, promises_1.readFile)(node_path_1.default.join(schemaDir, filename), 'utf8');
    return JSON.parse(raw);
};
describe('Evidence schemas', () => {
    const ajv = new ajv_1.default({ allErrors: true, strict: true });
    (0, ajv_formats_1.default)(ajv);
    it('validates report, metrics, stamp, and index samples', async () => {
        const reportSchema = await loadSchema('evidence.report.schema.json');
        const metricsSchema = await loadSchema('evidence.metrics.schema.json');
        const stampSchema = await loadSchema('evidence.stamp.schema.json');
        const indexSchema = await loadSchema('evidence.index.schema.json');
        const reportSample = {
            evidenceId: 'EVD-DECAGON-CX-001',
            runId: 'run-001',
            agent: { name: 'concierge', version: '0.1.0' },
            inputSummary: 'Customer requested a refund.',
            decisions: [{ step: 'classify', rationale: 'Refund intent detected.' }],
            outputs: [{ kind: 'proposal', ref: 'proposal.json' }],
        };
        const metricsSample = {
            evidenceId: 'EVD-DECAGON-CX-001',
            runId: 'run-001',
            counters: { containment_rate: 0.0 },
        };
        const stampSample = {
            evidenceId: 'EVD-DECAGON-CX-001',
            runId: 'run-001',
            createdAtIso: '2026-02-06T00:00:00.000Z',
        };
        const indexSample = {
            'EVD-DECAGON-CX-001': {
                report: 'evidence/run-001/report.json',
                metrics: 'evidence/run-001/metrics.json',
                stamp: 'evidence/run-001/stamp.json',
            },
        };
        const reportValidate = ajv.compile(reportSchema);
        const metricsValidate = ajv.compile(metricsSchema);
        const stampValidate = ajv.compile(stampSchema);
        const indexValidate = ajv.compile(indexSchema);
        expect(reportValidate(reportSample)).toBe(true);
        expect(metricsValidate(metricsSample)).toBe(true);
        expect(stampValidate(stampSample)).toBe(true);
        expect(indexValidate(indexSample)).toBe(true);
    });
});
