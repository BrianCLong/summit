import dotenv from 'dotenv';
import { z } from 'zod';
import { FeatureFlags, FeatureKey, FeatureContext } from './featureFlags.js';

dotenv.config();

// --- Helpers ---
const zBool = (def: boolean) => z.preprocess(
  (val) => {
    if (typeof val === 'string') return val.toLowerCase() === 'true' || val === '1';
    return val;
  },
  z.boolean().default(def)
);

// --- Zod Schema for Environment Variables ---
const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'ci', 'staging', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),

  // Postgres
  POSTGRES_HOST: z.string().default('localhost'),
  POSTGRES_PORT: z.coerce.number().default(5432),
  POSTGRES_DB: z.string().default('intelgraph_dev'),
  POSTGRES_USER: z.string().default('intelgraph'),
  POSTGRES_PASSWORD: z.string().default('devpassword'),
  POSTGRES_SSL: zBool(false),
  DATABASE_URL: z.string().optional(),

  // Neo4j
  NEO4J_URI: z.string().default('bolt://localhost:7687'),
  NEO4J_USERNAME: z.string().default('neo4j'),
  NEO4J_PASSWORD: z.string().default('devpassword'),
  NEO4J_DATABASE: z.string().default('neo4j'),

  // Redis
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().default(6379),
  REDIS_PASSWORD: z.string().default('devpassword'),
  REDIS_DB: z.coerce.number().default(0),

  // JWT
  JWT_SECRET: z.string().default('dev_jwt_secret_12345'),
  JWT_EXPIRES_IN: z.string().default('24h'),
  JWT_REFRESH_SECRET: z.string().default('dev_refresh_secret_67890'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  JWT_ISSUER: z.string().optional(),
  JWT_AUDIENCE: z.string().optional(),

  // Security / Rate Limit
  BCRYPT_ROUNDS: z.coerce.number().default(12),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(900000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(100),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),

  // LLM
  LLM_DEFAULT_PROVIDER: z.string().default('mock'),
  OPENAI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),

  // Observability
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  STRUCTURED_LOGS: zBool(true),

  // Misc Features (Legacy)
  GRAPH_EXPAND_CACHE: z.union([z.string(), z.boolean(), z.number()]).optional(),
  AI_REQUEST_ENABLED: z.union([z.string(), z.boolean(), z.number()]).optional(),

  // Requirement flag
  REQUIRE_REAL_DBS: z.string().optional(),

  // Explicit Feature Flags (optional overrides)
  ENABLE_NEW_MAESTRO_RUN_CONSOLE: zBool(false),

  // GraphRAG
  GRAPHRAG_REDIS_URL: z.string().optional(),
  GRAPHRAG_TOKEN_BUDGET: z.coerce.number().default(2000),
  GRAPHRAG_LATENCY_BUDGET_MS: z.coerce.number().default(2000),
});

// --- SummitConfig Interface ---
export interface SummitConfig {
  env: 'development' | 'test' | 'ci' | 'staging' | 'production';
  serverPort: number;

  // Unified DB Config (Postgres)
  db: {
    host: string;
    port: number;
    user: string;
    password: string;
    name: string;
    ssl: boolean;
    url?: string;
  };

  // Auth Config
  auth: {
    jwtSecret: string;
    jwtExpiresIn: string;
    refreshSecret: string;
    refreshExpiresIn: string;
    issuer?: string;
    audience?: string;
    bcryptRounds: number;
  };

  // Service Configs
  neo4j: {
    uri: string;
    username: string;
    password: string;
    database: string;
  };
  redis: {
    host: string;
    port: number;
    password: string;
    db: number;
  };

  // LLM & AI
  llm: {
    defaultProvider: string;
    openaiApiKey?: string;
    anthropicApiKey?: string;
  };

  graphrag: {
    redisUrl?: string;
    tokenBudget: number;
    latencyBudgetMs: number;
  };

  // Observability
  observability: {
    logLevel: 'debug' | 'info' | 'warn' | 'error';
    structuredLogs: boolean;
  };

  // Misc
  rateLimit: {
    windowMs: number;
    maxRequests: number;
  };
  cors: {
    origin: string;
  };

  // Features
  features: Partial<Record<FeatureKey, boolean>> & {
    GRAPH_EXPAND_CACHE?: boolean;
    AI_REQUEST_ENABLED?: boolean;
  };

  featureFlags: FeatureFlags;

  // Legacy keys for backward compatibility
  postgres: {
    host: string;
    port: number;
    database: string;
    username: string;
    password: string;
  };
  jwt: {
    secret: string;
    expiresIn: string;
    refreshSecret: string;
    refreshExpiresIn: string;
  };
  bcrypt: { rounds: number };
  requireRealDbs: boolean;
}

