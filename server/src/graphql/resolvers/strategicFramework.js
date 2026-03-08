"use strict";
// @ts-nocheck
/**
 * Strategic Framework GraphQL Resolvers
 *
 * Provides resolvers for strategic planning, analysis, decision support,
 * and monitoring capabilities.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.strategicFrameworkResolvers = void 0;
const graphql_1 = require("graphql");
const index_js_1 = require("../../services/strategic-framework/index.js");
// DateTime scalar
const DateTimeScalar = new graphql_1.GraphQLScalarType({
    name: 'DateTime',
    description: 'Date custom scalar type',
    serialize(value) {
        if (value instanceof Date) {
            return value.toISOString();
        }
        throw new Error('DateTime must be a Date');
    },
    parseValue(value) {
        if (typeof value === 'string' || typeof value === 'number') {
            return new Date(value);
        }
        throw new Error('DateTime must be a string or number');
    },
    parseLiteral(ast) {
        if (ast.kind === graphql_1.Kind.STRING || ast.kind === graphql_1.Kind.INT) {
            return new Date(ast.kind === graphql_1.Kind.INT ? ast.value : ast.value);
        }
        return null;
    },
});
// Helper to get user ID from context
const getUserId = (context) => {
    return context?.user?.id || context?.userId || 'system';
};
exports.strategicFrameworkResolvers = {
    DateTime: DateTimeScalar,
    Query: {
        // =========================================================================
        // STRATEGIC PLANNING QUERIES
        // =========================================================================
        strategicGoal: async (_, { id }) => {
            return index_js_1.strategicPlanningService.getGoal(id);
        },
        strategicGoals: async (_, args) => {
            return index_js_1.strategicPlanningService.getAllGoals(args);
        },
        strategicOverview: async () => {
            return index_js_1.strategicPlanningService.getStrategicOverview();
        },
        goalHierarchy: async (_, { goalId }) => {
            return index_js_1.strategicPlanningService.getGoalHierarchy(goalId);
        },
        // =========================================================================
        // STRATEGIC ANALYSIS QUERIES
        // =========================================================================
        swotAnalysis: async (_, { id }) => {
            return index_js_1.strategicAnalysisEngine.getSWOTAnalysis(id);
        },
        scenarioAnalysis: async (_, { id }) => {
            return index_js_1.strategicAnalysisEngine.getScenarioAnalysis(id);
        },
        riskAssessment: async (_, { id }) => {
            return index_js_1.strategicAnalysisEngine.getRiskAssessment(id);
        },
        gapAnalysis: async (_, { id }) => {
            return index_js_1.strategicAnalysisEngine.getGapAnalysis(id);
        },
        strategicAnalyses: async (_, args) => {
            return index_js_1.strategicAnalysisEngine.getAllAnalyses(args);
        },
        // =========================================================================
        // STRATEGIC DECISION QUERIES
        // =========================================================================
        strategicDecision: async (_, { id }) => {
            return index_js_1.strategicDecisionService.getDecision(id);
        },
        strategicDecisions: async (_, args) => {
            return index_js_1.strategicDecisionService.getAllDecisions(args);
        },
        decisionInsights: async () => {
            return index_js_1.strategicDecisionService.getDecisionInsights();
        },
        // =========================================================================
        // MONITORING QUERIES
        // =========================================================================
        strategicDashboard: async (_, { id }) => {
            return index_js_1.strategicMonitoringService.getDashboard(id);
        },
        strategicDashboards: async (_, { userId }) => {
            return index_js_1.strategicMonitoringService.getAllDashboards(userId);
        },
        strategicMetric: async (_, { id }) => {
            return index_js_1.strategicMonitoringService.getMetric(id);
        },
        strategicMetrics: async (_, args) => {
            return index_js_1.strategicMonitoringService.getAllMetrics(args);
        },
        activeAlerts: async () => {
            return index_js_1.strategicMonitoringService.getActiveAlerts();
        },
        progressReport: async (_, { id }) => {
            return index_js_1.strategicMonitoringService.getReport(id);
        },
        progressReports: async (_, args) => {
            return index_js_1.strategicMonitoringService.getAllReports(args);
        },
        strategicHealthSummary: async () => {
            return index_js_1.strategicMonitoringService.getStrategicHealthSummary();
        },
    },
    Mutation: {
        // =========================================================================
        // STRATEGIC PLANNING MUTATIONS
        // =========================================================================
        createStrategicGoal: async (_, { input }, context) => {
            return index_js_1.strategicPlanningService.createGoal(input, getUserId(context));
        },
        updateStrategicGoal: async (_, { input }, context) => {
            return index_js_1.strategicPlanningService.updateGoal(input, getUserId(context));
        },
        deleteStrategicGoal: async (_, { id }) => {
            return index_js_1.strategicPlanningService.deleteGoal(id);
        },
        activateStrategicGoal: async (_, { id }, context) => {
            return index_js_1.strategicPlanningService.activateGoal(id, getUserId(context));
        },
        completeStrategicGoal: async (_, { id }, context) => {
            return index_js_1.strategicPlanningService.completeGoal(id, getUserId(context));
        },
        createObjective: async (_, { input }, context) => {
            return index_js_1.strategicPlanningService.createObjective(input, getUserId(context));
        },
        updateObjective: async (_, { id, updates }, context) => {
            return index_js_1.strategicPlanningService.updateObjective(id, updates, getUserId(context));
        },
        deleteObjective: async (_, { id }) => {
            return index_js_1.strategicPlanningService.deleteObjective(id);
        },
        createKeyResult: async (_, args, context) => {
            const { objectiveId, ...input } = args;
            return index_js_1.strategicPlanningService.createKeyResult(objectiveId, input, getUserId(context));
        },
        updateKeyResultValue: async (_, { id, value, note }, context) => {
            return index_js_1.strategicPlanningService.updateKeyResultValue(id, value, note || '', getUserId(context));
        },
        createInitiative: async (_, { input }, context) => {
            const initiativeInput = {
                objectiveId: input.objectiveId,
                title: input.title,
                description: input.description,
                rationale: input.rationale || '',
                priority: input.priority,
                owner: input.owner,
                team: input.team || [],
                startDate: new Date(input.startDate),
                targetDate: new Date(input.targetDate),
                budget: input.budgetTotal
                    ? { total: input.budgetTotal, currency: input.budgetCurrency || 'USD' }
                    : undefined,
                effortEstimate: input.effortEstimate,
                tags: input.tags || [],
                labels: {},
            };
            return index_js_1.strategicPlanningService.createInitiative(initiativeInput, getUserId(context));
        },
        updateInitiative: async (_, { id, updates }, context) => {
            return index_js_1.strategicPlanningService.updateInitiative(id, updates, getUserId(context));
        },
        deleteInitiative: async (_, { id }) => {
            return index_js_1.strategicPlanningService.deleteInitiative(id);
        },
        createMilestone: async (_, args) => {
            return index_js_1.strategicPlanningService.createMilestone(args.initiativeId, {
                title: args.title,
                description: args.description,
                targetDate: new Date(args.targetDate),
                deliverables: args.deliverables || [],
            });
        },
        updateMilestoneStatus: async (_, { id, status, notes }) => {
            return index_js_1.strategicPlanningService.updateMilestoneStatus(id, status, notes);
        },
        addSuccessCriterion: async (_, args, context) => {
            return index_js_1.strategicPlanningService.addSuccessCriterion(args.goalId, args, getUserId(context));
        },
        assessSuccessCriterion: async (_, args, context) => {
            return index_js_1.strategicPlanningService.assessSuccessCriterion(args.goalId, args.criterionId, args.achieved, args.evidence, getUserId(context));
        },
        // =========================================================================
        // STRATEGIC ANALYSIS MUTATIONS
        // =========================================================================
        createSWOTAnalysis: async (_, { input }, context) => {
            return index_js_1.strategicAnalysisEngine.createSWOTAnalysis(input, getUserId(context));
        },
        addSWOTItem: async (_, { analysisId, quadrant, item }, context) => {
            return index_js_1.strategicAnalysisEngine.addSWOTItem(analysisId, quadrant, item, getUserId(context));
        },
        generateSWOTImplications: async (_, { analysisId }, context) => {
            return index_js_1.strategicAnalysisEngine.generateSWOTImplications(analysisId, getUserId(context));
        },
        createScenarioAnalysis: async (_, { input }, context) => {
            return index_js_1.strategicAnalysisEngine.createScenarioAnalysis(input, getUserId(context));
        },
        addScenario: async (_, { analysisId, scenario }, context) => {
            return index_js_1.strategicAnalysisEngine.addScenario(analysisId, scenario, getUserId(context));
        },
        generateScenarios: async (_, { analysisId, count }, context) => {
            return index_js_1.strategicAnalysisEngine.generateScenarios(analysisId, count, getUserId(context));
        },
        createRiskAssessment: async (_, { input }, context) => {
            return index_js_1.strategicAnalysisEngine.createRiskAssessment(input, getUserId(context));
        },
        addRisk: async (_, { assessmentId, risk }, context) => {
            return index_js_1.strategicAnalysisEngine.addRisk(assessmentId, risk, getUserId(context));
        },
        createGapAnalysis: async (_, { input }, context) => {
            return index_js_1.strategicAnalysisEngine.createGapAnalysis(input, getUserId(context));
        },
        addGap: async (_, { analysisId, gap }, context) => {
            return index_js_1.strategicAnalysisEngine.addGap(analysisId, gap, getUserId(context));
        },
        generateGapClosurePlan: async (_, { analysisId }, context) => {
            return index_js_1.strategicAnalysisEngine.generateGapClosurePlan(analysisId, getUserId(context));
        },
        finalizeAnalysis: async (_, args, context) => {
            return index_js_1.strategicAnalysisEngine.finalizeAnalysis(args.analysisId, args.executiveSummary, args.confidenceLevel, getUserId(context));
        },
        deleteAnalysis: async (_, { id }) => {
            return index_js_1.strategicAnalysisEngine.deleteAnalysis(id);
        },
        // =========================================================================
        // STRATEGIC DECISION MUTATIONS
        // =========================================================================
        createStrategicDecision: async (_, { input }, context) => {
            return index_js_1.strategicDecisionService.createDecision(input, getUserId(context));
        },
        updateStrategicDecision: async (_, { id, updates }, context) => {
            return index_js_1.strategicDecisionService.updateDecision(id, updates, getUserId(context));
        },
        deleteStrategicDecision: async (_, { id }) => {
            return index_js_1.strategicDecisionService.deleteDecision(id);
        },
        addDecisionOption: async (_, { input }, context) => {
            return index_js_1.strategicDecisionService.addOption(input.decisionId, {
                name: input.name,
                description: input.description,
                pros: input.pros,
                cons: input.cons,
                assumptions: input.assumptions || [],
                timeline: input.timeline,
                cost: {
                    initialInvestment: input.initialInvestment || 0,
                    ongoingCosts: input.ongoingCosts || 0,
                },
            }, getUserId(context));
        },
        updateDecisionOption: async (_, { optionId, updates }, context) => {
            return index_js_1.strategicDecisionService.updateOption(optionId, updates, getUserId(context));
        },
        deleteDecisionOption: async (_, { optionId }) => {
            return index_js_1.strategicDecisionService.deleteOption(optionId);
        },
        addDecisionCriterion: async (_, { input }) => {
            return index_js_1.strategicDecisionService.addCriterion(input.decisionId, {
                name: input.name,
                description: input.description,
                weight: input.weight,
                type: input.type,
                measurementMethod: input.measurementMethod,
                minimumThreshold: input.minimumThreshold,
                idealValue: input.idealValue,
                mustHave: input.mustHave,
            });
        },
        updateCriterionWeight: async (_, { criterionId, weight }) => {
            return index_js_1.strategicDecisionService.updateCriterionWeight(criterionId, weight);
        },
        performMultiCriteriaAnalysis: async (_, { decisionId, scores }, context) => {
            const scoresMap = {};
            for (const entry of scores) {
                scoresMap[entry.optionId] = entry.scores;
            }
            return index_js_1.strategicDecisionService.performMultiCriteriaAnalysis(decisionId, scoresMap, getUserId(context));
        },
        performSensitivityAnalysis: async (_, { decisionId }, context) => {
            return index_js_1.strategicDecisionService.performSensitivityAnalysis(decisionId, getUserId(context));
        },
        recordDecision: async (_, args, context) => {
            return index_js_1.strategicDecisionService.recordDecision(args.decisionId, args.selectedOptionId, args.rationale, getUserId(context));
        },
        createImplementationPlan: async (_, args, context) => {
            return index_js_1.strategicDecisionService.createImplementationPlan(args.decisionId, {
                plan: args.steps.map((step, index) => ({
                    sequence: index + 1,
                    action: step.action,
                    owner: step.owner,
                    targetDate: new Date(step.targetDate),
                    dependencies: step.dependencies || [],
                    notes: step.notes || '',
                })),
                owner: args.owner,
                startDate: new Date(args.startDate),
                targetDate: new Date(args.targetDate),
            }, getUserId(context));
        },
        updateImplementationProgress: async (_, args, context) => {
            return index_js_1.strategicDecisionService.updateImplementationProgress(args.decisionId, args.stepIndex, args.status, args.notes, getUserId(context));
        },
        recordDecisionOutcome: async (_, { decisionId, outcome }, context) => {
            return index_js_1.strategicDecisionService.recordOutcome(decisionId, outcome, getUserId(context));
        },
        // =========================================================================
        // MONITORING MUTATIONS
        // =========================================================================
        createDashboard: async (_, args, context) => {
            return index_js_1.strategicMonitoringService.createDashboard({
                name: args.name,
                description: args.description,
                owner: args.owner,
                viewers: args.viewers,
                refreshFrequency: args.refreshFrequency,
            }, getUserId(context));
        },
        addDashboardSection: async (_, { dashboardId, section }, context) => {
            return index_js_1.strategicMonitoringService.addDashboardSection(dashboardId, section, getUserId(context));
        },
        updateDashboardSection: async (_, { dashboardId, sectionId, updates }, context) => {
            return index_js_1.strategicMonitoringService.updateDashboardSection(dashboardId, sectionId, updates, getUserId(context));
        },
        deleteDashboard: async (_, { id }) => {
            return index_js_1.strategicMonitoringService.deleteDashboard(id);
        },
        createStrategicMetric: async (_, { input }, context) => {
            return index_js_1.strategicMonitoringService.createMetric(input, getUserId(context));
        },
        updateMetricValue: async (_, { metricId, value, note }, context) => {
            return index_js_1.strategicMonitoringService.updateMetricValue(metricId, value, note, getUserId(context));
        },
        addMetricAnnotation: async (_, args) => {
            return index_js_1.strategicMonitoringService.addMetricAnnotation(args.metricId, {
                timestamp: new Date(args.timestamp),
                note: args.note,
                author: args.author,
                type: args.type,
            });
        },
        deleteMetric: async (_, { id }) => {
            return index_js_1.strategicMonitoringService.deleteMetric(id);
        },
        acknowledgeAlert: async (_, { alertId, resolution }, context) => {
            return index_js_1.strategicMonitoringService.acknowledgeAlert(alertId, getUserId(context), resolution);
        },
        generateProgressReport: async (_, args, context) => {
            return index_js_1.strategicMonitoringService.generateProgressReport(args.reportType, new Date(args.periodStart), new Date(args.periodEnd), getUserId(context));
        },
    },
};
exports.default = exports.strategicFrameworkResolvers;
