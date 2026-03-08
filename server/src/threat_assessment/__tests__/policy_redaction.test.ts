import { hasForbiddenScoringFields, redactPayload } from '../redaction';

describe('policy redaction', () => {
  it('redacts never-log fields', () => {
    const out = redactPayload({ street_address: '123', safe: 'ok' });
    expect(out.street_address).toBe('[REDACTED]');
    expect(out.safe).toBe('ok');
  });

  it('detects forbidden scoring fields', () => {
    expect(hasForbiddenScoringFields({ ideology: 'x' })).toBe(true);
  });
});
