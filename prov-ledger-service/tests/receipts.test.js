"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const tar_stream_1 = __importDefault(require("tar-stream"));
const zlib_1 = require("zlib");
const server_1 = __importDefault(require("../src/server"));
const provenance_1 = require("@intelgraph/provenance");
function bufferParser(res, callback) {
    const data = [];
    res.on('data', (chunk) => data.push(chunk));
    res.on('end', () => callback(null, Buffer.concat(data)));
}
describe('receipt routes', () => {
    it('issues, retrieves, and exports receipts with redaction metadata', async () => {
        const ev = await (0, supertest_1.default)(server_1.default.server).post('/evidence/register').send({
            contentHash: 'abcd',
            licenseId: 'MIT',
            source: 'sensor-A',
            transforms: [],
        });
        expect(ev.status).toBe(200);
        const claim = await (0, supertest_1.default)(server_1.default.server).post('/claims').send({
            evidenceId: [ev.body.evidenceId],
            text: 'receipt claim',
            confidence: 0.9,
            links: [],
            caseId: 'case-42',
            actor: { id: 'agent-1', role: 'analyst' },
            redactions: [{ path: 'actor.id', reason: 'privacy' }],
        });
        expect(claim.status).toBe(200);
        expect(claim.body.receiptId).toBeDefined();
        const receiptId = claim.body.receiptId;
        const receiptRes = await (0, supertest_1.default)(server_1.default.server).get(`/receipts/${receiptId}`);
        expect(receiptRes.status).toBe(200);
        expect(receiptRes.body.valid).toBe(true);
        expect((0, provenance_1.verifyReceiptSignature)(receiptRes.body.receipt)).toBe(true);
        const exportRes = await (0, supertest_1.default)(server_1.default.server)
            .post('/receipts/export')
            .send({
            receiptIds: [receiptId],
            includeProvenance: true,
            redactions: [{ path: 'actor.role', reason: 'least-privilege' }],
        })
            .buffer()
            .parse(bufferParser);
        expect(exportRes.status).toBe(200);
        const entries = [];
        const gunzip = (0, zlib_1.createGunzip)();
        const extract = tar_stream_1.default.extract();
        const bundleBuffer = exportRes.body;
        await new Promise((resolve, reject) => {
            extract.on('entry', (header, stream, next) => {
                entries.push(header.name);
                stream.on('end', next);
                stream.on('error', reject);
                stream.resume();
            });
            extract.on('finish', resolve);
            gunzip.on('error', reject);
            extract.on('error', reject);
            gunzip.pipe(extract);
            gunzip.end(bundleBuffer);
        });
        expect(entries).toContain(`receipts/full/${receiptId}.json`);
        expect(entries).toContain(`receipts/redacted/${receiptId}.json`);
        expect(entries.some((e) => e.startsWith('provenance/'))).toBe(true);
    });
});
