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
const esmMock_js_1 = require("../../../tests/utils/esmMock.js");
describe('cacheWarmupWorker', () => {
    beforeEach(() => {
        globals_1.jest.resetModules();
    });
    it('skips starting queue and enqueuing when Redis is mocked', async () => {
        const queueAdd = globals_1.jest.fn();
        const workerConstructor = globals_1.jest.fn();
        await (0, esmMock_js_1.mockEsmModule)('../../src/db/redis.js', () => ({
            getRedisClient: () => ({ __isMock: true }),
            getRedisConnectionOptions: () => ({}),
            isRedisMock: () => true,
        }));
        await (0, esmMock_js_1.mockEsmModule)('bullmq', () => ({
            Queue: globals_1.jest.fn(() => ({ add: queueAdd })),
            Worker: globals_1.jest.fn((...args) => {
                workerConstructor(...args);
                return {};
            }),
            Job: class {
            },
        }));
        const { startCacheWarmupWorker, enqueueCacheWarmup } = await Promise.resolve().then(() => __importStar(require('../cacheWarmupWorker.js')));
        await startCacheWarmupWorker();
        await enqueueCacheWarmup({ query: 'foo', limit: 5 });
        expect(workerConstructor).not.toHaveBeenCalled();
        expect(queueAdd).not.toHaveBeenCalled();
    });
});
