// @ts-nocheck
/**
 * Secrets Management System
 * Handles sensitive configuration with validation and secure defaults
 */

import * as z from 'zod';
import crypto from 'crypto';

// Environment validation schema
const EnvSchema = (z as any).object({
  // Application
  NODE_ENV: (z as any)
    .enum(['development', 'test', 'staging', 'production'])
    .default('development'),
  PORT: (z as any).coerce.number().min(1024).max(65535).default(8080),

  // Database URLs (with validation)
  DATABASE_URL: (z as any)
    .string()
    .url()
    .refine(
      (url: string) => url.startsWith('postgresql://') || url.startsWith('postgres://'),
      {
        message: 'DATABASE_URL must be a valid PostgreSQL connection string',
      },
    ),

  // Neo4j Configuration
  NEO4J_URI: (z as any).string().default('bolt://localhost:7687'),
  NEO4J_USER: (z as any).string().default('neo4j'),
  NEO4J_PASSWORD: (z as any)
    .string()
    .min(6, 'Neo4j password must be at least 6 characters'),

  // Redis Configuration
  REDIS_HOST: (z as any).string().default('localhost'),
  REDIS_PORT: (z as any).coerce.number().min(1).max(65535).default(6379),
  REDIS_PASSWORD: (z as any).string().optional(),

  // Security - JWT Secrets
  JWT_SECRET: (z as any).string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: (z as any)
    .string()
    .min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: (z as any).string().default('24h'),
  JWT_REFRESH_EXPIRES_IN: (z as any).string().default('7d'),

  // OIDC Configuration
  OIDC_ISSUER: (z as any).string().url().optional(),
  OIDC_CLIENT_ID: (z as any).string().optional(),
  OIDC_CLIENT_SECRET: (z as any).string().optional(),
  OIDC_REDIRECT_URI: (z as any).string().url().optional(),

  // CORS
  CORS_ORIGIN: (z as any).string().default('http://localhost:3000'),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: (z as any).coerce.number().default(900000), // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: (z as any).coerce.number().default(100),

  // External API Keys (sensitive)
  OPENAI_API_KEY: (z as any).string().startsWith('sk-').optional(),
  VIRUSTOTAL_API_KEY: (z as any).string().length(64).optional(),

  // Feature Flags
  AI_ENABLED: (z as any).coerce.boolean().default(false),
  KAFKA_ENABLED: (z as any).coerce.boolean().default(false),
  MAESTRO_MCP_ENABLED: (z as any).coerce.boolean().default(true),
  MAESTRO_PIPELINES_ENABLED: (z as any).coerce.boolean().default(true),

  // Logging
  LOG_LEVEL: (z as any).enum(['error', 'warn', 'info', 'debug']).default('info'),

  // TLS/Security
  TLS_KEY_PATH: (z as any).string().optional(),
  TLS_CERT_PATH: (z as any).string().optional(),

  // Session Configuration
  SESSION_SECRET: (z as any)
    .string()
    .min(32, 'SESSION_SECRET must be at least 32 characters'),

  // Encryption
  ENCRYPTION_KEY: (z as any)
    .string()
    .length(64, 'ENCRYPTION_KEY must be exactly 64 characters (32 bytes hex)')
    .optional(),
});

type EnvConfig = z.infer<typeof EnvSchema>;

// Production security checks
const INSECURE_DEFAULTS = [
  'development-jwt-secret-at-least-32-characters-long',
  'development-refresh-secret-different-from-jwt-secret',
  'dev_jwt_secret_12345',
  'change-me-in-production',
  'default-session-secret-please-change',
];

/**
 * Validate environment variables and return typed configuration
 */
function validateEnvironment(): EnvConfig {
  // Ensure process.exit is defined
  if (!process.exit) {
    throw new Error('process.exit is not available');
  }
  try {
    const parsed = EnvSchema.parse(process.env);

    // Additional security validations for production
    if (parsed.NODE_ENV === 'production') {
      validateProductionSecurity(parsed);
    }

    return parsed;
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      console.error('Environment validation failed:');
      error.issues.forEach((issue) => {
        console.error(`  ${issue.path.join('.')}: ${issue.message}`);
      });
    } else {
      console.error('Environment validation error:', error);
    }
    process.exit(1);
  }
}

