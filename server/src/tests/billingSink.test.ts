import { BillingAdapter } from '../billing/sink';
import { createHmac } from 'crypto';

// Mock S3
const mockSend = jest.fn();
jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn(() => ({
    send: mockSend
  })),
  PutObjectCommand: jest.fn((args) => args)
}));

describe('BillingAdapter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.BILLING_ENABLED = 'true';
    process.env.BILLING_HMAC_SECRET = 'test-secret';
  });

  // Helper to match implementation logic
  function escapeCsv(field: any): string {
    if (field === null || field === undefined) return '';
    const stringField = String(field);
    if (stringField.includes(',') || stringField.includes('"') || stringField.includes('\n')) {
        return `"${stringField.replace(/"/g, '""')}"`;
    }
    return stringField;
  }

  it('should sign and export usage correctly', async () => {
    const adapter = new BillingAdapter();
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

    expect(mockSend).toHaveBeenCalledTimes(1);
    const callArgs = mockSend.mock.calls[0][0];

    // Verify CSV structure
    const body = callArgs.Body;
    const parts = body.split(',');
    // Note: signature is the last part, but payload might contain commas if escaped.
    // For this test data, no fields need escaping.

    expect(parts[0]).toBe('t1');
    expect(parts[3]).toBe('100');

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
    const expectedSig = createHmac('sha256', 'test-secret')
      .update(payloadToSign)
      .digest('hex');

    expect(signature).toBe(expectedSig);
  });

  it('should retry on failure', async () => {
    mockSend.mockRejectedValueOnce(new Error('S3 Error')).mockResolvedValueOnce({});

    const adapter = new BillingAdapter();
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
    expect(mockSend).toHaveBeenCalledTimes(2);
  });
});
