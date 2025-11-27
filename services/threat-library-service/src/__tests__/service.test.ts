/**
 * Service Unit Tests
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { ThreatLibraryService, createService } from '../service.js';
import {
  ThreatLibraryRepository,
  resetRepository,
  getRepository,
} from '../repository.js';
import { NotFoundError, ValidationError, InvalidPatternError } from '../errors.js';
import type { ThreatArchetype, TTP, PatternTemplate, IndicatorPattern } from '../types.js';

describe('ThreatLibraryService', () => {
  let service: ThreatLibraryService;
  let repository: ThreatLibraryRepository;

  // Test data
  const createArchetype = async (): Promise<ThreatArchetype> => {
    return repository.createThreatArchetype(
      {
        name: 'Test APT',
        description: 'Test APT description',
        summary: 'Test summary',
        sophistication: 'EXPERT',
        motivation: ['ESPIONAGE'],
        targetSectors: ['GOVERNMENT', 'DEFENSE'],
        typicalTTPs: [],
        patternTemplates: [],
        indicators: [],
        countermeasures: [
          { id: 'c1', name: 'Counter', description: 'Desc', effectiveness: 'HIGH' },
        ],
        riskScore: 85,
        prevalence: 'UNCOMMON',
        active: true,
        status: 'ACTIVE',
      },
      { author: 'test' }
    );
  };

  const createTTP = async (): Promise<TTP> => {
    return repository.createTTP(
      {
        name: 'Test TTP',
        description: 'Test TTP description',
        tactic: 'LATERAL_MOVEMENT',
        techniqueId: 'T1021',
        techniqueName: 'Remote Services',
        procedures: [],
        platforms: ['WINDOWS'],
        dataSources: ['Process', 'Network'],
        mitreReference: {
          techniqueId: 'T1021',
          techniqueName: 'Remote Services',
          tacticIds: ['TA0008'],
          mitreUrl: 'https://attack.mitre.org/techniques/T1021/',
        },
        severity: 'HIGH',
        prevalence: 'COMMON',
        status: 'ACTIVE',
      },
      { author: 'test' }
    );
  };

  const createPattern = async (): Promise<PatternTemplate> => {
    return repository.createPatternTemplate(
      {
        name: 'Test Pattern',
        description: 'Test pattern description',
        category: 'LATERAL_MOVEMENT',
        graphMotifs: [
          {
            id: 'motif-1',
            name: 'Lateral Movement Motif',
            description: 'Detects lateral movement',
            nodes: [
              { id: 'actor', type: 'THREAT_ACTOR' },
              { id: 'source', type: 'ASSET' },
              { id: 'target', type: 'ASSET' },
            ],
            edges: [
              {
                id: 'e1',
                sourceNodeId: 'actor',
                targetNodeId: 'source',
                type: 'CONTROLS',
                direction: 'OUTGOING',
              },
              {
                id: 'e2',
                sourceNodeId: 'source',
                targetNodeId: 'target',
                type: 'LATERAL_MOVE_TO',
                direction: 'OUTGOING',
              },
            ],
            weight: 0.9,
          },
        ],
        signals: [
          {
            id: 'signal-1',
            name: 'Multiple Host Access',
            description: 'Detects access to multiple hosts',
            signalType: 'THRESHOLD',
            dataSource: 'Auth Logs',
            metric: 'host_count',
            threshold: 5,
            operator: 'GT',
          },
        ],
        indicators: [],
        ttps: [],
        requiredMotifMatches: 1,
        requiredSignalMatches: 1,
        severity: 'HIGH',
        status: 'ACTIVE',
      },
      { author: 'test' }
    );
  };

  const createIndicator = async (): Promise<IndicatorPattern> => {
    return repository.createIndicatorPattern(
      {
        name: 'Test Indicator',
        description: 'Test indicator',
        type: 'IP_ADDRESS',
        pattern: '10.0.0.0/8',
        patternFormat: 'LITERAL',
        confidence: 'HIGH',
        severity: 'MEDIUM',
        validFrom: new Date().toISOString(),
        status: 'ACTIVE',
      },
      { author: 'test' }
    );
  };

  beforeEach(() => {
    resetRepository();
    repository = getRepository();
    service = createService(repository);
  });

  afterEach(() => {
    resetRepository();
  });

  describe('Threat operations', () => {
    it('should list threats', async () => {
      await createArchetype();
      const result = await service.listThreats();

      expect(result.items.length).toBe(1);
      expect(result.items[0].name).toBe('Test APT');
    });

    it('should get threat by ID', async () => {
      const archetype = await createArchetype();
      const result = await service.getThreatById(archetype.id);

      expect(result.id).toBe(archetype.id);
    });

    it('should deprecate a threat', async () => {
      const archetype = await createArchetype();
      const deprecated = await service.deprecateThreat(archetype.id, { author: 'test' });

      expect(deprecated.status).toBe('DEPRECATED');
    });
  });

  describe('Pattern operations', () => {
    it('should list patterns', async () => {
      await createPattern();
      const result = await service.listPatterns();

      expect(result.items.length).toBe(1);
    });

    it('should validate pattern coverage', async () => {
      const pattern = await createPattern();
      const validation = await service.validatePatternCoverage(pattern.id);

      expect(validation.valid).toBe(false); // No TTPs linked
      expect(validation.coverage.hasGraphMotifs).toBe(true);
      expect(validation.coverage.hasSignals).toBe(true);
    });

    it('should reject pattern with invalid graph motif', async () => {
      await expect(
        service.createPattern(
          {
            name: 'Invalid Pattern',
            description: 'Pattern with invalid motif',
            category: 'LATERAL_MOVEMENT',
            graphMotifs: [
              {
                id: 'motif-1',
                name: 'Invalid Motif',
                description: 'Motif with no nodes',
                nodes: [], // Invalid: no nodes
                edges: [],
                weight: 1,
              },
            ],
            signals: [],
            indicators: [],
            ttps: [],
            requiredMotifMatches: 1,
            requiredSignalMatches: 0,
            severity: 'HIGH',
            status: 'ACTIVE',
          },
          { author: 'test' }
        )
      ).rejects.toThrow(InvalidPatternError);
    });

    it('should reject pattern with invalid edge references', async () => {
      await expect(
        service.createPattern(
          {
            name: 'Invalid Pattern',
            description: 'Pattern with invalid edge',
            category: 'LATERAL_MOVEMENT',
            graphMotifs: [
              {
                id: 'motif-1',
                name: 'Invalid Motif',
                description: 'Motif with bad edge',
                nodes: [{ id: 'n1', type: 'THREAT_ACTOR' }],
                edges: [
                  {
                    id: 'e1',
                    sourceNodeId: 'n1',
                    targetNodeId: 'n2', // n2 doesn't exist
                    type: 'CONTROLS',
                    direction: 'OUTGOING',
                  },
                ],
                weight: 1,
              },
            ],
            signals: [],
            indicators: [],
            ttps: [],
            requiredMotifMatches: 1,
            requiredSignalMatches: 0,
            severity: 'HIGH',
            status: 'ACTIVE',
          },
          { author: 'test' }
        )
      ).rejects.toThrow(InvalidPatternError);
    });
  });

  describe('Pattern Evaluation Spec Generation', () => {
    it('should generate evaluation spec for a pattern', async () => {
      const pattern = await createPattern();

      const spec = await service.generatePatternEvaluationSpec({
        patternId: pattern.id,
        evaluationOptions: {
          maxMatches: 50,
          minConfidence: 0.6,
          includePartialMatches: false,
          timeout: 30000,
        },
      });

      expect(spec.specId).toBeDefined();
      expect(spec.patternId).toBe(pattern.id);
      expect(spec.patternName).toBe('Test Pattern');
      expect(spec.cypherQueries.length).toBeGreaterThan(0);
      expect(spec.signalEvaluations.length).toBe(1);
      expect(spec.matchCriteria.requiredMotifMatches).toBe(1);
    });

    it('should generate bulk specs for a threat', async () => {
      const archetype = await createArchetype();
      const pattern = await createPattern();

      // Link pattern to archetype
      await repository.updateThreatArchetype(
        archetype.id,
        { patternTemplates: [pattern.id] },
        { author: 'test' }
      );

      const specs = await service.generateBulkEvaluationSpecs(archetype.id, {
        maxMatches: 100,
        minConfidence: 0.5,
        includePartialMatches: false,
        timeout: 30000,
      });

      expect(specs.length).toBe(1);
      expect(specs[0].patternId).toBe(pattern.id);
    });

    it('should throw error when no pattern or threat ID provided', async () => {
      await expect(
        service.generatePatternEvaluationSpec({
          evaluationOptions: {
            maxMatches: 100,
            minConfidence: 0.5,
            includePartialMatches: false,
            timeout: 30000,
          },
        })
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('Explanation Payload Generation', () => {
    it('should generate explanation payload for a threat', async () => {
      const archetype = await createArchetype();
      const ttp = await createTTP();
      const indicator = await createIndicator();

      // Link TTP and indicator to archetype
      await repository.updateThreatArchetype(
        archetype.id,
        {
          typicalTTPs: [ttp.id],
          indicators: [indicator.id],
        },
        { author: 'test' }
      );

      const explanation = await service.generateExplanationPayload(archetype.id);

      expect(explanation.threatId).toBe(archetype.id);
      expect(explanation.threatName).toBe('Test APT');
      expect(explanation.severity).toBe('CRITICAL'); // riskScore 85 = CRITICAL
      expect(explanation.explanation.whatItIs).toBe('Test APT description');
      expect(explanation.explanation.typicalTargets).toContain('GOVERNMENT');
      expect(explanation.mitreMapping.length).toBeGreaterThan(0);
    });

    it('should generate brief explanation', async () => {
      const archetype = await createArchetype();
      const indicator = await createIndicator();

      await repository.updateThreatArchetype(
        archetype.id,
        { indicators: [indicator.id] },
        { author: 'test' }
      );

      const brief = await service.generateBriefExplanation(archetype.id);

      expect(brief.summary).toBe('Test summary');
      expect(brief.severity).toBe('CRITICAL');
      expect(brief.topIndicators).toContain('Test Indicator');
    });
  });

  describe('Library Statistics', () => {
    it('should return comprehensive statistics', async () => {
      await createArchetype();
      await createTTP();
      await createPattern();
      await createIndicator();

      const stats = await service.getLibraryStatistics();

      expect(stats.threatArchetypes.total).toBe(1);
      expect(stats.ttps.total).toBe(1);
      expect(stats.ttps.byTactic['LATERAL_MOVEMENT']).toBe(1);
      expect(stats.patterns.total).toBe(1);
      expect(stats.indicators.total).toBe(1);
    });
  });
});