/**
 * Validate production security requirements
 */
function validateProductionSecurity(config: EnvConfig): void {
  const issues: string[] = [];

  // Check for insecure defaults
  if (INSECURE_DEFAULTS.includes(config.JWT_SECRET)) {
    issues.push('JWT_SECRET is using a development default');
  }

  if (INSECURE_DEFAULTS.includes(config.JWT_REFRESH_SECRET)) {
    issues.push('JWT_REFRESH_SECRET is using a development default');
  }

  if (INSECURE_DEFAULTS.includes(config.SESSION_SECRET)) {
    issues.push('SESSION_SECRET is using a development default');
  }

  // Check database security
  if (
    config.DATABASE_URL.includes('@localhost') ||
    config.DATABASE_URL.includes('password')
  ) {
    issues.push('DATABASE_URL appears to contain development credentials');
  }

  // Check Redis security
  if (!config.REDIS_PASSWORD) {
    issues.push('REDIS_PASSWORD is required in production');
  }

  // Check OIDC configuration in production
  if (
    !config.OIDC_ISSUER ||
    !config.OIDC_CLIENT_ID ||
    !config.OIDC_CLIENT_SECRET
  ) {
    issues.push('OIDC configuration is incomplete (required in production)');
  }

  if (issues.length > 0) {
    console.error('Production security validation failed:');
    issues.forEach((issue) => console.error(`  - ${issue}`));
    console.error(
      '\nRefusing to start with insecure configuration in production.',
    );
    process.exit(1);
  }
}

/**
 * Generate secure random secrets for development
 */
export function generateSecrets(): Record<string, string> {
  return {
    JWT_SECRET: crypto.randomBytes(32).toString('hex'),
    JWT_REFRESH_SECRET: crypto.randomBytes(32).toString('hex'),
    SESSION_SECRET: crypto.randomBytes(32).toString('hex'),
    ENCRYPTION_KEY: crypto.randomBytes(32).toString('hex'),
  };
}

/**
 * Create development .env file with secure defaults
 */
export function createDevelopmentEnv(
  overrides: Record<string, string> = {},
): string {
  const secrets = generateSecrets();

  const envTemplate = `# IntelGraph Server - Development Environment
# Auto-generated with secure defaults
# Copy and modify for your environment

# Application
NODE_ENV=development
PORT=8080

# Database URLs
DATABASE_URL=postgresql://maestro:maestro-dev-secret@localhost:5432/maestro
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=neo4j-dev-password

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=redis-dev-secret

# Security (auto-generated secure secrets)
JWT_SECRET=${secrets.JWT_SECRET}
JWT_REFRESH_SECRET=${secrets.JWT_REFRESH_SECRET}
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d
SESSION_SECRET=${secrets.SESSION_SECRET}
ENCRYPTION_KEY=${secrets.ENCRYPTION_KEY}

# OIDC Configuration (optional for development)
# OIDC_ISSUER=https://your-oidc-provider.com
# OIDC_CLIENT_ID=your-client-id
# OIDC_CLIENT_SECRET=your-client-secret
# OIDC_REDIRECT_URI=http://localhost:8080/auth/callback

# CORS
CORS_ORIGIN=http://localhost:3000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=1000

# External APIs (optional)
# OPENAI_API_KEY=sk-your-openai-key
# VIRUSTOTAL_API_KEY=your-virustotal-key

# Feature Flags
AI_ENABLED=false
KAFKA_ENABLED=false
MAESTRO_MCP_ENABLED=true
MAESTRO_PIPELINES_ENABLED=true

# Logging
LOG_LEVEL=debug
`;

  return envTemplate;
}

// Export the validated configuration
export const config = validateEnvironment();

export default config;
