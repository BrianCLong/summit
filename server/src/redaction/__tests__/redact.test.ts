import { jest } from '@jest/globals';

// Mock dependencies
jest.mock('@opentelemetry/api', () => ({
  trace: {
    getTracer: () => ({
      startActiveSpan: (_name: string, callback: any) => {
        const span = {
          setAttributes: jest.fn(),
          recordException: jest.fn(),
          setStatus: jest.fn(),
          end: jest.fn(),
        };
        // Mock async callback handling
        const result = callback(span);
        if (result && typeof result.then === 'function') {
            return result.then((val: any) => {
                return val;
            });
        }
        return result;
      },
    }),
  },
}));

jest.mock('prom-client', () => {
  return {
    Counter: class {
      inc() {}
    },
  };
});

// Import after mocks
import { RedactionService } from '../redact.js';

describe('RedactionService', () => {
  let service: RedactionService;
  const tenantId = 'test-tenant';

  beforeEach(() => {
    service = new RedactionService();
  });

  it('should redact sensitive fields based on policy', async () => {
    const sensitiveData = {
      password: 'supersecretpassword',
      token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
      apiKey: 'sk_live_1234567890',
      secret: 'my_secret_value',
      email: 'test@example.com', // existing sensitive field
    };

    const policy = service.createRedactionPolicy(['sensitive', 'pii']);

    const result = await service.redactObject(sensitiveData, policy, tenantId);

    // email is already in FIELD_METADATA as pii
    expect(result.email).not.toBe('test@example.com');

    // These are expected to fail initially because they are missing from FIELD_METADATA
    expect(result.password).toBe('[REDACTED]');
    expect(result.token).toBe('[REDACTED]');
    expect(result.apiKey).toBe('[REDACTED]');
    expect(result.secret).toBe('[REDACTED]');
  });

  it('should redact known sensitive fields', async () => {
    const data = {
      creditCard: '1234-5678-9012-3456',
      ssn: '123-45-6789',
    };

    const policy = service.createRedactionPolicy(['financial', 'pii']);
    const result = await service.redactObject(data, policy, tenantId);

    expect(result.creditCard).toContain('3456'); // Last 4 digits
    expect(result.creditCard).toContain('[REDACTED]');
    expect(result.ssn).toContain('1'); // First char
    expect(result.ssn).toContain('9'); // Last char
    expect(result.ssn).toContain('[REDACTED]');
  });
});
