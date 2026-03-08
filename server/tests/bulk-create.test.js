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
const globals_1 = require("@jest/globals");
globals_1.jest.mock('../src/config.js', () => ({
    cfg: {
        NODE_ENV: 'test',
        DATABASE_URL: 'postgres://test:test@localhost:5432/test',
        NEO4J_URI: 'bolt://localhost:7687',
        NEO4J_USER: 'neo4j',
        NEO4J_PASSWORD: 'test',
        REDIS_URL: 'redis://localhost:6379',
        JWT_SECRET: 'test-secret',
        JWT_ISSUER: 'test',
    },
}));
var tx;
var session;
var pgClient;
var redisClient;
let crudResolvers;
globals_1.jest.mock('../src/config/database.js', () => ({
    getNeo4jDriver: () => ({ session: () => session }),
    getPostgresPool: () => ({ connect: () => pgClient }),
    getRedisClient: () => redisClient,
}));
globals_1.jest.mock('../src/graphql/subscriptionEngine.js', () => ({
    subscriptionEngine: {
        publish: globals_1.jest.fn(),
        createFilteredAsyncIterator: globals_1.jest.fn(),
        createBatchedAsyncIterator: globals_1.jest.fn(),
    },
}));
(0, globals_1.describe)('Bulk mutations', () => {
    const user = { id: 'u1', tenantId: 't1' };
    (0, globals_1.beforeAll)(async () => {
        redisClient = {
            smembers: globals_1.jest.fn(),
            del: globals_1.jest.fn(),
            get: globals_1.jest.fn(),
            set: globals_1.jest.fn(),
            sadd: globals_1.jest.fn(),
        };
        ({ crudResolvers } = await Promise.resolve().then(() => __importStar(require('../src/graphql/resolvers/crudResolvers.js'))));
    });
    (0, globals_1.beforeEach)(() => {
        const mockRunResult = {
            records: [
                {
                    get: () => ({
                        properties: {
                            id: 'id1',
                            investigationId: 'inv1',
                            fromEntity: { id: 'a' },
                            toEntity: { id: 'b' },
                        },
                    }),
                },
            ],
        };
        tx = {
            run: globals_1.jest.fn().mockResolvedValue(mockRunResult),
            commit: globals_1.jest.fn(),
            rollback: globals_1.jest.fn(),
        };
        session = { beginTransaction: () => tx, close: globals_1.jest.fn() };
        pgClient = {
            query: globals_1.jest.fn().mockResolvedValue({}),
            release: globals_1.jest.fn(),
        };
        redisClient.smembers.mockResolvedValue([]);
    });
    (0, globals_1.test)('createEntities returns array', async () => {
        const inputs = [{ type: 'PERSON', label: 'E1', investigationId: 'inv1' }];
        const res = await crudResolvers.Mutation.createEntities(null, { inputs }, { user });
        (0, globals_1.expect)(Array.isArray(res)).toBe(true);
        (0, globals_1.expect)(res).toHaveLength(1);
    });
    (0, globals_1.test)('createRelationships returns array', async () => {
        const inputs = [
            {
                type: 'CONNECTED_TO',
                fromEntityId: 'a',
                toEntityId: 'b',
                investigationId: 'inv1',
            },
        ];
        const res = await crudResolvers.Mutation.createRelationships(null, { inputs }, { user });
        (0, globals_1.expect)(Array.isArray(res)).toBe(true);
        (0, globals_1.expect)(res).toHaveLength(1);
    });
});
