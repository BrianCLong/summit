"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = require("node:fs");
const node_os_1 = require("node:os");
const node_path_1 = __importDefault(require("node:path"));
const index_js_1 = require("../src/index.js");
function createIngestPayload(now) {
    const provenance = (0, index_js_1.buildProvenance)('unit-test', '1.0.0');
    return {
        entity: {
            id: 'entity-1',
            type: 'person',
            attributes: { name: 'Ada' },
            tags: {
                classification: 'internal',
                residencyRegion: 'us-east',
                retentionDays: 1,
                piiFields: ['name'],
            },
            provenance,
        },
        events: [
            {
                id: 'event-1',
                entityId: 'entity-1',
                type: 'created',
                occurredAt: now,
                source: 'api',
                confidence: 0.9,
                payload: { status: 'new' },
                provenance: { ...provenance },
                tags: {
                    classification: 'internal',
                    residencyRegion: 'us-east',
                    retentionDays: 1,
                    piiFields: ['name'],
                },
            },
        ],
    };
}
describe('policy engine', () => {
    it('enforces deny by default and logs decisions', () => {
        const bundle = {
            ...index_js_1.denyByDefaultBundle,
            rules: [
                {
                    id: 'allow-read',
                    role: 'analyst',
                    resource: 'entity',
                    action: 'read',
                    effect: 'allow',
                },
            ],
        };
        const engine = new index_js_1.PolicyEngine(bundle);
        const allow = engine.evaluate({
            role: 'analyst',
            resource: 'entity',
            action: 'read',
            tenant: 'a',
            region: 'us-east',
            classification: 'internal',
        }, 'trace-1');
        const deny = engine.evaluate({
            role: 'analyst',
            resource: 'entity',
            action: 'delete',
            tenant: 'a',
            region: 'us-east',
            classification: 'internal',
        }, 'trace-2');
        expect(allow).toBe(true);
        expect(deny).toBe(false);
        const logs = engine.getDecisionLog();
        expect(logs).toHaveLength(2);
        expect(logs[0]).toMatchObject({ traceId: 'trace-1', decision: 'allow' });
        expect(logs[1]).toMatchObject({ traceId: 'trace-2', decision: 'deny' });
    });
});
describe('ingest store and governance', () => {
    it('deduplicates ingest and respects residency guard', () => {
        const store = new index_js_1.InMemoryIngestStore();
        const payload = createIngestPayload(new Date().toISOString());
        store.ingest(payload, ['us-east']);
        store.ingest(payload, ['us-east']);
        const audit = store.getAuditTrail();
        expect(audit.filter((a) => a.message === 'Ingest succeeded')).toHaveLength(1);
        expect(audit.filter((a) => a.message === 'Duplicate ingest blocked')).toHaveLength(1);
    });
    it('blocks residency violations', () => {
        const store = new index_js_1.InMemoryIngestStore();
        const payload = createIngestPayload(new Date().toISOString());
        expect(() => store.ingest(payload, ['eu-west'])).toThrow('Residency us-east is not permitted');
    });
    it('builds timeline ordered with provenance', () => {
        const store = new index_js_1.InMemoryIngestStore();
        const now = new Date();
        const earlier = new Date(now.getTime() - 1000).toISOString();
        const later = new Date(now.getTime() + 1000).toISOString();
        const payload = createIngestPayload(earlier);
        payload.events?.push({
            id: 'event-2',
            entityId: 'entity-1',
            type: 'updated',
            occurredAt: later,
            source: 'api',
            confidence: 0.95,
            payload: { status: 'updated' },
            provenance: { ...payload.events[0].provenance },
            tags: payload.events[0].tags,
        });
        store.ingest(payload, ['us-east']);
        const timeline = store.getTimeline({ entityId: 'entity-1' });
        expect(timeline.map((t) => t.id)).toEqual(['event-1', 'event-2']);
    });
});
describe('retention sweeper', () => {
    it('marks expired events and removes them when not dry-run', () => {
        const now = new Date('2025-01-03T00:00:00Z');
        const eventDate = new Date('2025-01-01T00:00:00Z').toISOString();
        const payload = createIngestPayload(eventDate);
        const result = (0, index_js_1.runRetentionSweeper)(payload.events ?? [], now, false, []);
        expect(result.deletedIds).toEqual(['event-1']);
        expect(result.remaining).toHaveLength(0);
    });
});
describe('canary controller', () => {
    it('rolls back on regression unless override is set', () => {
        const config = {
            steps: [
                { percentage: 1, durationSeconds: 10 },
                { percentage: 10, durationSeconds: 20 },
            ],
            maxErrorRate: 0.05,
            maxP99Latency: 400,
            maxSaturation: 0.8,
            maxCustomMetric: 2,
        };
        const rollback = (0, index_js_1.runCanary)([
            { errorRate: 0.01, p99LatencyMs: 200, saturation: 0.5 },
            { errorRate: 0.1, p99LatencyMs: 500, saturation: 0.9 },
        ], config);
        expect(rollback.state).toBe('rolled_back');
        const override = (0, index_js_1.runCanary)([
            { errorRate: 0.01, p99LatencyMs: 200, saturation: 0.5 },
            { errorRate: 0.1, p99LatencyMs: 500, saturation: 0.9 },
        ], config, true);
        expect(override.state).toBe('rolled_forward');
        expect(override.auditTrail.some((entry) => entry.message === 'manual_override')).toBe(true);
    });
});
describe('observability middleware', () => {
    it('propagates trace ids and records metrics', () => {
        const bundle = (0, index_js_1.createMetrics)();
        const trace = (0, index_js_1.createTraceMiddleware)();
        const metrics = (0, index_js_1.createHttpMetricsMiddleware)(bundle);
        const req = { method: 'GET', path: '/healthz', headers: {} };
        const res = {
            statusCode: 200,
            locals: {},
            headers: {},
            setHeader(key, value) {
                this.headers[key] = value;
            },
            on(event, handler) {
                if (event === 'finish')
                    handler();
            },
        };
        trace(req, res, () => { });
        metrics(req, res, () => { });
        expect(res.headers['x-trace-id']).toBeDefined();
        const metricsText = bundle.registry.metrics();
        expect(metricsText).toContain('http_request_duration_seconds');
    });
});
describe('supply chain and compliance pack', () => {
    it('generates deterministic sbom and builds disclosure pack', async () => {
        const dir = (0, node_fs_1.mkdtempSync)(node_path_1.default.join((0, node_os_1.tmpdir)(), 'golden-path-'));
        const manifestPath = node_path_1.default.join(dir, 'package.json');
        const manifest = { name: 'example', version: '1.0.0', dependencies: { a: '1.0.0' } };
        await Promise.resolve().then(() => __importStar(require('node:fs/promises'))).then((fs) => fs.writeFile(manifestPath, JSON.stringify(manifest), 'utf-8'));
        const sbom = (0, index_js_1.generateSbom)(manifestPath);
        expect(sbom.components).toHaveLength(2);
        const packPath = await (0, index_js_1.buildDisclosurePack)({
            manifestDir: dir,
            outputDir: node_path_1.default.join(dir, 'out'),
            policyBundleVersion: '2025.01',
            deploymentAttestation: { status: 'signed' },
        });
        const pack = JSON.parse((0, node_fs_1.readFileSync)(packPath, 'utf-8'));
        expect(pack.policyBundleVersion).toBe('2025.01');
        expect(pack.sbomPath).toContain('artifacts/sbom.json');
    });
});
describe('scaffold', () => {
    it('copies template with placeholders replaced', async () => {
        const dir = (0, node_fs_1.mkdtempSync)(node_path_1.default.join((0, node_os_1.tmpdir)(), 'golden-path-scaffold-'));
        await Promise.resolve().then(() => __importStar(require('../src/generator.js'))).then(({ scaffoldService }) => scaffoldService(dir, 'sample-service'));
        const readme = (0, node_fs_1.readFileSync)(node_path_1.default.join(dir, 'README.md'), 'utf-8');
        expect(readme).toContain('sample-service');
        const slo = (0, node_fs_1.readFileSync)(node_path_1.default.join(dir, 'configs/slo.yaml'), 'utf-8');
        expect(slo).toContain('sample-service');
    });
});
