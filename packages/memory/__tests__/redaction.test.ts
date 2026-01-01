import { redactPrivateContent } from '../src/utils/redaction.js';

describe('redactPrivateContent', () => {
  it('removes private sections', () => {
    const input = 'Keep this <private>secret</private> safe.';
    expect(redactPrivateContent(input)).toBe('Keep this [redacted] safe.');
  });

  it('handles multiple occurrences', () => {
    const input = '<private>a</private> public <private>b</private>';
    expect(redactPrivateContent(input)).toBe('[redacted] public [redacted]');
  });
});
