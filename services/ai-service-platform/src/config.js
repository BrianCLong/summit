"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const zod_1 = require("zod");
const configSchema = zod_1.z.object({
    nodeEnv: zod_1.z.enum(['development', 'production', 'test']).default('development'),
    port: zod_1.z.coerce.number().default(4100),
    logLevel: zod_1.z.enum(['debug', 'info', 'warn', 'error']).default('info'),
    corsOrigins: zod_1.z.array(zod_1.z.string()).default(['http://localhost:3000']),
    redis: zod_1.z.object({
        host: zod_1.z.string().default('localhost'),
        port: zod_1.z.coerce.number().default(6379),
    }),
    postgres: zod_1.z.object({
        host: zod_1.z.string().default('localhost'),
        port: zod_1.z.coerce.number().default(5432),
        database: zod_1.z.string().default('ai_platform'),
        user: zod_1.z.string().default('postgres'),
        password: zod_1.z.string().default('postgres'),
    }),
    opa: zod_1.z.object({
        url: zod_1.z.string().default('http://localhost:8181'),
    }),
    kubernetes: zod_1.z.object({
        namespace: zod_1.z.string().default('ai-services'),
        inCluster: zod_1.z.boolean().default(false),
    }),
    compliance: zod_1.z.object({
        fedrampEnabled: zod_1.z.boolean().default(false),
        auditRetentionDays: zod_1.z.coerce.number().default(365),
    }),
});
exports.config = configSchema.parse({
    nodeEnv: process.env.NODE_ENV,
    port: process.env.AI_PLATFORM_PORT,
    logLevel: process.env.LOG_LEVEL,
    corsOrigins: process.env.CORS_ORIGINS?.split(','),
    redis: {
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT,
    },
    postgres: {
        host: process.env.POSTGRES_HOST,
        port: process.env.POSTGRES_PORT,
        database: process.env.POSTGRES_DB,
        user: process.env.POSTGRES_USER,
        password: process.env.POSTGRES_PASSWORD,
    },
    opa: {
        url: process.env.OPA_URL,
    },
    kubernetes: {
        namespace: process.env.K8S_NAMESPACE,
        inCluster: process.env.K8S_IN_CLUSTER === 'true',
    },
    compliance: {
        fedrampEnabled: process.env.FEDRAMP_ENABLED === 'true',
        auditRetentionDays: process.env.AUDIT_RETENTION_DAYS,
    },
});
