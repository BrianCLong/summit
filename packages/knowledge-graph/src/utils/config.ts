/**
 * Configuration and environment utilities
 */

import { z } from 'zod';

export const KnowledgeGraphConfigSchema = z.object({
  database: z.object({
    type: z.enum(['neo4j', 'janusgraph', 'memory']).default('neo4j'),
    uri: z.string().default('bolt://localhost:7687'),
    username: z.string().default('neo4j'),
    password: z.string().default('password'),
    database: z.string().optional(),
    maxConnectionPoolSize: z.number().min(1).max(1000).default(50),
    connectionTimeout: z.number().min(1000).max(60000).default(30000),
    encrypted: z.boolean().default(true)
  }),
  tripleStore: z.object({
    enabled: z.boolean().default(false),
    backend: z.enum(['memory', 'redis', 'postgres']).default('memory'),
    namespace: z.string().default('http://summit.io/kg#')
  }).optional(),
  versioning: z.object({
    enabled: z.boolean().default(true),
    snapshotInterval: z.number().min(10).max(10000).default(100)
  }).optional(),
  cache: z.object({
    enabled: z.boolean().default(false),
    type: z.enum(['memory', 'redis']).default('memory'),
    ttl: z.number().min(0).default(3600),
    maxSize: z.number().min(100).default(10000)
  }).optional(),
  logging: z.object({
    level: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
    format: z.enum(['json', 'pretty']).default('json')
  }).optional()
});

export type KnowledgeGraphConfig = z.infer<typeof KnowledgeGraphConfigSchema>;

/**
 * Load configuration from environment variables
 */
export function loadConfigFromEnv(): KnowledgeGraphConfig {
  return KnowledgeGraphConfigSchema.parse({
    database: {
      type: process.env.KG_DB_TYPE || 'neo4j',
      uri: process.env.NEO4J_URI || process.env.KG_DB_URI || 'bolt://localhost:7687',
      username: process.env.NEO4J_USERNAME || process.env.KG_DB_USERNAME || 'neo4j',
      password: process.env.NEO4J_PASSWORD || process.env.KG_DB_PASSWORD || 'password',
      database: process.env.NEO4J_DATABASE || process.env.KG_DB_NAME,
      maxConnectionPoolSize: parseInt(process.env.KG_DB_POOL_SIZE || '50'),
      connectionTimeout: parseInt(process.env.KG_DB_TIMEOUT || '30000'),
      encrypted: process.env.KG_DB_ENCRYPTED !== 'false'
    },
    tripleStore: {
      enabled: process.env.KG_TRIPLE_STORE_ENABLED === 'true',
      backend: (process.env.KG_TRIPLE_STORE_BACKEND as any) || 'memory',
      namespace: process.env.KG_TRIPLE_STORE_NAMESPACE || 'http://summit.io/kg#'
    },
    versioning: {
      enabled: process.env.KG_VERSIONING_ENABLED !== 'false',
      snapshotInterval: parseInt(process.env.KG_SNAPSHOT_INTERVAL || '100')
    },
    cache: {
      enabled: process.env.KG_CACHE_ENABLED === 'true',
      type: (process.env.KG_CACHE_TYPE as any) || 'memory',
      ttl: parseInt(process.env.KG_CACHE_TTL || '3600'),
      maxSize: parseInt(process.env.KG_CACHE_MAX_SIZE || '10000')
    },
    logging: {
      level: (process.env.LOG_LEVEL as any) || 'info',
      format: (process.env.LOG_FORMAT as any) || 'json'
    }
  });
}

/**
 * Validate configuration
 */
export function validateConfig(config: unknown): KnowledgeGraphConfig {
  return KnowledgeGraphConfigSchema.parse(config);
}

/**
 * Create default configuration
 */
export function createDefaultConfig(overrides: Partial<KnowledgeGraphConfig> = {}): KnowledgeGraphConfig {
  const defaults = KnowledgeGraphConfigSchema.parse({});
  return { ...defaults, ...overrides };
}
