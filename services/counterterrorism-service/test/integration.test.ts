/**
 * Integration Tests for Counterterrorism Service
 */

import { CounterterrorismService } from '../src/service';

describe('CounterterrorismService Integration Tests', () => {
  let service: CounterterrorismService;

  beforeEach(() => {
    service = new CounterterrorismService();
  });

  describe('Service Initialization', () => {
    it('should initialize all component services', () => {
      const services = service.getServices();

      expect(services.organizations).toBeDefined();
      expect(services.attacks).toBeDefined();
      expect(services.radicalization).toBeDefined();
      expect(services.fighters).toBeDefined();
      expect(services.finance).toBeDefined();
      expect(services.propaganda).toBeDefined();
    });
  });

  describe('Threat Picture Generation', () => {
    it('should generate comprehensive threat picture', async () => {
      const picture = await service.getThreatPicture();

      expect(picture).toHaveProperty('organizations');
      expect(picture).toHaveProperty('attacks');
      expect(picture).toHaveProperty('radicalization');
      expect(picture).toHaveProperty('fighters');
      expect(picture).toHaveProperty('finance');
      expect(picture).toHaveProperty('propaganda');

      expect(typeof picture.organizations.total).toBe('number');
      expect(typeof picture.attacks.total).toBe('number');
    });
  });

  describe('Interdiction Opportunities', () => {
    it('should identify interdiction opportunities', async () => {
      const opportunities = await service.identifyInterdictionOpportunities();

      expect(Array.isArray(opportunities)).toBe(true);

      if (opportunities.length > 0) {
        const opportunity = opportunities[0];
        expect(opportunity).toHaveProperty('id');
        expect(opportunity).toHaveProperty('targetId');
        expect(opportunity).toHaveProperty('targetType');
        expect(opportunity).toHaveProperty('probability');
        expect(opportunity).toHaveProperty('impact');
        expect(opportunity).toHaveProperty('recommendation');
      }
    });
  });

  describe('Disruption Targets', () => {
    it('should identify disruption targets', async () => {
      const targets = await service.identifyDisruptionTargets();

      expect(Array.isArray(targets)).toBe(true);

      if (targets.length > 0) {
        const target = targets[0];
        expect(target).toHaveProperty('id');
        expect(target).toHaveProperty('type');
        expect(target).toHaveProperty('priority');
        expect(target).toHaveProperty('vulnerabilities');
        expect(target).toHaveProperty('disruptionMethods');
      }
    });
  });

  describe('Legal Compliance', () => {
    it('should enforce legal compliance requirements', async () => {
      const compliance = {
        operationId: 'test-op-001',
        jurisdiction: 'US',
        legalBasis: ['Test Law'],
        authorizations: [],
        humanRights: {
          conducted: true,
          compliance: false, // Intentionally false
          findings: ['Violation detected'],
          mitigations: []
        },
        oversight: []
      };

      await expect(
        service.ensureLegalCompliance(compliance)
      ).rejects.toThrow('Human rights compliance violation detected');
    });

    it('should accept compliant operations', async () => {
      const compliance = {
        operationId: 'test-op-002',
        jurisdiction: 'US',
        legalBasis: ['Test Law'],
        authorizations: [],
        humanRights: {
          conducted: true,
          compliance: true,
          findings: [],
          mitigations: []
        },
        oversight: []
      };

      await expect(
        service.ensureLegalCompliance(compliance)
      ).resolves.not.toThrow();
    });
  });

  describe('Evidence Management', () => {
    it('should collect and store evidence', async () => {
      const evidence = {
        id: 'evidence-001',
        type: 'DIGITAL' as const,
        source: 'Test source',
        description: 'Test evidence',
        collected: new Date(),
        chainOfCustody: [],
        admissible: true,
        relatedTargets: ['target-001']
      };

      await expect(
        service.collectEvidence(evidence)
      ).resolves.not.toThrow();
    });
  });

  describe('Information Sharing', () => {
    it('should share information between agencies', async () => {
      const sharing = {
        id: 'share-001',
        fromAgency: 'FBI',
        toAgency: 'DHS',
        classification: 'SECRET',
        content: 'Test intelligence',
        shared: new Date(),
        acknowledged: false
      };

      await expect(
        service.shareInformation(sharing)
      ).resolves.not.toThrow();
    });
  });

  describe('Operation Effectiveness', () => {
    it('should assess operation effectiveness', async () => {
      // Create a test operation
      const compliance = {
        operationId: 'op-test-001',
        jurisdiction: 'US',
        legalBasis: ['Test'],
        authorizations: [],
        humanRights: {
          conducted: true,
          compliance: true,
          findings: [],
          mitigations: []
        },
        oversight: []
      };

      await service.ensureLegalCompliance(compliance);

      const operation = {
        id: 'op-test-001',
        type: 'SURVEILLANCE' as const,
        name: 'Test Operation',
        status: 'COMPLETED' as const,
        priority: 'HIGH' as const,
        targets: ['target-001'],
        objectives: ['Test objective'],
        startDate: new Date(),
        agencies: ['FBI'],
        intelligence: [],
        outcomes: [
          {
            date: new Date(),
            type: 'Success',
            description: 'Target identified',
            success: true,
            impact: 'High'
          }
        ]
      };

      await service.createOperation(operation);

      const effectiveness = await service.assessEffectiveness('op-test-001');

      expect(effectiveness).toHaveProperty('operationId', 'op-test-001');
      expect(effectiveness).toHaveProperty('overallEffectiveness');
      expect(effectiveness).toHaveProperty('metrics');
      expect(Array.isArray(effectiveness.metrics)).toBe(true);
    });
  });
});

