require('dotenv').config();

const config = {
  env: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 4000,

  // Database configurations
  neo4j: {
    uri: process.env.NEO4J_URI || 'bolt://localhost:7687',
    username: process.env.NEO4J_USERNAME || 'neo4j',
    password: process.env.NEO4J_PASSWORD || 'devpassword',
    database: process.env.NEO4J_DATABASE || 'neo4j',
  },

  postgres: {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: process.env.POSTGRES_PORT || 5432,
    database: process.env.POSTGRES_DB || 'intelgraph_dev',
    username: process.env.POSTGRES_USER || 'intelgraph',
    password: process.env.POSTGRES_PASSWORD || 'devpassword',
  },

  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || 'devpassword',
    db: process.env.REDIS_DB || 0,
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
    rounds: parseInt(process.env.BCRYPT_ROUNDS) || 12,
  },

  // Rate limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
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
};

if (config.env === 'production') {
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
    console.error(`❌ Production mode missing env vars: ${missing.join(', ')}`);
    process.exit(1);
  }

  const devPasswords = [
    'devpassword',
    'dev_jwt_secret_12345',
    'dev_refresh_secret_67890',
  ];

  if (
    devPasswords.includes(config.neo4j.password) ||
    devPasswords.includes(config.postgres.password) ||
    devPasswords.includes(config.jwt.secret) ||
    devPasswords.includes(config.redis.password) ||
    devPasswords.includes(config.jwt.refreshSecret)
  ) {
    console.error(
      '❌ Production mode using default dev passwords. Set proper secrets.',
    );
    process.exit(1);
  }
}

module.exports = config;
