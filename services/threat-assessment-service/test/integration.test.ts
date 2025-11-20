/**
 * Integration Tests for Threat Assessment Service
 */

import { ThreatAssessmentService } from '../src/service';

describe('ThreatAssessmentService Integration Tests', () => {
  let service: ThreatAssessmentService;

  beforeEach(() => {
    service = new ThreatAssessmentService();
  });

  describe('Threat Assessment', () => {
    it('should conduct comprehensive threat assessment', async () => {
      const assessment = {
        id: 'assessment-001',
        targetId: 'target-001',
        targetType: 'ORGANIZATION' as const,
        assessmentDate: new Date(),
        overallThreat: 0.75,
        components: [
          {
            category: 'CAPABILITY',
            score: 0.8,
            weight: 0.3,
            factors: [],
            trend: 'INCREASING' as const
          },
          {
            category: 'INTENT',
            score: 0.9,
            weight: 0.4,
            factors: [],
            trend: 'STABLE' as const
          }
        ],
        mitigations: [],
        recommendations: ['Enhanced surveillance'],
        confidence: 0.85
      };

      await service.assessThreat(assessment);

      const retrieved = await service.getAssessment('target-001');
      expect(retrieved).toBeDefined();
      expect(retrieved?.overallThreat).toBe(0.75);
    });
  });

  describe('Attack Probability Calculation', () => {
    it('should calculate attack probability', async () => {
      // First create an assessment
      const assessment = {
        id: 'assessment-002',
        targetId: 'target-002',
        targetType: 'INDIVIDUAL' as const,
        assessmentDate: new Date(),
        overallThreat: 0.7,
        components: [
          {
            category: 'CAPABILITY',
            score: 0.7,
            weight: 0.3,
            factors: [],
            trend: 'STABLE' as const
          },
          {
            category: 'INTENT',
            score: 0.8,
            weight: 0.4,
            factors: [],
            trend: 'INCREASING' as const
          },
          {
            category: 'OPPORTUNITY',
            score: 0.6,
            weight: 0.3,
            factors: [],
            trend: 'STABLE' as const
          }
        ],
        mitigations: [],
        recommendations: [],
        confidence: 0.8
      };

      await service.assessThreat(assessment);

      const probability = await service.calculateAttackProbability('target-002');

      expect(probability).toHaveProperty('targetId', 'target-002');
      expect(probability).toHaveProperty('probability');
      expect(probability).toHaveProperty('timeframe');
      expect(probability).toHaveProperty('attackTypes');
      expect(probability).toHaveProperty('factors');
      expect(probability).toHaveProperty('confidence');

      expect(typeof probability.probability).toBe('number');
      expect(probability.probability).toBeGreaterThanOrEqual(0);
      expect(probability.probability).toBeLessThanOrEqual(1);
    });

    it('should return zero probability for non-existent target', async () => {
      const probability = await service.calculateAttackProbability('non-existent');

      expect(probability.probability).toBe(0);
      expect(probability.confidence).toBe(0);
    });
  });

  describe('Vulnerability Assessment', () => {
    it('should assess target vulnerabilities', async () => {
      const vulnerability = {
        targetId: 'target-003',
        targetType: 'INFRASTRUCTURE',
        vulnerabilities: [
          {
            type: 'Physical Security',
            description: 'Inadequate perimeter security',
            severity: 'HIGH' as const,
            likelihood: 0.7,
            impact: 0.8,
            score: 0.75
          }
        ],
        securityMeasures: [
          {
            type: 'CCTV',
            description: 'Camera surveillance',
            effectiveness: 0.6,
            coverage: 0.7
          }
        ],
        overallVulnerability: 0.7,
        assessmentDate: new Date()
      };

      await service.assessVulnerability(vulnerability);
    });
  });

  describe('Geographic Threat Mapping', () => {
    it('should generate geographic threat map', async () => {
      const map = await service.generateGeographicThreatMap();

      expect(map).toHaveProperty('regions');
      expect(map).toHaveProperty('hotspots');
      expect(map).toHaveProperty('trends');
      expect(map).toHaveProperty('generated');

      expect(Array.isArray(map.regions)).toBe(true);
      expect(Array.isArray(map.hotspots)).toBe(true);
      expect(Array.isArray(map.trends)).toBe(true);
    });
  });

  describe('Sector Threat Assessment', () => {
    it('should assess sector-specific threats', async () => {
      const threats = await service.assessSectorThreats();

      expect(Array.isArray(threats)).toBe(true);
      expect(threats.length).toBeGreaterThan(0);

      const threat = threats[0];
      expect(threat).toHaveProperty('sector');
      expect(threat).toHaveProperty('threatLevel');
      expect(threat).toHaveProperty('vulnerabilities');
      expect(threat).toHaveProperty('attackTypes');
      expect(threat).toHaveProperty('trend');
    });
  });

  describe('Critical Infrastructure', () => {
    it('should register and track critical infrastructure', async () => {
      const infrastructure = {
        id: 'infra-001',
        type: 'ENERGY',
        name: 'Test Power Plant',
        location: 'Test Location',
        importance: 'CRITICAL' as const,
        vulnerabilities: [],
        threats: [],
        securityLevel: 0.7
      };

      await service.registerInfrastructure(infrastructure);
    });
  });

  describe('Mass Casualty Assessment', () => {
    it('should assess mass casualty potential', async () => {
      const assessment = await service.assessMassCasualtyPotential(
        'BOMBING',
        'target-004'
      );

      expect(assessment).toHaveProperty('scenarioId');
      expect(assessment).toHaveProperty('attackType', 'BOMBING');
      expect(assessment).toHaveProperty('target', 'target-004');
      expect(assessment).toHaveProperty('estimatedCasualties');
      expect(assessment).toHaveProperty('probability');

      expect(assessment.estimatedCasualties).toHaveProperty('minimum');
      expect(assessment.estimatedCasualties).toHaveProperty('likely');
      expect(assessment.estimatedCasualties).toHaveProperty('maximum');
    });
  });

  describe('Risk Matrix Generation', () => {
    it('should generate comprehensive risk matrix', async () => {
      // Add several assessments
      for (let i = 0; i < 5; i++) {
        await service.assessThreat({
          id: `assessment-${i}`,
          targetId: `target-matrix-${i}`,
          targetType: 'ORGANIZATION' as const,
          assessmentDate: new Date(),
          overallThreat: 0.5 + (i * 0.1),
          components: [],
          mitigations: [],
          recommendations: [],
          confidence: 0.8
        });
      }

      const matrix = await service.generateRiskMatrix();

      expect(matrix).toHaveProperty('scenarios');
      expect(matrix).toHaveProperty('generated');
      expect(Array.isArray(matrix.scenarios)).toBe(true);
      expect(matrix.scenarios.length).toBeGreaterThan(0);

      const scenario = matrix.scenarios[0];
      expect(scenario).toHaveProperty('id');
      expect(scenario).toHaveProperty('description');
      expect(scenario).toHaveProperty('likelihood');
      expect(scenario).toHaveProperty('impact');
      expect(scenario).toHaveProperty('riskScore');
      expect(scenario).toHaveProperty('priority');

      // Verify scenarios are sorted by risk score
      for (let i = 1; i < matrix.scenarios.length; i++) {
        expect(matrix.scenarios[i - 1].riskScore).toBeGreaterThanOrEqual(
          matrix.scenarios[i].riskScore
        );
      }
    });
  });

  describe('Symbolic Target Analysis', () => {
    it('should register and analyze symbolic targets', async () => {
      const target = {
        id: 'symbolic-001',
        name: 'Test Monument',
        type: 'MONUMENT',
        location: 'Test City',
        significance: 0.9,
        vulnerabilities: [],
        threatLevel: 0.7,
        previousTargeting: false
      };

      await service.registerSymbolicTarget(target);
    });
  });

  describe('Threat Timeline', () => {
    it('should generate threat timeline', async () => {
      const timeline = await service.generateThreatTimeline('30-days');

      expect(timeline).toHaveProperty('period', '30-days');
      expect(timeline).toHaveProperty('threats');
      expect(timeline).toHaveProperty('trends');

      expect(Array.isArray(timeline.threats)).toBe(true);
      expect(Array.isArray(timeline.trends)).toBe(true);
    });
  });
});

