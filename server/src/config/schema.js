"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigSchema = void 0;
// @ts-nocheck
const z = __importStar(require("zod"));
exports.ConfigSchema = z.object({
    env: z.enum(['development', 'test', 'staging', 'production']).default('development'),
    port: z.coerce.number().default(4000),
    requireRealDbs: z.coerce.boolean().default(false),
    neo4j: z.object({
        uri: z.string().default('bolt://localhost:7687'),
        username: z.string().default('neo4j'),
        password: z.string().default('devpassword'),
        database: z.string().default('neo4j'),
    }).default({}),
    postgres: z.object({
        host: z.string().default('localhost'),
        port: z.coerce.number().default(5432),
        database: z.string().default('intelgraph_dev'),
        username: z.string().default('intelgraph'),
        password: z.string().default('devpassword'),
    }).default({}),
    redis: z.object({
        host: z.string().default('localhost'),
        port: z.coerce.number().default(6379),
        password: z.string().default('devpassword'),
        db: z.coerce.number().default(0),
        useCluster: z.coerce.boolean().default(false),
        clusterNodes: z.array(z.object({
            host: z.string(),
            port: z.coerce.number()
        })).default([]),
        tls: z.coerce.boolean().default(false),
    }).default({}),
    jwt: z.object({
        secret: z.string().min(10).default('dev_jwt_secret_12345'),
        expiresIn: z.string().default('24h'),
        refreshSecret: z.string().min(10).default('dev_refresh_secret_67890'),
        refreshExpiresIn: z.string().default('7d'),
    }).default({}),
    bcrypt: z.object({
        rounds: z.coerce.number().default(12),
    }).default({}),
    rateLimit: z.object({
        windowMs: z.coerce.number().default(15 * 60 * 1000),
        maxRequests: z.coerce.number().default(100),
    }).default({}),
    cors: z.object({
        origin: z.string().default('http://localhost:3000'),
    }).default({}),
    cache: z.object({
        staleWhileRevalidateSeconds: z.coerce.number().default(300),
    }).default({}),
    cdn: z.object({
        enabled: z.coerce.boolean().default(false),
        browserTtlSeconds: z.coerce.number().default(60),
        edgeTtlSeconds: z.coerce.number().default(300),
        surrogateKeyNamespace: z.string().default('summit'),
    }).default({}),
    features: z.object({
        GRAPH_EXPAND_CACHE: z.coerce.boolean().default(true),
        AI_REQUEST_ENABLED: z.coerce.boolean().default(true),
    }).default({}),
});
