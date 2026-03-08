"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const _2020_1 = __importDefault(require("ajv/dist/2020"));
const ajv_formats_1 = __importDefault(require("ajv-formats"));
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
(0, globals_1.describe)('AuditEventV1 schema', () => {
    const schemaPath = path_1.default.join(process.cwd(), 'src', 'audit', 'audit-v1.schema.json');
    const schema = JSON.parse((0, fs_1.readFileSync)(schemaPath, 'utf8'));
    const ajv = new _2020_1.default({ allErrors: true, strict: true });
    (0, ajv_formats_1.default)(ajv);
    const validate = ajv.compile(schema);
    const events = [
        {
            eventId: 'evt-001',
            occurredAt: '2025-01-01T00:00:00.000Z',
            actor: {
                type: 'user',
                id: 'user-123',
                name: 'Analyst One',
                ipAddress: '203.0.113.10',
            },
            action: {
                type: 'user_login',
                name: 'login',
                outcome: 'success',
            },
            target: {
                type: 'session',
                id: 'session-abc',
            },
            tenantId: 'tenant-1',
            traceId: 'trace-001',
            metadata: {
                message: 'User signed in',
            },
        },
        {
            eventId: 'evt-002',
            occurredAt: '2025-01-02T12:34:56.000Z',
            actor: {
                type: 'service',
                id: 'svc-ingest',
                name: 'Ingestion Service',
            },
            action: {
                type: 'data_import',
                name: 'ingest',
                outcome: 'partial',
            },
            target: {
                type: 'artifact',
                id: 'artifact-789',
                path: '/uploads/sample.pdf',
            },
            tenantId: 'tenant-2',
            traceId: 'trace-002',
            metadata: {
                source: 'upload',
                sizeBytes: 2048,
            },
        },
        {
            eventId: 'evt-003',
            occurredAt: '2025-01-03T08:15:30.000Z',
            actor: {
                type: 'system',
                name: 'scheduler',
            },
            action: {
                type: 'policy_decision',
                name: 'policy-eval',
                outcome: 'failure',
            },
            target: {
                type: 'policy',
                id: 'policy-opa-1',
                name: 'Access Policy',
            },
            tenantId: 'tenant-1',
            traceId: 'trace-003',
            metadata: {
                decision: 'deny',
                reason: 'missing clearance',
            },
        },
    ];
    (0, globals_1.it)('matches the audit.v1 schema (golden snapshots)', () => {
        for (const event of events) {
            const valid = validate(event);
            (0, globals_1.expect)(valid).toBe(true);
            (0, globals_1.expect)(validate.errors).toBeNull();
            (0, globals_1.expect)(event).toMatchSnapshot();
        }
    });
});
