"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const fs_1 = __importDefault(require("fs"));
const os_1 = __importDefault(require("os"));
const path_1 = __importDefault(require("path"));
const auditLogPipeline_js_1 = require("../auditLogPipeline.js");
const logAlertEngine_js_1 = require("../logAlertEngine.js");
const logEventBus_js_1 = require("../logEventBus.js");
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
(0, globals_1.describe)('AuditLogPipeline', () => {
    (0, globals_1.it)('captures structured JSON logs with compliance context', async () => {
        const tmpDir = fs_1.default.mkdtempSync(path_1.default.join(os_1.default.tmpdir(), 'audit-pipeline-'));
        const bus = new logEventBus_js_1.LogEventBus(50);
        const alerts = new logAlertEngine_js_1.LogAlertEngine([
            {
                id: 'burst-errors',
                name: 'Burst errors',
                level: 'error',
                windowSeconds: 10,
                threshold: 1,
            },
        ]);
        const pipeline = new auditLogPipeline_js_1.AuditLogPipeline({
            logDir: tmpDir,
            streamName: 'test-audit',
            bus,
            alertEngine: alerts,
            maxRecent: 10,
        });
        bus.publish({
            level: 'info',
            message: 'user viewed record',
            tenantId: 'tenant-1',
            userId: 'user-123',
            context: {
                audit: { action: 'view', resource: 'case:42', compliance: ['SOC2'] },
                correlationId: 'corr-1',
            },
        });
        bus.publish({
            level: 'error',
            message: 'failed to update record',
            tenantId: 'tenant-1',
            userId: 'user-123',
            context: {
                audit: {
                    action: 'update',
                    outcome: 'failure',
                    resource: 'case:42',
                    compliance: ['HIPAA'],
                    ip: '10.0.0.5',
                    userAgent: 'jest',
                },
            },
        });
        await sleep(50);
        const fileContent = fs_1.default.readFileSync(path_1.default.join(tmpDir, 'test-audit.jsonl'), 'utf8');
        const lines = fileContent
            .split('\n')
            .filter(Boolean)
            .map((line) => JSON.parse(line));
        (0, globals_1.expect)(lines).toHaveLength(2);
        (0, globals_1.expect)(lines[0]).toMatchObject({
            stream: 'test-audit',
            tenantId: 'tenant-1',
            audit: { action: 'view', resource: 'case:42' },
        });
        (0, globals_1.expect)(lines[1]).toMatchObject({
            level: 'error',
            audit: { outcome: 'failure', ip: '10.0.0.5' },
        });
        const snapshot = pipeline.getDashboardSnapshot();
        (0, globals_1.expect)(snapshot.metrics.totalEvents).toBe(2);
        (0, globals_1.expect)(snapshot.metrics.perLevel.error).toBe(1);
        (0, globals_1.expect)(snapshot.metrics.perTenant['tenant-1']).toBe(2);
        (0, globals_1.expect)(snapshot.metrics.compliance).toEqual({});
        (0, globals_1.expect)(snapshot.recentEvents[0].audit?.resource).toBe('case:42');
        pipeline.stop();
    });
});
