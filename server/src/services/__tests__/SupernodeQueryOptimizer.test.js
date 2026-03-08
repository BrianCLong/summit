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
// Create mocks at the top level so they can be referenced in the mock module
const mockSession = {
    run: globals_1.jest.fn(),
    close: globals_1.jest.fn(),
};
const mockDriver = {
    session: globals_1.jest.fn(),
};
// Mock neo4j-driver
globals_1.jest.unstable_mockModule('neo4j-driver', () => ({
    default: {
        driver: globals_1.jest.fn(() => mockDriver),
        auth: {
            basic: globals_1.jest.fn(),
        },
    },
    Driver: globals_1.jest.fn(),
    Session: globals_1.jest.fn(),
}));
// Mock ioredis
globals_1.jest.unstable_mockModule('ioredis', () => ({
    __esModule: true,
    default: globals_1.jest.fn(() => ({
        get: globals_1.jest.fn(),
        set: globals_1.jest.fn(),
        setex: globals_1.jest.fn(),
        keys: globals_1.jest.fn(),
        del: globals_1.jest.fn(),
    })),
}));
// Mock logger
globals_1.jest.unstable_mockModule('../utils/logger.js', () => ({
    __esModule: true,
    default: {
        child: globals_1.jest.fn(() => ({
            info: globals_1.jest.fn(),
            error: globals_1.jest.fn(),
            warn: globals_1.jest.fn(),
            debug: globals_1.jest.fn(),
        })),
    },
}));
const { SupernodeQueryOptimizer } = await Promise.resolve().then(() => __importStar(require('../SupernodeQueryOptimizer.js')));
(0, globals_1.describe)('SupernodeQueryOptimizer', () => {
    let optimizer;
    (0, globals_1.beforeEach)(() => {
        globals_1.jest.clearAllMocks();
        // Setup default mock behavior
        mockDriver.session.mockReturnValue(mockSession);
        mockSession.run.mockResolvedValue({ records: [] });
        mockSession.close.mockResolvedValue(undefined);
        optimizer = new SupernodeQueryOptimizer(mockDriver, undefined, {
            supernodeThreshold: 100,
        });
        // Reset internal cache
        optimizer['supernodeCache'].clear();
    });
    (0, globals_1.describe)('getSupernodeInfo', () => {
        (0, globals_1.it)('should use size() for degree checks and return info', async () => {
            const mockRecord = {
                get: (key) => {
                    const data = {
                        entityId: 'ent-1',
                        label: 'Entity 1',
                        type: 'Person',
                        connectionCount: { toNumber: () => 150 },
                        outgoing: { toNumber: () => 100 },
                        incoming: { toNumber: () => 50 },
                        topTypes: [{ type: 'KNOWS', count: 150 }],
                    };
                    return data[key];
                },
            };
            mockSession.run.mockResolvedValue({
                records: [mockRecord],
            });
            const info = await optimizer.getSupernodeInfo('ent-1');
            (0, globals_1.expect)(info).toBeDefined();
            (0, globals_1.expect)(info.connectionCount).toBe(150);
            (0, globals_1.expect)(mockSession.run).toHaveBeenCalledWith(globals_1.expect.stringContaining('size((e)-->())'), { entityId: 'ent-1' });
        });
    });
    (0, globals_1.describe)('detectSupernodes', () => {
        (0, globals_1.it)('should batch multiple IDs using UNWIND', async () => {
            const mockRecords = [
                {
                    get: (key) => {
                        const data = {
                            entityId: 'ent-1',
                            label: 'Entity 1',
                            type: 'Person',
                            connectionCount: { toNumber: () => 200 },
                            outgoing: { toNumber: () => 100 },
                            incoming: { toNumber: () => 100 },
                            topTypes: [],
                        };
                        return data[key];
                    },
                },
                {
                    get: (key) => {
                        const data = {
                            entityId: 'ent-2',
                            label: 'Entity 2',
                            type: 'Person',
                            connectionCount: { toNumber: () => 300 },
                            outgoing: { toNumber: () => 150 },
                            incoming: { toNumber: () => 150 },
                            topTypes: [],
                        };
                        return data[key];
                    },
                },
            ];
            mockSession.run.mockResolvedValue({
                records: mockRecords,
            });
            const ids = ['ent-1', 'ent-2', 'ent-3'];
            const supernodes = await optimizer.detectSupernodes(ids);
            (0, globals_1.expect)(supernodes).toHaveLength(2);
            (0, globals_1.expect)(mockSession.run).toHaveBeenCalledTimes(1); // Only one call for all IDs
            (0, globals_1.expect)(mockSession.run).toHaveBeenCalledWith(globals_1.expect.stringContaining('UNWIND $entityIds'), globals_1.expect.objectContaining({ entityIds: ['ent-1', 'ent-2', 'ent-3'] }));
        });
        (0, globals_1.it)('should use cache and only query missing IDs', async () => {
            // Pre-fill cache
            const cachedInfo = {
                entityId: 'ent-cached',
                connectionCount: 500,
                label: 'Cached',
                type: 'Person',
                incomingCount: 250,
                outgoingCount: 250,
                topConnectionTypes: [],
                lastUpdated: new Date()
            };
            optimizer['supernodeCache'].set('ent-cached', cachedInfo);
            mockSession.run.mockResolvedValue({ records: [] });
            await optimizer.detectSupernodes(['ent-cached', 'ent-new']);
            (0, globals_1.expect)(mockSession.run).toHaveBeenCalledWith(globals_1.expect.any(String), globals_1.expect.objectContaining({ entityIds: ['ent-new'] }));
        });
    });
    (0, globals_1.describe)('precomputeSupernodeStats', () => {
        (0, globals_1.it)('should use batched detection', async () => {
            mockSession.run.mockResolvedValueOnce({
                records: [
                    { get: () => 'ent-1' },
                    { get: () => 'ent-2' }
                ]
            });
            // Mock detectSupernodes call that happens inside
            const detectSpy = globals_1.jest.spyOn(optimizer, 'detectSupernodes').mockResolvedValue([
                { entityId: 'ent-1', connectionCount: 200 },
                { entityId: 'ent-2', connectionCount: 300 }
            ]);
            const processed = await optimizer.precomputeSupernodeStats(10);
            (0, globals_1.expect)(processed).toBe(2);
            (0, globals_1.expect)(detectSpy).toHaveBeenCalledWith(['ent-1', 'ent-2']);
        });
    });
});