describe('Multi-Service Integration', () => {
  let service: CounterterrorismService;

  beforeEach(() => {
    service = new CounterterrorismService();
  });

  it('should integrate terrorist tracking and attack detection', async () => {
    const services = service.getServices();

    // Track organization
    await services.organizations.trackOrganization({
      id: 'org-test-001',
      name: 'Test Organization',
      aliases: [],
      type: 'PRIMARY',
      ideology: ['RELIGIOUS_EXTREMISM'],
      operatingRegions: ['Test Region'],
      status: 'ACTIVE',
      affiliates: [],
      metadata: {}
    });

    // Register attack plan
    await services.attacks.registerAttackPlan({
      id: 'attack-test-001',
      status: 'PLANNING',
      targetType: 'CIVILIAN',
      targets: [],
      planners: ['person-test-001'],
      indicators: [],
      confidence: 0.7,
      severity: 'HIGH',
      discovered: new Date(),
      lastUpdated: new Date(),
      intelligence: []
    });

    // Verify integration
    const org = await services.organizations.getOrganization('org-test-001');
    const attack = await services.attacks.getAttackPlan('attack-test-001');

    expect(org).toBeDefined();
    expect(attack).toBeDefined();
  });

  it('should integrate radicalization monitoring and fighter tracking', async () => {
    const services = service.getServices();

    // Monitor individual
    await services.radicalization.monitorIndividual({
      id: 'profile-test-001',
      individualId: 'person-test-002',
      status: 'AT_RISK',
      stage: 'IDENTIFICATION',
      pathway: {
        primary: 'ONLINE',
        description: 'Test pathway'
      },
      indicators: [],
      timeline: {
        profileCreated: new Date(),
        stageProgression: [],
        criticalEvents: []
      },
      influences: [],
      interventions: [],
      riskScore: 0.6,
      lastAssessed: new Date()
    });

    // Track as fighter
    await services.fighters.trackFighter({
      id: 'fighter-test-001',
      personalInfo: {
        name: 'Test Fighter',
        aliases: [],
        nationality: 'US',
        languages: ['English'],
        skills: [],
        background: 'Test'
      },
      status: 'TRAVELING',
      journey: {
        departure: {
          date: new Date(),
          location: 'US',
          method: 'Flight',
          documents: [],
          detected: true
        },
        facilitators: [],
        network: 'Test network',
        route: []
      },
      combatExperience: {
        conflictZone: 'Test Zone',
        organization: 'org-test-001',
        role: 'Fighter',
        training: [],
        operations: [],
        specializations: []
      },
      affiliations: [],
      threatLevel: 'HIGH',
      monitoring: {
        active: true,
        methods: [],
        agencies: []
      },
      lastUpdated: new Date()
    });

    // Verify integration
    const profile = await services.radicalization.getIndividualAnalysis('person-test-002');
    const fighter = await services.fighters.getFighter('fighter-test-001');

    expect(profile.profile).toBeDefined();
    expect(fighter).toBeDefined();
  });

  it('should integrate financing and propaganda analysis', async () => {
    const services = service.getServices();

    // Track financial entity
    await services.finance.trackEntity({
      id: 'entity-test-001',
      type: 'INDIVIDUAL',
      identifiers: [],
      status: 'ACTIVE',
      sanctioned: false,
      riskScore: 0.8
    });

    // Analyze propaganda
    await services.propaganda.analyzeContent({
      id: 'content-test-001',
      type: 'VIDEO',
      created: new Date(),
      discovered: new Date(),
      language: 'en',
      themes: [],
      narrative: {
        primaryMessage: 'Test message',
        themes: [],
        targets: [],
        emotionalAppeal: [],
        frames: [],
        grievances: []
      },
      distribution: {
        platforms: [],
        networks: [],
        reach: 1000,
        engagement: {
          views: 1000,
          likes: 100,
          shares: 50,
          comments: 25,
          reactions: {}
        },
        viralityScore: 0.5
      },
      impact: {
        reach: 1000,
        influence: 0.6
      },
      removed: false
    });

    // Verify integration
    const entity = await services.finance.query({ entityTypes: ['INDIVIDUAL'] });
    const content = await services.propaganda.getContent('content-test-001');

    expect(entity.entities.length).toBeGreaterThan(0);
    expect(content).toBeDefined();
  });
});
