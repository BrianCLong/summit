import type { AppConfig } from './types.js';

function getEnvString(key: string, defaultValue: string): string {
  return process.env[key] ?? defaultValue;
}

function getEnvNumber(key: string, defaultValue: number): number {
  const value = process.env[key];
  if (value === undefined) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

function getEnvBoolean(key: string, defaultValue: boolean): boolean {
  const value = process.env[key];
  if (value === undefined) return defaultValue;
  return value.toLowerCase() === 'true' || value === '1';
}

export function loadConfig(): AppConfig {
  return {
    port: getEnvNumber('PORT', 3010),
    nodeEnv: getEnvString('NODE_ENV', 'development'),
    logLevel: getEnvString('LOG_LEVEL', 'info'),

    postgres: {
      host: getEnvString('POSTGRES_HOST', 'localhost'),
      port: getEnvNumber('POSTGRES_PORT', 5432),
      database: getEnvString('POSTGRES_DB', 'summit_approvals'),
      user: getEnvString('POSTGRES_USER', 'summit'),
      password: getEnvString('POSTGRES_PASSWORD', 'devpassword'),
      maxConnections: getEnvNumber('POSTGRES_MAX_CONNECTIONS', 20),
    },

    opa: {
      url: getEnvString('OPA_URL', 'http://localhost:8181'),
      timeout: getEnvNumber('OPA_TIMEOUT_MS', 5000),
      failClosed: getEnvBoolean('OPA_FAIL_CLOSED', true),
    },

    provenance: {
      url: getEnvString('PROVENANCE_URL', 'http://localhost:3020'),
      enabled: getEnvBoolean('PROVENANCE_ENABLED', true),
      signingKeyId: getEnvString('PROVENANCE_SIGNING_KEY_ID', 'approvals-svc-key-1'),
    },

    otel: {
      enabled: getEnvBoolean('OTEL_ENABLED', true),
      endpoint: getEnvString(
        'OTEL_EXPORTER_OTLP_ENDPOINT',
        'http://localhost:4318',
      ),
      serviceName: getEnvString('OTEL_SERVICE_NAME', 'approvals-service'),
    },

    features: {
      approvals: {
        enabled: getEnvBoolean('FEATURES_APPROVALS_ENABLED', true),
        defaultPolicyProfile: getEnvString(
          'FEATURES_APPROVALS_DEFAULT_POLICY_PROFILE',
          'standard',
        ),
        defaultExpirationHours: getEnvNumber(
          'FEATURES_APPROVALS_DEFAULT_EXPIRATION_HOURS',
          72,
        ),
      },
    },
  };
}

export const config = loadConfig();
