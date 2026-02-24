// @ts-nocheck
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import * as dotenv from 'dotenv';
import type { DefinedError } from 'ajv';

dotenv.config();

// Inline schema to avoid ESM/CJS import.meta issues
const schema = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "env": { "type": "string", "enum": ["development", "test", "staging", "production"], "default": "development" },
    "port": { "type": "integer", "default": 4000 },
    "requireRealDbs": { "type": "boolean", "default": false },
    "neo4j": {
      "type": "object",
      "properties": {
        "uri": { "type": "string", "default": "bolt://localhost:7687" },
        "username": { "type": "string", "default": "neo4j" },
        "password": { "type": "string", "default": "devpassword" },
        "database": { "type": "string", "default": "neo4j" }
      },
      "required": ["uri", "username", "password", "database"],
      "default": {}
    },
    "postgres": {
      "type": "object",
      "properties": {
        "host": { "type": "string", "default": "localhost" },
        "port": { "type": "integer", "default": 5432 },
        "database": { "type": "string", "default": "intelgraph_dev" },
        "username": { "type": "string", "default": "intelgraph" },
        "password": { "type": "string", "default": "devpassword" }
      },
      "required": ["host", "port", "database", "username", "password"],
      "default": {}
    },
    "redis": {
      "type": "object",
      "properties": {
        "host": { "type": "string", "default": "localhost" },
        "port": { "type": "integer", "default": 6379 },
        "password": { "type": "string", "default": "devpassword" },
        "db": { "type": "integer", "default": 0 }
      },
      "required": ["host", "port", "password", "db"],
      "default": {}
    },
    "jwt": {
      "type": "object",
      "properties": {
        "secret": { "type": "string", "minLength": 10, "default": "dev_jwt_secret_12345" },
        "expiresIn": { "type": "string", "default": "24h" },
        "refreshSecret": { "type": "string", "minLength": 10, "default": "dev_refresh_secret_67890" },
        "refreshExpiresIn": { "type": "string", "default": "7d" }
      },
      "required": ["secret", "expiresIn", "refreshSecret", "refreshExpiresIn"],
      "default": {}
    },
    "bcrypt": {
      "type": "object",
      "properties": { "rounds": { "type": "integer", "default": 12 } },
      "required": ["rounds"],
      "default": {}
    },
    "rateLimit": {
      "type": "object",
      "properties": {
        "windowMs": { "type": "integer", "default": 900000 },
        "maxRequests": { "type": "integer", "default": 100 }
      },
      "required": ["windowMs", "maxRequests"],
      "default": {}
    },
    "cors": {
      "type": "object",
      "properties": { "origin": { "type": "string", "default": "http://localhost:3000" } },
      "required": ["origin"],
      "default": {}
    },
    "features": {
      "type": "object",
      "properties": {
        "GRAPH_EXPAND_CACHE": { "type": "boolean", "default": true },
        "AI_REQUEST_ENABLED": { "type": "boolean", "default": true }
      },
      "required": ["GRAPH_EXPAND_CACHE", "AI_REQUEST_ENABLED"],
      "default": {}
    },
    "partitioning": {
      "type": "object",
      "properties": {
        "enabled": { "type": "boolean", "default": false },
        "strategy": { "type": "string", "enum": ["hash", "range", "list"], "default": "hash" },
        "shardCount": { "type": "integer", "default": 1 }
      },
      "required": ["enabled", "strategy", "shardCount"],
      "default": {}
    }
  },
  "required": ["env", "port", "neo4j", "postgres", "redis", "jwt", "bcrypt", "rateLimit", "cors", "features", "partitioning"],
  "additionalProperties": false
};

const ajv = new Ajv({
    allErrors: true,
    coerceTypes: true,
    useDefaults: true,
    strict: false
});
addFormats(ajv);

const validate = ajv.compile(schema);

export function loadConfig() {
  const rawConfig: any = {
    env: process.env.NODE_ENV,
    port: process.env.PORT,
    requireRealDbs: process.env.REQUIRE_REAL_DBS,
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
      // Preserve specific logic from original index.ts
      GRAPH_EXPAND_CACHE: process.env.GRAPH_EXPAND_CACHE !== '0',
      AI_REQUEST_ENABLED: process.env.AI_REQUEST_ENABLED !== '0',
    },
    partitioning: {
      enabled: process.env.PARTITIONING_ENABLED === 'true',
      strategy: process.env.PARTITIONING_STRATEGY || 'hash',
      shardCount: process.env.PARTITIONING_SHARD_COUNT ? parseInt(process.env.PARTITIONING_SHARD_COUNT, 10) : 1,
    },
  };

  const valid = validate(rawConfig);
  const shouldValidateStrictly = process.env.CONFIG_VALIDATE_ON_START === 'true';

  if (!valid) {
    const errors = (validate.errors as DefinedError[]).map(err => `${err.instancePath} ${err.message}`).join(', ');
    if (shouldValidateStrictly) {
      console.error(`❌ Invalid Configuration (Strict Mode): ${errors}`);
      process.exit(1);
    } else {
      console.warn(`⚠️ Configuration validation failed (Non-strict mode): ${errors}`);
    }
  }

  return rawConfig;
}
