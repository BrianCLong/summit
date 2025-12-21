import { redactData } from '@/utils/dataRedaction';
import { describe, it, expect } from '@jest/globals';

describe('redactData', () => {
  const sample = {
    email: 'user@example.com',
    properties: { phone: '1234567890', name: 'Alice' },
  };

  it('redacts PII for viewer role', () => {
    const user = { id: '1', role: 'VIEWER' } as any;
    const redacted = redactData(sample, user);
    expect(redacted.email).toBe('[REDACTED]');
    expect(redacted.properties.phone).toBe('[REDACTED]');
    expect(redacted.properties.name).toMatch(/^A\*\*\*e$/);
  });

  it('masks PII for analyst role', () => {
    const user = { id: '2', role: 'ANALYST' } as any;
    const redacted = redactData(sample, user);
    expect(redacted.email).toBe('use***@example.com');
    expect(redacted.properties.phone).toBe('***-***-7890');
  });
});
