"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const zlib_1 = require("zlib");
const tar_stream_1 = __importDefault(require("tar-stream"));
const stream_1 = require("stream");
const server_1 = __importDefault(require("../src/server"));
const ledger_1 = require("../src/ledger");
async function unpackBundle(buffer) {
    const extract = tar_stream_1.default.extract();
    const files = {};
    return new Promise((resolve, reject) => {
        extract.on('entry', (header, stream, next) => {
            const chunks = [];
            stream.on('data', (d) => chunks.push(d));
            stream.on('end', () => {
                files[header.name] = Buffer.concat(chunks).toString();
                next();
            });
            stream.on('error', reject);
        });
        extract.on('finish', () => resolve(files));
        extract.on('error', reject);
        stream_1.Readable.from(buffer).pipe((0, zlib_1.createGunzip)()).pipe(extract);
    });
}
describe('export bundle assembler', () => {
    beforeAll(async () => {
        await server_1.default.ready();
    });
    afterAll(async () => {
        await server_1.default.close();
    });
    it('bundles receipts, policy decisions, and redaction metadata', async () => {
        const evidence = (0, ledger_1.registerEvidence)({
            contentHash: 'hash-export',
            licenseId: 'MIT',
            source: 'source-a',
            transforms: [],
        });
        const claim = (0, ledger_1.createClaim)({
            evidenceIds: [evidence.id],
            text: 'exportable claim',
            confidence: 0.92,
            links: ['ref'],
        });
        const receipts = [
            {
                id: 'rec-1',
                subject: 'case-123',
                type: 'ingest',
                issuedAt: new Date().toISOString(),
                actor: 'analyst',
                payload: { exposure: 'secret', safe: 'ok', pii: '123-45-6789' },
            },
            {
                id: 'rec-2',
                subject: 'case-123',
                type: 'decision',
                issuedAt: new Date().toISOString(),
                actor: 'ops',
                payload: { note: 'drop-me' },
            },
        ];
        const policyDecisions = [
            {
                id: 'pol-1',
                decision: 'allow',
                rationale: 'approved for export',
                policy: 'opa/bundle',
                createdAt: new Date().toISOString(),
                attributes: { visibility: 'internal' },
            },
        ];
        const response = await (0, supertest_1.default)(server_1.default.server)
            .post('/prov/export/case-123')
            .send({
            claimId: [claim.id],
            context: {
                user_id: 'user-1',
                user_role: 'analyst',
                tenant_id: 'tenant-1',
                purpose: 'analysis',
                export_type: 'report',
                approvals: ['compliance-officer'],
                step_up_verified: true,
            },
            receipts,
            policyDecisions,
            redaction: {
                allowReceiptIds: ['rec-1'],
                redactFields: ['pii', 'exposure'],
                maskFields: ['actor'],
            },
        })
            .buffer(true)
            .parse((res, callback) => {
            const data = [];
            res.on('data', (chunk) => data.push(chunk));
            res.on('end', () => callback(null, Buffer.concat(data)));
        })
            .expect(200);
        const files = await unpackBundle(response.body);
        const manifest = JSON.parse(files['manifest.json']);
        const bundledReceipts = JSON.parse(files['receipts.json']);
        const bundledPolicy = JSON.parse(files['policy-decisions.json']);
        const metadata = JSON.parse(files['metadata.json']);
        expect(manifest.export.receipts).toBe(1);
        expect(manifest.export.policyDecisions).toBe(1);
        expect(bundledReceipts).toHaveLength(1);
        expect(bundledReceipts[0].payload.pii).toBeUndefined();
        expect(bundledReceipts[0].payload.exposure).toBeUndefined();
        expect(bundledReceipts[0].actor).toBe('[REDACTED]');
        expect(bundledPolicy[0].attributes.visibility).toBe('internal');
        expect(metadata.redaction.applied).toBe(true);
        expect(metadata.redaction.droppedReceipts).toEqual(['rec-2']);
        expect(metadata.redaction.redactedFields).toEqual(expect.arrayContaining(['payload.pii', 'payload.exposure']));
        expect(metadata.redaction.maskedFields).toContain('actor');
    });
});
