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
const getNeo4jDriverMock = globals_1.jest.fn();
globals_1.jest.unstable_mockModule('../../config/database.js', () => ({
    getNeo4jDriver: getNeo4jDriverMock,
}));
// Helper to mock Neo4j record
const mockRecord = (keys, values) => {
    return {
        keys,
        length: keys.length,
        get: (key) => {
            const index = keys.indexOf(key);
            if (index === -1)
                return null;
            const val = values[index];
            // Only mock Neo4j integer behavior for specific fields expected to be Integers
            if (['hops', 'degree', 'reach', 'pathCount'].includes(key)) {
                return {
                    toNumber: () => val,
                    toInt: () => val
                };
            }
            return val;
        },
        toObject: () => {
            const obj = {};
            keys.forEach((k, i) => obj[k] = values[i]);
            return obj;
        }
    };
};
(0, globals_1.describe)('CognitiveMapperService', () => {
    let CognitiveMapperService;
    let mockDriver;
    let mockSession;
    (0, globals_1.beforeAll)(async () => {
        ({ CognitiveMapperService } = await Promise.resolve().then(() => __importStar(require('../CognitiveMapperService.js'))));
    });
    (0, globals_1.beforeEach)(() => {
        mockSession = {
            run: globals_1.jest.fn(),
            close: globals_1.jest.fn(),
            beginTransaction: globals_1.jest.fn(),
            lastBookmark: globals_1.jest.fn(),
        };
        mockDriver = {
            session: globals_1.jest.fn().mockReturnValue(mockSession),
            close: globals_1.jest.fn(),
        };
        getNeo4jDriverMock.mockReturnValue(mockDriver);
        // Reset singleton instance to ensure new mock driver is used
        // @ts-ignore
        CognitiveMapperService.instance = undefined;
    });
    (0, globals_1.afterEach)(() => {
        globals_1.jest.clearAllMocks();
    });
    (0, globals_1.describe)('simulatePropagation', () => {
        (0, globals_1.it)('should simulate propagation and return influence map', async () => {
            const service = CognitiveMapperService.getInstance();
            const mockResult = {
                records: [
                    mockRecord(['nodeId', 'label', 'hops', 'finalStrength'], ['node1', 'User', 1, 0.8]),
                    mockRecord(['nodeId', 'label', 'hops', 'finalStrength'], ['node2', 'Group', 2, 0.64])
                ]
            };
            mockSession.run.mockResolvedValue(mockResult);
            const result = await service.simulatePropagation('startNode', 1.0, 3);
            (0, globals_1.expect)(result.nodesReached).toBe(2);
            (0, globals_1.expect)(result.maxDepth).toBe(2);
            (0, globals_1.expect)(result.influenceMap['node1']).toBe(0.8);
            (0, globals_1.expect)(result.influenceMap['node2']).toBe(0.64);
            (0, globals_1.expect)(mockSession.run).toHaveBeenCalledTimes(1);
        });
    });
    (0, globals_1.describe)('detectAmplifiers', () => {
        (0, globals_1.it)('should identify amplifier nodes', async () => {
            const service = CognitiveMapperService.getInstance();
            const mockResult = {
                records: [
                    mockRecord(['nodeId', 'label', 'degree', 'reach', 'amplificationScore'], ['amp1', 'User', 10, 50, 35])
                ]
            };
            mockSession.run.mockResolvedValue(mockResult);
            const result = await service.detectAmplifiers('inv123');
            (0, globals_1.expect)(result).toHaveLength(1);
            (0, globals_1.expect)(result[0].nodeId).toBe('amp1');
            (0, globals_1.expect)(result[0].amplificationScore).toBe(35);
        });
    });
    (0, globals_1.describe)('forecastOpinionShift', () => {
        (0, globals_1.it)('should forecast opinion shift based on neighbors', async () => {
            const service = CognitiveMapperService.getInstance();
            // Mock node has 0.5 opinion, neighbors have -0.5 and -0.3
            const mockResult = {
                records: [
                    mockRecord(['selfOpinion', 'neighborOpinions'], [0.5, [-0.5, -0.3]] // Avg neighbor = -0.4
                    )
                ]
            };
            mockSession.run.mockResolvedValue(mockResult);
            // t=1: 0.5 * 0.7 + (-0.4) * 0.3 = 0.35 - 0.12 = 0.23
            const result = await service.forecastOpinionShift('nodeX', 1);
            (0, globals_1.expect)(result.nodeId).toBe('nodeX');
            (0, globals_1.expect)(result.predictedOpinion).toBeCloseTo(0.23);
        });
    });
});
