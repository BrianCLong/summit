"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const export_1 = require("./export");
const export_2 = require("../../../../../prov-ledger-service/src/export");
class MockResponse {
    statusCode = 200;
    headers = {};
    payload;
    status(code) {
        this.statusCode = code;
        return this;
    }
    setHeader(name, value) {
        this.headers[name.toLowerCase()] = value;
        return this;
    }
    json(body) {
        this.payload = body;
    }
    send(body) {
        this.payload = body;
    }
}
describe('receipt export handler', () => {
    const handler = (0, export_1.buildReceiptExportHandler)();
    const receipts = [
        {
            id: 'receipt-1',
            subject: 'case-001',
            issuedAt: '2024-05-01T00:00:00Z',
            amount: 1500,
            pii: 'should-be-removed',
        },
    ];
    const policyDecisions = [
        {
            id: 'pd-1',
            rule: 'export:receipts',
            outcome: 'allow',
            issuedAt: '2024-05-01T00:00:00Z',
            reviewer: 'compliance',
        },
    ];
    test('returns bundle with redacted receipts and manifest headers', async () => {
        const res = new MockResponse();
        await handler({
            body: {
                receipts,
                policyDecisions,
                redaction: { receipts: ['pii'], policyDecisions: ['reviewer'] },
            },
        }, res);
        expect(res.statusCode).toBe(200);
        expect(res.headers['content-type']).toBe('application/gzip');
        expect(res.headers['content-disposition']).toContain('receipts-export');
        expect(res.headers['x-manifest-id']).toBeDefined();
        const bundle = res.payload;
        const files = await (0, export_2.unpackBundle)(bundle);
        const receiptsJson = files['receipts.json'];
        expect(receiptsJson).toBeDefined();
        const exportedReceipts = JSON.parse(receiptsJson);
        expect(exportedReceipts[0].pii).toBeUndefined();
        const manifestJson = files['manifest.json'];
        expect(manifestJson).toBeDefined();
        const manifest = JSON.parse(manifestJson);
        expect(manifest.receiptCount).toBe(1);
        expect(manifest.redactionsApplied.receipts).toContain('pii');
    });
    test('returns 400 when payload is invalid', async () => {
        const res = new MockResponse();
        await handler({ body: { receipts: [], policyDecisions: [] } }, res);
        expect(res.statusCode).toBe(400);
        expect(res.payload).toEqual(expect.objectContaining({
            error: 'Failed to generate receipt export',
        }));
    });
});
