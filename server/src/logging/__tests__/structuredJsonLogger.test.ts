import { PassThrough } from 'stream';
import { createStructuredLogger } from '../structuredJsonLogger.js';
import { REQUIRED_LOG_FIELDS } from '../schema.js';

describe('structuredJsonLogger', () => {
  it('emits structured logs with required fields', () => {
    const destination = new PassThrough();
    const buffer: string[] = [];
    destination.on('data', (chunk) => buffer.push(chunk.toString()));

    const logger = createStructuredLogger('receipt-ingestion', { destination });

    const payload = logger.info('receipt stored', {
      correlationId: 'corr-123',
      tenantId: 'tenant-42',
      runId: 'run-1',
    });

    const rawLog = buffer.join('').trim();
    const parsed = rawLog ? JSON.parse(rawLog.split('\n').pop() as string) : payload;

    for (const field of REQUIRED_LOG_FIELDS) {
      expect(payload[field]).toBeDefined();
    }

    expect(payload).toMatchObject({
      level: 'info',
      msg: 'receipt stored',
      correlationId: 'corr-123',
      tenantId: 'tenant-42',
      component: 'receipt-ingestion',
    });

    expect(new Date(payload.timestamp).toString()).not.toBe('Invalid Date');

    if (parsed) {
      for (const field of REQUIRED_LOG_FIELDS) {
        expect((parsed as any)[field]).toBeDefined();
      }

      expect(parsed).toMatchObject({
        level: 'info',
        msg: 'receipt stored',
        correlationId: 'corr-123',
        tenantId: 'tenant-42',
        component: 'receipt-ingestion',
      });
    }
  });
});