describe('Capability and Intent Assessment', () => {
  let service: ThreatAssessmentService;

  beforeEach(() => {
    service = new ThreatAssessmentService();
  });

  it('should assess entity capabilities', async () => {
    const capability = {
      entityId: 'entity-001',
      capabilities: [
        {
          type: 'Weapons',
          level: 'INTERMEDIATE' as const,
          description: 'Small arms proficiency',
          evidence: ['Training records'],
          score: 0.6
        },
        {
          type: 'Explosives',
          level: 'BASIC' as const,
          description: 'Basic IED construction',
          evidence: ['Online research'],
          score: 0.4
        }
      ],
      overallCapability: 0.5,
      limitations: ['No advanced training', 'Limited resources'],
      trends: ['Increasing weapons proficiency'],
      assessmentDate: new Date()
    };

    await service.assessCapability(capability);
  });

  it('should assess entity intent', async () => {
    const intent = {
      entityId: 'entity-002',
      intents: [
        {
          type: 'Attack',
          strength: 0.8,
          evidence: ['Threatening statements', 'Attack planning'],
          indicators: ['Target research', 'Weapons acquisition']
        }
      ],
      overallIntent: 0.8,
      motivations: ['Political grievance', 'Ideological belief'],
      constraints: ['Law enforcement surveillance', 'Lack of resources'],
      assessmentDate: new Date()
    };

    await service.assessIntent(intent);
  });
});
