import { join } from 'node:path';
import { loadConfig } from '../parse';
import { validate } from '../validate';
import type { InterpolationPolicy } from '../types';

const FIXTURES = join(__dirname, 'fixtures');
const SCHEMA = join(FIXTURES, 'service.schema.json');

describe('configguard load', () => {
  beforeEach(() => {
    delete process.env.DATABASE_URL;
    delete process.env.SERVICE_NAME;
  });

  it('returns diagnostics for invalid config', () => {
    const file = join(FIXTURES, 'invalid.yaml');
    const result = loadConfig(file, SCHEMA);

    expect(result.diagnostics.some((d) => d.code === 'required' || d.code === 'enum')).toBe(true);
    const enumDiag = result.diagnostics.find((d) => d.code === 'enum');
    expect(enumDiag?.hint).toContain('Allowed values');
    const typeDiag = result.diagnostics.find((d) => d.code === 'type');
    expect(typeDiag?.pointer).toContain('port');
  });

  it('loads valid config with interpolation defaults', () => {
    const file = join(FIXTURES, 'interpolation.yaml');
    const policy: InterpolationPolicy = {
      allowList: ['SERVICE_NAME', 'DATABASE_URL'],
      defaults: { DATABASE_URL: 'postgres://localhost:5432/app' },
      onMissing: 'warn'
    };
    const result = loadConfig(file, SCHEMA, { interpolation: policy });

    expect(result.config).toBeTruthy();
    const config = result.config as Record<string, unknown>;
    expect(config.serviceName).toBe('intelgraph-dev');
    expect(config.database).toEqual({ url: 'postgres://localhost:5432/app' });
    expect(result.diagnostics).toHaveLength(0);
  });

  it('fails when interpolation policy denies env var', () => {
    const file = join(FIXTURES, 'valid.yaml');
    process.env.DATABASE_URL = 'postgres://remote:5432/app';
    const policy: InterpolationPolicy = {
      denyList: ['DATABASE_URL']
    };

    const result = loadConfig(file, SCHEMA, { interpolation: policy });
    const error = result.diagnostics.find((d) => d.severity === 'error');
    expect(error?.message).toContain('blocked by policy');
  });
});

describe('configguard validate', () => {
  it('produces empty diagnostics for valid object', () => {
    const obj = {
      serviceName: 'intelgraph-api',
      port: 8080,
      mode: 'production',
      database: { url: 'https://example.com/db' }
    };

    const diagnostics = validate(obj, SCHEMA, {});
    expect(diagnostics).toHaveLength(0);
  });
});