// --- Loading Logic ---
let _config: SummitConfig | undefined;

export function resetConfigForTesting() {
  _config = undefined;
}

export function loadConfig(): SummitConfig {
  if (_config) return _config;

  const raw = process.env;

  // Parse with Zod
  const parsed = EnvSchema.parse(raw);

  // Collect features
  const featureMap: Partial<Record<FeatureKey, boolean>> & { GRAPH_EXPAND_CACHE?: boolean; AI_REQUEST_ENABLED?: boolean } = {};

  // Map legacy features
  featureMap.GRAPH_EXPAND_CACHE = parsed.GRAPH_EXPAND_CACHE !== '0' && parsed.GRAPH_EXPAND_CACHE !== false && parsed.GRAPH_EXPAND_CACHE !== 'false';
  featureMap.AI_REQUEST_ENABLED = parsed.AI_REQUEST_ENABLED !== '0' && parsed.AI_REQUEST_ENABLED !== false && parsed.AI_REQUEST_ENABLED !== 'false';

  // Explicit mapping for known legacy features or specific envs
  if (parsed.ENABLE_NEW_MAESTRO_RUN_CONSOLE === true) {
    featureMap['maestro.newRunConsole'] = true;
  }

  // Generic FEATURE_ scanning and normalization
  // Logic:
  // 1. Scan for FEATURE_*
  // 2. Try to match against known keys if needed, OR allow dynamic keys?
  // We want to support: FEATURE_LLM_EXPERIMENTAL_ROUTING -> llm.experimentalRouting
  // Strategy:
  // - Remove FEATURE_
  // - Split by _
  // - If first part is a known domain (maestro, llm, agent), treat as dot prefix?
  // - If double underscore __ present, treat as dot?
  //
  // Simplified strategy: We assume standard ENV naming: FEATURE_MAESTRO_NEW_RUN_CONSOLE
  // We can try to construct the camelCase key from it.

  Object.keys(raw).forEach(key => {
    if (key.startsWith('FEATURE_')) {
      const value = raw[key]?.toLowerCase() === 'true';
      // Try to reverse map? No, ambiguous.
      // Instead, we can just allow the raw parsed key if someone uses exact FeatureKey in env?
      // e.g. FEATURE_maestro.newRunConsole? No, usually envs are UPPERCASE.

      // Let's implement the mapping from FeatureKey -> EnvVar and check for it.
      // Since we don't have the list of FeatureKeys at runtime easily (it's a type),
      // we rely on specific manual mappings or generic "dot to underscore" logic if we want to support EVERYTHING.

      // For now, let's map the specific ones we know we added or saw in `featureFlags.ts` if we had a list.
      // Since we can't iterate the type, we will add a list of known keys here.
    }
  });

  // Manual mappings for important flags (supporting legacy ENABLE_ prefix too)
  const envKeyMap: Record<string, FeatureKey> = {
      'FEATURE_MAESTRO_NEW_RUN_CONSOLE': 'maestro.newRunConsole',
      'ENABLE_NEW_MAESTRO_RUN_CONSOLE': 'maestro.newRunConsole',

      'FEATURE_LLM_EXPERIMENTAL_ROUTING': 'llm.experimentalRouting',

      'FEATURE_DASHBOARD_REALTIME': 'dashboard.realtime',
      'ENABLE_REAL_TIME': 'dashboard.realtime',

      'FEATURE_CI_FAST_LANE': 'ci.fastLane',
      'FEATURE_SECURITY_STRICT_AUTH': 'security.strictAuth',
      'FEATURE_E2E_TEST_MODE_API': 'e2e.testModeApi',

      'FEATURE_AI_ENABLED': 'ai.enabled',
      'ENABLE_AI_FEATURES': 'ai.enabled',

      'FEATURE_KAFKA_ENABLED': 'kafka.enabled',
      'FEATURE_MAESTRO_MCP_ENABLED': 'maestro.mcpEnabled',
      'FEATURE_MAESTRO_PIPELINES_ENABLED': 'maestro.pipelinesEnabled',
      'FEATURE_OPENTELEMETRY_ENABLED': 'opentelemetry.enabled',
      'FEATURE_RBAC_FINE_GRAINED': 'rbac.fineGrained',
      'FEATURE_AUDIT_TRAIL': 'audit.trail',
      'FEATURE_COPILOT_SERVICE': 'copilot.service',

      'FEATURE_ANALYTICS_PANEL': 'analytics.panel',
      'ENABLE_ANALYTICS': 'analytics.panel',

      'FEATURE_PDF_EXPORT': 'pdf.export',
  };

  // Also support agent keys dynamically: FEATURE_AGENT_XYZ -> agent.xyz

  Object.keys(raw).forEach(key => {
      if (envKeyMap[key]) {
          featureMap[envKeyMap[key]] = raw[key]?.toLowerCase() === 'true';
      } else if (key.startsWith('FEATURE_AGENT_')) {
          const agentName = key.replace('FEATURE_AGENT_', '').toLowerCase();
          const featureKey = `agent.${agentName}` as FeatureKey;
          featureMap[featureKey] = raw[key]?.toLowerCase() === 'true';
      }
  });

  // Instantiate FeatureFlags
  const flags = new FeatureFlags(featureMap);

  // Production Security Checks
  if (parsed.NODE_ENV === 'production') {
     const insecureDefaults = ['devpassword', 'dev_jwt_secret_12345'];
     if (insecureDefaults.includes(parsed.POSTGRES_PASSWORD) ||
         insecureDefaults.includes(parsed.JWT_SECRET)) {
         console.warn('WARNING: Using insecure default passwords in PRODUCTION mode.');
     }
  }

  _config = {
    env: parsed.NODE_ENV,
    serverPort: parsed.PORT,

    db: {
      host: parsed.POSTGRES_HOST,
      port: parsed.POSTGRES_PORT,
      user: parsed.POSTGRES_USER,
      password: parsed.POSTGRES_PASSWORD,
      name: parsed.POSTGRES_DB,
      ssl: parsed.POSTGRES_SSL,
      url: parsed.DATABASE_URL,
    },

    // Legacy mapping for postgres
    postgres: {
      host: parsed.POSTGRES_HOST,
      port: parsed.POSTGRES_PORT,
      database: parsed.POSTGRES_DB,
      username: parsed.POSTGRES_USER,
      password: parsed.POSTGRES_PASSWORD,
    },

    neo4j: {
      uri: parsed.NEO4J_URI,
      username: parsed.NEO4J_USERNAME,
      password: parsed.NEO4J_PASSWORD,
      database: parsed.NEO4J_DATABASE,
    },

    redis: {
      host: parsed.REDIS_HOST,
      port: parsed.REDIS_PORT,
      password: parsed.REDIS_PASSWORD,
      db: parsed.REDIS_DB,
    },

    auth: {
      jwtSecret: parsed.JWT_SECRET,
      jwtExpiresIn: parsed.JWT_EXPIRES_IN,
      refreshSecret: parsed.JWT_REFRESH_SECRET,
      refreshExpiresIn: parsed.JWT_REFRESH_EXPIRES_IN,
      issuer: parsed.JWT_ISSUER,
      audience: parsed.JWT_AUDIENCE,
      bcryptRounds: parsed.BCRYPT_ROUNDS,
    },

    // Legacy mapping for jwt
    jwt: {
      secret: parsed.JWT_SECRET,
      expiresIn: parsed.JWT_EXPIRES_IN,
      refreshSecret: parsed.JWT_REFRESH_SECRET,
      refreshExpiresIn: parsed.JWT_REFRESH_EXPIRES_IN,
    },
    bcrypt: { rounds: parsed.BCRYPT_ROUNDS },

    llm: {
      defaultProvider: parsed.LLM_DEFAULT_PROVIDER,
      openaiApiKey: parsed.OPENAI_API_KEY,
      anthropicApiKey: parsed.ANTHROPIC_API_KEY,
    },

    graphrag: {
      redisUrl: parsed.GRAPHRAG_REDIS_URL,
      tokenBudget: parsed.GRAPHRAG_TOKEN_BUDGET,
      latencyBudgetMs: parsed.GRAPHRAG_LATENCY_BUDGET_MS,
    },

    observability: {
      logLevel: parsed.LOG_LEVEL,
      structuredLogs: parsed.STRUCTURED_LOGS,
    },

    rateLimit: {
      windowMs: parsed.RATE_LIMIT_WINDOW_MS,
      maxRequests: parsed.RATE_LIMIT_MAX_REQUESTS,
    },
    cors: {
      origin: parsed.CORS_ORIGIN,
    },

    features: featureMap,
    featureFlags: flags,

    requireRealDbs: parsed.REQUIRE_REAL_DBS === 'true',
  };

  return _config;
}

export function logConfigSummary() {
    const c = loadConfig();
    console.log('=== Summit Server Config ===');
    console.log(`Env: ${c.env}`);
    console.log(`Port: ${c.serverPort}`);
    console.log(`Log Level: ${c.observability.logLevel}`);
    console.log(`DB Host: ${c.db.host}`);
    console.log('--- Feature Flags ---');
    Object.keys(c.features).forEach(k => {
        if (c.features[k as FeatureKey]) {
            console.log(`  [x] ${k}`);
        } else {
            console.log(`  [ ] ${k}`);
        }
    });
    console.log('============================');
}

const config = loadConfig();
export default config;
