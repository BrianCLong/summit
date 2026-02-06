import 'dotenv/config';
import { z } from 'zod';

export const EnvSchema = z
  .object({
    NODE_ENV: z.string().default('development'),
    PORT: z.coerce.number().default(4000),
    DATABASE_URL: z.string().min(1),
    NEO4J_URI: z.string().min(1),
    NEO4J_USER: z.string().min(1),
    NEO4J_PASSWORD: z.string().min(1),
    REDIS_HOST: z.string().default('localhost'),
    REDIS_PORT: z.coerce.number().default(6379),
    REDIS_PASSWORD: z.string().optional().default(''),
    JWT_SECRET: z.string().min(32),
    JWT_REFRESH_SECRET: z.string().min(32),
    CORS_ORIGIN: z.string().default('http://localhost:3000'),
    RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60000),
    RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(100),
    RATE_LIMIT_MAX_AUTHENTICATED: z.coerce.number().default(1000),
    AI_RATE_LIMIT_WINDOW_MS: z.coerce.number().default(15 * 60 * 1000),
    AI_RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(50),
    BACKGROUND_RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60_000),
    BACKGROUND_RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(120),
    CACHE_ENABLED: z.coerce.boolean().default(true),
    CACHE_TTL_DEFAULT: z.coerce.number().default(300), // 5 minutes
    L1_CACHE_MAX_BYTES: z.coerce.number().default(1 * 1024 * 1024 * 1024), // 1 GB
    L1_CACHE_FALLBACK_TTL_SECONDS: z.coerce.number().default(300), // 5 minutes
    DOCLING_SVC_URL: z.string().url().default('http://localhost:5001'),
    DOCLING_SVC_TIMEOUT_MS: z.coerce.number().default(30000),
    // GraphQL Cost Analysis & Rate Limiting
    ENFORCE_GRAPHQL_COST_LIMITS: z.coerce.boolean().default(true),
    GRAPHQL_COST_CONFIG_PATH: z.string().optional(),
    COST_EXEMPT_TENANTS: z.string().optional().default(''),
    GA_CLOUD: z.coerce.boolean().default(false),
    AWS_REGION: z.string().optional(),
    AI_ENABLED: z.coerce.boolean().default(false),
    FACTFLOW_ENABLED: z.coerce.boolean().default(false),
    KAFKA_ENABLED: z.coerce.boolean().default(false),
    OPENAI_API_KEY: z.string().optional(),
    ANTHROPIC_API_KEY: z.string().optional(),
    SKIP_AI_ROUTES: z.coerce.boolean().default(false),
    SKIP_WEBHOOKS: z.coerce.boolean().default(false),
    SKIP_GRAPHQL: z.coerce.boolean().default(false),
    FACTFLOW_ENABLED: z.coerce.boolean().default(false),
    // Email Configuration
    SMTP_HOST: z.string().optional(),
    SMTP_PORT: z.coerce.number().optional().default(587),
    SMTP_USER: z.string().optional(),
    SMTP_PASS: z.string().optional(),
    EMAIL_FROM_ADDRESS: z.string().email().optional().default('noreply@intelgraph.com'),
    EMAIL_FROM_NAME: z.string().optional().default('IntelGraph'),
  });

const TestEnvSchema = EnvSchema.extend({
  DATABASE_URL: z.string().optional().default('postgresql://postgres:testpassword@localhost:5432/intelgraph_test'),
  JWT_SECRET: z.string().min(32).optional().default('test-jwt-secret-at-least-32-chars-long'),
  JWT_REFRESH_SECRET: z.string().min(32).optional().default('test-jwt-refresh-secret-at-least-32-chars-long'),
  NEO4J_URI: z.string().optional().default('bolt://localhost:7687'),
  NEO4J_USER: z.string().optional().default('neo4j'),
  NEO4J_PASSWORD: z.string().optional().default('testpassword'),
});

const Env = EnvSchema.passthrough(); // Allow extra env vars
const TestEnv = TestEnvSchema.passthrough();

