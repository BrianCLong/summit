export type AppConfig = {
  serviceName: string;
  port: number;
  logLevel: string;
  metricsEnabled: boolean;
  tracingEnabled: boolean;
  policyEndpoint: string;
  featureFlagSecureApproval: boolean;
};

const toBoolean = (value: string | undefined, defaultValue: boolean): boolean => {
  if (value === undefined) return defaultValue;
  return value.toLowerCase() === 'true';
};

const toNumber = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value ?? fallback);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
};

export const config: AppConfig = {
  serviceName: process.env.SERVICE_NAME || 'golden-path-service',
  port: toNumber(process.env.PORT, 3000),
  logLevel: process.env.LOG_LEVEL || 'info',
  metricsEnabled: toBoolean(process.env.METRICS_ENABLED, true),
  tracingEnabled: toBoolean(process.env.TRACING_ENABLED, true),
  policyEndpoint: process.env.POLICY_ENDPOINT || 'http://localhost:8181/v1/data/companyos/authz/allow',
  featureFlagSecureApproval: toBoolean(process.env.FEATURE_FLAG_SECURE_APPROVAL, true)
};
