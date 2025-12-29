import { getRedactionLists, sanitizeForProvenance } from '../src/utils/redactionLists.js';

describe('redaction allowlist/denylist config', () => {
  it('loads lists from the shared config file', () => {
    const lists = getRedactionLists();

    expect(lists.allowlist).toContain('requestId');
    expect(lists.denylist).toContain('email');
  });

  it('masks denied fields while preserving allowlisted fields and structure', () => {
    const payload = {
      requestId: 'req-123',
      email: 'user@example.com',
      nested: {
        sessionId: 'abc123',
        traceId: 'trace-xyz',
      },
    };

    const sanitized = sanitizeForProvenance(payload);

    expect(sanitized.requestId).toBe('req-123');
    expect(sanitized.email).toBe('[REDACTED]');
    expect(sanitized.nested.sessionId).toBe('[REDACTED]');
    expect(sanitized.nested.traceId).toBe('trace-xyz');
  });
});