// Environment variable documentation for helpful error messages
const ENV_VAR_HELP: Record<string, string> = {
  DATABASE_URL: 'PostgreSQL connection string (e.g., postgresql://user:pass@host:5432/db)',
  RATE_LIMIT_WINDOW_MS: 'Window size for rate limiting in milliseconds (default: 60000)',
  RATE_LIMIT_MAX_REQUESTS: 'Max requests per window per user/IP (default: 100)',
  RATE_LIMIT_MAX_AUTHENTICATED: 'Max requests per window for authenticated users (default: 1000)',
  AI_RATE_LIMIT_WINDOW_MS: 'Window size for AI endpoints (default: 15 minutes)',
  AI_RATE_LIMIT_MAX_REQUESTS: 'Max requests for AI endpoints per window (default: 50)',
  BACKGROUND_RATE_LIMIT_WINDOW_MS: 'Window size for Redis-backed background throttles (default: 60s)',
  BACKGROUND_RATE_LIMIT_MAX_REQUESTS: 'Max background jobs per window per identifier (default: 120)',
  CACHE_ENABLED: 'Enable or disable caching (default: true)',
  CACHE_TTL_DEFAULT: 'Default cache TTL in seconds (default: 300)',
  NEO4J_URI: 'Neo4j bolt URI (e.g., bolt://localhost:7687)',
  NEO4J_USER: 'Neo4j username (default: neo4j)',
  NEO4J_PASSWORD: 'Neo4j password (set in Neo4j config)',
  REDIS_HOST: 'Redis hostname (default: localhost)',
  REDIS_PORT: 'Redis port (default: 6379)',
  JWT_SECRET: 'JWT signing secret (min 32 characters, use strong random value)',
  JWT_REFRESH_SECRET: 'JWT refresh token secret (min 32 characters, different from JWT_SECRET)',
  CORS_ORIGIN: 'Allowed CORS origins (comma-separated, e.g., http://localhost:3000)',
  ENFORCE_GRAPHQL_COST_LIMITS: 'Enable/disable GraphQL cost limit enforcement (default: true)',
  GRAPHQL_COST_CONFIG_PATH: 'Path to GraphQL cost configuration JSON file (optional)',
  COST_EXEMPT_TENANTS: 'Comma-separated list of tenant IDs exempt from cost limits',
  GA_CLOUD: 'Enable strict GA cloud readiness checks (default: false)',
  AWS_REGION: 'AWS Region (required if GA_CLOUD is true)',
  AI_ENABLED: 'Enable AI-augmented features (default: false)',
  FACTFLOW_ENABLED: 'Enable FactFlow product module (default: false)',
  OPENAI_API_KEY: 'OpenAI API Key (required if AI_ENABLED=true)',
  ANTHROPIC_API_KEY: 'Anthropic API Key (required if AI_ENABLED=true)',
  SMTP_HOST: 'SMTP host for emails (e.g., smtp.gmail.com)',
  SMTP_PORT: 'SMTP port (default: 587)',
  SMTP_USER: 'SMTP username',
  SMTP_PASS: 'SMTP password',
  EMAIL_FROM_ADDRESS: 'Verified sender email address',
  EMAIL_FROM_NAME: 'Sender name displayed in emails',
};

