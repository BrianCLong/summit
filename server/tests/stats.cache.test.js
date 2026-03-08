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
globals_1.jest.mock('../src/metrics/cacheMetrics.js', () => ({
    recHit: globals_1.jest.fn(),
    recMiss: globals_1.jest.fn(),
    recSet: globals_1.jest.fn(),
    recInvalidation: globals_1.jest.fn(),
    recEviction: globals_1.jest.fn(),
    setHitRatio: globals_1.jest.fn(),
    cacheLocalSize: {
        labels: globals_1.jest.fn(() => ({ set: globals_1.jest.fn() })),
    },
}));
globals_1.jest.mock('../src/config/database.js', () => {
    const query = globals_1.jest.fn(async (sql, _params) => {
        if (/GROUP BY status/.test(sql)) {
            return {
                rows: [
                    { status: 'OPEN', c: 3 },
                    { status: 'CLOSED', c: 1 },
                ],
            };
        }
        if (/SELECT COUNT\(\*\)::int AS entities/.test(sql))
            return { rows: [{ entities: 42 }] };
        if (/SELECT COUNT\(\*\)::int AS relationships/.test(sql))
            return { rows: [{ relationships: 99 }] };
        if (/SELECT COUNT\(\*\)::int AS investigations/.test(sql))
            return { rows: [{ investigations: 7 }] };
        return { rows: [] };
    });
    return {
        getPostgresPool: () => ({ query }),
    };
});
(0, globals_1.describe)('stats caching', () => {
    (0, globals_1.test)('caseCounts and summaryStats are cached via local/redis cache', async () => {
        globals_1.jest.resetModules();
        const { statsResolvers } = await Promise.resolve().then(() => __importStar(require('../src/graphql/resolvers/stats.js')));
        const ctx = { user: { tenant: 't-test' } };
        // First pass -> populates cache
        await statsResolvers.Query.caseCounts(null, {}, ctx);
        await statsResolvers.Query.summaryStats(null, {}, ctx);
        // Reset db mock counters by re-mocking getPostgresPool
        const mod = require('../src/config/database.js');
        mod.getPostgresPool().query.mockClear();
        await statsResolvers.Query.caseCounts(null, {}, ctx);
        await statsResolvers.Query.summaryStats(null, {}, ctx);
        (0, globals_1.expect)(mod.getPostgresPool().query).not.toHaveBeenCalled();
    });
});
