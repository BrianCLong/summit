import dotenv from 'dotenv';
dotenv.config();

interface Config {
  env: string;
  port: number;
  requireRealDbs: boolean;
  neo4j: {
    uri: string;
    username: string;
    password: string;
    database: string;
  };
  postgres: {
    host: string;
    port: number;
    database: string;
    username: string;
    password: string;
  };
  redis: {
    host: string;
    port: number;
    password: string;
    db: number;
    useCluster: boolean;
    clusterNodes: string[];
    tls: boolean;
  };
  jwt: {
    secret: string;
    expiresIn: string;
    refreshSecret: string;
    refreshExpiresIn: string;
  };
  bcrypt: {
    rounds: number;
  };
  rateLimit: {
    windowMs: number;
    maxRequests: number;
  };
  cors: {
    origin: string;
  };
  features: {
    GRAPH_EXPAND_CACHE: boolean;
    AI_REQUEST_ENABLED: boolean;
  };
  cache: {
    defaultTtlSeconds: number;
    queryTtlSeconds: number;
    warmersEnabled: boolean;
    warmerIntervalSeconds: number;
    staleWhileRevalidateSeconds: number;
  };
  cdn: {
    enabled: boolean;
    provider: 'cloudflare' | 'fastly' | 'generic';
    surrogateKeyNamespace: string;
    edgeTtlSeconds: number;
    browserTtlSeconds: number;
  };
}

const config: Config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '4000'),

  // Production readiness flag - fail fast if DBs not available
  requireRealDbs: process.env.REQUIRE_REAL_DBS === 'true',

  // Database configurations
  neo4j: {
    uri: process.env.NEO4J_URI || 'bolt://localhost:7687',
    username: process.env.NEO4J_USERNAME || 'neo4j',
    password: process.env.NEO4J_PASSWORD || 'devpassword',
    database: process.env.NEO4J_DATABASE || 'neo4j',
  },

  postgres: {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432'),
    database: process.env.POSTGRES_DB || 'intelgraph_dev',
    username: process.env.POSTGRES_USER || 'intelgraph',
    password: process.env.POSTGRES_PASSWORD || 'devpassword',
  },

  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD || 'devpassword',
    db: parseInt(process.env.REDIS_DB || '0'),
    useCluster: process.env.REDIS_USE_CLUSTER === 'true',
    clusterNodes:
      process.env.REDIS_CLUSTER_NODES?.split(',')
        .map((node) => node.trim())
        .filter(Boolean) || [],
    tls: process.env.REDIS_TLS === 'true',
  },

  // JWT configuration
  jwt: {
    secret: process.env.JWT_SECRET || 'dev_jwt_secret_12345',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev_refresh_secret_67890',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },

  // Security
  bcrypt: {
    rounds: parseInt(process.env.BCRYPT_ROUNDS || '12'),
  },

  // Rate limiting
  rateLimit: {
    windowMs: parseInt(
      process.env.RATE_LIMIT_WINDOW_MS || String(15 * 60 * 1000),
    ),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  },

  // CORS
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  },

  // Feature flags
  features: {
    GRAPH_EXPAND_CACHE: process.env.GRAPH_EXPAND_CACHE !== '0',
    AI_REQUEST_ENABLED: process.env.AI_REQUEST_ENABLED !== '0',
  },

  cache: {
    defaultTtlSeconds: parseInt(process.env.CACHE_DEFAULT_TTL || '300'),
    queryTtlSeconds: parseInt(process.env.CACHE_QUERY_TTL || '180'),
    warmersEnabled: process.env.CACHE_WARMERS_ENABLED !== '0',
    warmerIntervalSeconds: parseInt(process.env.CACHE_WARMER_INTERVAL || '300'),
    staleWhileRevalidateSeconds: parseInt(
      process.env.CACHE_STALE_WHILE_REVALIDATE || '30',
    ),
  },

  cdn: {
    enabled: process.env.CDN_ENABLED === 'true',
    provider:
      (process.env.CDN_PROVIDER as 'cloudflare' | 'fastly' | 'generic') ||
      'generic',
    surrogateKeyNamespace:
      process.env.CDN_SURROGATE_KEY_NAMESPACE || 'summit-edge-cache',
    edgeTtlSeconds: parseInt(process.env.CDN_EDGE_TTL || '120'),
    browserTtlSeconds: parseInt(process.env.CDN_BROWSER_TTL || '60'),
  },
};

// Validation for production readiness
if (config.requireRealDbs) {
  const requiredEnvVars = [
    'NEO4J_URI',
    'NEO4J_USERNAME',
    'NEO4J_PASSWORD',
    'POSTGRES_HOST',
    'POSTGRES_USER',
    'POSTGRES_PASSWORD',
    'REDIS_HOST',
  ];

  const missing = requiredEnvVars.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    console.error(
      `❌ REQUIRE_REAL_DBS=true but missing env vars: ${missing.join(', ')}`,
    );
    process.exit(1);
  }

  // Ensure not using default dev passwords in production
  const devPasswords = ['devpassword', 'dev_jwt_secret_12345'];
  if (
    devPasswords.includes(config.neo4j.password) ||
    devPasswords.includes(config.postgres.password) ||
    devPasswords.includes(config.jwt.secret)
  ) {
    console.error('❌ REQUIRE_REAL_DBS=true but using default dev passwords');
    process.exit(1);
  }
}

export default config;
