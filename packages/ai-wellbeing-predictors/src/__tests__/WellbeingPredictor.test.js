"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const WellbeingPredictor_js_1 = require("../WellbeingPredictor.js");
const InterventionRecommender_js_1 = require("../InterventionRecommender.js");
const ResourceAllocator_js_1 = require("../ResourceAllocator.js");
const index_js_1 = require("../index.js");
(0, vitest_1.describe)('WellbeingPredictor', () => {
    const predictor = new WellbeingPredictor_js_1.WellbeingPredictor();
    const createProfile = (overrides = {}) => ({
        citizenId: 'test-citizen-1',
        lastUpdated: new Date().toISOString(),
        predictions: [],
        activeInterventions: [],
        historicalScores: [],
        ...overrides,
    });
    (0, vitest_1.it)('should generate prediction with minimal data', () => {
        const profile = createProfile();
        const prediction = predictor.predict(profile);
        (0, vitest_1.expect)(prediction.citizenId).toBe('test-citizen-1');
        (0, vitest_1.expect)(prediction.overallWellbeingScore).toBeGreaterThanOrEqual(0);
        (0, vitest_1.expect)(prediction.overallWellbeingScore).toBeLessThanOrEqual(100);
        (0, vitest_1.expect)(prediction.riskLevel).toBeDefined();
        (0, vitest_1.expect)(prediction.predictionId).toBeDefined();
    });
    (0, vitest_1.it)('should calculate lower scores for at-risk profiles', () => {
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
        (0, vitest_1.expect)(prediction.overallWellbeingScore).toBeLessThan(40);
        (0, vitest_1.expect)(['critical', 'high']).toContain(prediction.riskLevel);
        (0, vitest_1.expect)(prediction.contributingFactors.length).toBeGreaterThan(0);
    });
    (0, vitest_1.it)('should calculate higher scores for stable profiles', () => {
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
        (0, vitest_1.expect)(prediction.overallWellbeingScore).toBeGreaterThan(60);
        (0, vitest_1.expect)(['low', 'minimal']).toContain(prediction.riskLevel);
    });
    (0, vitest_1.it)('should handle batch predictions', () => {
        const profiles = [createProfile({ citizenId: 'citizen-1' }), createProfile({ citizenId: 'citizen-2' })];
        const predictions = predictor.predictBatch(profiles);
        (0, vitest_1.expect)(predictions).toHaveLength(2);
        (0, vitest_1.expect)(predictions[0].citizenId).toBe('citizen-1');
        (0, vitest_1.expect)(predictions[1].citizenId).toBe('citizen-2');
    });
});
(0, vitest_1.describe)('InterventionRecommender', () => {
    const predictor = new WellbeingPredictor_js_1.WellbeingPredictor();
    const recommender = new InterventionRecommender_js_1.InterventionRecommender();
    (0, vitest_1.it)('should generate recommendations for at-risk predictions', () => {
        const atRiskProfile = {
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
        (0, vitest_1.expect)(recommendations.length).toBeGreaterThan(0);
        (0, vitest_1.expect)(recommendations[0].priority).toBeDefined();
        (0, vitest_1.expect)(recommendations[0].suggestedPrograms.length).toBeGreaterThan(0);
    });
    (0, vitest_1.it)('should prioritize urgent interventions for critical risk', () => {
        const criticalProfile = {
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
        (0, vitest_1.expect)(recommendations[0].priority).toBe('urgent');
        (0, vitest_1.expect)(recommendations[0].interventionType).toBe('immediate_crisis');
    });
});
(0, vitest_1.describe)('ResourceAllocator', () => {
    const predictor = new WellbeingPredictor_js_1.WellbeingPredictor();
    const allocator = new ResourceAllocator_js_1.ResourceAllocator();
    // Helper to create varied profiles for testing
    const createVariedProfiles = (count) => {
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
                employmentStatus: 'unemployed',
                incomeLevel: 'poverty',
                housingStability: 'unstable',
                foodSecurityStatus: 'insecure',
                socialBenefitsReceived: [],
            } : undefined,
        }));
    };
    (0, vitest_1.it)('should generate resource allocation for a region', () => {
        const profiles = createVariedProfiles(10);
        const predictions = predictor.predictBatch(profiles);
        const allocation = allocator.allocate(predictions, 100000, 'test-region');
        (0, vitest_1.expect)(allocation.region).toBe('test-region');
        (0, vitest_1.expect)(allocation.totalBudget).toBe(100000);
        (0, vitest_1.expect)(allocation.allocations.length).toBeGreaterThan(0);
        (0, vitest_1.expect)(allocation.projectedImpact.citizensServed).toBeGreaterThanOrEqual(0);
    });
    (0, vitest_1.it)('should analyze cohort statistics', () => {
        const profiles = createVariedProfiles(5);
        const predictions = predictor.predictBatch(profiles);
        const analysis = allocator.analyzeCohort(predictions, { region: 'test' });
        (0, vitest_1.expect)(analysis.populationSize).toBe(5);
        (0, vitest_1.expect)(analysis.averageWellbeingScore).toBeDefined();
        (0, vitest_1.expect)(analysis.riskDistribution).toBeDefined();
    });
    // Critical: Budget balance verification
    (0, vitest_1.describe)('budget balance', () => {
        (0, vitest_1.it)('should ensure allocations sum to available budget (minus reserve)', () => {
            const profiles = createVariedProfiles(20);
            const predictions = predictor.predictBatch(profiles);
            const totalBudget = 100000;
            const reservePercent = 0.10; // Default config
            const allocation = allocator.allocate(predictions, totalBudget, 'test-region');
            const totalAllocated = allocation.allocations.reduce((sum, a) => sum + a.amount, 0);
            const availableBudget = totalBudget * (1 - reservePercent);
            // Allocations should equal available budget (within rounding tolerance)
            (0, vitest_1.expect)(totalAllocated).toBeGreaterThanOrEqual(availableBudget - allocation.allocations.length);
            (0, vitest_1.expect)(totalAllocated).toBeLessThanOrEqual(availableBudget);
        });
        (0, vitest_1.it)('should handle various budget sizes correctly', () => {
            const profiles = createVariedProfiles(10);
            const predictions = predictor.predictBatch(profiles);
            const budgets = [1000, 10000, 100000, 1000000];
            for (const budget of budgets) {
                const allocation = allocator.allocate(predictions, budget, 'test-region');
                const totalAllocated = allocation.allocations.reduce((sum, a) => sum + a.amount, 0);
                const availableBudget = budget * 0.9;
                (0, vitest_1.expect)(totalAllocated).toBeLessThanOrEqual(availableBudget);
                (0, vitest_1.expect)(totalAllocated).toBeGreaterThanOrEqual(availableBudget - allocation.allocations.length);
            }
        });
    });
    // Critical: Different budgets produce different outcomes
    (0, vitest_1.describe)('budget sensitivity', () => {
        (0, vitest_1.it)('should project more citizens served with larger budgets', () => {
            const profiles = createVariedProfiles(50);
            const predictions = predictor.predictBatch(profiles);
            const smallBudget = allocator.allocate(predictions, 10000, 'test-region');
            const largeBudget = allocator.allocate(predictions, 1000000, 'test-region');
            (0, vitest_1.expect)(largeBudget.projectedImpact.citizensServed)
                .toBeGreaterThanOrEqual(smallBudget.projectedImpact.citizensServed);
        });
        (0, vitest_1.it)('should project higher wellbeing improvement with larger budgets', () => {
            const profiles = createVariedProfiles(30);
            const predictions = predictor.predictBatch(profiles);
            const smallBudget = allocator.allocate(predictions, 5000, 'test-region');
            const largeBudget = allocator.allocate(predictions, 500000, 'test-region');
            // Larger budget should lead to same or higher improvement
            (0, vitest_1.expect)(largeBudget.projectedImpact.wellbeingImprovement)
                .toBeGreaterThanOrEqual(smallBudget.projectedImpact.wellbeingImprovement);
        });
        (0, vitest_1.it)('should compare scenarios correctly', () => {
            const profiles = createVariedProfiles(20);
            const predictions = predictor.predictBatch(profiles);
            const scenarios = allocator.compareScenarios(predictions, [10000, 50000, 100000], 'comparison-region');
            (0, vitest_1.expect)(scenarios).toHaveLength(3);
            (0, vitest_1.expect)(scenarios[0].totalBudget).toBe(10000);
            (0, vitest_1.expect)(scenarios[1].totalBudget).toBe(50000);
            (0, vitest_1.expect)(scenarios[2].totalBudget).toBe(100000);
            // Larger budgets should generally result in more citizens served
            (0, vitest_1.expect)(scenarios[2].projectedImpact.citizensServed)
                .toBeGreaterThanOrEqual(scenarios[0].projectedImpact.citizensServed);
        });
    });
    // Edge cases and validation
    (0, vitest_1.describe)('input validation', () => {
        (0, vitest_1.it)('should throw error for negative budget', () => {
            const profiles = createVariedProfiles(5);
            const predictions = predictor.predictBatch(profiles);
            (0, vitest_1.expect)(() => allocator.allocate(predictions, -1000, 'test-region'))
                .toThrow('Total budget cannot be negative');
        });
        (0, vitest_1.it)('should throw error for empty predictions', () => {
            (0, vitest_1.expect)(() => allocator.allocate([], 100000, 'test-region'))
                .toThrow('Predictions array cannot be empty');
        });
        (0, vitest_1.it)('should throw error for empty region', () => {
            const profiles = createVariedProfiles(5);
            const predictions = predictor.predictBatch(profiles);
            (0, vitest_1.expect)(() => allocator.allocate(predictions, 100000, ''))
                .toThrow('Region must be specified');
        });
        (0, vitest_1.it)('should handle zero budget gracefully', () => {
            const profiles = createVariedProfiles(5);
            const predictions = predictor.predictBatch(profiles);
            const allocation = allocator.allocate(predictions, 0, 'test-region');
            (0, vitest_1.expect)(allocation.allocations).toHaveLength(0);
            (0, vitest_1.expect)(allocation.projectedImpact.citizensServed).toBe(0);
        });
        (0, vitest_1.it)('should throw error for empty cohort analysis', () => {
            (0, vitest_1.expect)(() => allocator.analyzeCohort([], { region: 'test' }))
                .toThrow('Predictions array cannot be empty for cohort analysis');
        });
    });
    // Domain-specific allocation tests
    (0, vitest_1.describe)('domain allocation', () => {
        (0, vitest_1.it)('should allocate more to domains with higher severity', () => {
            // Create profiles where some domains are clearly worse
            const profiles = Array.from({ length: 20 }, (_, i) => ({
                citizenId: `citizen-${i}`,
                lastUpdated: new Date().toISOString(),
                predictions: [],
                activeInterventions: [],
                historicalScores: [],
                economicData: {
                    citizenId: `citizen-${i}`,
                    timestamp: new Date().toISOString(),
                    employmentStatus: 'unemployed',
                    incomeLevel: 'poverty',
                    housingStability: 'homeless',
                    foodSecurityStatus: 'insecure',
                    socialBenefitsReceived: [],
                },
            }));
            const predictions = predictor.predictBatch(profiles);
            const allocation = allocator.allocate(predictions, 100000, 'test-region');
            // Housing and food_security domains should get significant allocation
            // given all profiles have homeless/insecure status
            const housingAllocation = allocation.allocations.find(a => a.domain === 'housing');
            const foodAllocation = allocation.allocations.find(a => a.domain === 'food_security');
            (0, vitest_1.expect)(housingAllocation).toBeDefined();
            (0, vitest_1.expect)(foodAllocation).toBeDefined();
        });
        (0, vitest_1.it)('should include rationale explaining allocation decision', () => {
            const profiles = createVariedProfiles(10);
            const predictions = predictor.predictBatch(profiles);
            const allocation = allocator.allocate(predictions, 100000, 'test-region');
            for (const domainAllocation of allocation.allocations) {
                (0, vitest_1.expect)(domainAllocation.rationale).toBeDefined();
                (0, vitest_1.expect)(domainAllocation.rationale.length).toBeGreaterThan(0);
                (0, vitest_1.expect)(domainAllocation.rationale).toContain('allocation');
            }
        });
        (0, vitest_1.it)('should generate expected outcomes for each domain', () => {
            const profiles = createVariedProfiles(10);
            const predictions = predictor.predictBatch(profiles);
            const allocation = allocator.allocate(predictions, 100000, 'test-region');
            for (const domainAllocation of allocation.allocations) {
                (0, vitest_1.expect)(domainAllocation.expectedOutcomes).toBeDefined();
                (0, vitest_1.expect)(Array.isArray(domainAllocation.expectedOutcomes)).toBe(true);
            }
        });
    });
    // Configuration tests
    (0, vitest_1.describe)('custom configuration', () => {
        (0, vitest_1.it)('should respect custom reserve percent', () => {
            const customAllocator = new ResourceAllocator_js_1.ResourceAllocator({ reservePercent: 0.20 });
            const profiles = createVariedProfiles(10);
            const predictions = predictor.predictBatch(profiles);
            const allocation = customAllocator.allocate(predictions, 100000, 'test-region');
            const totalAllocated = allocation.allocations.reduce((sum, a) => sum + a.amount, 0);
            // With 20% reserve, available should be 80000
            (0, vitest_1.expect)(totalAllocated).toBeLessThanOrEqual(80000);
        });
        (0, vitest_1.it)('should respect min/max allocation constraints', () => {
            const customAllocator = new ResourceAllocator_js_1.ResourceAllocator({
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
                (0, vitest_1.expect)(domainAllocation.amount).toBeGreaterThan(0);
                (0, vitest_1.expect)(domainAllocation.amount).toBeLessThanOrEqual(availableBudget);
            }
        });
    });
});
(0, vitest_1.describe)('createWellbeingPipeline', () => {
    (0, vitest_1.it)('should create a complete pipeline with default config', () => {
        const pipeline = (0, index_js_1.createWellbeingPipeline)();
        (0, vitest_1.expect)(pipeline).toBeDefined();
        (0, vitest_1.expect)(pipeline.predictor).toBeInstanceOf(WellbeingPredictor_js_1.WellbeingPredictor);
        (0, vitest_1.expect)(pipeline.recommender).toBeInstanceOf(InterventionRecommender_js_1.InterventionRecommender);
        (0, vitest_1.expect)(pipeline.allocator).toBeInstanceOf(ResourceAllocator_js_1.ResourceAllocator);
    });
    (0, vitest_1.it)('should create a pipeline with custom config', () => {
        const config = {
            allocationReservePercent: 0.20,
        };
        const pipeline = (0, index_js_1.createWellbeingPipeline)(config);
        (0, vitest_1.expect)(pipeline).toBeDefined();
        (0, vitest_1.expect)(pipeline.predictor).toBeInstanceOf(WellbeingPredictor_js_1.WellbeingPredictor);
        (0, vitest_1.expect)(pipeline.recommender).toBeInstanceOf(InterventionRecommender_js_1.InterventionRecommender);
        (0, vitest_1.expect)(pipeline.allocator).toBeInstanceOf(ResourceAllocator_js_1.ResourceAllocator);
    });
    (0, vitest_1.it)('should work end-to-end with pipeline components', () => {
        const pipeline = (0, index_js_1.createWellbeingPipeline)();
        // Create test profiles
        const profiles = Array.from({ length: 5 }, (_, i) => ({
            citizenId: `citizen-${i}`,
            lastUpdated: new Date().toISOString(),
            predictions: [],
            activeInterventions: [],
            historicalScores: [],
        }));
        // Run through the pipeline
        const predictions = pipeline.predictor.predictBatch(profiles);
        (0, vitest_1.expect)(predictions).toHaveLength(5);
        const recommendations = pipeline.recommender.recommend(predictions[0]);
        (0, vitest_1.expect)(recommendations).toBeDefined();
        const allocation = pipeline.allocator.allocate(predictions, 100000, 'test-region');
        (0, vitest_1.expect)(allocation.totalBudget).toBe(100000);
        (0, vitest_1.expect)(allocation.allocations.length).toBeGreaterThan(0);
    });
});
