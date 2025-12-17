/**
 * Service Configuration
 */

export interface Config {
  port: number;
  nodeEnv: string;
  opaUrl: string;
  logLevel: string;
  metricsEnabled: boolean;
  serviceName: string;
}

export const config: Config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  opaUrl: process.env.OPA_URL || 'http://localhost:8181',
  logLevel: process.env.LOG_LEVEL || 'info',
  metricsEnabled: process.env.METRICS_ENABLED !== 'false',
  serviceName: process.env.SERVICE_NAME || 'companyos-service',
};
