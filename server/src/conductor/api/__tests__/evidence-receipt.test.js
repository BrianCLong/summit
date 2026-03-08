"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const crypto_1 = __importDefault(require("crypto"));
const express_1 = __importDefault(require("express"));
const supertest_1 = __importDefault(require("supertest"));
const receipt_js_1 = require("../../../maestro/evidence/receipt.js");
const evidence_routes_js_1 = require("../evidence-routes.js");
globals_1.jest.mock('../../auth/rbac-middleware.js', () => {
    const allow = (permission) => (req, res, next) => {
        if (req.headers[`x-allow-${permission}`]) {
            req.user = { userId: 'user-1', permissions: [permission] };
            return next();
        }
        return res.status(403).json({ error: 'Insufficient permissions', required: permission });
    };
    return {
        requirePermission: allow,
        authenticateUser: (_req, _res, next) => next(),
    };
});
const queryMock = globals_1.jest.fn();
globals_1.jest.mock('../../../db/postgres.js', () => ({
    getPostgresPool: () => ({
        query: (...args) => queryMock(...args),
    }),
}));
const describeIf = process.env.NO_NETWORK_LISTEN === 'true' ? globals_1.describe.skip : globals_1.describe;
describeIf('evidence receipt routes', () => {
    const app = (0, express_1.default)();
    app.use('/api/conductor/evidence', evidence_routes_js_1.evidenceRoutes);
    (0, globals_1.beforeEach)(() => {
        globals_1.jest.useFakeTimers().setSystemTime(new Date('2024-01-02T00:00:00Z'));
        process.env.EVIDENCE_SIGNING_SECRET = 'test-secret';
        queryMock.mockReset();
    });
    (0, globals_1.afterEach)(() => {
        globals_1.jest.restoreAllMocks();
        globals_1.jest.useRealTimers();
    });
    test('canonical hashing is deterministic', () => {
        const a = { b: 1, a: [{ z: 2, y: 3 }] };
        const b = { a: [{ y: 3, z: 2 }], b: 1 };
        const hashA = (0, receipt_js_1.hashCanonical)(a);
        const hashB = (0, receipt_js_1.hashCanonical)(b);
        (0, globals_1.expect)(hashA).toEqual(hashB);
    });
    test('signature verification matches HMAC computation', () => {
        const payload = { receiptId: 'r1', runId: 'run', codeDigest: 'abc' };
        const secret = 'secret-value';
        const signature = (0, receipt_js_1.signReceiptPayload)(payload, secret);
        const expected = crypto_1.default
            .createHmac('sha256', secret)
            .update((0, receipt_js_1.canonicalStringify)(payload))
            .digest('base64url');
        (0, globals_1.expect)(signature).toEqual(expected);
    });
    test('POST /receipt stores artifact and returns receipt', async () => {
        const runRow = {
            id: 'run-1',
            runbook: 'demo',
            status: 'COMPLETED',
            started_at: '2024-01-01T00:00:00Z',
            ended_at: '2024-01-01T01:00:00Z',
        };
        const events = [
            {
                kind: 'schedule.dispatched',
                payload: { schedule: 'nightly' },
                ts: '2024-01-01T00:00:00Z',
            },
        ];
        const artifacts = [
            {
                id: 'artifact-1',
                artifact_type: 'log',
                sha256_hash: 'abc123',
                created_at: '2024-01-01T00:10:00Z',
            },
        ];
        queryMock
            .mockResolvedValueOnce({ rows: [runRow] })
            .mockResolvedValueOnce({ rows: events })
            .mockResolvedValueOnce({ rows: artifacts })
            .mockResolvedValue({ rows: [] });
        globals_1.jest
            .spyOn(crypto_1.default, 'randomUUID')
            .mockReturnValueOnce('receipt-uuid')
            .mockReturnValueOnce('artifact-uuid');
        const res = await (0, supertest_1.default)(app)
            .post('/api/conductor/evidence/receipt')
            .set('x-allow-evidence:create', '1')
            .send({ runId: 'run-1' });
        (0, globals_1.expect)(res.status).toBe(200);
        (0, globals_1.expect)(res.body.success).toBe(true);
        (0, globals_1.expect)(res.body.data.artifactId).toBe('artifact-uuid');
        const receipt = res.body.data.receipt;
        const recomputedSignature = crypto_1.default
            .createHmac('sha256', 'test-secret')
            .update((0, receipt_js_1.canonicalStringify)({ ...receipt, signature: undefined }))
            .digest('base64url');
        (0, globals_1.expect)(receipt.signature).toEqual(recomputedSignature);
        (0, globals_1.expect)(queryMock).toHaveBeenCalledWith(globals_1.expect.stringContaining('INSERT INTO evidence_artifacts'), globals_1.expect.arrayContaining(['artifact-uuid', 'run-1']));
        (0, globals_1.expect)(queryMock).toHaveBeenCalledWith(globals_1.expect.stringContaining('INSERT INTO evidence_artifact_content'), globals_1.expect.arrayContaining(['artifact-uuid']));
    });
    test('GET /receipt/:runId returns stored receipt', async () => {
        const receipt = { hello: 'world' };
        queryMock
            .mockResolvedValueOnce({ rows: [{ id: 'artifact-uuid' }] })
            .mockResolvedValueOnce({ rows: [{ content: Buffer.from(JSON.stringify(receipt)) }] });
        const res = await (0, supertest_1.default)(app)
            .get('/api/conductor/evidence/receipt/run-1')
            .set('x-allow-evidence:read', '1');
        (0, globals_1.expect)(res.status).toBe(200);
        (0, globals_1.expect)(res.body.data.receipt).toEqual(receipt);
    });
    test('GET /receipt/:runId returns 404 when missing', async () => {
        queryMock.mockResolvedValueOnce({ rows: [] });
        const res = await (0, supertest_1.default)(app)
            .get('/api/conductor/evidence/receipt/run-unknown')
            .set('x-allow-evidence:read', '1');
        (0, globals_1.expect)(res.status).toBe(404);
    });
    test('RBAC denies when permission missing', async () => {
        const res = await (0, supertest_1.default)(app)
            .post('/api/conductor/evidence/receipt')
            .send({ runId: 'run-1' });
        (0, globals_1.expect)(res.status).toBe(403);
    });
});
