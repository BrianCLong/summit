import { configService } from './config/ConfigService.js';

// Mapping new ConfigService back to the flat structure expected by legacy consumers
export const cfg = {
  NODE_ENV: configService.get('app').env,
  PORT: configService.get('app').port,
  DATABASE_URL: configService.get('postgres').url,
  NEO4J_URI: configService.get('neo4j').uri,
  NEO4J_USER: configService.get('neo4j').username,
  NEO4J_PASSWORD: configService.get('neo4j').password,
  REDIS_HOST: configService.get('redis').host,
  REDIS_PORT: configService.get('redis').port,
  REDIS_PASSWORD: configService.get('redis').password,
  JWT_SECRET: configService.get('auth').jwtSecret,
  JWT_REFRESH_SECRET: configService.get('auth').refreshSecret,
  CORS_ORIGIN: configService.get('app').corsOrigin,
};

// Derived URLs for convenience
export const dbUrls = {
  redis: `redis://${cfg.REDIS_HOST}:${cfg.REDIS_PORT}`,
  postgres: cfg.DATABASE_URL,
  neo4j: cfg.NEO4J_URI,
};
