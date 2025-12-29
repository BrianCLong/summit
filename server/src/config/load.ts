import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { createRequire } from 'module';
import * as dotenv from 'dotenv';
import type { DefinedError } from 'ajv';

dotenv.config();

const require = createRequire(import.meta.url);
const schema = require('./schema.json');

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
