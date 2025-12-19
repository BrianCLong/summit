import * as dotenv from 'dotenv';
import dotenv from 'dotenv';
import { ConfigSchema, type Config } from './schema.js';
import { z } from 'zod';

// Load environment variables
dotenv.config();

// Create a raw config object from process.env to map to our schema structure
const rawConfig = {
  env: process.env.NODE_ENV,
  port: process.env.PORT,
  requireRealDbs: process.env.REQUIRE_REAL_DBS === 'true',
  neo4j: {
    uri: process.env.NEO4J_URI,
    username: process.env.NEO4J_USERNAME,
    password: process.env.NEO4J_PASSWORD,
    database: process.env.NEO4J_DATABASE,
  },
  postgres: {
    host: process.env.POSTGRES_HOST,
    port: process.env.POSTGRES_PORT,
    database: process.env.POSTGRES_DB,
    username: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
  },
  redis: {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
    password: process.env.REDIS_PASSWORD,
    db: process.env.REDIS_DB,
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN,
  },
  bcrypt: {
    rounds: parseInt(process.env.BCRYPT_ROUNDS || '14'),
    rounds: process.env.BCRYPT_ROUNDS,
  },
  rateLimit: {
    windowMs: process.env.RATE_LIMIT_WINDOW_MS,
    maxRequests: process.env.RATE_LIMIT_MAX_REQUESTS,
  },
  cors: {
    origin: process.env.CORS_ORIGIN,
  },
  features: {
    GRAPH_EXPAND_CACHE: process.env.GRAPH_EXPAND_CACHE !== '0',
    AI_REQUEST_ENABLED: process.env.AI_REQUEST_ENABLED !== '0',
  },
};

// Validation for production readiness
if (config.requireRealDbs || config.env === 'production') {
  const requiredEnvVars = [
    'NEO4J_URI',
    'NEO4J_USERNAME',
    'NEO4J_PASSWORD',
    'POSTGRES_HOST',
    'POSTGRES_USER',
    'POSTGRES_PASSWORD',
    'REDIS_HOST',
  ];

  // In production, we expect these to be set explicitly
  const missing = requiredEnvVars.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    console.error(
      `❌ Production/RealDBs mode missing env vars: ${missing.join(', ')}`,
    );
let config: Config;

try {
  config = ConfigSchema.parse(rawConfig);
} catch (error) {
  if (error instanceof z.ZodError) {
    console.error('❌ Invalid Configuration:', error.format());
    process.exit(1);
  }
  throw error;
}

  // Ensure not using default dev passwords in production
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
      '❌ Production/RealDBs mode but using default dev passwords. Set proper secrets.',
    );
// Production Readiness Checks
if (config.requireRealDbs) {
  const devPasswords = ['devpassword', 'dev_jwt_secret_12345'];
  const violations: string[] = [];

  if (devPasswords.includes(config.neo4j.password)) violations.push('Default Neo4j password in use');
  if (devPasswords.includes(config.postgres.password)) violations.push('Default Postgres password in use');
  if (devPasswords.includes(config.jwt.secret)) violations.push('Default JWT secret in use');

  if (violations.length > 0) {
    console.error('❌ REQUIRE_REAL_DBS=true but security violations found:');
    violations.forEach(v => console.error(`   - ${v}`));
    process.exit(1);
  }
}

export default config;
