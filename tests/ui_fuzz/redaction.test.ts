import { readFileSync } from 'node:fs';
import path from 'node:path';
import { redactString, redactUrl } from '../../tools/ui_fuzz/src/redaction.js';

describe('ui fuzz redaction', () => {
  const fixturePath = path.join(
    process.cwd(),
    '__tests__',
    'fixtures',
    'ui_fuzz',
    'urls.json',
  );
  const fixtures = JSON.parse(readFileSync(fixturePath, 'utf8')) as Record<string, string>;

  it('redacts query tokens', () => {
    expect(redactUrl(fixtures.withToken)).toContain('token=[REDACTED]');
  });

  it('redacts access_token', () => {
    expect(redactUrl(fixtures.withAccessToken)).toContain('access_token=[REDACTED]');
  });

  it('redacts bearer tokens', () => {
    expect(redactString(fixtures.withBearer.toLowerCase())).toContain('bearer [REDACTED]');
  });
});
