import { redactionService } from '../../server/src/redaction/redact';

describe('RedactionService PII coverage', () => {
  const policy = { rules: ['pii', 'financial', 'sensitive'] } as any;

  it('masks common PII fields and nested objects', async () => {
    const input = {
      email: 'user@example.com',
      phone: '+1-555-867-5309',
      ssn: '123-45-6789',
      creditCard: '4111111111111111',
      bankAccount: '123456789',
      ip: '127.0.0.1',
      location: { city: 'Denver', region: 'CO' },
      userId: 'user-123',
      sessionId: 'sess-456',
      nested: { email: 'nested@example.com' },
      untouched: 'ok',
    };

    const redacted = await redactionService.redactObject(
      input,
      policy,
      'tenant-1',
    );

    expect(redacted.email).not.toContain('@');
    expect(redacted.phone).not.toContain('555');
    expect(redacted.ssn).toBeDefined();
    expect(redacted.creditCard).not.toContain('4111');
    expect(redacted.bankAccount).not.toBe(input.bankAccount);
    expect(redacted.ip).toBe('[REDACTED]');
    expect(redacted.location).toBe('[REDACTED]');
    expect(redacted.userId).toBe('[REDACTED]');
    expect(redacted.sessionId).toBe('[REDACTED]');
    expect(redacted.nested.email).not.toContain('@');
    expect(redacted.untouched).toBe('ok');
  });
});
