// tests/security/longhorizon_redaction.test.ts
import { redactSecrets, redactArtifact } from '../../src/agents/longhorizon/policies/redaction';

describe('LongHorizon Redaction', () => {
  it('should redact AWS keys', () => {
    const raw = 'My key is AKIA1234567890ABCDEF and it is secret.';
    const redacted = redactSecrets(raw);
    expect(redacted).toBe('My key is [REDACTED] and it is secret.');
  });

  it('should redact private keys', () => {
    const raw = '-----BEGIN RSA PRIVATE KEY-----\nMIIEpAIBAAKCAQEA7...\n-----END RSA PRIVATE KEY-----';
    const redacted = redactSecrets(raw);
    expect(redacted).toBe('[REDACTED]');
  });

  it('should redact secrets in nested objects', () => {
    const artifact = {
      logs: 'Error with AKIA1234567890ABCDEF',
      nested: {
        key: 'AKIA1234567890ABCDEF'
      }
    };
    const redacted = redactArtifact(artifact);
    expect(redacted.logs).toBe('Error with [REDACTED]');
    expect(redacted.nested.key).toBe('[REDACTED]');
  });
});
