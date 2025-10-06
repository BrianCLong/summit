import crypto from 'node:crypto';
import type { RuntimeConfig, RuntimeSecurityPolicy, RuntimeTelemetryConfig } from './types.js';

export interface PartialRuntimeConfig extends Partial<Omit<RuntimeConfig, 'telemetry' | 'security' | 'performance' | 'auditTrail'>> {
  readonly telemetry?: Partial<RuntimeTelemetryConfig>;
  readonly security?: Partial<RuntimeSecurityPolicy>;
  readonly performance?: Partial<RuntimeConfig['performance']>;
  readonly auditTrail?: Partial<RuntimeConfig['auditTrail']>;
}

const DEFAULT_CONFIG: RuntimeConfig = {
  id: crypto.randomUUID(),
  environment: 'dev',
  telemetry: {
    mode: 'console',
    sampleRate: 0.1
  },
  security: {
    allowDynamicPlugins: false,
    redactFields: ['secret', 'token'],
    validateSignatures: true
  },
  performance: {
    maxConcurrency: 4,
    highWatermark: 100,
    adaptiveThrottling: true
  },
  auditTrail: {
    enabled: true,
    sink: 'memory'
  }
};

export function loadConfig(partial: PartialRuntimeConfig = {}): RuntimeConfig {
  const merged: RuntimeConfig = {
    ...DEFAULT_CONFIG,
    ...partial,
    telemetry: {
      ...DEFAULT_CONFIG.telemetry,
      ...partial.telemetry
    },
    security: {
      ...DEFAULT_CONFIG.security,
      ...partial.security
    },
    performance: {
      ...DEFAULT_CONFIG.performance,
      ...partial.performance
    },
    auditTrail: {
      ...DEFAULT_CONFIG.auditTrail,
      ...partial.auditTrail
    }
  };
  validateConfig(merged);
  return merged;
}

export function validateConfig(config: RuntimeConfig): void {
  if (!config.id) {
    throw new Error('runtime config must include an id');
  }
  if (config.performance.maxConcurrency <= 0) {
    throw new Error('maxConcurrency must be greater than zero');
  }
  if (config.performance.highWatermark < config.performance.maxConcurrency) {
    throw new Error('highWatermark must be >= maxConcurrency');
  }
  if (config.telemetry.mode === 'otlp' && !config.telemetry.endpoint) {
    throw new Error('otlp telemetry requires an endpoint');
  }
  if (!['dev', 'staging', 'prod', 'test'].includes(config.environment)) {
    throw new Error(`invalid environment: ${config.environment}`);
  }
}
