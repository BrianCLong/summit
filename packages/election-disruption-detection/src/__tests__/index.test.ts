import { describe, it, expect } from 'vitest';
import {
  ElectionDisruptionEngine,
  MultiModalFusionEngine,
  CausalAttributionEngine,
  THREAT_MODELS,
} from '../index.js';

describe('ElectionDisruptionEngine', () => {
  it('should initialize with config', () => {
    const engine = new ElectionDisruptionEngine({
      fusion: { weights: {}, correlationThreshold: 0.7 },
      attribution: { minConfidence: 0.5, methods: ['MULTI_INT_FUSION'] },
      adversarial: { enabled: true, detectionThreshold: 0.8 },
    });

    expect(engine).toBeDefined();
  });

  it('should analyze empty signals', async () => {
    const engine = new ElectionDisruptionEngine({
      fusion: { weights: {}, correlationThreshold: 0.7 },
      attribution: { minConfidence: 0.5, methods: ['MULTI_INT_FUSION'] },
      adversarial: { enabled: true, detectionThreshold: 0.8 },
    });

    const result = await engine.analyzeSignals([], {
      electionId: 'test-2024',
      jurisdiction: 'US',
      currentPhase: 'CAMPAIGN',
      daysToElection: 30,
      historicalBaseline: {},
    });

    expect(result).toHaveProperty('threats');
    expect(result).toHaveProperty('overallRiskLevel');
    expect(result).toHaveProperty('recommendations');
  });
});

describe('MultiModalFusionEngine', () => {
  it('should fuse empty threat sets', async () => {
    const engine = new MultiModalFusionEngine({
      weights: {},
      correlationThreshold: 0.7,
    });

    const result = await engine.fuse([]);
    expect(result).toEqual([]);
  });

  it('should wrap single threat', async () => {
    const engine = new MultiModalFusionEngine({
      weights: {},
      correlationThreshold: 0.7,
    });

    const threat = {
      id: 'test-1',
      type: 'DISINFORMATION_CAMPAIGN' as const,
      confidence: 0.8,
      severity: 'HIGH' as const,
      vectors: ['SOCIAL_MEDIA' as const],
      temporalContext: {
        phase: 'CAMPAIGN' as const,
        daysToElection: 30,
        timeWindow: { start: new Date(), end: new Date() },
        trendDirection: 'STABLE' as const,
        velocity: 0,
      },
      geospatialContext: {
        jurisdictions: ['US'],
        precincts: [],
        swingIndicator: 0,
        demographicOverlays: [],
        infrastructureDependencies: [],
      },
      attribution: {
        primaryActor: null,
        confidence: 0,
        methodology: 'BEHAVIORAL_ANALYSIS' as const,
        indicators: [],
        alternativeHypotheses: [],
      },
      evidence: [],
      mitigationRecommendations: [],
    };

    const result = await engine.fuse([[threat]]);
    expect(result).toHaveLength(1);
    expect(result[0]).toHaveProperty('id');
    expect(result[0]).toHaveProperty('type');
    expect(result[0].confidence).toBe(0.8);
  });
});

describe('CausalAttributionEngine', () => {
  it('should attribute empty threats', async () => {
    const engine = new CausalAttributionEngine({
      minConfidenceThreshold: 0.5,
      methods: ['MULTI_INT_FUSION'],
      requireMultipleMethods: false,
      historicalDatabase: '',
    });

    const result = await engine.attribute([]);
    expect(result).toEqual([]);
  });
});

describe('THREAT_MODELS', () => {
  it('should have predefined threat models', () => {
    expect(THREAT_MODELS).toBeDefined();
    expect(THREAT_MODELS.length).toBeGreaterThan(0);
  });

  it('should have required fields in each model', () => {
    for (const model of THREAT_MODELS) {
      expect(model).toHaveProperty('id');
      expect(model).toHaveProperty('name');
      expect(model).toHaveProperty('category');
      expect(model).toHaveProperty('actors');
      expect(model).toHaveProperty('objectives');
      expect(model).toHaveProperty('indicators');
      expect(model).toHaveProperty('mitigations');
    }
  });
});
