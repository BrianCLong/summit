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

  it('redacts additional PII markers including network and session data', async () => {
    const sample = {
      ip: '203.0.113.10',
      location: { city: 'Denver', state: 'CO' },
      sessionId: 'sess-abc-123',
      metadata: { requestId: 'keep-me' },
    };

    const redacted = await redactionService.redactObject(
      sample,
      policy as any,
      'tenant-session',
    );

    expect(redacted.ip).toContain('[REDACTED]');
    expect(redacted.location).toBe('[REDACTED]');
    expect(redacted.sessionId).toContain('[REDACTED]');
    expect(redacted.metadata.requestId).toBe('keep-me');
  });

  it('honors allowedFields while redacting everything else', async () => {
    const sample = {
      email: 'allowed@example.com',
      phone: '+1-555-0100',
      userId: 'user-456',
      note: 'leave intact',
    };

    const allowList = redactionService.createRedactionPolicy(['pii'], {
      allowedFields: ['email', 'note'],
    });

    const redacted = await redactionService.redactObject(
      sample,
      allowList as any,
      'tenant-allowlist',
    );

    expect(redacted.email).toBe(sample.email);
    expect(redacted.note).toBe(sample.note);
    expect(redacted.phone).toContain('[REDACTED]');
    expect(redacted.userId).toContain('[REDACTED]');
  });
});
