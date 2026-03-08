"use strict";
/**
 * Strategic Framework Test Suite
 *
 * Comprehensive tests for strategic planning, analysis, decision support,
 * and monitoring services.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const index_js_1 = require("../index.js");
(0, globals_1.describe)('Strategic Framework', () => {
    const testUserId = 'test-user-123';
    (0, globals_1.describe)('StrategicPlanningService', () => {
        (0, globals_1.describe)('Goal Management', () => {
            (0, globals_1.it)('should create a strategic goal', async () => {
                const input = {
                    title: 'Increase Market Share',
                    description: 'Expand market presence by 25% in target regions',
                    priority: index_js_1.StrategicPriority.HIGH,
                    timeHorizon: index_js_1.TimeHorizon.MEDIUM_TERM,
                    startDate: new Date('2025-01-01'),
                    targetDate: new Date('2026-12-31'),
                    owner: 'strategy-team',
                    stakeholders: ['sales', 'marketing'],
                    tags: ['growth', 'market-expansion'],
                    labels: { region: 'APAC' },
                    notes: 'Key initiative for FY2025',
                };
                const goal = await index_js_1.strategicPlanningService.createGoal(input, testUserId);
                (0, globals_1.expect)(goal).toBeDefined();
                (0, globals_1.expect)(goal.id).toBeDefined();
                (0, globals_1.expect)(goal.title).toBe(input.title);
                (0, globals_1.expect)(goal.description).toBe(input.description);
                (0, globals_1.expect)(goal.priority).toBe(index_js_1.StrategicPriority.HIGH);
                (0, globals_1.expect)(goal.status).toBe('DRAFT');
                (0, globals_1.expect)(goal.progress).toBe(0);
                (0, globals_1.expect)(goal.healthScore).toBe(100);
                (0, globals_1.expect)(goal.createdBy).toBe(testUserId);
            });
            (0, globals_1.it)('should retrieve a goal by ID', async () => {
                const input = {
                    title: 'Test Goal',
                    description: 'Test description',
                    priority: index_js_1.StrategicPriority.MEDIUM,
                    timeHorizon: index_js_1.TimeHorizon.SHORT_TERM,
                    startDate: new Date(),
                    targetDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
                    owner: 'test-owner',
                    stakeholders: [],
                    tags: [],
                    labels: {},
                    notes: '',
                };
                const created = await index_js_1.strategicPlanningService.createGoal(input, testUserId);
                const retrieved = await index_js_1.strategicPlanningService.getGoal(created.id);
                (0, globals_1.expect)(retrieved).toBeDefined();
                (0, globals_1.expect)(retrieved?.id).toBe(created.id);
                (0, globals_1.expect)(retrieved?.title).toBe(input.title);
            });
            (0, globals_1.it)('should update a strategic goal', async () => {
                const input = {
                    title: 'Original Title',
                    description: 'Original description',
                    priority: index_js_1.StrategicPriority.LOW,
                    timeHorizon: index_js_1.TimeHorizon.SHORT_TERM,
                    startDate: new Date(),
                    targetDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
                    owner: 'test-owner',
                    stakeholders: [],
                    tags: [],
                    labels: {},
                    notes: '',
                };
                const created = await index_js_1.strategicPlanningService.createGoal(input, testUserId);
                const updated = await index_js_1.strategicPlanningService.updateGoal({ id: created.id, title: 'Updated Title', priority: index_js_1.StrategicPriority.HIGH }, testUserId);
                (0, globals_1.expect)(updated.title).toBe('Updated Title');
                (0, globals_1.expect)(updated.priority).toBe(index_js_1.StrategicPriority.HIGH);
                (0, globals_1.expect)(updated.version).toBe(2);
            });
            (0, globals_1.it)('should activate a goal', async () => {
                const input = {
                    title: 'Goal to Activate',
                    description: 'Description',
                    priority: index_js_1.StrategicPriority.MEDIUM,
                    timeHorizon: index_js_1.TimeHorizon.SHORT_TERM,
                    startDate: new Date(),
                    targetDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
                    owner: 'test-owner',
                    stakeholders: [],
                    tags: [],
                    labels: {},
                    notes: '',
                };
                const created = await index_js_1.strategicPlanningService.createGoal(input, testUserId);
                (0, globals_1.expect)(created.status).toBe('DRAFT');
                const activated = await index_js_1.strategicPlanningService.activateGoal(created.id, testUserId);
                (0, globals_1.expect)(activated.status).toBe('ACTIVE');
            });
            (0, globals_1.it)('should delete a goal', async () => {
                const input = {
                    title: 'Goal to Delete',
                    description: 'Description',
                    priority: index_js_1.StrategicPriority.LOW,
                    timeHorizon: index_js_1.TimeHorizon.SHORT_TERM,
                    startDate: new Date(),
                    targetDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
                    owner: 'test-owner',
                    stakeholders: [],
                    tags: [],
                    labels: {},
                    notes: '',
                };
                const created = await index_js_1.strategicPlanningService.createGoal(input, testUserId);
                const deleted = await index_js_1.strategicPlanningService.deleteGoal(created.id);
                (0, globals_1.expect)(deleted).toBe(true);
                const retrieved = await index_js_1.strategicPlanningService.getGoal(created.id);
                (0, globals_1.expect)(retrieved).toBeNull();
            });
            (0, globals_1.it)('should get all goals with filters', async () => {
                // Create multiple goals with different priorities
                const goals = await index_js_1.strategicPlanningService.getAllGoals({
                    priority: index_js_1.StrategicPriority.HIGH,
                });
                (0, globals_1.expect)(Array.isArray(goals)).toBe(true);
                goals.forEach((goal) => {
                    (0, globals_1.expect)(goal.priority).toBe(index_js_1.StrategicPriority.HIGH);
                });
            });
        });
        (0, globals_1.describe)('Objective Management', () => {
            let goalId;
            (0, globals_1.beforeEach)(async () => {
                const goal = await index_js_1.strategicPlanningService.createGoal({
                    title: 'Parent Goal',
                    description: 'Parent goal for objectives',
                    priority: index_js_1.StrategicPriority.HIGH,
                    timeHorizon: index_js_1.TimeHorizon.MEDIUM_TERM,
                    startDate: new Date(),
                    targetDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
                    owner: 'test-owner',
                    stakeholders: [],
                    tags: [],
                    labels: {},
                    notes: '',
                }, testUserId);
                goalId = goal.id;
            });
            (0, globals_1.it)('should create an objective', async () => {
                const input = {
                    goalId,
                    title: 'Increase Customer Satisfaction',
                    description: 'Improve NPS score by 20 points',
                    priority: index_js_1.StrategicPriority.HIGH,
                    owner: 'customer-success',
                    contributors: ['support-team'],
                    startDate: new Date(),
                    targetDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
                    alignedCapabilities: ['customer-support'],
                    measurementCriteria: 'NPS score improvement',
                };
                const objective = await index_js_1.strategicPlanningService.createObjective(input, testUserId);
                (0, globals_1.expect)(objective).toBeDefined();
                (0, globals_1.expect)(objective.id).toBeDefined();
                (0, globals_1.expect)(objective.goalId).toBe(goalId);
                (0, globals_1.expect)(objective.title).toBe(input.title);
                (0, globals_1.expect)(objective.status).toBe('DRAFT');
                (0, globals_1.expect)(objective.progress).toBe(0);
            });
            (0, globals_1.it)('should get objectives for a goal', async () => {
                const input = {
                    goalId,
                    title: 'Test Objective',
                    description: 'Test description',
                    priority: index_js_1.StrategicPriority.MEDIUM,
                    owner: 'test-owner',
                    contributors: [],
                    startDate: new Date(),
                    targetDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
                    alignedCapabilities: [],
                    measurementCriteria: '',
                };
                await index_js_1.strategicPlanningService.createObjective(input, testUserId);
                const objectives = await index_js_1.strategicPlanningService.getObjectivesForGoal(goalId);
                (0, globals_1.expect)(Array.isArray(objectives)).toBe(true);
                (0, globals_1.expect)(objectives.length).toBeGreaterThan(0);
                objectives.forEach((obj) => {
                    (0, globals_1.expect)(obj.goalId).toBe(goalId);
                });
            });
        });
        (0, globals_1.describe)('Key Result Management', () => {
            let objectiveId;
            (0, globals_1.beforeEach)(async () => {
                const goal = await index_js_1.strategicPlanningService.createGoal({
                    title: 'KR Test Goal',
                    description: 'Goal for key result tests',
                    priority: index_js_1.StrategicPriority.HIGH,
                    timeHorizon: index_js_1.TimeHorizon.SHORT_TERM,
                    startDate: new Date(),
                    targetDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
                    owner: 'test-owner',
                    stakeholders: [],
                    tags: [],
                    labels: {},
                    notes: '',
                }, testUserId);
                const objective = await index_js_1.strategicPlanningService.createObjective({
                    goalId: goal.id,
                    title: 'KR Test Objective',
                    description: 'Objective for key result tests',
                    priority: index_js_1.StrategicPriority.HIGH,
                    owner: 'test-owner',
                    contributors: [],
                    startDate: new Date(),
                    targetDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
                    alignedCapabilities: [],
                    measurementCriteria: '',
                }, testUserId);
                objectiveId = objective.id;
            });
            (0, globals_1.it)('should create a key result', async () => {
                const keyResult = await index_js_1.strategicPlanningService.createKeyResult(objectiveId, {
                    title: 'Revenue Growth',
                    description: 'Increase quarterly revenue',
                    baseline: 1000000,
                    target: 1250000,
                    unit: 'USD',
                    frequency: 'MONTHLY',
                    dataSource: 'finance-system',
                    owner: 'finance-team',
                }, testUserId);
                (0, globals_1.expect)(keyResult).toBeDefined();
                (0, globals_1.expect)(keyResult.objectiveId).toBe(objectiveId);
                (0, globals_1.expect)(keyResult.baseline).toBe(1000000);
                (0, globals_1.expect)(keyResult.target).toBe(1250000);
                (0, globals_1.expect)(keyResult.current).toBe(1000000); // Initial = baseline
                (0, globals_1.expect)(keyResult.trend).toBe('STABLE');
            });
            (0, globals_1.it)('should update key result value', async () => {
                const keyResult = await index_js_1.strategicPlanningService.createKeyResult(objectiveId, {
                    title: 'Test KR',
                    description: 'Test',
                    baseline: 0,
                    target: 100,
                    unit: 'points',
                    frequency: 'WEEKLY',
                    dataSource: 'manual',
                    owner: 'test-owner',
                }, testUserId);
                const updated = await index_js_1.strategicPlanningService.updateKeyResultValue(keyResult.id, 50, 'Midpoint progress', testUserId);
                (0, globals_1.expect)(updated.current).toBe(50);
                (0, globals_1.expect)(updated.trend).toBe('IMPROVING');
                (0, globals_1.expect)(updated.history.length).toBe(2);
            });
        });
        (0, globals_1.describe)('Initiative Management', () => {
            let objectiveId;
            (0, globals_1.beforeEach)(async () => {
                const goal = await index_js_1.strategicPlanningService.createGoal({
                    title: 'Initiative Test Goal',
                    description: 'Goal for initiative tests',
                    priority: index_js_1.StrategicPriority.HIGH,
                    timeHorizon: index_js_1.TimeHorizon.MEDIUM_TERM,
                    startDate: new Date(),
                    targetDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
                    owner: 'test-owner',
                    stakeholders: [],
                    tags: [],
                    labels: {},
                    notes: '',
                }, testUserId);
                const objective = await index_js_1.strategicPlanningService.createObjective({
                    goalId: goal.id,
                    title: 'Initiative Test Objective',
                    description: 'Objective for initiative tests',
                    priority: index_js_1.StrategicPriority.HIGH,
                    owner: 'test-owner',
                    contributors: [],
                    startDate: new Date(),
                    targetDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
                    alignedCapabilities: [],
                    measurementCriteria: '',
                }, testUserId);
                objectiveId = objective.id;
            });
            (0, globals_1.it)('should create an initiative', async () => {
                const input = {
                    objectiveId,
                    title: 'Launch New Product',
                    description: 'Launch product in Q2',
                    rationale: 'Market opportunity identified',
                    priority: index_js_1.StrategicPriority.CRITICAL,
                    owner: 'product-team',
                    team: ['dev', 'design', 'qa'],
                    startDate: new Date(),
                    targetDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
                    budget: { total: 500000, currency: 'USD' },
                    effortEstimate: 120,
                    tags: ['product-launch'],
                    labels: {},
                };
                const initiative = await index_js_1.strategicPlanningService.createInitiative(input, testUserId);
                (0, globals_1.expect)(initiative).toBeDefined();
                (0, globals_1.expect)(initiative.objectiveId).toBe(objectiveId);
                (0, globals_1.expect)(initiative.title).toBe(input.title);
                (0, globals_1.expect)(initiative.budget.total).toBe(500000);
                (0, globals_1.expect)(initiative.status).toBe('DRAFT');
            });
            (0, globals_1.it)('should create a milestone', async () => {
                const initiative = await index_js_1.strategicPlanningService.createInitiative({
                    objectiveId,
                    title: 'Test Initiative',
                    description: 'Test',
                    rationale: '',
                    priority: index_js_1.StrategicPriority.MEDIUM,
                    owner: 'test-owner',
                    team: [],
                    startDate: new Date(),
                    targetDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
                    tags: [],
                    labels: {},
                }, testUserId);
                const milestone = await index_js_1.strategicPlanningService.createMilestone(initiative.id, {
                    title: 'Phase 1 Complete',
                    description: 'Complete phase 1 deliverables',
                    targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                    deliverables: ['spec-doc', 'prototype'],
                });
                (0, globals_1.expect)(milestone).toBeDefined();
                (0, globals_1.expect)(milestone.initiativeId).toBe(initiative.id);
                (0, globals_1.expect)(milestone.status).toBe('PENDING');
            });
            (0, globals_1.it)('should update milestone status', async () => {
                const initiative = await index_js_1.strategicPlanningService.createInitiative({
                    objectiveId,
                    title: 'Milestone Test Initiative',
                    description: 'Test',
                    rationale: '',
                    priority: index_js_1.StrategicPriority.LOW,
                    owner: 'test-owner',
                    team: [],
                    startDate: new Date(),
                    targetDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
                    tags: [],
                    labels: {},
                }, testUserId);
                const milestone = await index_js_1.strategicPlanningService.createMilestone(initiative.id, {
                    title: 'Test Milestone',
                    description: 'Test',
                    targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                    deliverables: [],
                });
                const updated = await index_js_1.strategicPlanningService.updateMilestoneStatus(milestone.id, 'COMPLETED', 'All deliverables submitted');
                (0, globals_1.expect)(updated.status).toBe('COMPLETED');
                (0, globals_1.expect)(updated.actualDate).toBeDefined();
            });
        });
        (0, globals_1.describe)('Strategic Overview', () => {
            (0, globals_1.it)('should return strategic overview', async () => {
                const overview = await index_js_1.strategicPlanningService.getStrategicOverview();
                (0, globals_1.expect)(overview).toBeDefined();
                (0, globals_1.expect)(typeof overview.totalGoals).toBe('number');
                (0, globals_1.expect)(typeof overview.activeGoals).toBe('number');
                (0, globals_1.expect)(typeof overview.averageProgress).toBe('number');
                (0, globals_1.expect)(typeof overview.averageHealthScore).toBe('number');
                (0, globals_1.expect)(overview.goalsByPriority).toBeDefined();
                (0, globals_1.expect)(overview.goalsByTimeHorizon).toBeDefined();
                (0, globals_1.expect)(Array.isArray(overview.upcomingMilestones)).toBe(true);
            });
        });
    });
    (0, globals_1.describe)('StrategicAnalysisEngine', () => {
        (0, globals_1.describe)('SWOT Analysis', () => {
            (0, globals_1.it)('should create a SWOT analysis', async () => {
                const input = {
                    type: index_js_1.AnalysisType.SWOT,
                    title: 'Q1 Strategic Position Assessment',
                    description: 'Comprehensive SWOT analysis for strategic planning',
                    scope: 'Enterprise-wide',
                    context: 'Annual strategic review',
                    timeHorizon: index_js_1.TimeHorizon.MEDIUM_TERM,
                    analyst: 'strategy-team',
                    reviewers: ['ceo', 'cfo'],
                    linkedGoals: [],
                };
                const analysis = await index_js_1.strategicAnalysisEngine.createSWOTAnalysis(input, testUserId);
                (0, globals_1.expect)(analysis).toBeDefined();
                (0, globals_1.expect)(analysis.type).toBe('SWOT');
                (0, globals_1.expect)(analysis.title).toBe(input.title);
                (0, globals_1.expect)(analysis.status).toBe('DRAFT');
                (0, globals_1.expect)(Array.isArray(analysis.strengths)).toBe(true);
                (0, globals_1.expect)(Array.isArray(analysis.weaknesses)).toBe(true);
                (0, globals_1.expect)(Array.isArray(analysis.opportunities)).toBe(true);
                (0, globals_1.expect)(Array.isArray(analysis.threats)).toBe(true);
            });
            (0, globals_1.it)('should add SWOT items', async () => {
                const analysis = await index_js_1.strategicAnalysisEngine.createSWOTAnalysis({
                    type: index_js_1.AnalysisType.SWOT,
                    title: 'Test SWOT',
                    description: 'Test',
                    scope: 'Test scope',
                    context: 'Test context',
                    timeHorizon: index_js_1.TimeHorizon.SHORT_TERM,
                    analyst: 'test-analyst',
                    reviewers: [],
                    linkedGoals: [],
                }, testUserId);
                const updated = await index_js_1.strategicAnalysisEngine.addSWOTItem(analysis.id, 'strengths', {
                    description: 'Strong brand recognition',
                    impact: index_js_1.ImpactLevel.SIGNIFICANT,
                    evidence: ['market-research-2024'],
                    relevance: 85,
                    timeframe: index_js_1.TimeHorizon.MEDIUM_TERM,
                    linkedFactors: [],
                    actionability: 70,
                }, testUserId);
                (0, globals_1.expect)(updated.strengths.length).toBe(1);
                (0, globals_1.expect)(updated.strengths[0].description).toBe('Strong brand recognition');
            });
            (0, globals_1.it)('should generate SWOT implications', async () => {
                const analysis = await index_js_1.strategicAnalysisEngine.createSWOTAnalysis({
                    type: index_js_1.AnalysisType.SWOT,
                    title: 'SWOT with Items',
                    description: 'For implication testing',
                    scope: 'Test scope',
                    context: 'Test context',
                    timeHorizon: index_js_1.TimeHorizon.MEDIUM_TERM,
                    analyst: 'test-analyst',
                    reviewers: [],
                    linkedGoals: [],
                }, testUserId);
                // Add items to all quadrants
                await index_js_1.strategicAnalysisEngine.addSWOTItem(analysis.id, 'strengths', {
                    description: 'Technical expertise',
                    impact: index_js_1.ImpactLevel.SIGNIFICANT,
                    evidence: [],
                    relevance: 80,
                    timeframe: index_js_1.TimeHorizon.MEDIUM_TERM,
                    linkedFactors: [],
                    actionability: 75,
                }, testUserId);
                await index_js_1.strategicAnalysisEngine.addSWOTItem(analysis.id, 'opportunities', {
                    description: 'Emerging market segment',
                    impact: index_js_1.ImpactLevel.TRANSFORMATIONAL,
                    evidence: [],
                    relevance: 90,
                    timeframe: index_js_1.TimeHorizon.MEDIUM_TERM,
                    linkedFactors: [],
                    actionability: 60,
                }, testUserId);
                const result = await index_js_1.strategicAnalysisEngine.generateSWOTImplications(analysis.id, testUserId);
                (0, globals_1.expect)(result.strategicImplications.length).toBeGreaterThan(0);
            });
        });
        (0, globals_1.describe)('Scenario Analysis', () => {
            (0, globals_1.it)('should create a scenario analysis', async () => {
                const analysis = await index_js_1.strategicAnalysisEngine.createScenarioAnalysis({
                    type: index_js_1.AnalysisType.SCENARIO_PLANNING,
                    title: 'Market Evolution Scenarios',
                    description: 'Scenario planning for next 5 years',
                    scope: 'Test scope',
                    context: 'Test context',
                    timeHorizon: index_js_1.TimeHorizon.LONG_TERM,
                    analyst: 'strategy-team',
                    reviewers: [],
                    linkedGoals: [],
                }, testUserId);
                (0, globals_1.expect)(analysis).toBeDefined();
                (0, globals_1.expect)(analysis.type).toBe('SCENARIO_PLANNING');
                (0, globals_1.expect)(Array.isArray(analysis.scenarios)).toBe(true);
            });
            (0, globals_1.it)('should generate scenarios', async () => {
                const analysis = await index_js_1.strategicAnalysisEngine.createScenarioAnalysis({
                    type: index_js_1.AnalysisType.SCENARIO_PLANNING,
                    title: 'Auto-generated Scenarios',
                    description: 'Test scenario generation',
                    scope: 'Test scope',
                    context: 'Test context',
                    timeHorizon: index_js_1.TimeHorizon.MEDIUM_TERM,
                    analyst: 'test-analyst',
                    reviewers: [],
                    linkedGoals: [],
                }, testUserId);
                const result = await index_js_1.strategicAnalysisEngine.generateScenarios(analysis.id, 3, testUserId);
                (0, globals_1.expect)(result.scenarios.length).toBe(3);
                result.scenarios.forEach((scenario) => {
                    (0, globals_1.expect)(scenario.name).toBeDefined();
                    (0, globals_1.expect)(scenario.probability).toBeDefined();
                });
            });
        });
        (0, globals_1.describe)('Risk Assessment', () => {
            (0, globals_1.it)('should create a risk assessment', async () => {
                const assessment = await index_js_1.strategicAnalysisEngine.createRiskAssessment({
                    type: index_js_1.AnalysisType.RISK_ASSESSMENT,
                    title: 'Enterprise Risk Assessment',
                    description: 'Comprehensive risk analysis',
                    scope: 'Test scope',
                    context: 'Test context',
                    timeHorizon: index_js_1.TimeHorizon.MEDIUM_TERM,
                    analyst: 'risk-team',
                    reviewers: ['cro'],
                    linkedGoals: [],
                }, testUserId);
                (0, globals_1.expect)(assessment).toBeDefined();
                (0, globals_1.expect)(assessment.type).toBe('RISK_ASSESSMENT');
                (0, globals_1.expect)(assessment.riskAppetite).toBeDefined();
                (0, globals_1.expect)(assessment.aggregateRiskScore).toBe(0);
            });
            (0, globals_1.it)('should add risks and calculate scores', async () => {
                const assessment = await index_js_1.strategicAnalysisEngine.createRiskAssessment({
                    type: index_js_1.AnalysisType.RISK_ASSESSMENT,
                    title: 'Risk Test',
                    description: 'Test',
                    scope: 'Test scope',
                    context: 'Test context',
                    timeHorizon: index_js_1.TimeHorizon.SHORT_TERM,
                    analyst: 'test-analyst',
                    reviewers: [],
                    linkedGoals: [],
                }, testUserId);
                const updated = await index_js_1.strategicAnalysisEngine.addRisk(assessment.id, {
                    title: 'Cybersecurity Breach',
                    description: 'Risk of data breach',
                    category: 'TECHNOLOGICAL',
                    source: 'IT Security Assessment',
                    probability: 0.3,
                    impact: index_js_1.ImpactLevel.SIGNIFICANT,
                    impactAreas: ['reputation', 'financial'],
                    controls: [
                        {
                            id: 'ctrl-1',
                            type: 'PREVENTIVE',
                            description: 'Firewall and IDS',
                            effectiveness: 70,
                            owner: 'it-security',
                            testingFrequency: 'monthly',
                            lastTestDate: new Date(),
                            status: 'EFFECTIVE',
                        },
                    ],
                    owner: 'ciso',
                    status: 'OPEN',
                    reviewFrequency: 'quarterly',
                    lastReviewDate: new Date(),
                    escalationThreshold: 8,
                }, testUserId);
                (0, globals_1.expect)(updated.risks.length).toBe(1);
                (0, globals_1.expect)(updated.risks[0].riskScore).toBeDefined();
                (0, globals_1.expect)(updated.risks[0].inherentRisk).toBeDefined();
                (0, globals_1.expect)(updated.risks[0].residualRisk).toBeDefined();
                (0, globals_1.expect)(updated.aggregateRiskScore).toBeGreaterThan(0);
            });
        });
        (0, globals_1.describe)('Gap Analysis', () => {
            (0, globals_1.it)('should create a gap analysis', async () => {
                const analysis = await index_js_1.strategicAnalysisEngine.createGapAnalysis({
                    type: index_js_1.AnalysisType.GAP_ANALYSIS,
                    title: 'Digital Capability Gap Assessment',
                    description: 'Assess current vs target digital capabilities',
                    scope: 'Test scope',
                    context: 'Test context',
                    timeHorizon: index_js_1.TimeHorizon.MEDIUM_TERM,
                    analyst: 'digital-team',
                    reviewers: ['cto'],
                    linkedGoals: [],
                }, testUserId);
                (0, globals_1.expect)(analysis).toBeDefined();
                (0, globals_1.expect)(analysis.type).toBe('GAP_ANALYSIS');
                (0, globals_1.expect)(analysis.currentState).toBeDefined();
                (0, globals_1.expect)(analysis.targetState).toBeDefined();
            });
            (0, globals_1.it)('should add gaps and generate closure plan', async () => {
                const analysis = await index_js_1.strategicAnalysisEngine.createGapAnalysis({
                    type: index_js_1.AnalysisType.GAP_ANALYSIS,
                    title: 'Gap Test',
                    description: 'Test',
                    scope: 'Test scope',
                    context: 'Test context',
                    timeHorizon: index_js_1.TimeHorizon.SHORT_TERM,
                    analyst: 'test-analyst',
                    reviewers: [],
                    linkedGoals: [],
                }, testUserId);
                await index_js_1.strategicAnalysisEngine.addGap(analysis.id, {
                    area: 'Cloud Infrastructure',
                    description: 'Need to migrate to cloud',
                    currentState: 'On-premise legacy systems',
                    targetState: 'Cloud-native architecture',
                    gapSize: 0.7,
                    impact: index_js_1.ImpactLevel.SIGNIFICANT,
                    priority: index_js_1.StrategicPriority.HIGH,
                    rootCauses: ['technical-debt', 'skills-gap'],
                    closureApproach: 'Phased migration',
                    estimatedEffort: 200,
                    estimatedCost: 500000,
                    timeline: '18 months',
                }, testUserId);
                const result = await index_js_1.strategicAnalysisEngine.generateGapClosurePlan(analysis.id, testUserId);
                (0, globals_1.expect)(result.closurePlan).toBeDefined();
                (0, globals_1.expect)(result.closurePlan.phases.length).toBeGreaterThan(0);
            });
        });
    });
    (0, globals_1.describe)('StrategicDecisionService', () => {
        (0, globals_1.describe)('Decision Management', () => {
            (0, globals_1.it)('should create a strategic decision', async () => {
                const input = {
                    title: 'Market Entry Strategy',
                    description: 'Decide on approach for entering new market',
                    type: index_js_1.DecisionType.STRATEGIC,
                    context: 'Competitive pressure and growth targets',
                    urgency: 'NORMAL',
                    importance: index_js_1.ImpactLevel.TRANSFORMATIONAL,
                    decisionMaker: 'executive-team',
                    stakeholders: ['sales', 'operations', 'finance'],
                    deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                    linkedGoals: [],
                    linkedAnalyses: [],
                };
                const decision = await index_js_1.strategicDecisionService.createDecision(input, testUserId);
                (0, globals_1.expect)(decision).toBeDefined();
                (0, globals_1.expect)(decision.title).toBe(input.title);
                (0, globals_1.expect)(decision.type).toBe(index_js_1.DecisionType.STRATEGIC);
                (0, globals_1.expect)(decision.status).toBe('PENDING');
            });
            (0, globals_1.it)('should add options to a decision', async () => {
                const decision = await index_js_1.strategicDecisionService.createDecision({
                    title: 'Options Test',
                    description: 'Test decision',
                    type: index_js_1.DecisionType.INVESTMENT,
                    context: 'Test context',
                    urgency: 'NORMAL',
                    importance: index_js_1.ImpactLevel.MODERATE,
                    decisionMaker: 'test-dm',
                    stakeholders: [],
                    deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                    linkedGoals: [],
                    linkedAnalyses: [],
                }, testUserId);
                const option = await index_js_1.strategicDecisionService.addOption(decision.id, {
                    name: 'Option A: Build',
                    description: 'Build internally',
                    pros: ['Full control', 'IP ownership'],
                    cons: ['Higher cost', 'Longer timeline'],
                    assumptions: ['Team available'],
                    timeline: '12 months',
                    cost: {
                        initialInvestment: 1000000,
                        ongoingCosts: 200000,
                    },
                }, testUserId);
                (0, globals_1.expect)(option).toBeDefined();
                (0, globals_1.expect)(option.decisionId).toBe(decision.id);
                (0, globals_1.expect)(option.name).toBe('Option A: Build');
                (0, globals_1.expect)(option.rank).toBe(1);
            });
            (0, globals_1.it)('should add criteria to a decision', async () => {
                const decision = await index_js_1.strategicDecisionService.createDecision({
                    title: 'Criteria Test',
                    description: 'Test',
                    type: index_js_1.DecisionType.TACTICAL,
                    context: 'Test context',
                    urgency: 'NORMAL',
                    importance: index_js_1.ImpactLevel.MINOR,
                    decisionMaker: 'test-dm',
                    stakeholders: [],
                    deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                    linkedGoals: [],
                    linkedAnalyses: [],
                }, testUserId);
                const criterion = await index_js_1.strategicDecisionService.addCriterion(decision.id, {
                    name: 'Cost Effectiveness',
                    description: 'Total cost of ownership',
                    weight: 0.3,
                    type: 'QUANTITATIVE',
                    measurementMethod: 'TCO calculation',
                    mustHave: false,
                });
                (0, globals_1.expect)(criterion).toBeDefined();
                (0, globals_1.expect)(criterion.name).toBe('Cost Effectiveness');
                (0, globals_1.expect)(criterion.weight).toBe(0.3);
            });
            (0, globals_1.it)('should perform multi-criteria analysis', async () => {
                const decision = await index_js_1.strategicDecisionService.createDecision({
                    title: 'MCA Test',
                    description: 'Test MCA',
                    type: index_js_1.DecisionType.STRATEGIC,
                    context: 'Test context',
                    urgency: 'NORMAL',
                    importance: index_js_1.ImpactLevel.SIGNIFICANT,
                    decisionMaker: 'test-dm',
                    stakeholders: [],
                    deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                    linkedGoals: [],
                    linkedAnalyses: [],
                }, testUserId);
                const option1 = await index_js_1.strategicDecisionService.addOption(decision.id, {
                    name: 'Option 1',
                    description: 'First option',
                    pros: ['Fast'],
                    cons: ['Expensive'],
                    assumptions: [],
                    timeline: '3 months',
                }, testUserId);
                const option2 = await index_js_1.strategicDecisionService.addOption(decision.id, {
                    name: 'Option 2',
                    description: 'Second option',
                    pros: ['Cheap'],
                    cons: ['Slow'],
                    assumptions: [],
                    timeline: '12 months',
                }, testUserId);
                const criterion1 = await index_js_1.strategicDecisionService.addCriterion(decision.id, {
                    name: 'Speed',
                    description: 'Time to implement',
                    weight: 0.5,
                    type: 'QUANTITATIVE',
                    measurementMethod: 'Months',
                    mustHave: false,
                });
                const criterion2 = await index_js_1.strategicDecisionService.addCriterion(decision.id, {
                    name: 'Cost',
                    description: 'Total cost',
                    weight: 0.5,
                    type: 'QUANTITATIVE',
                    measurementMethod: 'USD',
                    mustHave: false,
                });
                const scores = {
                    [option1.id]: {
                        [criterion1.id]: 9,
                        [criterion2.id]: 4,
                    },
                    [option2.id]: {
                        [criterion1.id]: 3,
                        [criterion2.id]: 8,
                    },
                };
                const result = await index_js_1.strategicDecisionService.performMultiCriteriaAnalysis(decision.id, scores, testUserId);
                (0, globals_1.expect)(result.analysis.multiCriteriaAnalysis.length).toBe(2);
                (0, globals_1.expect)(result.analysis.recommendation).toBeDefined();
                (0, globals_1.expect)(result.status).toBe('READY_FOR_DECISION');
            });
            (0, globals_1.it)('should record a decision', async () => {
                const decision = await index_js_1.strategicDecisionService.createDecision({
                    title: 'Record Test',
                    description: 'Test recording',
                    type: index_js_1.DecisionType.OPERATIONAL,
                    context: 'Test context',
                    urgency: 'NORMAL',
                    importance: index_js_1.ImpactLevel.MINOR,
                    decisionMaker: 'test-dm',
                    stakeholders: [],
                    deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                    linkedGoals: [],
                    linkedAnalyses: [],
                }, testUserId);
                const option = await index_js_1.strategicDecisionService.addOption(decision.id, {
                    name: 'Selected Option',
                    description: 'The chosen option',
                    pros: ['Good'],
                    cons: ['None'],
                    assumptions: [],
                    timeline: '1 month',
                }, testUserId);
                const recorded = await index_js_1.strategicDecisionService.recordDecision(decision.id, option.id, 'Best fit for requirements', testUserId);
                (0, globals_1.expect)(recorded.status).toBe('DECIDED');
                (0, globals_1.expect)(recorded.selectedOption).toBe(option.id);
                (0, globals_1.expect)(recorded.rationale).toBe('Best fit for requirements');
                (0, globals_1.expect)(recorded.decisionDate).toBeDefined();
            });
        });
        (0, globals_1.describe)('Decision Insights', () => {
            (0, globals_1.it)('should return decision insights', async () => {
                const insights = await index_js_1.strategicDecisionService.getDecisionInsights();
                (0, globals_1.expect)(insights).toBeDefined();
                (0, globals_1.expect)(typeof insights.totalDecisions).toBe('number');
                (0, globals_1.expect)(typeof insights.pendingDecisions).toBe('number');
                (0, globals_1.expect)(typeof insights.averageTimeToDecision).toBe('number');
                (0, globals_1.expect)(insights.decisionsByType).toBeDefined();
                (0, globals_1.expect)(insights.decisionsByUrgency).toBeDefined();
            });
        });
    });
    (0, globals_1.describe)('StrategicMonitoringService', () => {
        (0, globals_1.describe)('Dashboard Management', () => {
            (0, globals_1.it)('should create a dashboard', async () => {
                const dashboard = await index_js_1.strategicMonitoringService.createDashboard({
                    name: 'Executive Dashboard',
                    description: 'High-level strategic metrics',
                    owner: 'executive-team',
                    viewers: ['board'],
                    refreshFrequency: 'DAILY',
                }, testUserId);
                (0, globals_1.expect)(dashboard).toBeDefined();
                (0, globals_1.expect)(dashboard.name).toBe('Executive Dashboard');
                (0, globals_1.expect)(dashboard.refreshFrequency).toBe('DAILY');
            });
            (0, globals_1.it)('should add sections to dashboard', async () => {
                const dashboard = await index_js_1.strategicMonitoringService.createDashboard({
                    name: 'Test Dashboard',
                    description: 'Test',
                    owner: 'test-owner',
                }, testUserId);
                const updated = await index_js_1.strategicMonitoringService.addDashboardSection(dashboard.id, {
                    title: 'KPI Overview',
                    type: 'KPI_GRID',
                    config: { columns: 4 },
                    metrics: ['metric-1', 'metric-2'],
                    position: { row: 0, col: 0, width: 4, height: 2 },
                }, testUserId);
                (0, globals_1.expect)(updated.sections.length).toBe(1);
                (0, globals_1.expect)(updated.sections[0].title).toBe('KPI Overview');
            });
        });
        (0, globals_1.describe)('Metric Management', () => {
            (0, globals_1.it)('should create a metric', async () => {
                const metric = await index_js_1.strategicMonitoringService.createMetric({
                    name: 'Customer Satisfaction Score',
                    description: 'NPS-based satisfaction metric',
                    type: index_js_1.MetricType.KPI,
                    category: 'customer',
                    owner: 'customer-success',
                    dataSource: 'survey-system',
                    unit: 'points',
                    direction: 'HIGHER_IS_BETTER',
                    baseline: 45,
                    target: 65,
                    linkedGoals: [],
                    linkedObjectives: [],
                }, testUserId);
                (0, globals_1.expect)(metric).toBeDefined();
                (0, globals_1.expect)(metric.name).toBe('Customer Satisfaction Score');
                (0, globals_1.expect)(metric.current).toBe(45); // Initial = baseline
                (0, globals_1.expect)(metric.target).toBe(65);
                (0, globals_1.expect)(metric.thresholds.length).toBeGreaterThan(0);
            });
            (0, globals_1.it)('should update metric value and analyze trend', async () => {
                const metric = await index_js_1.strategicMonitoringService.createMetric({
                    name: 'Revenue',
                    description: 'Monthly revenue',
                    type: index_js_1.MetricType.KPI,
                    category: 'financial',
                    owner: 'finance',
                    dataSource: 'erp',
                    unit: 'USD',
                    direction: 'HIGHER_IS_BETTER',
                    baseline: 1000000,
                    target: 1500000,
                    linkedGoals: [],
                    linkedObjectives: [],
                }, testUserId);
                // Update value multiple times
                await index_js_1.strategicMonitoringService.updateMetricValue(metric.id, 1100000, 'Month 1');
                await index_js_1.strategicMonitoringService.updateMetricValue(metric.id, 1200000, 'Month 2');
                const updated = await index_js_1.strategicMonitoringService.updateMetricValue(metric.id, 1300000, 'Month 3');
                (0, globals_1.expect)(updated.current).toBe(1300000);
                (0, globals_1.expect)(updated.history.length).toBe(4); // baseline + 3 updates
                (0, globals_1.expect)(updated.trend).toBeDefined();
                (0, globals_1.expect)(updated.trend.direction).toBe('IMPROVING');
            });
            (0, globals_1.it)('should add metric annotations', async () => {
                const metric = await index_js_1.strategicMonitoringService.createMetric({
                    name: 'Test Metric',
                    description: 'Test',
                    type: index_js_1.MetricType.HEALTH_METRIC,
                    category: 'test',
                    owner: 'test-owner',
                    dataSource: 'manual',
                    unit: '%',
                    direction: 'HIGHER_IS_BETTER',
                    baseline: 0,
                    target: 100,
                    linkedGoals: [],
                    linkedObjectives: [],
                }, testUserId);
                const updated = await index_js_1.strategicMonitoringService.addMetricAnnotation(metric.id, {
                    timestamp: new Date(),
                    note: 'Major initiative launched',
                    author: 'test-user',
                    type: 'EVENT',
                });
                (0, globals_1.expect)(updated.annotations.length).toBe(1);
                (0, globals_1.expect)(updated.annotations[0].note).toBe('Major initiative launched');
            });
        });
        (0, globals_1.describe)('Progress Reporting', () => {
            (0, globals_1.it)('should generate a progress report', async () => {
                const report = await index_js_1.strategicMonitoringService.generateProgressReport('MONTHLY', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), new Date(), testUserId);
                (0, globals_1.expect)(report).toBeDefined();
                (0, globals_1.expect)(report.reportType).toBe('MONTHLY');
                (0, globals_1.expect)(Array.isArray(report.goals)).toBe(true);
                (0, globals_1.expect)(Array.isArray(report.metrics)).toBe(true);
                (0, globals_1.expect)(Array.isArray(report.highlights)).toBe(true);
                (0, globals_1.expect)(Array.isArray(report.challenges)).toBe(true);
                (0, globals_1.expect)(report.executiveSummary).toBeDefined();
            });
        });
        (0, globals_1.describe)('Health Summary', () => {
            (0, globals_1.it)('should return strategic health summary', async () => {
                const summary = await index_js_1.strategicMonitoringService.getStrategicHealthSummary();
                (0, globals_1.expect)(summary).toBeDefined();
                (0, globals_1.expect)(typeof summary.overallHealth).toBe('number');
                (0, globals_1.expect)(summary.goalHealth).toBeDefined();
                (0, globals_1.expect)(summary.metricHealth).toBeDefined();
                (0, globals_1.expect)(summary.alertCount).toBeDefined();
            });
        });
    });
});
