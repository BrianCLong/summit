import { describe, expect, test } from 'vitest';
import { redactSensitive } from '../../src/evidence/writer';

describe('redaction', () => {
  test('removes disallowed PII-bearing keys from finding payloads', () => {
    const redacted = redactSensitive({
      raw_media_bytes: 'abc',
      faces: ['face1'],
      phone_numbers: ['+1-555'],
      emails: ['a@example.com'],
      keep_me: 'ok',
    });

    expect(redacted).toEqual({ keep_me: 'ok' });
  });
});
