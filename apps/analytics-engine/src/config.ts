// ============================================================================
// SECURITY: Credential Validation
// ============================================================================

function requireSecret(name: string, value: string | undefined, minLength: number = 16): string {
  if (!value) {
    console.error(`FATAL: ${name} environment variable is required but not set`);
    console.error(`Set ${name} in your environment or .env file`);
    process.exit(1);
  }

  if (value.length < minLength) {
    console.error(`FATAL: ${name} must be at least ${minLength} characters`);
    console.error(`Current length: ${value.length}`);
    process.exit(1);
  }

  const insecureValues = ['password', 'secret', 'changeme', 'default', 'localhost', 'analytics-engine-secret'];
  if (insecureValues.includes(value.toLowerCase())) {
    console.error(`FATAL: ${name} is set to an insecure default value: "${value}"`);
    console.error(`Use a strong, unique secret (e.g., generated via: openssl rand -base64 32)`);
    process.exit(1);
  }

  return value;
}

export const config = {
  server: {
    port: parseInt(process.env.ANALYTICS_ENGINE_PORT || '4004'),
    allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || [
      'http://localhost:3000',
      'http://localhost:4001',
    ],
    environment: process.env.NODE_ENV || 'development',
  },

  database: {
    postgres: {
      host: process.env.POSTGRES_HOST || 'localhost',
      port: parseInt(process.env.POSTGRES_PORT || '5432'),
      user: process.env.POSTGRES_USER || 'intelgraph',
      password: requireSecret('POSTGRES_PASSWORD', process.env.POSTGRES_PASSWORD),
      database: process.env.POSTGRES_DB || 'intelgraph',
      ssl:
        process.env.NODE_ENV === 'production'
          ? { rejectUnauthorized: false }
          : false,
    },

    neo4j: {
      uri: process.env.NEO4J_URI || 'bolt://localhost:7687',
      user: process.env.NEO4J_USERNAME || 'neo4j',
      password: requireSecret('NEO4J_PASSWORD', process.env.NEO4J_PASSWORD),
    },
  },

  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB || '3'), // Use different DB from other services
  },

  analytics: {
    cacheEnabled: process.env.ANALYTICS_CACHE_ENABLED !== 'false',
    defaultCacheTTL: parseInt(process.env.DEFAULT_CACHE_TTL || '300'), // 5 minutes
    maxQueryTimeout: parseInt(process.env.MAX_QUERY_TIMEOUT || '30000'), // 30 seconds
    maxResultSize: parseInt(process.env.MAX_RESULT_SIZE || '10000'), // 10k rows
    enableQueryLogging: process.env.ENABLE_QUERY_LOGGING === 'true',
  },

  dashboard: {
    maxWidgetsPerDashboard: parseInt(
      process.env.MAX_WIDGETS_PER_DASHBOARD || '50',
    ),
    maxDashboardsPerUser: parseInt(
      process.env.MAX_DASHBOARDS_PER_USER || '100',
    ),
    defaultRefreshInterval: parseInt(
      process.env.DEFAULT_REFRESH_INTERVAL || '300',
    ), // 5 minutes
    allowPublicDashboards: process.env.ALLOW_PUBLIC_DASHBOARDS !== 'false',
  },

  export: {
    enablePdfExport: process.env.ENABLE_PDF_EXPORT === 'true',
    enableCsvExport: process.env.ENABLE_CSV_EXPORT !== 'false',
    maxExportSize: parseInt(process.env.MAX_EXPORT_SIZE || '100000'), // 100k rows
    exportTimeout: parseInt(process.env.EXPORT_TIMEOUT || '60000'), // 1 minute
  },

  auth: {
    jwtSecret: requireSecret('JWT_SECRET', process.env.JWT_SECRET, 32),
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
  },

  monitoring: {
    metricsEnabled: process.env.METRICS_ENABLED === 'true',
    metricsPort: parseInt(process.env.METRICS_PORT || '9094'),
    logLevel: process.env.LOG_LEVEL || 'info',
  },
};
