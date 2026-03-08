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
(0, globals_1.describe)('PredictiveService Integration (Mocked Driver)', () => {
    let PredictiveService;
    let mockSession;
    let mockRun;
    let service;
    (0, globals_1.beforeAll)(async () => {
        const module = await Promise.resolve().then(() => __importStar(require('../PredictiveService.js')));
        PredictiveService = module.PredictiveService;
    });
    (0, globals_1.beforeEach)(() => {
        globals_1.jest.clearAllMocks();
        mockRun = globals_1.jest.fn();
        mockSession = {
            run: mockRun,
            close: globals_1.jest.fn(),
        };
        getNeo4jDriverMock.mockReturnValue({
            session: globals_1.jest.fn().mockReturnValue(mockSession),
        });
        service = new PredictiveService();
    });
    (0, globals_1.it)('correctly reconstructs edges from GraphStore convention', async () => {
        mockRun.mockResolvedValue({
            records: [
                {
                    get: (key) => {
                        if (key === 'n') {
                            return { properties: { id: 'node1' }, labels: ['Person'], elementId: 'n1' };
                        }
                        if (key === 'm') {
                            return { properties: { id: 'node2' }, labels: ['Person'], elementId: 'n2' };
                        }
                        if (key === 'r') {
                            return {
                                properties: { id: 'edge1', fromId: 'node1', toId: 'node2' },
                                type: 'KNOWS',
                                startNodeElementId: 'n1',
                                endNodeElementId: 'n2',
                            };
                        }
                        return undefined;
                    },
                },
            ],
        });
        const req = {
            investigationId: 'inv1',
            injectedNodes: [],
            injectedEdges: [],
            legalBasis: { purpose: 'test', policyId: 'p1' },
        };
        const result = await service.simulateWhatIf(req);
        (0, globals_1.expect)(result.baselineMetrics.density).toBeCloseTo(0.5);
    });
    (0, globals_1.it)('correctly reconstructs edges from Internal IDs fallback', async () => {
        mockRun.mockResolvedValue({
            records: [
                {
                    get: (key) => {
                        if (key === 'n') {
                            return {
                                properties: { id: 'nodeA' },
                                labels: ['Person'],
                                elementId: 'intA',
                                identity: 'intA',
                            };
                        }
                        if (key === 'm') {
                            return {
                                properties: { id: 'nodeB' },
                                labels: ['Person'],
                                elementId: 'intB',
                                identity: 'intB',
                            };
                        }
                        if (key === 'r') {
                            return {
                                properties: { id: 'edgeX' },
                                type: 'KNOWS',
                                startNodeElementId: 'intA',
                                endNodeElementId: 'intB',
                                start: 'intA',
                                end: 'intB',
                            };
                        }
                        return undefined;
                    },
                },
            ],
        });
        const req = {
            investigationId: 'inv2',
            injectedNodes: [],
            injectedEdges: [],
            legalBasis: { purpose: 'test', policyId: 'p1' },
        };
        const result = await service.simulateWhatIf(req);
        (0, globals_1.expect)(result.baselineMetrics.density).toBeCloseTo(0.5);
    });
});
