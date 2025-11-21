import { describe, it, expect } from 'vitest';
import { WellbeingPredictor } from '../WellbeingPredictor.js';
import { InterventionRecommender } from '../InterventionRecommender.js';
import { ResourceAllocator } from '../ResourceAllocator.js';
import type { CitizenWellbeingProfile } from '../types.js';

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

  it('should generate resource allocation for a region', () => {
    const profiles: CitizenWellbeingProfile[] = Array.from({ length: 10 }, (_, i) => ({
      citizenId: `citizen-${i}`,
      lastUpdated: new Date().toISOString(),
      predictions: [],
      activeInterventions: [],
      historicalScores: [],
    }));

    const predictions = predictor.predictBatch(profiles);
    const allocation = allocator.allocate(predictions, 100000, 'test-region');

    expect(allocation.region).toBe('test-region');
    expect(allocation.totalBudget).toBe(100000);
    expect(allocation.allocations.length).toBeGreaterThan(0);
    expect(allocation.projectedImpact.citizensServed).toBeGreaterThan(0);
  });

  it('should analyze cohort statistics', () => {
    const profiles: CitizenWellbeingProfile[] = Array.from({ length: 5 }, (_, i) => ({
      citizenId: `citizen-${i}`,
      lastUpdated: new Date().toISOString(),
      predictions: [],
      activeInterventions: [],
      historicalScores: [],
    }));

    const predictions = predictor.predictBatch(profiles);
    const analysis = allocator.analyzeCohort(predictions, { region: 'test' });

    expect(analysis.populationSize).toBe(5);
    expect(analysis.averageWellbeingScore).toBeDefined();
    expect(analysis.riskDistribution).toBeDefined();
  });
});
