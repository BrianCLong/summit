import { SecretRef } from '../services/SecretsService.js';

export const SECRETS = {
  JWT_SECRET: {
    id: 'JWT_SECRET',
    kind: 'encryption_key',
    scope: 'global',
    description: 'Secret for signing JWT access tokens'
  } as SecretRef,
  JWT_REFRESH_SECRET: {
    id: 'JWT_REFRESH_SECRET',
    kind: 'encryption_key',
    scope: 'global',
    description: 'Secret for signing JWT refresh tokens'
  } as SecretRef,
  NEO4J_PASSWORD: {
    id: 'NEO4J_PASSWORD',
    kind: 'db_password',
    scope: 'global',
    description: 'Password for Neo4j database'
  } as SecretRef,
  POSTGRES_PASSWORD: {
    id: 'POSTGRES_PASSWORD',
    kind: 'db_password',
    scope: 'global',
    description: 'Password for Postgres database'
  } as SecretRef,
  REDIS_PASSWORD: {
    id: 'REDIS_PASSWORD',
    kind: 'db_password',
    scope: 'global',
    description: 'Password for Redis'
  } as SecretRef,
};
