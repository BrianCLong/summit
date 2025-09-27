import 'dotenv/config';
import { z } from 'zod';

const Env = z.object({
  NODE_ENV: z.string().default('development'),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1),
  NEO4J_URI: z.string().min(1),
  NEO4J_USER: z.string().min(1), 
  NEO4J_PASSWORD: z.string().min(1),
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().default(6379),
  JWT_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
}).passthrough(); // Allow extra env vars

export const cfg = (() => {
  const parsed = Env.safeParse(process.env);
  if (!parsed.success) {
    // Don't leak secrets; show keys only
    console.error('[STARTUP] Environment validation failed:', 
      parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`));
    process.exit(1);
  }
  const env = parsed.data;
  const present = Object.keys(env).length;
  if (env.NODE_ENV !== 'production') {
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