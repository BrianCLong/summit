"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const crypto_1 = __importDefault(require("crypto"));
const receipt_signing_js_1 = require("../../src/maestro/evidence/receipt-signing.js");
const provenance_service_js_1 = require("../../src/maestro/evidence/provenance-service.js");
const mockQuery = globals_1.jest.fn();
globals_1.jest.mock('../../src/db/postgres.js', () => ({
    getPostgresPool: () => ({
        query: mockQuery,
    }),
}));
(0, globals_1.describe)('maestro receipt chain verification', () => {
    (0, globals_1.beforeEach)(() => {
        mockQuery.mockReset();
        delete process.env.EVIDENCE_SIGNING_KEYS;
        delete process.env.EVIDENCE_SIGNER_KID;
        delete process.env.EVIDENCE_SIGNING_SECRET;
        delete process.env.EVIDENCE_SIGNING_KEY;
    });
    (0, globals_1.it)('verifies receipts signed with rotated keys', () => {
        process.env.EVIDENCE_SIGNING_KEYS = JSON.stringify({
            kidA: 'alpha',
            kidB: 'bravo',
        });
        process.env.EVIDENCE_SIGNER_KID = 'kidB';
        const payload = {
            spec_version: '1.0.0',
            id: 'receipt-1',
            timestamp: '2026-01-02T00:00:00Z',
            correlation_id: 'run-1',
            tenant_id: 'tenant-1',
            actor: { id: 'system', principal_type: 'system' },
            action: 'maestro.task.started',
            resource: { id: 'task-1', type: 'maestro.task' },
            policy: {
                decision_id: 'decision-1',
                policy_set: 'maestro.policy.guard.v1',
                evaluation_timestamp: '2026-01-02T00:00:00Z',
            },
            result: { status: 'success' },
        };
        const signature = (0, receipt_signing_js_1.buildReceiptSignature)(payload);
        (0, globals_1.expect)(signature.key_id).toBe('kidB');
        (0, globals_1.expect)((0, receipt_signing_js_1.verifyReceiptSignature)(payload, signature)).toBe(true);
    });
    (0, globals_1.it)('verifies receipt chain traversal and signatures', async () => {
        process.env.EVIDENCE_SIGNING_KEY = 'chain-secret';
        const service = new provenance_service_js_1.EvidenceProvenanceService();
        const chainData1 = JSON.stringify({
            artifactId: 'receipt-1',
            previousHash: null,
            currentHash: 'hash-1',
            timestamp: '2026-01-02T00:00:01Z',
            runId: 'run-1',
        });
        const chainData2 = JSON.stringify({
            artifactId: 'receipt-2',
            previousHash: 'hash-1',
            currentHash: 'hash-2',
            timestamp: '2026-01-02T00:00:02Z',
            runId: 'run-1',
        });
        const signature1 = crypto_1.default
            .createHmac('sha256', process.env.EVIDENCE_SIGNING_KEY)
            .update(chainData1)
            .digest('hex');
        const signature2 = crypto_1.default
            .createHmac('sha256', process.env.EVIDENCE_SIGNING_KEY)
            .update(chainData2)
            .digest('hex');
        mockQuery.mockResolvedValueOnce({
            rows: [
                {
                    artifact_id: 'receipt-1',
                    sha256_hash: 'hash-1',
                    created_at: '2026-01-02T00:00:01Z',
                    previous_hash: null,
                    current_hash: 'hash-1',
                    signature: signature1,
                    chain_data: chainData1,
                },
                {
                    artifact_id: 'receipt-2',
                    sha256_hash: 'hash-2',
                    created_at: '2026-01-02T00:00:02Z',
                    previous_hash: 'hash-1',
                    current_hash: 'hash-2',
                    signature: signature2,
                    chain_data: chainData2,
                },
            ],
        });
        const verification = await service.verifyReceiptChain('run-1');
        (0, globals_1.expect)(verification.valid).toBe(true);
        (0, globals_1.expect)(verification.errors).toHaveLength(0);
        (0, globals_1.expect)(verification.chain).toHaveLength(2);
    });
});
