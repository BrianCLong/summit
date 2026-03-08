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
const mockDetectCIB = globals_1.jest.fn();
const mockTakeSnapshot = globals_1.jest.fn();
const mockGetNarrativeEvolution = globals_1.jest.fn();
const mockCentrality = globals_1.jest.fn();
const mockCommunities = globals_1.jest.fn();
const mockGraphService = {
    centrality: mockCentrality,
    communities: mockCommunities,
};
globals_1.jest.unstable_mockModule('../src/services/NarrativeAnalysisService.js', () => ({
    NarrativeAnalysisService: globals_1.jest.fn(() => ({
        takeSnapshot: mockTakeSnapshot,
        getNarrativeEvolution: mockGetNarrativeEvolution,
    })),
}));
globals_1.jest.unstable_mockModule('../src/services/CIBDetectionService.js', () => {
    class MockCIBDetectionService {
        detectCIB = mockDetectCIB;
    }
    return { CIBDetectionService: MockCIBDetectionService };
});
globals_1.jest.unstable_mockModule('../src/services/GraphAnalyticsService.js', () => {
    class MockGraphAnalyticsService {
        centrality = mockCentrality;
        communities = mockCommunities;
        static getInstance = globals_1.jest.fn(() => mockGraphService);
    }
    return {
        __esModule: true,
        default: MockGraphAnalyticsService,
    };
});
globals_1.jest.unstable_mockModule('../src/services/CrossPlatformAttributionService.js', () => ({
    CrossPlatformAttributionService: globals_1.jest.fn(),
}));
(0, globals_1.describe)('InfluenceOperationsService', () => {
    let InfluenceOperationsService;
    let service;
    let NarrativeAnalysisService;
    let GraphAnalyticsService;
    (0, globals_1.beforeAll)(async () => {
        ({ InfluenceOperationsService } = await Promise.resolve().then(() => __importStar(require('../src/services/InfluenceOperationsService.js'))));
        ({ NarrativeAnalysisService } = await Promise.resolve().then(() => __importStar(require('../src/services/NarrativeAnalysisService.js'))));
        ({ default: GraphAnalyticsService } = await Promise.resolve().then(() => __importStar(require('../src/services/GraphAnalyticsService.js'))));
    });
    (0, globals_1.beforeEach)(() => {
        globals_1.jest.clearAllMocks();
        // Clear the instance so a new one is created
        InfluenceOperationsService.instance = null;
        NarrativeAnalysisService.mockImplementation(() => ({
            takeSnapshot: mockTakeSnapshot,
            getNarrativeEvolution: mockGetNarrativeEvolution,
        }));
        GraphAnalyticsService.getInstance.mockReturnValue(mockGraphService);
        service = InfluenceOperationsService.getInstance();
        service.cibService = { detectCIB: mockDetectCIB };
        service.narrativeService = {
            takeSnapshot: mockTakeSnapshot,
            getNarrativeEvolution: mockGetNarrativeEvolution,
        };
        service.graphService = mockGraphService;
    });
    (0, globals_1.it)('should detect influence operations correctly', async () => {
        const campaignId = 'camp-123';
        mockDetectCIB.mockImplementation(async () => ({
            campaignId: 'camp-123',
            identifiedBotClusters: [],
            anomalies: [],
            precisionScore: 0.88,
            timestamp: new Date()
        }));
        mockTakeSnapshot.mockImplementation(async () => ({
            timestamp: new Date(),
            narrativeId: campaignId,
            metrics: { nodeCount: 100 },
            topTopics: [],
            amplificationVelocity: 10
        }));
        mockCentrality.mockImplementation(async () => [
            { nodeId: 'node1', score: 0.5 },
        ]);
        const result = await service.detectInfluenceOperations(campaignId);
        (0, globals_1.expect)(result).toBeDefined();
        (0, globals_1.expect)(result.cib.precisionScore).toBe(0.88);
        (0, globals_1.expect)(result.narrative.metrics.nodeCount).toBe(100);
        (0, globals_1.expect)(mockCentrality).toHaveBeenCalledWith({
            tenantId: 'system',
            scope: { investigationId: campaignId },
            algorithm: 'pageRank',
        });
        (0, globals_1.expect)(mockDetectCIB).toHaveBeenCalled();
        (0, globals_1.expect)(mockTakeSnapshot).toHaveBeenCalledWith(campaignId);
    });
    (0, globals_1.it)('should get narrative timeline', async () => {
        const narrativeId = 'narr-1';
        const mockTimeline = [{ timestamp: new Date(), metrics: {} }];
        mockGetNarrativeEvolution.mockImplementation(async () => mockTimeline);
        const timeline = await service.getNarrativeTimeline(narrativeId);
        (0, globals_1.expect)(timeline).toBe(mockTimeline);
        (0, globals_1.expect)(mockGetNarrativeEvolution).toHaveBeenCalledWith(narrativeId);
    });
    (0, globals_1.it)('should get influence network', async () => {
        const narrativeId = 'narr-1';
        const mockCentralityResult = { degreeCentrality: [] };
        const mockCommunitiesResult = [{ id: 1, size: 10 }];
        mockCentrality.mockImplementation(async () => mockCentralityResult);
        mockCommunities.mockImplementation(async () => mockCommunitiesResult);
        const network = await service.getInfluenceNetwork(narrativeId);
        (0, globals_1.expect)(network.centrality).toBe(mockCentralityResult);
        (0, globals_1.expect)(network.communities).toBe(mockCommunitiesResult);
    });
});
