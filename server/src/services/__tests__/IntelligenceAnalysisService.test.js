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
const mockDetectAnomalies = globals_1.jest.fn();
const mockCalculateRiskScore = globals_1.jest.fn();
const mockComputeGraphMetrics = globals_1.jest.fn();
const autoMlListModelsMock = globals_1.jest.fn();
globals_1.jest.unstable_mockModule('../LLMService.js', () => ({
    default: class MockLLMService {
        async summarize(text) {
            return `Summary of ${text}`;
        }
        async extract(_text, _entities) {
            return { Person: ['John'] };
        }
        async complete(_params) {
            return 'Positive';
        }
    },
}));
globals_1.jest.unstable_mockModule('../mlAnalysisService.js', () => ({
    mlAnalysisService: {
        detectAnomalies: (...args) => mockDetectAnomalies(...args),
        calculateRiskScore: (...args) => mockCalculateRiskScore(...args),
        computeGraphMetrics: (...args) => mockComputeGraphMetrics(...args),
    },
}));
globals_1.jest.unstable_mockModule('../AutoMLService.js', () => ({
    autoMLService: {
        listModels: autoMlListModelsMock,
    },
}));
globals_1.jest.unstable_mockModule('../../utils/require.js', () => ({
    requireFunc: (path) => {
        if (path.includes('VisionService')) {
            return class MockVisionService {
                async analyzeImageObjects(_input) {
                    return { objects: [] };
                }
                async analyzeMicroexpressions(_input) {
                    return { dominant: 'happy' };
                }
            };
        }
        if (path.includes('SentimentService')) {
            return class MockSentimentService {
                async analyze(_text) {
                    return { score: 0.8, label: 'positive', magnitude: 0.9 };
                }
            };
        }
        if (path.includes('GraphAnalyticsService')) {
            return class MockGraphAnalyticsService {
            };
        }
        return class Dummy {
        };
    },
}));
const loggerMock = {
    info: globals_1.jest.fn(),
    error: globals_1.jest.fn(),
    warn: globals_1.jest.fn(),
    debug: globals_1.jest.fn(),
};
globals_1.jest.unstable_mockModule('../../utils/logger.js', () => ({
    default: loggerMock,
}));
(0, globals_1.describe)('IntelligenceAnalysisService', () => {
    let IntelligenceAnalysisService;
    let service;
    (0, globals_1.beforeAll)(async () => {
        ({ IntelligenceAnalysisService } = await Promise.resolve().then(() => __importStar(require('../IntelligenceAnalysisService.js'))));
    });
    (0, globals_1.beforeEach)(() => {
        globals_1.jest.clearAllMocks();
        mockDetectAnomalies.mockResolvedValue([
            {
                entity_id: 'e1',
                anomaly_type: 'STATISTICAL',
                severity: 0.8,
                description: 'desc',
                baseline_deviation: 1.0,
                contributing_factors: [],
                timestamp: '2023-01-01',
            },
        ]);
        mockCalculateRiskScore.mockResolvedValue({
            confidence: 0.9,
            reasoning: ['Factor 1'],
            probability: 0.9,
            risk_level: 'CRITICAL',
        });
        mockComputeGraphMetrics.mockResolvedValue({
            density: 0.5,
            centrality_scores: {},
            clustering_coefficient: 0.5,
            average_path_length: 1,
            network_density: 0.5,
            community_modularity: 0.5,
            influence_scores: {},
        });
        autoMlListModelsMock.mockReturnValue([{ id: 'model-1' }]);
        service = new IntelligenceAnalysisService();
    });
    (0, globals_1.it)('should analyze text correctly', async () => {
        const result = await service.analyzeText('John went to Paris.');
        (0, globals_1.expect)(result.summary).toContain('Summary of');
        (0, globals_1.expect)(result.entities).toHaveProperty('Person');
        (0, globals_1.expect)(result.sentiment.label).toBe('positive');
    });
    (0, globals_1.it)('should detect anomalies', async () => {
        const result = await service.detectAnomalies('inv-1');
        (0, globals_1.expect)(result).toHaveLength(1);
        (0, globals_1.expect)(result[0].anomaly_type).toBe('STATISTICAL');
    });
    (0, globals_1.it)('should predict threat level with explainability', async () => {
        const result = await service.predictThreatLevel('entity-1');
        (0, globals_1.expect)(result.confidence).toBe(0.9);
        (0, globals_1.expect)(result.explainability.factors).toContain('Factor 1');
    });
    (0, globals_1.it)('should analyze images', async () => {
        const result = await service.analyzeImage({});
        (0, globals_1.expect)(result.emotions.dominant).toBe('happy');
    });
    (0, globals_1.it)('should classify content', async () => {
        const result = await service.classifyContent('Attack detected', ['Safe', 'Threat']);
        (0, globals_1.expect)(result.category).toBe('Positive');
    });
    (0, globals_1.it)('should analyze trends', () => {
        const data = [10, 20, 30, 40, 50];
        const result = service.analyzeTrends(data);
        (0, globals_1.expect)(result.trend).toBe('increasing');
        (0, globals_1.expect)(result.forecast).toHaveLength(3);
        (0, globals_1.expect)(result.forecast[0]).toBeCloseTo(60);
    });
    (0, globals_1.it)('should expose autoML service', () => {
        const automl = service.getAutoML();
        (0, globals_1.expect)(automl).toBeDefined();
        const models = automl.listModels();
        (0, globals_1.expect)(models.length).toBeGreaterThan(0);
    });
});
