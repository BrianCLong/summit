import { redactText, stripQueryParams } from '../../src/connectors/platform-watch/redact';

describe('platform-watch redaction', () => {
  it('redacts emails and tokens', () => {
    const input = 'Contact me at test@example.com bearer ABCDEFG12345 token=secretvalue';
    const output = redactText(input);
    expect(output).toContain('[redacted-email]');
    expect(output).toContain('bearer [redacted-token]');
    expect(output).toContain('token=[redacted]');
  });

  it('strips query params from urls', () => {
    const cleaned = stripQueryParams('https://example.com/path?utm_source=abc#frag');
    expect(cleaned).toBe('https://example.com/path');
  });
});
