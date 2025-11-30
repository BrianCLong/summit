import 'dotenv/config';
import { z } from 'zod';

const Env = z
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
    CACHE_ENABLED: z.coerce.boolean().default(true),
    CACHE_TTL_DEFAULT: z.coerce.number().default(300), // 5 minutes
    L1_CACHE_MAX_BYTES: z.coerce.number().default(1 * 1024 * 1024 * 1024), // 1 GB
    L1_CACHE_FALLBACK_TTL_SECONDS: z.coerce.number().default(300), // 5 minutes
    PROV_LEDGER_URL: z.string().default('http://localhost:8000'),
    PROV_LEDGER_AUTHORITY_ID: z.string().default('intelgraph-server'),
    PROV_LEDGER_REASON: z.string().default('data-mutation'),
  })
  .passthrough(); // Allow extra env vars

// Environment variable documentation for helpful error messages
const ENV_VAR_HELP: Record<string, string> = {
  PROV_LEDGER_URL: 'URL of the Provenance Ledger service (default: http://localhost:8000)',
  PROV_LEDGER_AUTHORITY_ID: 'Authority ID for Provenance Ledger requests',
  PROV_LEDGER_REASON: 'Reason for access for Provenance Ledger requests',
  DATABASE_URL: 'PostgreSQL connection string (e.g., postgresql://user:pass@host:5432/db)',
  RATE_LIMIT_WINDOW_MS: 'Window size for rate limiting in milliseconds (default: 60000)',
  RATE_LIMIT_MAX_REQUESTS: 'Max requests per window per user/IP (default: 100)',
  RATE_LIMIT_MAX_AUTHENTICATED: 'Max requests per window for authenticated users (default: 1000)',
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
};

export const cfg = (() => {
  const parsed = Env.safeParse(process.env);
  if (!parsed.success) {
    console.error('\n❌ Environment Validation Failed\n');
    console.error('Missing or invalid environment variables:\n');

    parsed.error.issues.forEach((issue) => {
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

    process.exit(1);
  }
  const env = parsed.data;
  const present = Object.keys(env).length;
  if (env.NODE_ENV === 'production') {
    const insecureTokens = ['devpassword', 'changeme', 'secret', 'localhost'];
    const fail = (key: string, reason: string) => {
      console.error('\n❌ Production Configuration Error\n');
      console.error(`  Variable: ${key}`);
      console.error(`  Issue: ${reason}\n`);
      console.error('Production deployments require secure configuration:');
      console.error('  • JWT secrets must be >= 32 characters and cryptographically random');
      console.error('  • Database passwords must not contain dev/test values');
      console.error('  • CORS origins must use explicit HTTPS URLs (no wildcards)');
      console.error('  • All connection strings must use production hosts (no localhost)\n');
      console.error('To generate a secure secret:');
      console.error('  openssl rand -base64 32\n');
      console.error('See .env.production.sample for a production template.\n');
      process.exit(1);
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
    const corsOrigins = env.CORS_ORIGIN.split(',').map((origin) => origin.trim());
    if (
      corsOrigins.length === 0 ||
      corsOrigins.some(
        (origin) =>
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
  } else {
    console.log(`[STARTUP] Environment validated (${present} keys)`);
  }
  return env;
})();

// Derived URLs for convenience
export const dbUrls = {
  redis: `redis://${cfg.REDIS_HOST}:${cfg.REDIS_PORT}`,
  postgres: cfg.DATABASE_URL,
  neo4j: cfg.NEO4J_URI,
};
