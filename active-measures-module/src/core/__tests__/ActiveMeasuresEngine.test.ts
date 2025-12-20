/**
 * Comprehensive Unit Tests for Active Measures Engine
 * Tests portfolio generation, measure combination, operation management, and compliance
 */

import { ActiveMeasuresEngine } from '../ActiveMeasuresEngine';

// Mock dependencies
jest.mock('../../utils/logger', () => ({
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('../../utils/metrics', () => ({
  metricsCollector: {
    setGauge: jest.fn(),
    recordHistogram: jest.fn(),
    incrementCounter: jest.fn(),
  },
}));

jest.mock('../../db/neo4j', () => ({
  activeMeasuresGraphRepo: {
    initializeSchema: jest.fn().mockResolvedValue(undefined),
    getActiveMeasuresPortfolio: jest.fn().mockResolvedValue([]),
    createActiveMeasure: jest.fn().mockResolvedValue('measure-id'),
    createOperation: jest.fn().mockResolvedValue('operation-id'),
    getOperation: jest.fn().mockResolvedValue(null),
    linkOperationToMeasures: jest.fn().mockResolvedValue(undefined),
    createAuditEntry: jest.fn().mockResolvedValue('audit-id'),
  },
}));

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid'),
}));

describe('ActiveMeasuresEngine', () => {
  let engine: ActiveMeasuresEngine;
  let mockNeo4jDriver: any;

  beforeEach(() => {
    mockNeo4jDriver = {};
    engine = new ActiveMeasuresEngine(mockNeo4jDriver);
  });

  describe('Initialization', () => {
    it('should initialize the engine', () => {
      expect(engine).toBeDefined();
    });

    it('should call initializeSchema on neo4j repo', async () => {
      const { activeMeasuresGraphRepo } = require('../../db/neo4j');
      expect(activeMeasuresGraphRepo.initializeSchema).toHaveBeenCalled();
    });
  });

  describe('Portfolio Generation', () => {
    beforeEach(() => {
      const { activeMeasuresGraphRepo } = require('../../db/neo4j');
      activeMeasuresGraphRepo.getActiveMeasuresPortfolio.mockResolvedValue([
        {
          id: 'measure-1',
          name: 'Test Measure 1',
          category: 'INFORMATION_OPERATIONS',
          riskLevel: 'MODERATE',
          effectivenessRating: 0.75,
          unattributabilityScore: 0.85,
          ethicalScore: 0.6,
        },
        {
          id: 'measure-2',
          name: 'Test Measure 2',
          category: 'CYBER_OPERATIONS',
          riskLevel: 'HIGH',
          effectivenessRating: 0.90,
          unattributabilityScore: 0.70,
          ethicalScore: 0.4,
        },
      ]);
    });

    it('should generate a portfolio with measures', async () => {
      const portfolio = await engine.getActiveMeasuresPortfolio();

      expect(portfolio).toBeDefined();
      expect(portfolio.measures).toBeInstanceOf(Array);
      expect(portfolio.totalCount).toBeGreaterThan(0);
    });

    it('should apply ethical filtering based on tuners', async () => {
      const tuners = {
        ethicalIndex: 0.9,
      };

      const portfolio = await engine.getActiveMeasuresPortfolio({}, tuners);

      expect(portfolio).toBeDefined();
      // High ethical index should filter risky operations
    });

    it('should apply tuning algorithms to measures', async () => {
      const tuners = {
        proportionality: 0.7,
        riskTolerance: 0.5,
        unattributabilityRequirement: 0.8,
        plausibleDeniability: 0.9,
      };

      const portfolio = await engine.getActiveMeasuresPortfolio({}, tuners);

      expect(portfolio).toBeDefined();
      expect(portfolio.measures).toBeInstanceOf(Array);

      if (portfolio.measures.length > 0) {
        expect(portfolio.measures[0]).toHaveProperty('compositeScore');
        expect(portfolio.measures[0]).toHaveProperty('tuningMetadata');
      }
    });

    it('should generate recommendations', async () => {
      const portfolio = await engine.getActiveMeasuresPortfolio();

      expect(portfolio.recommendations).toBeInstanceOf(Array);
    });

    it('should calculate risk assessment', async () => {
      const portfolio = await engine.getActiveMeasuresPortfolio();

      expect(portfolio.riskAssessment).toBeDefined();
      expect(portfolio.riskAssessment.overallRisk).toBeDefined();
      expect(portfolio.riskAssessment.categories).toBeInstanceOf(Array);
      expect(portfolio.riskAssessment.mitigationStrategies).toBeInstanceOf(Array);
    });

    it('should check compliance status', async () => {
      const portfolio = await engine.getActiveMeasuresPortfolio();

      expect(portfolio.complianceStatus).toBeDefined();
      expect(portfolio.complianceStatus.overallStatus).toBeDefined();
      expect(portfolio.complianceStatus.frameworks).toBeInstanceOf(Array);
    });

    it('should categorize measures', async () => {
      const portfolio = await engine.getActiveMeasuresPortfolio();

      expect(portfolio.categories).toBeInstanceOf(Array);

      if (portfolio.categories.length > 0) {
        expect(portfolio.categories[0]).toHaveProperty('name');
        expect(portfolio.categories[0]).toHaveProperty('count');
        expect(portfolio.categories[0]).toHaveProperty('averageEffectiveness');
      }
    });

    it('should limit measures to top 50', async () => {
      const manyMeasures = Array.from({ length: 100 }, (_, i) => ({
        id: `measure-${i}`,
        name: `Measure ${i}`,
        category: 'INFORMATION_OPERATIONS',
        riskLevel: 'MODERATE',
        effectivenessRating: Math.random(),
        unattributabilityScore: Math.random(),
        ethicalScore: 0.5,
      }));

      const { activeMeasuresGraphRepo } = require('../../db/neo4j');
      activeMeasuresGraphRepo.getActiveMeasuresPortfolio.mockResolvedValue(manyMeasures);

      const portfolio = await engine.getActiveMeasuresPortfolio();

      expect(portfolio.measures.length).toBeLessThanOrEqual(50);
    });

    it('should record metrics', async () => {
      const { metricsCollector } = require('../../utils/metrics');

      await engine.getActiveMeasuresPortfolio();

      expect(metricsCollector.recordHistogram).toHaveBeenCalledWith('portfolio_generation_time', expect.any(Number));
      expect(metricsCollector.incrementCounter).toHaveBeenCalledWith('portfolio_requests');
    });
  });

  describe('Operation Management', () => {
    it('should create a new operation', async () => {
      const operationData = {
        name: 'Test Operation',
        description: 'A test operation',
        classification: 'SECRET',
        objectives: [
          {
            id: 'obj-1',
            type: 'INFLUENCE_PERCEPTION',
            description: 'Test objective',
            successCriteria: ['Criterion 1'],
            metrics: [],
            priority: 'HIGH',
          },
        ],
        measures: [],
        targetProfile: {
          entityIds: [],
          demographicData: {},
          psychographicProfile: {},
          vulnerabilities: [],
          communicationChannels: [],
          influenceNetwork: {},
          adaptabilityScore: 0.5,
        },
        timeline: {
          plannedStart: new Date(),
          plannedEnd: new Date(Date.now() + 86400000),
          phases: [],
        },
        team: {
          lead: {
            id: 'user-1',
            name: 'Test Lead',
            role: 'Lead',
            clearanceLevel: 'SECRET',
            responsibilities: [],
            contactInfo: {},
          },
          members: [],
          approvers: [],
          advisors: [],
        },
        approvalChain: [],
        progress: {
          percentage: 0,
          currentPhase: 'Planning',
          completedTasks: 0,
          totalTasks: 0,
          estimatedCompletion: new Date(),
          blockers: [],
        },
        auditTrail: [],
        createdBy: 'test-user',
      };

      const operationId = await engine.createOperation(operationData);

      expect(operationId).toBe('operation-id');

      const { metricsCollector } = require('../../utils/metrics');
      expect(metricsCollector.incrementCounter).toHaveBeenCalledWith('operations_created');
    });

    it('should link measures to operation', async () => {
      const { activeMeasuresGraphRepo } = require('../../db/neo4j');

      const operationData = {
        name: 'Test Operation',
        description: 'Test',
        classification: 'SECRET',
        objectives: [],
        measures: [{ id: 'measure-1' }, { id: 'measure-2' }],
        targetProfile: {} as any,
        timeline: {} as any,
        team: {} as any,
        approvalChain: [],
        progress: {} as any,
        auditTrail: [],
      };

      await engine.createOperation(operationData);

      expect(activeMeasuresGraphRepo.linkOperationToMeasures).toHaveBeenCalledWith(
        'operation-id',
        ['measure-1', 'measure-2']
      );
    });

    it('should create audit entry on operation creation', async () => {
      const { activeMeasuresGraphRepo } = require('../../db/neo4j');

      const operationData = {
        name: 'Test Operation',
        description: 'Test',
        classification: 'SECRET',
        objectives: [],
        measures: [],
        targetProfile: {} as any,
        timeline: {} as any,
        team: {} as any,
        approvalChain: [],
        progress: {} as any,
        auditTrail: [],
        createdBy: 'test-user',
      };

      await engine.createOperation(operationData);

      expect(activeMeasuresGraphRepo.createAuditEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'CREATE_OPERATION',
          operationId: 'operation-id',
        })
      );
    });

    it('should get operation by ID', async () => {
      const { activeMeasuresGraphRepo } = require('../../db/neo4j');
      const mockOperation = {
        id: 'op-1',
        name: 'Test Operation',
        status: 'DRAFT',
      };
      activeMeasuresGraphRepo.getOperation.mockResolvedValue(mockOperation);

      const operation = await engine.getOperation('op-1');

      expect(operation).toEqual(mockOperation);
      expect(activeMeasuresGraphRepo.getOperation).toHaveBeenCalledWith('op-1');
    });
  });

  describe('Measure Combination', () => {
    beforeEach(() => {
      jest.spyOn(engine as any, 'getMeasureById').mockResolvedValue({
        id: 'measure-1',
        name: 'Test Measure',
        category: 'INFORMATION_OPERATIONS',
        effectivenessRating: 0.75,
        riskLevel: 'MODERATE',
        unattributabilityScore: 0.85,
        ethicalScore: 0.6,
        compatibilityFactors: ['social_media'],
      });
    });

    it('should combine multiple measures', async () => {
      const measureIds = ['measure-1', 'measure-2', 'measure-3'];
      const tuners = {
        proportionality: 0.7,
        riskTolerance: 0.5,
      };
      const context = {
        region: 'test-region',
      };

      const result = await engine.combineMeasures(measureIds, tuners, context);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.operationPlan).toBeDefined();
      expect(result.compatibilityMatrix).toBeInstanceOf(Array);
      expect(result.recommendations).toBeInstanceOf(Array);
    });

    it('should analyze compatibility between measures', async () => {
      const measureIds = ['measure-1', 'measure-2'];
      const tuners = {};
      const context = {};

      const result = await engine.combineMeasures(measureIds, tuners, context);

      expect(result.compatibilityMatrix).toBeInstanceOf(Array);

      if (result.compatibilityMatrix.length > 0) {
        expect(result.compatibilityMatrix[0]).toHaveProperty('measure1Id');
        expect(result.compatibilityMatrix[0]).toHaveProperty('measure2Id');
        expect(result.compatibilityMatrix[0]).toHaveProperty('compatibilityScore');
        expect(result.compatibilityMatrix[0]).toHaveProperty('synergies');
        expect(result.compatibilityMatrix[0]).toHaveProperty('conflicts');
      }
    });

    it('should generate operation plan with graph', async () => {
      const measureIds = ['measure-1', 'measure-2'];
      const result = await engine.combineMeasures(measureIds, {}, {});

      expect(result.operationPlan).toBeDefined();
      expect(result.operationPlan.graph).toBeDefined();
      expect(result.operationPlan.graph.nodes).toBeInstanceOf(Array);
      expect(result.operationPlan.graph.edges).toBeInstanceOf(Array);
    });

    it('should calculate predicted effects', async () => {
      const measureIds = ['measure-1', 'measure-2'];
      const result = await engine.combineMeasures(measureIds, {}, {});

      expect(result.operationPlan.predictedEffects).toBeInstanceOf(Array);

      if (result.operationPlan.predictedEffects.length > 0) {
        expect(result.operationPlan.predictedEffects[0]).toHaveProperty('metric');
        expect(result.operationPlan.predictedEffects[0]).toHaveProperty('impact');
        expect(result.operationPlan.predictedEffects[0]).toHaveProperty('confidence');
      }
    });

    it('should assess combined risks', async () => {
      const measureIds = ['measure-1', 'measure-2'];
      const result = await engine.combineMeasures(measureIds, {}, {});

      expect(result.operationPlan.riskAssessment).toBeDefined();
      expect(result.operationPlan.riskAssessment.overallRisk).toBeDefined();
      expect(result.operationPlan.riskAssessment.mitigationStrategies).toBeInstanceOf(Array);
    });

    it('should record metrics for combination', async () => {
      const { metricsCollector } = require('../../utils/metrics');

      const measureIds = ['measure-1', 'measure-2'];
      await engine.combineMeasures(measureIds, {}, {});

      expect(metricsCollector.recordHistogram).toHaveBeenCalledWith('measure_combination_time', expect.any(Number));
      expect(metricsCollector.incrementCounter).toHaveBeenCalledWith('measures_combined');
    });
  });

  describe('Audit Trail', () => {
    it('should create audit entry', async () => {
      const entryData = {
        actor: 'test-user',
        action: 'TEST_ACTION',
        operationId: 'op-1',
        details: { test: 'data' },
      };

      const entryId = await engine.createAuditEntry(entryData);

      expect(entryId).toBe('audit-id');

      const { activeMeasuresGraphRepo } = require('../../db/neo4j');
      expect(activeMeasuresGraphRepo.createAuditEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'TEST_ACTION',
          cryptographicSignature: expect.any(String),
        })
      );
    });

    it('should generate cryptographic signature for audit entries', async () => {
      const entryData = {
        actor: 'test-user',
        action: 'TEST_ACTION',
        details: { test: 'data' },
      };

      await engine.createAuditEntry(entryData);

      const { activeMeasuresGraphRepo } = require('../../db/neo4j');
      const callArgs = activeMeasuresGraphRepo.createAuditEntry.mock.calls[0][0];

      expect(callArgs.cryptographicSignature).toBeTruthy();
      expect(callArgs.cryptographicSignature).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should include timestamp in audit entry', async () => {
      const entryData = {
        actor: 'test-user',
        action: 'TEST_ACTION',
      };

      await engine.createAuditEntry(entryData);

      const { activeMeasuresGraphRepo } = require('../../db/neo4j');
      const callArgs = activeMeasuresGraphRepo.createAuditEntry.mock.calls[0][0];

      expect(callArgs.timestamp).toBeTruthy();
    });
  });

  describe('Risk Assessment', () => {
    it('should calculate risk penalty for different risk levels', () => {
      const engine = new ActiveMeasuresEngine(mockNeo4jDriver);

      expect((engine as any).calculateRiskPenalty('MINIMAL')).toBe(0.0);
      expect((engine as any).calculateRiskPenalty('LOW')).toBe(0.1);
      expect((engine as any).calculateRiskPenalty('MODERATE')).toBe(0.3);
      expect((engine as any).calculateRiskPenalty('HIGH')).toBe(0.6);
      expect((engine as any).calculateRiskPenalty('CRITICAL')).toBe(0.9);
    });

    it('should analyze risk profile correctly', () => {
      const measures = [
        { riskLevel: 'LOW', effectivenessRating: 0.5 },
        { riskLevel: 'MODERATE', effectivenessRating: 0.7 },
        { riskLevel: 'HIGH', effectivenessRating: 0.9 },
      ];

      const riskProfile = (engine as any).analyzeRiskProfile(measures);

      expect(riskProfile).toBeDefined();
      expect(riskProfile.averageRisk).toBeGreaterThan(0);
      expect(riskProfile.riskVariance).toBeGreaterThanOrEqual(0);
      expect(riskProfile.highRiskMeasures).toBeGreaterThanOrEqual(0);
    });

    it('should generate risk mitigation strategies for high-risk portfolios', () => {
      const riskProfile = {
        averageRisk: 0.7,
        highRiskMeasures: 3,
      };

      const strategies = (engine as any).generateRiskMitigationStrategies(riskProfile);

      expect(strategies).toBeInstanceOf(Array);
      expect(strategies.length).toBeGreaterThan(0);
      expect(strategies).toContain(expect.stringContaining('operational security'));
    });
  });

  describe('Recommendations', () => {
    it('should recommend diversification for concentrated portfolios', () => {
      const measures = Array.from({ length: 10 }, () => ({
        category: 'INFORMATION_OPERATIONS',
        riskLevel: 'MODERATE',
        effectivenessRating: 0.7,
        unattributabilityScore: 0.8,
        ethicalScore: 0.6,
      }));

      const recommendations = (engine as any).generateRecommendations(measures, {});

      const diversificationRec = recommendations.find(r => r.type === 'DIVERSIFICATION');
      expect(diversificationRec).toBeDefined();
    });

    it('should recommend risk mitigation for high-risk portfolios', () => {
      const measures = Array.from({ length: 5 }, () => ({
        category: 'CYBER_OPERATIONS',
        riskLevel: 'CRITICAL',
        effectivenessRating: 0.9,
        unattributabilityScore: 0.6,
        ethicalScore: 0.3,
      }));

      const tuners = { riskTolerance: 0.3 };
      const recommendations = (engine as any).generateRecommendations(measures, tuners);

      const riskRec = recommendations.find(r => r.type === 'RISK_MITIGATION');
      expect(riskRec).toBeDefined();
    });

    it('should recommend effectiveness optimization', () => {
      const measures = [
        ...Array.from({ length: 3 }, () => ({
          category: 'INFORMATION_OPERATIONS',
          riskLevel: 'LOW',
          effectivenessRating: 0.3,
          unattributabilityScore: 0.8,
          ethicalScore: 0.7,
        })),
        ...Array.from({ length: 2 }, () => ({
          category: 'CYBER_OPERATIONS',
          riskLevel: 'MODERATE',
          effectivenessRating: 0.9,
          unattributabilityScore: 0.7,
          ethicalScore: 0.5,
        })),
      ];

      const recommendations = (engine as any).generateRecommendations(measures, {});

      const effectivenessRec = recommendations.find(r => r.type === 'EFFECTIVENESS_OPTIMIZATION');
      expect(effectivenessRec).toBeDefined();
    });
  });

  describe('Compliance Checking', () => {
    it('should check compliance against multiple frameworks', async () => {
      const measures = [
        {
          category: 'INFORMATION_OPERATIONS',
          riskLevel: 'MODERATE',
          effectivenessRating: 0.7,
        },
      ];

      const complianceStatus = await (engine as any).checkComplianceStatus(measures);

      expect(complianceStatus).toBeDefined();
      expect(complianceStatus.overallStatus).toBeDefined();
      expect(complianceStatus.frameworks).toBeInstanceOf(Array);
      expect(complianceStatus.frameworks.length).toBeGreaterThan(0);
    });

    it('should flag potential violations', async () => {
      const measures = [
        {
          category: 'ECONOMIC_PRESSURE',
          riskLevel: 'CRITICAL',
          effectivenessRating: 0.9,
        },
      ];

      const complianceStatus = await (engine as any).checkComplianceStatus(measures);

      const genevaConvention = complianceStatus.frameworks.find(f => f.name === 'Geneva Conventions');
      expect(genevaConvention?.status).toBe('POTENTIAL_VIOLATION');
    });
  });

  describe('Error Handling', () => {
    it('should handle portfolio generation errors', async () => {
      const { activeMeasuresGraphRepo } = require('../../db/neo4j');
      activeMeasuresGraphRepo.getActiveMeasuresPortfolio.mockRejectedValue(new Error('Database error'));

      await expect(engine.getActiveMeasuresPortfolio()).rejects.toThrow('Database error');

      const { metricsCollector } = require('../../utils/metrics');
      expect(metricsCollector.incrementCounter).toHaveBeenCalledWith('portfolio_errors');
    });

    it('should handle operation creation errors', async () => {
      const { activeMeasuresGraphRepo } = require('../../db/neo4j');
      activeMeasuresGraphRepo.createOperation.mockRejectedValue(new Error('Creation failed'));

      const operationData = {
        name: 'Test',
        description: 'Test',
        classification: 'SECRET',
        objectives: [],
        measures: [],
        targetProfile: {} as any,
        timeline: {} as any,
        team: {} as any,
        approvalChain: [],
        progress: {} as any,
        auditTrail: [],
      };

      await expect(engine.createOperation(operationData)).rejects.toThrow('Creation failed');

      const { metricsCollector } = require('../../utils/metrics');
      expect(metricsCollector.incrementCounter).toHaveBeenCalledWith('operation_creation_errors');
    });
  });
});
