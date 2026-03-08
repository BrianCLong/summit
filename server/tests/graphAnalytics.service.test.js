"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-nocheck - Test needs update for singleton pattern
const GraphAnalyticsService_js_1 = __importDefault(require("../src/services/GraphAnalyticsService.js"));
const globals_1 = require("@jest/globals");
(0, globals_1.describe)('GraphAnalyticsService caching', () => {
    const createRedisStub = () => {
        const store = new Map();
        return {
            get: globals_1.jest.fn(async (key) => store.get(key) ?? null),
            set: globals_1.jest.fn(async (key, value) => {
                store.set(key, value);
                return 'OK';
            }),
            del: globals_1.jest.fn(async (key) => {
                store.delete(key);
                return 1;
            }),
        };
    };
    (0, globals_1.it)('returns cached PageRank results on subsequent calls', async () => {
        const redis = createRedisStub();
        const service = new GraphAnalyticsService_js_1.default({
            driver: { session: globals_1.jest.fn() },
            redis,
            cacheTtl: 10,
        });
        globals_1.jest
            .spyOn(service, 'ensureGraphProjection')
            .mockResolvedValue(undefined);
        const execute = globals_1.jest
            .spyOn(service, 'executePageRank')
            .mockResolvedValue([{ nodeId: 'n1', label: 'Node', score: 0.5 }]);
        const first = await service.calculatePageRank({
            investigationId: 'inv-1',
            limit: 5,
        });
        const second = await service.calculatePageRank({
            investigationId: 'inv-1',
            limit: 5,
        });
        (0, globals_1.expect)(first).toEqual(second);
        (0, globals_1.expect)(execute).toHaveBeenCalledTimes(1);
        (0, globals_1.expect)(redis.get).toHaveBeenCalled();
        (0, globals_1.expect)(redis.set).toHaveBeenCalled();
    });
    (0, globals_1.it)('bypasses the cache when forceRefresh is true', async () => {
        const redis = createRedisStub();
        const service = new GraphAnalyticsService_js_1.default({
            driver: { session: globals_1.jest.fn() },
            redis,
        });
        globals_1.jest
            .spyOn(service, 'ensureGraphProjection')
            .mockResolvedValue(undefined);
        globals_1.jest
            .spyOn(service, 'dropGraphProjection')
            .mockResolvedValue(undefined);
        const execute = globals_1.jest
            .spyOn(service, 'executePageRank')
            .mockResolvedValue([{ nodeId: 'n1', label: 'Node', score: 0.5 }]);
        await service.calculatePageRank({
            investigationId: 'inv-2',
            limit: 10,
            forceRefresh: true,
        });
        (0, globals_1.expect)(execute).toHaveBeenCalledTimes(1);
        (0, globals_1.expect)(redis.del).toHaveBeenCalled();
    });
});
