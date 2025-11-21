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
    REDIS_USERNAME: z.string().optional(),
    REDIS_TLS: z.boolean().default(false),
    JWT_SECRET: z.string().min(32),
    JWT_REFRESH_SECRET: z.string().min(32),
    CORS_ORIGIN: z.string().default('http://localhost:3000'),
  })
  .passthrough(); // Allow extra env vars

export const cfg = (() => {
  const parsed = Env.safeParse(process.env);
  if (!parsed.success) {
    // Don't leak secrets; show keys only
    console.error(
      '[STARTUP] Environment validation failed:',
      parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`),
    );
    process.exit(1);
  }
  const env = parsed.data;
  const present = Object.keys(env).length;
  if (env.NODE_ENV === 'production') {
    const insecureTokens = ['devpassword', 'changeme', 'secret', 'localhost'];
    const fail = (key: string, reason: string) => {
      console.error(`[STARTUP] ${key} is not production safe: ${reason}`);
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
