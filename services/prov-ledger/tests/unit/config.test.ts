import { mkdtempSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { loadConfig } from '../../src/config';

describe('loadConfig', () => {
  const baseEnv = {
    JWT_ISSUER: 'issuer',
    JWT_AUDIENCE: 'audience',
    JWKS_JSON: JSON.stringify({ keys: [] })
  } as Record<string, string>;

  it('loads configuration with defaults', () => {
    const config = loadConfig(baseEnv);
    expect(config.port).toBe(4010);
    expect(config.host).toBe('0.0.0.0');
    expect(config.features.provLedger).toBe(true);
    expect(config.jwt.allowTestTokens).toBe(false);
  });

  it('parses boolean and numeric env vars', () => {
    const env = {
      ...baseEnv,
      PORT: '4100',
      HOST: '127.0.0.1',
      FEATURES_PROV_LEDGER: 'true',
      JWT_ALLOW_TEST_TOKENS: 'true',
      RATE_LIMIT_MAX: '5',
      RATE_LIMIT_WINDOW_MS: '2000',
      METRICS_ENABLED: 'false'
    };
    const config = loadConfig(env);
    expect(config.port).toBe(4100);
    expect(config.host).toBe('127.0.0.1');
    expect(config.jwt.allowTestTokens).toBe(true);
    expect(config.rateLimit.max).toBe(5);
    expect(config.rateLimit.timeWindowMs).toBe(2000);
    expect(config.metricsEnabled).toBe(false);
  });

  it('falls back to defaults when numeric env values are invalid', () => {
    const env = {
      ...baseEnv,
      PORT: 'not-a-number',
      RATE_LIMIT_MAX: 'NaN',
      RATE_LIMIT_WINDOW_MS: 'oops'
    };
    const config = loadConfig(env);
    expect(config.port).toBe(4010);
    expect(config.rateLimit.max).toBe(100);
    expect(config.rateLimit.timeWindowMs).toBe(60000);
  });

  it('supports JWKS loaded from file path', () => {
    const dir = mkdtempSync(join(tmpdir(), 'jwks-'));
    const filePath = join(dir, 'jwks.json');
    writeFileSync(filePath, JSON.stringify({ keys: [{ kty: 'RSA' }] }));
    const config = loadConfig({
      ...baseEnv,
      JWKS_JSON: `file://${filePath}`
    });
    expect(config.jwt.jwksJson).toContain('RSA');
  });

  it('throws when feature flag disabled', () => {
    expect(() =>
      loadConfig({
        ...baseEnv,
        FEATURES_PROV_LEDGER: 'false'
      })
    ).toThrow('features.provLedger must be enabled');
  });

  it('throws when JWKS config missing', () => {
    expect(() => loadConfig({ JWT_ISSUER: 'issuer', JWT_AUDIENCE: 'audience' })).toThrow(
      'JWKS_URL or JWKS_JSON must be provided'
    );
  });
});
