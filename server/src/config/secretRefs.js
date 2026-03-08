"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SECRETS = void 0;
exports.SECRETS = {
    JWT_SECRET: {
        id: 'JWT_SECRET',
        kind: 'encryption_key',
        scope: 'global',
        description: 'Secret for signing JWT access tokens'
    },
    JWT_REFRESH_SECRET: {
        id: 'JWT_REFRESH_SECRET',
        kind: 'encryption_key',
        scope: 'global',
        description: 'Secret for signing JWT refresh tokens'
    },
    NEO4J_PASSWORD: {
        id: 'NEO4J_PASSWORD',
        kind: 'db_password',
        scope: 'global',
        description: 'Password for Neo4j database'
    },
    POSTGRES_PASSWORD: {
        id: 'POSTGRES_PASSWORD',
        kind: 'db_password',
        scope: 'global',
        description: 'Password for Postgres database'
    },
    REDIS_PASSWORD: {
        id: 'REDIS_PASSWORD',
        kind: 'db_password',
        scope: 'global',
        description: 'Password for Redis'
    },
};
