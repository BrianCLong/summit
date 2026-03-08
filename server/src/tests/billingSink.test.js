"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const sink_js_1 = require("../billing/sink.js");
const crypto_1 = require("crypto");
// Mock S3
// Mock S3
globals_1.jest.mock('@aws-sdk/client-s3');
const client_s3_1 = require("@aws-sdk/client-s3");
const mockSend = globals_1.jest.fn();
client_s3_1.S3Client.mockImplementation(() => ({
    send: mockSend,
}));
// @ts-ignore
const client_s3_2 = require("@aws-sdk/client-s3");
client_s3_2.PutObjectCommand.mockImplementation((args) => args);
(0, globals_1.describe)('BillingAdapter', () => {
    (0, globals_1.beforeEach)(() => {
        globals_1.jest.clearAllMocks();
        process.env.BILLING_ENABLED = 'true';
        process.env.BILLING_HMAC_SECRET = 'test-secret';
    });
    // Helper to match implementation logic
    function escapeCsv(field) {
        if (field === null || field === undefined)
            return '';
        const stringField = String(field);
        if (stringField.includes(',') || stringField.includes('"') || stringField.includes('\n')) {
            return `"${stringField.replace(/"/g, '""')}"`;
        }
        return stringField;
    }
    (0, globals_1.it)('should sign and export usage correctly', async () => {
        const adapter = new sink_js_1.BillingAdapter();
        const record = {
            tenant_id: 't1',
            period_start: '2026-03-20T00:00:00Z',
            period_end: '2026-03-20T23:59:59Z',
            api_calls: 100,
            ingest_events: 50,
            egress_gb: 1.5,
            plan: 'standard',
            quota_overrides: false
        };
        const result = await adapter.exportUsage(record);
        (0, globals_1.expect)(mockSend).toHaveBeenCalledTimes(1);
        const callArgs = mockSend.mock.calls[0][0];
        // Verify CSV structure
        const body = callArgs.Body;
        const parts = body.split(',');
        // Note: signature is the last part, but payload might contain commas if escaped.
        // For this test data, no fields need escaping.
        (0, globals_1.expect)(parts[0]).toBe('t1');
        (0, globals_1.expect)(parts[3]).toBe('100');
        // Verify signature
        // Reconstruct payload exactly as implementation does
        const fields = [
            record.tenant_id,
            record.period_start,
            record.period_end,
            record.api_calls,
            record.ingest_events,
            record.egress_gb,
            record.plan,
            record.quota_overrides
        ];
        const payloadToSign = fields.map(escapeCsv).join(',');
        const signature = body.substring(body.lastIndexOf(',') + 1);
        const expectedSig = (0, crypto_1.createHmac)('sha256', 'test-secret')
            .update(payloadToSign)
            .digest('hex');
        (0, globals_1.expect)(signature).toBe(expectedSig);
    });
    (0, globals_1.it)('should retry on failure', async () => {
        mockSend.mockRejectedValueOnce(new Error('S3 Error')).mockResolvedValueOnce({});
        const adapter = new sink_js_1.BillingAdapter();
        const record = {
            tenant_id: 't1',
            period_start: '2026-03-20T00:00:00Z',
            period_end: '2026-03-20T23:59:59Z',
            api_calls: 100,
            ingest_events: 50,
            egress_gb: 1.5,
            plan: 'standard',
            quota_overrides: false
        };
        await adapter.exportUsage(record);
        (0, globals_1.expect)(mockSend).toHaveBeenCalledTimes(2);
    });
});
