
import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Mock dependencies
jest.mock('../LLMService', () => {
  return class MockLLMService {
    constructor(config) {}
    async summarize(text) { return 'Summary of ' + text; }
    async extract(text, entities) { return { Person: ['John'] }; }
    async complete(params) { return 'Positive'; }
  };
});

const mockDetectAnomalies = jest.fn() as any;
const mockCalculateRiskScore = jest.fn() as any;
const mockComputeGraphMetrics = jest.fn() as any;

jest.mock('../mlAnalysisService', () => ({
  mlAnalysisService: {
    detectAnomalies: (...args) => mockDetectAnomalies(...args),
    calculateRiskScore: (...args) => mockCalculateRiskScore(...args),
    computeGraphMetrics: (...args) => mockComputeGraphMetrics(...args)
  }
}));

// Mock util - MUST be before import of the service
// Relative path from src/services/__tests__/IntelligenceAnalysisService.test.ts to src/utils/require.ts is ../../utils/require.ts
// BUT since we import it via module name in the source, we mock it via module path if mapped, or relative path.
// The source uses: import { requireFunc } from '../utils/require';
// Jest resolver will look for it.
jest.mock('../../utils/require', () => ({
  requireFunc: (path) => {
    // console.log('Mock requireFunc called with', path);
    if (path.includes('VisionService')) {
      return class MockVisionService {
        async analyzeImageObjects(input) { return { objects: [] }; }
        async analyzeMicroexpressions(input) { return { dominant: 'happy' }; }
      };
    }
    if (path.includes('SentimentService')) {
      return class MockSentimentService {
        async analyze(text) { return { score: 0.8, label: 'positive', magnitude: 0.9 }; }
      };
    }
    if (path.includes('GraphAnalyticsService')) {
      return class MockGraphAnalyticsService {};
    }
    return class Dummy {};
  }
}));

// Mock logger
jest.mock('../../utils/logger.js', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}), { virtual: true });

import { IntelligenceAnalysisService } from '../IntelligenceAnalysisService';

describe('IntelligenceAnalysisService', () => {
  let service;

  beforeEach(() => {
    jest.clearAllMocks();

    mockDetectAnomalies.mockResolvedValue([
      {
        entity_id: 'e1',
        anomaly_type: 'STATISTICAL',
        severity: 0.8,
        description: 'desc',
        baseline_deviation: 1.0,
        contributing_factors: [],
        timestamp: '2023-01-01'
      }
    ]);

    mockCalculateRiskScore.mockResolvedValue({
      confidence: 0.9,
      reasoning: ['Factor 1'],
      probability: 0.9,
      risk_level: 'CRITICAL'
    });

    mockComputeGraphMetrics.mockResolvedValue({
      density: 0.5,
      centrality_scores: {},
      clustering_coefficient: 0.5,
      average_path_length: 1,
      network_density: 0.5,
      community_modularity: 0.5,
      influence_scores: {}
    });

    service = new IntelligenceAnalysisService();
  });

  it('should analyze text correctly', async () => {
    const result = await service.analyzeText('John went to Paris.');
    expect(result.summary).toContain('Summary of');
    expect(result.entities).toHaveProperty('Person');
    expect(result.sentiment.label).toBe('positive');
  });

  it('should detect anomalies', async () => {
    const result = await service.detectAnomalies('inv-1');
    expect(result).toHaveLength(1);
    expect(result[0].anomaly_type).toBe('STATISTICAL');
  });

  it('should predict threat level with explainability', async () => {
    const result = await service.predictThreatLevel('entity-1');
    expect(result.confidence).toBe(0.9);
    expect(result.explainability.factors).toContain('Factor 1');
  });

  it('should analyze images', async () => {
    const result = await service.analyzeImage({});
    expect(result.emotions.dominant).toBe('happy');
  });

  it('should classify content', async () => {
    const result = await service.classifyContent('Attack detected', ['Safe', 'Threat']);
    expect(result.category).toBe('Positive'); // Mock returns 'Positive' for complete
  });

  it('should analyze trends', () => {
    const data = [10, 20, 30, 40, 50];
    const result = service.analyzeTrends(data);
    expect(result.trend).toBe('increasing');
    expect(result.forecast).toHaveLength(3);
    expect(result.forecast[0]).toBeCloseTo(60);
  });

  it('should expose autoML service', () => {
    const automl = service.getAutoML();
    expect(automl).toBeDefined();
    const models = automl.listModels();
    expect(models.length).toBeGreaterThan(0);
  });
});
