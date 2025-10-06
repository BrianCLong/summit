import { loadConfig, validateConfig } from '../src/runtime/config.js';

describe('configuration', () => {
  it('merges partial configuration with defaults', () => {
    const config = loadConfig({
      environment: 'prod',
      telemetry: { mode: 'otlp', endpoint: 'http://otel:4317', sampleRate: 0.5 },
      performance: { maxConcurrency: 8 }
    });
    expect(config.environment).toBe('prod');
    expect(config.telemetry.mode).toBe('otlp');
    expect(config.telemetry.endpoint).toBe('http://otel:4317');
    expect(config.performance.maxConcurrency).toBe(8);
    expect(config.auditTrail.enabled).toBe(true);
  });

  it('throws for invalid configuration', () => {
    expect(() =>
      validateConfig({
        id: 'bad',
        environment: 'prod',
        telemetry: { mode: 'otlp', sampleRate: 1 },
        security: {
          allowDynamicPlugins: true,
          redactFields: [],
          validateSignatures: true
        },
        performance: {
          maxConcurrency: 0,
          highWatermark: 1,
          adaptiveThrottling: true
        },
        auditTrail: {
          enabled: false,
          sink: 'stdout'
        }
      })
    ).toThrow('maxConcurrency must be greater than zero');
  });

  it('validates telemetry endpoint requirement for otlp', () => {
    expect(() =>
      validateConfig({
        id: 'bad-telemetry',
        environment: 'dev',
        telemetry: { mode: 'otlp', sampleRate: 0.2 },
        security: {
          allowDynamicPlugins: false,
          redactFields: [],
          validateSignatures: true
        },
        performance: {
          maxConcurrency: 1,
          highWatermark: 2,
          adaptiveThrottling: true
        },
        auditTrail: {
          enabled: true,
          sink: 'memory'
        }
      })
    ).toThrow('otlp telemetry requires an endpoint');
  });

  it('rejects unsupported environments', () => {
    expect(() =>
      validateConfig({
        id: 'env-bad',
        environment: 'qa' as 'dev',
        telemetry: { mode: 'console', sampleRate: 0.1 },
        security: {
          allowDynamicPlugins: false,
          redactFields: [],
          validateSignatures: true
        },
        performance: {
          maxConcurrency: 1,
          highWatermark: 2,
          adaptiveThrottling: true
        },
        auditTrail: {
          enabled: true,
          sink: 'memory'
        }
      })
    ).toThrow('invalid environment: qa');
  });
});
