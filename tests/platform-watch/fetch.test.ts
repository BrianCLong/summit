import { assertAllowedUrl } from '../../src/connectors/platform-watch/fetch';
import { ALLOWED_URL_PREFIXES } from '../../src/connectors/platform-watch/sources';

describe('platform-watch allowlist', () => {
  it('allows known source prefixes', () => {
    const sample = `${ALLOWED_URL_PREFIXES[0]}index.html`;
    expect(() => assertAllowedUrl(sample)).not.toThrow();
  });

  it('blocks off-allowlist urls', () => {
    expect(() => assertAllowedUrl('https://example.com/evil')).toThrow(
      'URL not in allowlist',
    );
  });
});
