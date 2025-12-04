/**
 * Strategic Framework Test Suite
 *
 * Comprehensive tests for strategic planning, analysis, decision support,
 * and monitoring services.
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  strategicPlanningService,
  strategicAnalysisEngine,
  strategicDecisionService,
  strategicMonitoringService,
  CreateGoalInput,
  CreateObjectiveInput,
  CreateInitiativeInput,
  CreateDecisionInput,
  CreateAnalysisInput,
  StrategicPriority,
  TimeHorizon,
  DecisionType,
  ImpactLevel,
  AnalysisType,
  MetricType,
} from '../index.js';

describe('Strategic Framework', () => {
  const testUserId = 'test-user-123';

  describe('StrategicPlanningService', () => {
    describe('Goal Management', () => {
      it('should create a strategic goal', async () => {
        const input: CreateGoalInput = {
          title: 'Increase Market Share',
          description: 'Expand market presence by 25% in target regions',
          priority: StrategicPriority.HIGH,
          timeHorizon: TimeHorizon.MEDIUM_TERM,
          startDate: new Date('2025-01-01'),
          targetDate: new Date('2026-12-31'),
          owner: 'strategy-team',
          stakeholders: ['sales', 'marketing'],
          tags: ['growth', 'market-expansion'],
          labels: { region: 'APAC' },
          notes: 'Key initiative for FY2025',
        };

        const goal = await strategicPlanningService.createGoal(input, testUserId);

        expect(goal).toBeDefined();
        expect(goal.id).toBeDefined();
        expect(goal.title).toBe(input.title);
        expect(goal.description).toBe(input.description);
        expect(goal.priority).toBe(StrategicPriority.HIGH);
        expect(goal.status).toBe('DRAFT');
        expect(goal.progress).toBe(0);
        expect(goal.healthScore).toBe(100);
        expect(goal.createdBy).toBe(testUserId);
      });

      it('should retrieve a goal by ID', async () => {
        const input: CreateGoalInput = {
          title: 'Test Goal',
          description: 'Test description',
          priority: StrategicPriority.MEDIUM,
          timeHorizon: TimeHorizon.SHORT_TERM,
          startDate: new Date(),
          targetDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
          owner: 'test-owner',
          stakeholders: [],
          tags: [],
          labels: {},
          notes: '',
        };

        const created = await strategicPlanningService.createGoal(input, testUserId);
        const retrieved = await strategicPlanningService.getGoal(created.id);

        expect(retrieved).toBeDefined();
        expect(retrieved?.id).toBe(created.id);
        expect(retrieved?.title).toBe(input.title);
      });

      it('should update a strategic goal', async () => {
        const input: CreateGoalInput = {
          title: 'Original Title',
          description: 'Original description',
          priority: StrategicPriority.LOW,
          timeHorizon: TimeHorizon.SHORT_TERM,
          startDate: new Date(),
          targetDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
          owner: 'test-owner',
          stakeholders: [],
          tags: [],
          labels: {},
          notes: '',
        };

        const created = await strategicPlanningService.createGoal(input, testUserId);
        const updated = await strategicPlanningService.updateGoal(
          { id: created.id, title: 'Updated Title', priority: StrategicPriority.HIGH },
          testUserId,
        );

        expect(updated.title).toBe('Updated Title');
        expect(updated.priority).toBe(StrategicPriority.HIGH);
        expect(updated.version).toBe(2);
      });

      it('should activate a goal', async () => {
        const input: CreateGoalInput = {
          title: 'Goal to Activate',
          description: 'Description',
          priority: StrategicPriority.MEDIUM,
          timeHorizon: TimeHorizon.SHORT_TERM,
          startDate: new Date(),
          targetDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
          owner: 'test-owner',
          stakeholders: [],
          tags: [],
          labels: {},
          notes: '',
        };

        const created = await strategicPlanningService.createGoal(input, testUserId);
        expect(created.status).toBe('DRAFT');

        const activated = await strategicPlanningService.activateGoal(created.id, testUserId);
        expect(activated.status).toBe('ACTIVE');
      });

      it('should delete a goal', async () => {
        const input: CreateGoalInput = {
          title: 'Goal to Delete',
          description: 'Description',
          priority: StrategicPriority.LOW,
          timeHorizon: TimeHorizon.SHORT_TERM,
          startDate: new Date(),
          targetDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
          owner: 'test-owner',
          stakeholders: [],
          tags: [],
          labels: {},
          notes: '',
        };

        const created = await strategicPlanningService.createGoal(input, testUserId);
        const deleted = await strategicPlanningService.deleteGoal(created.id);

        expect(deleted).toBe(true);

        const retrieved = await strategicPlanningService.getGoal(created.id);
        expect(retrieved).toBeNull();
      });

      it('should get all goals with filters', async () => {
        // Create multiple goals with different priorities
        const goals = await strategicPlanningService.getAllGoals({
          priority: StrategicPriority.HIGH,
        });

        expect(Array.isArray(goals)).toBe(true);
        goals.forEach((goal) => {
          expect(goal.priority).toBe(StrategicPriority.HIGH);
        });
      });
    });

    describe('Objective Management', () => {
      let goalId: string;

      beforeEach(async () => {
        const goal = await strategicPlanningService.createGoal(
          {
            title: 'Parent Goal',
            description: 'Parent goal for objectives',
            priority: StrategicPriority.HIGH,
            timeHorizon: TimeHorizon.MEDIUM_TERM,
            startDate: new Date(),
            targetDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
            owner: 'test-owner',
            stakeholders: [],
            tags: [],
            labels: {},
            notes: '',
          },
          testUserId,
        );
        goalId = goal.id;
      });

      it('should create an objective', async () => {
        const input: CreateObjectiveInput = {
          goalId,
          title: 'Increase Customer Satisfaction',
          description: 'Improve NPS score by 20 points',
          priority: StrategicPriority.HIGH,
          owner: 'customer-success',
          contributors: ['support-team'],
          startDate: new Date(),
          targetDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
          alignedCapabilities: ['customer-support'],
          measurementCriteria: 'NPS score improvement',
        };

        const objective = await strategicPlanningService.createObjective(input, testUserId);

        expect(objective).toBeDefined();
        expect(objective.id).toBeDefined();
        expect(objective.goalId).toBe(goalId);
        expect(objective.title).toBe(input.title);
        expect(objective.status).toBe('DRAFT');
        expect(objective.progress).toBe(0);
      });

      it('should get objectives for a goal', async () => {
        const input: CreateObjectiveInput = {
          goalId,
          title: 'Test Objective',
          description: 'Test description',
          priority: StrategicPriority.MEDIUM,
          owner: 'test-owner',
          contributors: [],
          startDate: new Date(),
          targetDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
          alignedCapabilities: [],
          measurementCriteria: '',
        };

        await strategicPlanningService.createObjective(input, testUserId);

        const objectives = await strategicPlanningService.getObjectivesForGoal(goalId);

        expect(Array.isArray(objectives)).toBe(true);
        expect(objectives.length).toBeGreaterThan(0);
        objectives.forEach((obj) => {
          expect(obj.goalId).toBe(goalId);
        });
      });
    });

    describe('Key Result Management', () => {
      let objectiveId: string;

      beforeEach(async () => {
        const goal = await strategicPlanningService.createGoal(
          {
            title: 'KR Test Goal',
            description: 'Goal for key result tests',
            priority: StrategicPriority.HIGH,
            timeHorizon: TimeHorizon.SHORT_TERM,
            startDate: new Date(),
            targetDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
            owner: 'test-owner',
            stakeholders: [],
            tags: [],
            labels: {},
            notes: '',
          },
          testUserId,
        );

        const objective = await strategicPlanningService.createObjective(
          {
            goalId: goal.id,
            title: 'KR Test Objective',
            description: 'Objective for key result tests',
            priority: StrategicPriority.HIGH,
            owner: 'test-owner',
            contributors: [],
            startDate: new Date(),
            targetDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
            alignedCapabilities: [],
            measurementCriteria: '',
          },
          testUserId,
        );
        objectiveId = objective.id;
      });

      it('should create a key result', async () => {
        const keyResult = await strategicPlanningService.createKeyResult(
          objectiveId,
          {
            title: 'Revenue Growth',
            description: 'Increase quarterly revenue',
            baseline: 1000000,
            target: 1250000,
            unit: 'USD',
            frequency: 'MONTHLY',
            dataSource: 'finance-system',
            owner: 'finance-team',
          },
          testUserId,
        );

        expect(keyResult).toBeDefined();
        expect(keyResult.objectiveId).toBe(objectiveId);
        expect(keyResult.baseline).toBe(1000000);
        expect(keyResult.target).toBe(1250000);
        expect(keyResult.current).toBe(1000000); // Initial = baseline
        expect(keyResult.trend).toBe('STABLE');
      });

      it('should update key result value', async () => {
        const keyResult = await strategicPlanningService.createKeyResult(
          objectiveId,
          {
            title: 'Test KR',
            description: 'Test',
            baseline: 0,
            target: 100,
            unit: 'points',
            frequency: 'WEEKLY',
            dataSource: 'manual',
            owner: 'test-owner',
          },
          testUserId,
        );

        const updated = await strategicPlanningService.updateKeyResultValue(
          keyResult.id,
          50,
          'Midpoint progress',
          testUserId,
        );

        expect(updated.current).toBe(50);
        expect(updated.trend).toBe('IMPROVING');
        expect(updated.history.length).toBe(2);
      });
    });

    describe('Initiative Management', () => {
      let objectiveId: string;

      beforeEach(async () => {
        const goal = await strategicPlanningService.createGoal(
          {
            title: 'Initiative Test Goal',
            description: 'Goal for initiative tests',
            priority: StrategicPriority.HIGH,
            timeHorizon: TimeHorizon.MEDIUM_TERM,
            startDate: new Date(),
            targetDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
            owner: 'test-owner',
            stakeholders: [],
            tags: [],
            labels: {},
            notes: '',
          },
          testUserId,
        );

        const objective = await strategicPlanningService.createObjective(
          {
            goalId: goal.id,
            title: 'Initiative Test Objective',
            description: 'Objective for initiative tests',
            priority: StrategicPriority.HIGH,
            owner: 'test-owner',
            contributors: [],
            startDate: new Date(),
            targetDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
            alignedCapabilities: [],
            measurementCriteria: '',
          },
          testUserId,
        );
        objectiveId = objective.id;
      });

      it('should create an initiative', async () => {
        const input: CreateInitiativeInput = {
          objectiveId,
          title: 'Launch New Product',
          description: 'Launch product in Q2',
          rationale: 'Market opportunity identified',
          priority: StrategicPriority.CRITICAL,
          owner: 'product-team',
          team: ['dev', 'design', 'qa'],
          startDate: new Date(),
          targetDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
          budget: { total: 500000, currency: 'USD' },
          effortEstimate: 120,
          tags: ['product-launch'],
          labels: {},
        };

        const initiative = await strategicPlanningService.createInitiative(input, testUserId);

        expect(initiative).toBeDefined();
        expect(initiative.objectiveId).toBe(objectiveId);
        expect(initiative.title).toBe(input.title);
        expect(initiative.budget.total).toBe(500000);
        expect(initiative.status).toBe('DRAFT');
      });

      it('should create a milestone', async () => {
        const initiative = await strategicPlanningService.createInitiative(
          {
            objectiveId,
            title: 'Test Initiative',
            description: 'Test',
            rationale: '',
            priority: StrategicPriority.MEDIUM,
            owner: 'test-owner',
            team: [],
            startDate: new Date(),
            targetDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
            tags: [],
            labels: {},
          },
          testUserId,
        );

        const milestone = await strategicPlanningService.createMilestone(initiative.id, {
          title: 'Phase 1 Complete',
          description: 'Complete phase 1 deliverables',
          targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          deliverables: ['spec-doc', 'prototype'],
        });

        expect(milestone).toBeDefined();
        expect(milestone.initiativeId).toBe(initiative.id);
        expect(milestone.status).toBe('PENDING');
      });

      it('should update milestone status', async () => {
        const initiative = await strategicPlanningService.createInitiative(
          {
            objectiveId,
            title: 'Milestone Test Initiative',
            description: 'Test',
            rationale: '',
            priority: StrategicPriority.LOW,
            owner: 'test-owner',
            team: [],
            startDate: new Date(),
            targetDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
            tags: [],
            labels: {},
          },
          testUserId,
        );

        const milestone = await strategicPlanningService.createMilestone(initiative.id, {
          title: 'Test Milestone',
          description: 'Test',
          targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          deliverables: [],
        });

        const updated = await strategicPlanningService.updateMilestoneStatus(
          milestone.id,
          'COMPLETED',
          'All deliverables submitted',
        );

        expect(updated.status).toBe('COMPLETED');
        expect(updated.actualDate).toBeDefined();
      });
    });

    describe('Strategic Overview', () => {
      it('should return strategic overview', async () => {
        const overview = await strategicPlanningService.getStrategicOverview();

        expect(overview).toBeDefined();
        expect(typeof overview.totalGoals).toBe('number');
        expect(typeof overview.activeGoals).toBe('number');
        expect(typeof overview.averageProgress).toBe('number');
        expect(typeof overview.averageHealthScore).toBe('number');
        expect(overview.goalsByPriority).toBeDefined();
        expect(overview.goalsByTimeHorizon).toBeDefined();
        expect(Array.isArray(overview.upcomingMilestones)).toBe(true);
      });
    });
  });

  describe('StrategicAnalysisEngine', () => {
    describe('SWOT Analysis', () => {
      it('should create a SWOT analysis', async () => {
        const input: CreateAnalysisInput = {
          type: AnalysisType.SWOT,
          title: 'Q1 Strategic Position Assessment',
          description: 'Comprehensive SWOT analysis for strategic planning',
          scope: 'Enterprise-wide',
          context: 'Annual strategic review',
          timeHorizon: TimeHorizon.MEDIUM_TERM,
          analyst: 'strategy-team',
          reviewers: ['ceo', 'cfo'],
          linkedGoals: [],
        };

        const analysis = await strategicAnalysisEngine.createSWOTAnalysis(input, testUserId);

        expect(analysis).toBeDefined();
        expect(analysis.type).toBe('SWOT');
        expect(analysis.title).toBe(input.title);
        expect(analysis.status).toBe('DRAFT');
        expect(Array.isArray(analysis.strengths)).toBe(true);
        expect(Array.isArray(analysis.weaknesses)).toBe(true);
        expect(Array.isArray(analysis.opportunities)).toBe(true);
        expect(Array.isArray(analysis.threats)).toBe(true);
      });

      it('should add SWOT items', async () => {
        const analysis = await strategicAnalysisEngine.createSWOTAnalysis(
          {
            type: AnalysisType.SWOT,
            title: 'Test SWOT',
            description: 'Test',
            timeHorizon: TimeHorizon.SHORT_TERM,
            analyst: 'test-analyst',
            reviewers: [],
            linkedGoals: [],
          },
          testUserId,
        );

        const updated = await strategicAnalysisEngine.addSWOTItem(
          analysis.id,
          'strengths',
          {
            description: 'Strong brand recognition',
            impact: ImpactLevel.SIGNIFICANT,
            evidence: ['market-research-2024'],
            relevance: 85,
            timeframe: TimeHorizon.MEDIUM_TERM,
            linkedFactors: [],
            actionability: 70,
          },
          testUserId,
        );

        expect(updated.strengths.length).toBe(1);
        expect(updated.strengths[0].description).toBe('Strong brand recognition');
      });

      it('should generate SWOT implications', async () => {
        const analysis = await strategicAnalysisEngine.createSWOTAnalysis(
          {
            type: AnalysisType.SWOT,
            title: 'SWOT with Items',
            description: 'For implication testing',
            timeHorizon: TimeHorizon.MEDIUM_TERM,
            analyst: 'test-analyst',
            reviewers: [],
            linkedGoals: [],
          },
          testUserId,
        );

        // Add items to all quadrants
        await strategicAnalysisEngine.addSWOTItem(
          analysis.id,
          'strengths',
          {
            description: 'Technical expertise',
            impact: ImpactLevel.SIGNIFICANT,
            evidence: [],
            relevance: 80,
            timeframe: TimeHorizon.MEDIUM_TERM,
            linkedFactors: [],
            actionability: 75,
          },
          testUserId,
        );

        await strategicAnalysisEngine.addSWOTItem(
          analysis.id,
          'opportunities',
          {
            description: 'Emerging market segment',
            impact: ImpactLevel.TRANSFORMATIONAL,
            evidence: [],
            relevance: 90,
            timeframe: TimeHorizon.MEDIUM_TERM,
            linkedFactors: [],
            actionability: 60,
          },
          testUserId,
        );

        const result = await strategicAnalysisEngine.generateSWOTImplications(
          analysis.id,
          testUserId,
        );

        expect(result.strategicImplications.length).toBeGreaterThan(0);
      });
    });

    describe('Scenario Analysis', () => {
      it('should create a scenario analysis', async () => {
        const analysis = await strategicAnalysisEngine.createScenarioAnalysis(
          {
            type: AnalysisType.SCENARIO_PLANNING,
            title: 'Market Evolution Scenarios',
            description: 'Scenario planning for next 5 years',
            timeHorizon: TimeHorizon.LONG_TERM,
            analyst: 'strategy-team',
            reviewers: [],
            linkedGoals: [],
          },
          testUserId,
        );

        expect(analysis).toBeDefined();
        expect(analysis.type).toBe('SCENARIO_PLANNING');
        expect(Array.isArray(analysis.scenarios)).toBe(true);
      });

      it('should generate scenarios', async () => {
        const analysis = await strategicAnalysisEngine.createScenarioAnalysis(
          {
            type: AnalysisType.SCENARIO_PLANNING,
            title: 'Auto-generated Scenarios',
            description: 'Test scenario generation',
            timeHorizon: TimeHorizon.MEDIUM_TERM,
            analyst: 'test-analyst',
            reviewers: [],
            linkedGoals: [],
          },
          testUserId,
        );

        const result = await strategicAnalysisEngine.generateScenarios(
          analysis.id,
          3,
          testUserId,
        );

        expect(result.scenarios.length).toBe(3);
        result.scenarios.forEach((scenario) => {
          expect(scenario.name).toBeDefined();
          expect(scenario.probability).toBeDefined();
        });
      });
    });

    describe('Risk Assessment', () => {
      it('should create a risk assessment', async () => {
        const assessment = await strategicAnalysisEngine.createRiskAssessment(
          {
            type: AnalysisType.RISK_ASSESSMENT,
            title: 'Enterprise Risk Assessment',
            description: 'Comprehensive risk analysis',
            timeHorizon: TimeHorizon.MEDIUM_TERM,
            analyst: 'risk-team',
            reviewers: ['cro'],
            linkedGoals: [],
          },
          testUserId,
        );

        expect(assessment).toBeDefined();
        expect(assessment.type).toBe('RISK_ASSESSMENT');
        expect(assessment.riskAppetite).toBeDefined();
        expect(assessment.aggregateRiskScore).toBe(0);
      });

      it('should add risks and calculate scores', async () => {
        const assessment = await strategicAnalysisEngine.createRiskAssessment(
          {
            type: AnalysisType.RISK_ASSESSMENT,
            title: 'Risk Test',
            description: 'Test',
            timeHorizon: TimeHorizon.SHORT_TERM,
            analyst: 'test-analyst',
            reviewers: [],
            linkedGoals: [],
          },
          testUserId,
        );

        const updated = await strategicAnalysisEngine.addRisk(
          assessment.id,
          {
            title: 'Cybersecurity Breach',
            description: 'Risk of data breach',
            category: 'TECHNOLOGICAL',
            source: 'IT Security Assessment',
            probability: 0.3,
            impact: ImpactLevel.SIGNIFICANT,
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
          },
          testUserId,
        );

        expect(updated.risks.length).toBe(1);
        expect(updated.risks[0].riskScore).toBeDefined();
        expect(updated.risks[0].inherentRisk).toBeDefined();
        expect(updated.risks[0].residualRisk).toBeDefined();
        expect(updated.aggregateRiskScore).toBeGreaterThan(0);
      });
    });

    describe('Gap Analysis', () => {
      it('should create a gap analysis', async () => {
        const analysis = await strategicAnalysisEngine.createGapAnalysis(
          {
            type: AnalysisType.GAP_ANALYSIS,
            title: 'Digital Capability Gap Assessment',
            description: 'Assess current vs target digital capabilities',
            timeHorizon: TimeHorizon.MEDIUM_TERM,
            analyst: 'digital-team',
            reviewers: ['cto'],
            linkedGoals: [],
          },
          testUserId,
        );

        expect(analysis).toBeDefined();
        expect(analysis.type).toBe('GAP_ANALYSIS');
        expect(analysis.currentState).toBeDefined();
        expect(analysis.targetState).toBeDefined();
      });

      it('should add gaps and generate closure plan', async () => {
        const analysis = await strategicAnalysisEngine.createGapAnalysis(
          {
            type: AnalysisType.GAP_ANALYSIS,
            title: 'Gap Test',
            description: 'Test',
            timeHorizon: TimeHorizon.SHORT_TERM,
            analyst: 'test-analyst',
            reviewers: [],
            linkedGoals: [],
          },
          testUserId,
        );

        await strategicAnalysisEngine.addGap(
          analysis.id,
          {
            area: 'Cloud Infrastructure',
            description: 'Need to migrate to cloud',
            currentState: 'On-premise legacy systems',
            targetState: 'Cloud-native architecture',
            gapSize: 0.7,
            impact: ImpactLevel.SIGNIFICANT,
            priority: StrategicPriority.HIGH,
            rootCauses: ['technical-debt', 'skills-gap'],
            closureApproach: 'Phased migration',
            estimatedEffort: 200,
            estimatedCost: 500000,
            timeline: '18 months',
          },
          testUserId,
        );

        const result = await strategicAnalysisEngine.generateGapClosurePlan(
          analysis.id,
          testUserId,
        );

        expect(result.closurePlan).toBeDefined();
        expect(result.closurePlan.phases.length).toBeGreaterThan(0);
      });
    });
  });

  describe('StrategicDecisionService', () => {
    describe('Decision Management', () => {
      it('should create a strategic decision', async () => {
        const input: CreateDecisionInput = {
          title: 'Market Entry Strategy',
          description: 'Decide on approach for entering new market',
          type: DecisionType.STRATEGIC,
          context: 'Competitive pressure and growth targets',
          urgency: 'NORMAL',
          importance: ImpactLevel.TRANSFORMATIONAL,
          decisionMaker: 'executive-team',
          stakeholders: ['sales', 'operations', 'finance'],
          deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          linkedGoals: [],
          linkedAnalyses: [],
        };

        const decision = await strategicDecisionService.createDecision(input, testUserId);

        expect(decision).toBeDefined();
        expect(decision.title).toBe(input.title);
        expect(decision.type).toBe(DecisionType.STRATEGIC);
        expect(decision.status).toBe('PENDING');
      });

      it('should add options to a decision', async () => {
        const decision = await strategicDecisionService.createDecision(
          {
            title: 'Options Test',
            description: 'Test decision',
            type: DecisionType.INVESTMENT,
            urgency: 'NORMAL',
            importance: ImpactLevel.MODERATE,
            decisionMaker: 'test-dm',
            stakeholders: [],
            deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            linkedGoals: [],
            linkedAnalyses: [],
          },
          testUserId,
        );

        const option = await strategicDecisionService.addOption(
          decision.id,
          {
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
          },
          testUserId,
        );

        expect(option).toBeDefined();
        expect(option.decisionId).toBe(decision.id);
        expect(option.name).toBe('Option A: Build');
        expect(option.rank).toBe(1);
      });

      it('should add criteria to a decision', async () => {
        const decision = await strategicDecisionService.createDecision(
          {
            title: 'Criteria Test',
            description: 'Test',
            type: DecisionType.TACTICAL,
            urgency: 'NORMAL',
            importance: ImpactLevel.MINOR,
            decisionMaker: 'test-dm',
            stakeholders: [],
            deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            linkedGoals: [],
            linkedAnalyses: [],
          },
          testUserId,
        );

        const criterion = await strategicDecisionService.addCriterion(decision.id, {
          name: 'Cost Effectiveness',
          description: 'Total cost of ownership',
          weight: 0.3,
          type: 'QUANTITATIVE',
          measurementMethod: 'TCO calculation',
          mustHave: false,
        });

        expect(criterion).toBeDefined();
        expect(criterion.name).toBe('Cost Effectiveness');
        expect(criterion.weight).toBe(0.3);
      });

      it('should perform multi-criteria analysis', async () => {
        const decision = await strategicDecisionService.createDecision(
          {
            title: 'MCA Test',
            description: 'Test MCA',
            type: DecisionType.STRATEGIC,
            urgency: 'NORMAL',
            importance: ImpactLevel.SIGNIFICANT,
            decisionMaker: 'test-dm',
            stakeholders: [],
            deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            linkedGoals: [],
            linkedAnalyses: [],
          },
          testUserId,
        );

        const option1 = await strategicDecisionService.addOption(
          decision.id,
          {
            name: 'Option 1',
            description: 'First option',
            pros: ['Fast'],
            cons: ['Expensive'],
            assumptions: [],
            timeline: '3 months',
          },
          testUserId,
        );

        const option2 = await strategicDecisionService.addOption(
          decision.id,
          {
            name: 'Option 2',
            description: 'Second option',
            pros: ['Cheap'],
            cons: ['Slow'],
            assumptions: [],
            timeline: '12 months',
          },
          testUserId,
        );

        const criterion1 = await strategicDecisionService.addCriterion(decision.id, {
          name: 'Speed',
          description: 'Time to implement',
          weight: 0.5,
          type: 'QUANTITATIVE',
          measurementMethod: 'Months',
          mustHave: false,
        });

        const criterion2 = await strategicDecisionService.addCriterion(decision.id, {
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

        const result = await strategicDecisionService.performMultiCriteriaAnalysis(
          decision.id,
          scores,
          testUserId,
        );

        expect(result.analysis.multiCriteriaAnalysis.length).toBe(2);
        expect(result.analysis.recommendation).toBeDefined();
        expect(result.status).toBe('READY_FOR_DECISION');
      });

      it('should record a decision', async () => {
        const decision = await strategicDecisionService.createDecision(
          {
            title: 'Record Test',
            description: 'Test recording',
            type: DecisionType.OPERATIONAL,
            urgency: 'NORMAL',
            importance: ImpactLevel.MINOR,
            decisionMaker: 'test-dm',
            stakeholders: [],
            deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            linkedGoals: [],
            linkedAnalyses: [],
          },
          testUserId,
        );

        const option = await strategicDecisionService.addOption(
          decision.id,
          {
            name: 'Selected Option',
            description: 'The chosen option',
            pros: ['Good'],
            cons: ['None'],
            assumptions: [],
            timeline: '1 month',
          },
          testUserId,
        );

        const recorded = await strategicDecisionService.recordDecision(
          decision.id,
          option.id,
          'Best fit for requirements',
          testUserId,
        );

        expect(recorded.status).toBe('DECIDED');
        expect(recorded.selectedOption).toBe(option.id);
        expect(recorded.rationale).toBe('Best fit for requirements');
        expect(recorded.decisionDate).toBeDefined();
      });
    });

    describe('Decision Insights', () => {
      it('should return decision insights', async () => {
        const insights = await strategicDecisionService.getDecisionInsights();

        expect(insights).toBeDefined();
        expect(typeof insights.totalDecisions).toBe('number');
        expect(typeof insights.pendingDecisions).toBe('number');
        expect(typeof insights.averageTimeToDecision).toBe('number');
        expect(insights.decisionsByType).toBeDefined();
        expect(insights.decisionsByUrgency).toBeDefined();
      });
    });
  });

  describe('StrategicMonitoringService', () => {
    describe('Dashboard Management', () => {
      it('should create a dashboard', async () => {
        const dashboard = await strategicMonitoringService.createDashboard(
          {
            name: 'Executive Dashboard',
            description: 'High-level strategic metrics',
            owner: 'executive-team',
            viewers: ['board'],
            refreshFrequency: 'DAILY',
          },
          testUserId,
        );

        expect(dashboard).toBeDefined();
        expect(dashboard.name).toBe('Executive Dashboard');
        expect(dashboard.refreshFrequency).toBe('DAILY');
      });

      it('should add sections to dashboard', async () => {
        const dashboard = await strategicMonitoringService.createDashboard(
          {
            name: 'Test Dashboard',
            description: 'Test',
            owner: 'test-owner',
          },
          testUserId,
        );

        const updated = await strategicMonitoringService.addDashboardSection(
          dashboard.id,
          {
            title: 'KPI Overview',
            type: 'KPI_GRID',
            config: { columns: 4 },
            metrics: ['metric-1', 'metric-2'],
            position: { row: 0, col: 0, width: 4, height: 2 },
          },
          testUserId,
        );

        expect(updated.sections.length).toBe(1);
        expect(updated.sections[0].title).toBe('KPI Overview');
      });
    });

    describe('Metric Management', () => {
      it('should create a metric', async () => {
        const metric = await strategicMonitoringService.createMetric(
          {
            name: 'Customer Satisfaction Score',
            description: 'NPS-based satisfaction metric',
            type: MetricType.KPI,
            category: 'customer',
            owner: 'customer-success',
            dataSource: 'survey-system',
            unit: 'points',
            direction: 'HIGHER_IS_BETTER',
            baseline: 45,
            target: 65,
            linkedGoals: [],
            linkedObjectives: [],
          },
          testUserId,
        );

        expect(metric).toBeDefined();
        expect(metric.name).toBe('Customer Satisfaction Score');
        expect(metric.current).toBe(45); // Initial = baseline
        expect(metric.target).toBe(65);
        expect(metric.thresholds.length).toBeGreaterThan(0);
      });

      it('should update metric value and analyze trend', async () => {
        const metric = await strategicMonitoringService.createMetric(
          {
            name: 'Revenue',
            description: 'Monthly revenue',
            type: MetricType.KPI,
            category: 'financial',
            owner: 'finance',
            dataSource: 'erp',
            unit: 'USD',
            direction: 'HIGHER_IS_BETTER',
            baseline: 1000000,
            target: 1500000,
            linkedGoals: [],
            linkedObjectives: [],
          },
          testUserId,
        );

        // Update value multiple times
        await strategicMonitoringService.updateMetricValue(metric.id, 1100000, 'Month 1');
        await strategicMonitoringService.updateMetricValue(metric.id, 1200000, 'Month 2');
        const updated = await strategicMonitoringService.updateMetricValue(
          metric.id,
          1300000,
          'Month 3',
        );

        expect(updated.current).toBe(1300000);
        expect(updated.history.length).toBe(4); // baseline + 3 updates
        expect(updated.trend).toBeDefined();
        expect(updated.trend.direction).toBe('IMPROVING');
      });

      it('should add metric annotations', async () => {
        const metric = await strategicMonitoringService.createMetric(
          {
            name: 'Test Metric',
            description: 'Test',
            type: MetricType.HEALTH_METRIC,
            category: 'test',
            owner: 'test-owner',
            dataSource: 'manual',
            unit: '%',
            direction: 'HIGHER_IS_BETTER',
            baseline: 0,
            target: 100,
            linkedGoals: [],
            linkedObjectives: [],
          },
          testUserId,
        );

        const updated = await strategicMonitoringService.addMetricAnnotation(metric.id, {
          timestamp: new Date(),
          note: 'Major initiative launched',
          author: 'test-user',
          type: 'EVENT',
        });

        expect(updated.annotations.length).toBe(1);
        expect(updated.annotations[0].note).toBe('Major initiative launched');
      });
    });

    describe('Progress Reporting', () => {
      it('should generate a progress report', async () => {
        const report = await strategicMonitoringService.generateProgressReport(
          'MONTHLY',
          new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          new Date(),
          testUserId,
        );

        expect(report).toBeDefined();
        expect(report.reportType).toBe('MONTHLY');
        expect(Array.isArray(report.goals)).toBe(true);
        expect(Array.isArray(report.metrics)).toBe(true);
        expect(Array.isArray(report.highlights)).toBe(true);
        expect(Array.isArray(report.challenges)).toBe(true);
        expect(report.executiveSummary).toBeDefined();
      });
    });

    describe('Health Summary', () => {
      it('should return strategic health summary', async () => {
        const summary = await strategicMonitoringService.getStrategicHealthSummary();

        expect(summary).toBeDefined();
        expect(typeof summary.overallHealth).toBe('number');
        expect(summary.goalHealth).toBeDefined();
        expect(summary.metricHealth).toBeDefined();
        expect(summary.alertCount).toBeDefined();
      });
    });
  });
});
