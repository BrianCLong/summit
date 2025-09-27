import { z } from 'zod';

const configSchema = z.object({
  NEO4J_URI: z.string().url(),
  NEO4J_USERNAME: z.string().min(1),
  NEO4J_PASSWORD: z.string().min(1),
  REDIS_URL: z.string().url().optional(),
  SUBGRAPH_PORT: z.coerce.number().int().positive().default(4003),
  NEIGHBORHOOD_CACHE_TTL_SECONDS: z.coerce.number().int().positive().default(45),
  NEO4J_MAX_RETRIES: z.coerce.number().int().min(0).max(5).default(3),
  NEO4J_RETRY_DELAY_MS: z.coerce.number().int().min(0).default(150),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info')
});

export type GraphSubgraphConfig = z.infer<typeof configSchema>;

export function loadConfig(env: NodeJS.ProcessEnv): GraphSubgraphConfig {
  const parsed = configSchema.safeParse(env);
  if (!parsed.success) {
    throw new Error(`Invalid configuration: ${parsed.error.toString()}`);
  }
  return parsed.data;
}
