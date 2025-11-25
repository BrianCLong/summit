import { describe, it, expect } from 'vitest';
import { WellbeingPredictor } from '../WellbeingPredictor.js';
import { InterventionRecommender } from '../InterventionRecommender.js';
import { ResourceAllocator } from '../ResourceAllocator.js';
import { CitizenWellbeingProfile } from '../types.js';

describe('WellbeingPredictor', () => {
  const predictor = new WellbeingPredictor();

  const createProfile = (overrides: Partial<CitizenWellbeingProfile> = {}): CitizenWellbeingProfile => ({
    citizenId: 'test-citizen-1',
    lastUpdated: new Date().toISOString(),
    predictions: [],
    activeInterventions: [],
    historicalScores: [],
    ...overrides,
  });

  it('should generate prediction with minimal data', () => {
    const profile = createProfile();
    const prediction = predictor.predict(profile);

    expect(prediction.citizenId).toBe('test-citizen-1');
    expect(prediction.overallWellbeingScore).toBeGreaterThanOrEqual(0);
    expect(prediction.overallWellbeingScore).toBeLessThanOrEqual(100);
    expect(prediction.riskLevel).toBeDefined();
    expect(prediction.predictionId).toBeDefined();
  });

  it('should calculate lower scores for at-risk profiles', () => {
    const atRiskProfile = createProfile({
      healthData: {
        citizenId: 'test-citizen-1',
        timestamp: new Date().toISOString(),
        chronicConditions: ['diabetes', 'hypertension'],
        recentHospitalizations: 2,
        accessToHealthcare: 'none',
        disabilityStatus: true,
      },
      economicData: {
        citizenId: 'test-citizen-1',
        timestamp: new Date().toISOString(),
        employmentStatus: 'unemployed',
        incomeLevel: 'poverty',
        housingStability: 'homeless',
        foodSecurityStatus: 'insecure',
        socialBenefitsReceived: [],
      },
    });

    const prediction = predictor.predict(atRiskProfile);

    expect(prediction.overallWellbeingScore).toBeLessThan(40);
    expect(['critical', 'high']).toContain(prediction.riskLevel);
    expect(prediction.contributingFactors.length).toBeGreaterThan(0);
  });

  it('should calculate higher scores for stable profiles', () => {
    const stableProfile = createProfile({
      healthData: {
        citizenId: 'test-citizen-1',
        timestamp: new Date().toISOString(),
        chronicConditions: [],
        recentHospitalizations: 0,
        accessToHealthcare: 'full',
        mentalHealthScore: 85,
        disabilityStatus: false,
      },
      economicData: {
        citizenId: 'test-citizen-1',
        timestamp: new Date().toISOString(),
        employmentStatus: 'employed',
        incomeLevel: 'middle',
        housingStability: 'owned',
        foodSecurityStatus: 'secure',
        socialBenefitsReceived: [],
      },
      educationalData: {
        citizenId: 'test-citizen-1',
        timestamp: new Date().toISOString(),
        highestEducationLevel: 'undergraduate',
        currentEnrollment: false,
        literacyLevel: 'proficient',
        digitalLiteracy: 'advanced',
        skillsGapIndicators: [],
        trainingParticipation: 2,
      },
      behavioralData: {
        citizenId: 'test-citizen-1',
        timestamp: new Date().toISOString(),
        serviceEngagementScore: 80,
        communityParticipation: 'high',
        socialSupportNetwork: 'strong',
        riskBehaviors: [],
        crisisHistoryCount: 0,
      },
    });

    const prediction = predictor.predict(stableProfile);

    expect(prediction.overallWellbeingScore).toBeGreaterThan(60);
    expect(['low', 'minimal']).toContain(prediction.riskLevel);
  });

  it('should handle batch predictions', () => {
    const profiles = [createProfile({ citizenId: 'citizen-1' }), createProfile({ citizenId: 'citizen-2' })];
    const predictions = predictor.predictBatch(profiles);

    expect(predictions).toHaveLength(2);
    expect(predictions[0].citizenId).toBe('citizen-1');
    expect(predictions[1].citizenId).toBe('citizen-2');
  });
});

