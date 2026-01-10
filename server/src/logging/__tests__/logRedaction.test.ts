import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import { redactLogLine, sanitizeLogArguments } from '../logRedaction.js';

describe('redactLogLine', () => {
  it('redacts common token formats', () => {
    const line =
      'Authorization: Bearer abcdef1234567890 api_key=abcdEFGH12345678 ghp_abcdefghijklmnopqrstuvwxyz123456 slack xoxb-1234567890-secret';

    const redacted = redactLogLine(line);

    expect(redacted).toContain('Bearer [REDACTED]');
    expect(redacted).not.toMatch(/ghp_[A-Za-z0-9]{20,}/);
    expect(redacted).toContain('[REDACTED_GITHUB_TOKEN]');
    expect(redacted).toContain('api_key=[REDACTED]');
    expect(redacted).toContain('[REDACTED_SLACK_TOKEN]');
  });

  it('does not over-redact benign strings', () => {
    const benign = 'tokenization strategy keeps api key rotation documented.';
    expect(redactLogLine(benign)).toBe(benign);
  });
});

describe('sanitizeLogArguments', () => {
  it('recursively redacts strings inside structured arguments', () => {
    const args = sanitizeLogArguments([
      { details: 'password=SuperSecretValue123', nested: { header: 'Bearer qwerty0987654321' } },
      ['AKIAABCD1234567890EF ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890abcd'],
    ]);

    expect(args[0]).toEqual({
      details: 'password=[REDACTED]',
      nested: { header: 'Bearer [REDACTED]' },
    });
    expect(args[1]).toEqual(['[REDACTED_AWS_KEY] [REDACTED_AWS_SECRET]']);
  });
});
