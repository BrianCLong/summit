import { redactionService } from '../../server/src/redaction/redact';

describe('PII redaction policies', () => {
  const sample = {
    email: 'analyst@example.com',
    phone: '+1-555-123-4567',
    ssn: '123-45-6789',
    ip: '192.168.1.22',
    userId: 'user-123',
    context: {
      location: { lat: 40.7128, lon: -74.006 },
    },
    publicNote: 'safe',
  };

  it('redacts known PII and sensitive fields', async () => {
    const policy = redactionService.createRedactionPolicy(['pii', 'sensitive']);

    const redacted = await redactionService.redactObject(
      sample,
      policy,
      'tenant-test',
    );

    expect(redacted.email).not.toEqual(sample.email);
    expect(redacted.phone).not.toEqual(sample.phone);
    expect(redacted.ssn).not.toEqual(sample.ssn);
    expect(redacted.ip).toContain('[REDACTED]');
    expect(typeof redacted.context.location).toBe('string');
    expect(redacted.publicNote).toEqual('safe');
  });

  it('respects allowedFields overrides', async () => {
    const policy = redactionService.createRedactionPolicy(['pii'], {
      allowedFields: ['email', 'publicNote'],
    });

    const redacted = await redactionService.redactObject(
      sample,
      policy,
      'tenant-test',
    );

    expect(redacted.email).toEqual(sample.email);
    expect(redacted.publicNote).toEqual(sample.publicNote);
    expect(redacted.phone).not.toEqual(sample.phone);
    expect(redacted.ssn).not.toEqual(sample.ssn);
  });
});