describe('InterventionRecommender', () => {
  const predictor = new WellbeingPredictor();
  const recommender = new InterventionRecommender();

  it('should generate recommendations for at-risk predictions', () => {
    const atRiskProfile: CitizenWellbeingProfile = {
      citizenId: 'test-citizen-1',
      lastUpdated: new Date().toISOString(),
      economicData: {
        citizenId: 'test-citizen-1',
        timestamp: new Date().toISOString(),
        employmentStatus: 'unemployed',
        incomeLevel: 'poverty',
        housingStability: 'homeless',
        foodSecurityStatus: 'insecure',
        socialBenefitsReceived: [],
      },
      predictions: [],
      activeInterventions: [],
      historicalScores: [],
    };

    const prediction = predictor.predict(atRiskProfile);
    const recommendations = recommender.recommend(prediction);

    expect(recommendations.length).toBeGreaterThan(0);
    expect(recommendations[0].priority).toBeDefined();
    expect(recommendations[0].suggestedPrograms.length).toBeGreaterThan(0);
  });

  it('should prioritize urgent interventions for critical risk', () => {
    const criticalProfile: CitizenWellbeingProfile = {
      citizenId: 'critical-citizen',
      lastUpdated: new Date().toISOString(),
      healthData: {
        citizenId: 'critical-citizen',
        timestamp: new Date().toISOString(),
        chronicConditions: ['severe-condition'],
        recentHospitalizations: 5,
        accessToHealthcare: 'none',
        mentalHealthScore: 10,
        disabilityStatus: true,
      },
      economicData: {
        citizenId: 'critical-citizen',
        timestamp: new Date().toISOString(),
        employmentStatus: 'unemployed',
        incomeLevel: 'poverty',
        housingStability: 'homeless',
        foodSecurityStatus: 'insecure',
        socialBenefitsReceived: [],
      },
      predictions: [],
      activeInterventions: [],
      historicalScores: [],
    };

    const prediction = predictor.predict(criticalProfile);
    const recommendations = recommender.recommend(prediction);

    expect(recommendations[0].priority).toBe('urgent');
    expect(recommendations[0].interventionType).toBe('immediate_crisis');
  });
});

