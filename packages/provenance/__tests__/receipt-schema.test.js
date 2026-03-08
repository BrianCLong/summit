"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const _2020_1 = __importDefault(require("ajv/dist/2020"));
const ajv_formats_1 = __importDefault(require("ajv-formats"));
const receiptSchema = JSON.parse(fs_1.default.readFileSync(path_1.default.resolve(__dirname, '../../../../prov-ledger/schema/receipt.v0.1.json'), 'utf-8'));
const ajv = new _2020_1.default({ allErrors: true });
(0, ajv_formats_1.default)(ajv);
const hex = (char) => char.repeat(64);
describe('receipt schema', () => {
    it('validates a complete signed receipt', () => {
        const receipt = {
            id: 'receipt-12345678',
            version: '0.1.0',
            caseId: 'case-abc',
            claimIds: ['claim-1', 'claim-2'],
            createdAt: '2025-01-01T00:00:00.000Z',
            actor: { id: 'actor-1', role: 'analyst', tenantId: 'tenant-1', displayName: 'Analyst One' },
            pipeline: { stage: 'ingest', runId: 'run-1', taskId: 'task-1', step: 'step-1' },
            payloadHash: hex('a'),
            signature: {
                algorithm: 'ed25519',
                keyId: 'key-1',
                publicKey: Buffer.from('public-key').toString('base64'),
                value: Buffer.from('signature').toString('base64'),
                signedAt: '2025-01-01T00:00:00.000Z',
            },
            proofs: {
                receiptHash: hex('b'),
                manifestMerkleRoot: hex('c'),
                claimHashes: [hex('d')],
            },
            metadata: { region: 'us-east-1' },
            redactions: [
                {
                    path: 'metadata.secret',
                    reason: 'policy',
                    appliedAt: '2025-01-02T00:00:00.000Z',
                    appliedBy: 'system',
                },
            ],
        };
        const validate = ajv.compile(receiptSchema);
        expect(validate(receipt)).toBe(true);
        expect(validate.errors).toBeNull();
    });
    it('rejects payloads with the wrong schema version', () => {
        const validate = ajv.compile(receiptSchema);
        const invalid = {
            id: 'receipt-87654321',
            version: '0.0.1',
            caseId: 'case-xyz',
            claimIds: ['claim-9'],
            createdAt: '2025-01-01T00:00:00.000Z',
            actor: { id: 'actor-9', role: 'analyst' },
            payloadHash: hex('e'),
            signature: {
                algorithm: 'ed25519',
                keyId: 'key-9',
                publicKey: Buffer.from('public-key').toString('base64'),
                value: Buffer.from('signature').toString('base64'),
                signedAt: '2025-01-01T00:00:00.000Z',
            },
            proofs: {
                receiptHash: hex('f'),
            },
        };
        expect(validate(invalid)).toBe(false);
        expect(validate.errors).not.toBeNull();
    });
});