export const initializeConfig = (options: { exitOnError?: boolean } = { exitOnError: true }) => {
  const isTest = process.env.NODE_ENV === 'test';
  const schema = isTest ? TestEnv : Env;

  // Cross-field validation for AI
  const rawData = { ...process.env };
  if (isTest) {
    const dropIfTooShort = (key: string, minLength: number) => {
      const value = rawData[key];
      if (typeof value === 'string' && value.trim() !== '' && value.length < minLength) {
        delete rawData[key];
      }
    };
    dropIfTooShort('JWT_SECRET', 32);
    dropIfTooShort('JWT_REFRESH_SECRET', 32);
  }
  const parsed = schema.safeParse(rawData);

  if (parsed.success) {
    const data = parsed.data;
    if (data.AI_ENABLED && !data.OPENAI_API_KEY && !data.ANTHROPIC_API_KEY) {
      const msg = '\n❌ AI Configuration Error: AI_ENABLED=true requires either OPENAI_API_KEY or ANTHROPIC_API_KEY.\n';
      console.error(msg);
      if (options.exitOnError) process.exit(1);
      throw new Error(msg);
    }
  }

  if (!parsed.success) {
    console.error('\n❌ Environment Validation Failed\n');
    console.error('Missing or invalid environment variables:\n');

    parsed.error.issues.forEach((issue: { path: (string | number)[]; message: string }) => {
      const varName = issue.path.join('.');
      const help = ENV_VAR_HELP[varName] || 'See .env.example for expected format';
      console.error(`  • ${varName}`);
      console.error(`    Error: ${issue.message}`);
      console.error(`    Help: ${help}\n`);
    });

    console.error('\nHow to fix:');
    console.error('  1. Copy .env.example to .env: cp .env.example .env');
    console.error('  2. Update the missing variables in .env');
    console.error('  3. For production, generate strong secrets (e.g., openssl rand -base64 32)');
    console.error('  4. See docs/ONBOARDING.md for detailed setup instructions\n');

    if (options.exitOnError) process.exit(1);
    throw new Error('Environment Validation Failed');
  }
  const env = parsed.data;
  const present = Object.keys(env).length;
  if (env.NODE_ENV === 'production') {
    const insecureTokens = ['devpassword', 'changeme', 'secret', 'localhost'];
    const fail = (key: string, reason: string) => {
      const msg = `\n❌ Production Configuration Error\n  Invariant GC-03 Violated: Production environment cannot use default secrets.\n  Variable: ${key}\n  Issue: ${reason}\n`;
      console.error(msg);
      if (options.exitOnError) process.exit(1);
      throw new Error(msg);
    };
    const guardSecret = (key: keyof typeof env) => {
      const value = String(env[key]);
      const normalized = value.toLowerCase();
      if (value.length < 32) {
        fail(key as string, 'value too short (need >= 32 chars)');
      }
      const hit = insecureTokens.find((token) => normalized.includes(token));
      if (hit) {
        fail(key as string, `contains insecure token (${hit})`);
      }
    };
    guardSecret('JWT_SECRET');
    guardSecret('JWT_REFRESH_SECRET');
    const corsOrigins = env.CORS_ORIGIN.split(',').map((origin: string) => origin.trim());
    if (
      corsOrigins.length === 0 ||
      corsOrigins.some(
        (origin: string) =>
          origin === '*' ||
          origin.startsWith('http://') ||
          origin.includes('localhost'),
      )
    ) {
      fail('CORS_ORIGIN', 'must list explicit https origins');
    }
    const dbSecrets = [
      ['DATABASE_URL', env.DATABASE_URL],
      ['NEO4J_PASSWORD', env.NEO4J_PASSWORD],
      ['REDIS_PASSWORD', env.REDIS_PASSWORD],
    ] as const;
    dbSecrets.forEach(([key, value]) => {
      if (!value) {
        fail(key, 'missing value');
      }
      const normalized = value.toLowerCase();
      if (
        normalized.includes('localhost') ||
        normalized.includes('devpassword')
      ) {
        fail(key, 'contains localhost/devpassword; set a production secret');
      }
    });
  }

  if (env.GA_CLOUD) {
    console.log('🔒 GA Cloud Guard Active: Enforcing strict production constraints');

    if (env.NODE_ENV !== 'production') {
      const msg = '\n❌ GA Cloud Error: NODE_ENV must be "production" when GA_CLOUD is enabled.\n';
      console.error(msg);
      if (options.exitOnError) process.exit(1);
      throw new Error(msg);
    }

    if (!env.AWS_REGION) {
      const msg = '\n❌ GA Cloud Error: AWS_REGION is required when GA_CLOUD is enabled.\n';
      console.error(msg);
      if (options.exitOnError) process.exit(1);
      throw new Error(msg);
    }

    // Ensure strictly no localhost in critical URLs for GA
    const criticalUrls = [env.DATABASE_URL, env.NEO4J_URI];
    criticalUrls.forEach(url => {
      if (url && (url.includes('localhost') || url.includes('127.0.0.1'))) {
        const msg = `\n❌ GA Cloud Error: Critical service URL contains localhost: ${url}\n`;
        console.error(msg);
        if (options.exitOnError) process.exit(1);
        throw new Error(msg);
      }
    });
  }

  if (env.NODE_ENV !== 'production' && !env.GA_CLOUD) {
    console.log(`[STARTUP] Environment validated (${present} keys)`);
  }
  return env;
};

let _cfg: any = null;

/**
 * Reset config cache for testing
 */
export const resetConfig = () => {
  _cfg = null;
};

export const cfg = new Proxy({} as any, {
  get: (_target, prop) => {
    if (!_cfg) {
      _cfg = initializeConfig();
    }
    return _cfg[prop];
  },
  ownKeys: (_target) => {
    if (!_cfg) {
      _cfg = initializeConfig();
    }
    return Reflect.ownKeys(_cfg);
  },
  getOwnPropertyDescriptor: (_target, prop) => {
    if (!_cfg) {
      _cfg = initializeConfig();
    }
    return Reflect.getOwnPropertyDescriptor(_cfg, prop);
  }
});

// Derived URLs for convenience
export const dbUrls = {
  redis: `redis://${cfg.REDIS_HOST}:${cfg.REDIS_PORT}`,
  postgres: cfg.DATABASE_URL,
  neo4j: cfg.NEO4J_URI,
};