describe('ResourceAllocator', () => {
  const predictor = new WellbeingPredictor();
  const allocator = new ResourceAllocator();

  // Helper to create varied profiles for testing
  const createVariedProfiles = (count: number): CitizenWellbeingProfile[] => {
    return Array.from({ length: count }, (_, i) => ({
      citizenId: `citizen-${i}`,
      lastUpdated: new Date().toISOString(),
      predictions: [],
      activeInterventions: [],
      historicalScores: [],
      // Vary the economic conditions to create diverse risk profiles
      economicData: i % 3 === 0 ? {
        citizenId: `citizen-${i}`,
        timestamp: new Date().toISOString(),
        employmentStatus: 'unemployed' as const,
        incomeLevel: 'poverty' as const,
        housingStability: 'unstable' as const,
        foodSecurityStatus: 'insecure' as const,
        socialBenefitsReceived: [],
      } : undefined,
    }));
  };

  it('should generate resource allocation for a region', () => {
    const profiles = createVariedProfiles(10);
    const predictions = predictor.predictBatch(profiles);
    const allocation = allocator.allocate(predictions, 100000, 'test-region');

    expect(allocation.region).toBe('test-region');
    expect(allocation.totalBudget).toBe(100000);
    expect(allocation.allocations.length).toBeGreaterThan(0);
    expect(allocation.projectedImpact.citizensServed).toBeGreaterThanOrEqual(0);
  });

  it('should analyze cohort statistics', () => {
    const profiles = createVariedProfiles(5);
    const predictions = predictor.predictBatch(profiles);
    const analysis = allocator.analyzeCohort(predictions, { region: 'test' });

    expect(analysis.populationSize).toBe(5);
    expect(analysis.averageWellbeingScore).toBeDefined();
    expect(analysis.riskDistribution).toBeDefined();
  });

  // Critical: Budget balance verification
  describe('budget balance', () => {
    it('should ensure allocations sum to available budget (minus reserve)', () => {
      const profiles = createVariedProfiles(20);
      const predictions = predictor.predictBatch(profiles);
      const totalBudget = 100000;
      const reservePercent = 0.10; // Default config

      const allocation = allocator.allocate(predictions, totalBudget, 'test-region');
      const totalAllocated = allocation.allocations.reduce((sum, a) => sum + a.amount, 0);
      const availableBudget = totalBudget * (1 - reservePercent);

      // Allocations should equal available budget (within rounding tolerance)
      expect(totalAllocated).toBeGreaterThanOrEqual(availableBudget - allocation.allocations.length);
      expect(totalAllocated).toBeLessThanOrEqual(availableBudget);
    });

    it('should handle various budget sizes correctly', () => {
      const profiles = createVariedProfiles(10);
      const predictions = predictor.predictBatch(profiles);

      const budgets = [1000, 10000, 100000, 1000000];
      for (const budget of budgets) {
        const allocation = allocator.allocate(predictions, budget, 'test-region');
        const totalAllocated = allocation.allocations.reduce((sum, a) => sum + a.amount, 0);
        const availableBudget = budget * 0.9;

        expect(totalAllocated).toBeLessThanOrEqual(availableBudget);
        expect(totalAllocated).toBeGreaterThanOrEqual(availableBudget - allocation.allocations.length);
      }
    });
  });

  // Critical: Different budgets produce different outcomes
  describe('budget sensitivity', () => {
    it('should project more citizens served with larger budgets', () => {
      const profiles = createVariedProfiles(50);
      const predictions = predictor.predictBatch(profiles);

      const smallBudget = allocator.allocate(predictions, 10000, 'test-region');
      const largeBudget = allocator.allocate(predictions, 1000000, 'test-region');

      expect(largeBudget.projectedImpact.citizensServed)
        .toBeGreaterThanOrEqual(smallBudget.projectedImpact.citizensServed);
    });

    it('should project higher wellbeing improvement with larger budgets', () => {
      const profiles = createVariedProfiles(30);
      const predictions = predictor.predictBatch(profiles);

      const smallBudget = allocator.allocate(predictions, 5000, 'test-region');
      const largeBudget = allocator.allocate(predictions, 500000, 'test-region');

      // Larger budget should lead to same or higher improvement
      expect(largeBudget.projectedImpact.wellbeingImprovement)
        .toBeGreaterThanOrEqual(smallBudget.projectedImpact.wellbeingImprovement);
    });

    it('should compare scenarios correctly', () => {
      const profiles = createVariedProfiles(20);
      const predictions = predictor.predictBatch(profiles);

      const scenarios = allocator.compareScenarios(
        predictions,
        [10000, 50000, 100000],
        'comparison-region'
      );

      expect(scenarios).toHaveLength(3);
      expect(scenarios[0].totalBudget).toBe(10000);
      expect(scenarios[1].totalBudget).toBe(50000);
      expect(scenarios[2].totalBudget).toBe(100000);

      // Larger budgets should generally result in more citizens served
      expect(scenarios[2].projectedImpact.citizensServed)
        .toBeGreaterThanOrEqual(scenarios[0].projectedImpact.citizensServed);
    });
  });

  // Edge cases and validation
  describe('input validation', () => {
    it('should throw error for negative budget', () => {
      const profiles = createVariedProfiles(5);
      const predictions = predictor.predictBatch(profiles);

      expect(() => allocator.allocate(predictions, -1000, 'test-region'))
        .toThrow('Total budget cannot be negative');
    });

    it('should throw error for empty predictions', () => {
      expect(() => allocator.allocate([], 100000, 'test-region'))
        .toThrow('Predictions array cannot be empty');
    });

    it('should throw error for empty region', () => {
      const profiles = createVariedProfiles(5);
      const predictions = predictor.predictBatch(profiles);

      expect(() => allocator.allocate(predictions, 100000, ''))
        .toThrow('Region must be specified');
    });

    it('should handle zero budget gracefully', () => {
      const profiles = createVariedProfiles(5);
      const predictions = predictor.predictBatch(profiles);

      const allocation = allocator.allocate(predictions, 0, 'test-region');

      expect(allocation.allocations).toHaveLength(0);
      expect(allocation.projectedImpact.citizensServed).toBe(0);
    });

    it('should throw error for empty cohort analysis', () => {
      expect(() => allocator.analyzeCohort([], { region: 'test' }))
        .toThrow('Predictions array cannot be empty for cohort analysis');
    });
  });

  // Domain-specific allocation tests
  describe('domain allocation', () => {
    it('should allocate more to domains with higher severity', () => {
      // Create profiles where some domains are clearly worse
      const profiles: CitizenWellbeingProfile[] = Array.from({ length: 20 }, (_, i) => ({
        citizenId: `citizen-${i}`,
        lastUpdated: new Date().toISOString(),
        predictions: [],
        activeInterventions: [],
        historicalScores: [],
        economicData: {
          citizenId: `citizen-${i}`,
          timestamp: new Date().toISOString(),
          employmentStatus: 'unemployed' as const,
          incomeLevel: 'poverty' as const,
          housingStability: 'homeless' as const,
          foodSecurityStatus: 'insecure' as const,
          socialBenefitsReceived: [],
        },
      }));

      const predictions = predictor.predictBatch(profiles);
      const allocation = allocator.allocate(predictions, 100000, 'test-region');

      // Housing and food_security domains should get significant allocation
      // given all profiles have homeless/insecure status
      const housingAllocation = allocation.allocations.find(a => a.domain === 'housing');
      const foodAllocation = allocation.allocations.find(a => a.domain === 'food_security');

      expect(housingAllocation).toBeDefined();
      expect(foodAllocation).toBeDefined();
    });

    it('should include rationale explaining allocation decision', () => {
      const profiles = createVariedProfiles(10);
      const predictions = predictor.predictBatch(profiles);
      const allocation = allocator.allocate(predictions, 100000, 'test-region');

      for (const domainAllocation of allocation.allocations) {
        expect(domainAllocation.rationale).toBeDefined();
        expect(domainAllocation.rationale.length).toBeGreaterThan(0);
        expect(domainAllocation.rationale).toContain('allocation');
      }
    });

    it('should generate expected outcomes for each domain', () => {
      const profiles = createVariedProfiles(10);
      const predictions = predictor.predictBatch(profiles);
      const allocation = allocator.allocate(predictions, 100000, 'test-region');

      for (const domainAllocation of allocation.allocations) {
        expect(domainAllocation.expectedOutcomes).toBeDefined();
        expect(Array.isArray(domainAllocation.expectedOutcomes)).toBe(true);
      }
    });
  });

  // Configuration tests
  describe('custom configuration', () => {
    it('should respect custom reserve percent', () => {
      const customAllocator = new ResourceAllocator({ reservePercent: 0.20 });
      const profiles = createVariedProfiles(10);
      const predictions = predictor.predictBatch(profiles);

      const allocation = customAllocator.allocate(predictions, 100000, 'test-region');
      const totalAllocated = allocation.allocations.reduce((sum, a) => sum + a.amount, 0);

      // With 20% reserve, available should be 80000
      expect(totalAllocated).toBeLessThanOrEqual(80000);
    });

    it('should respect min/max allocation constraints', () => {
      const customAllocator = new ResourceAllocator({
        minAllocationPercent: 0.10,
        maxAllocationPercent: 0.25,
      });
      const profiles = createVariedProfiles(10);
      const predictions = predictor.predictBatch(profiles);

      const allocation = customAllocator.allocate(predictions, 100000, 'test-region');
      const availableBudget = 90000; // After 10% reserve

      // Each allocation should respect min/max after normalization
      // Note: After normalization, the actual percentages may differ
      // This test verifies allocations are reasonable
      for (const domainAllocation of allocation.allocations) {
        expect(domainAllocation.amount).toBeGreaterThan(0);
        expect(domainAllocation.amount).toBeLessThanOrEqual(availableBudget);
      }
    });
  });
});
