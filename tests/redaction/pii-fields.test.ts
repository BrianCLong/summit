import { redactionService } from '../../server/src/redaction/redact';

describe('PII redaction coverage', () => {
  const policy = redactionService.createRedactionPolicy(['pii']);

  it('masks common PII primitives', async () => {
    const sample = {
      email: 'user@example.com',
      phone: '+1-555-111-2222',
      ssn: '123-45-6789',
      userId: 'user-123',
      message: 'keep me',
    };

    const redacted = await redactionService.redactObject(
      sample,
      policy as any,
      'tenant-pii',
    );

    expect(redacted.email).toContain('[REDACTED]');
    expect(redacted.phone).toContain('[REDACTED]');
    expect(redacted.ssn).toContain('[REDACTED]');
    expect(redacted.userId).toContain('[REDACTED]');
    expect(redacted.message).toBe(sample.message);
  });

  it('recursively redacts nested collections', async () => {
    const sample = {
      contacts: [
        { email: 'alpha@sample.io', phone: '+1-202-555-0101' },
        { email: 'beta@sample.io', phone: '+1-202-555-0102' },
      ],
      notes: { email: 'should-hide@corp.test', phone: '555-0199' },
    };

    const redacted = await redactionService.redactObject(
      sample,
      policy as any,
      'tenant-nested',
    );

    for (const contact of redacted.contacts) {
      expect(contact.email).toContain('[REDACTED]');
      expect(contact.phone).toContain('[REDACTED]');
    }
    expect(redacted.notes.email).toContain('[REDACTED]');
    expect(redacted.notes.phone).toContain('[REDACTED]');
  });
});
