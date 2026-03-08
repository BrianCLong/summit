"use strict";
// @ts-nocheck
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.strategicAnalysisEngine = exports.StrategicAnalysisEngine = void 0;
/**
 * Strategic Analysis Engine
 *
 * Provides comprehensive strategic analysis capabilities including:
 * - SWOT Analysis
 * - Scenario Planning
 * - Risk Assessment
 * - Gap Analysis
 * - Competitive Analysis
 */
const uuid_1 = require("uuid");
const logger_js_1 = __importDefault(require("../../utils/logger.js"));
const otel_js_1 = require("../../otel.js");
const types_js_1 = require("./types.js");
const tracer = typeof otel_js_1.getTracer === 'function'
    ? (0, otel_js_1.getTracer)('strategic-analysis-engine')
    : { startSpan: () => ({ end: () => { } }) };
// In-memory storage
const analysesStore = new Map();
const swotStore = new Map();
const scenarioStore = new Map();
const riskAssessmentStore = new Map();
const gapAnalysisStore = new Map();
class StrategicAnalysisEngine {
    static instance;
    constructor() {
        logger_js_1.default.info('StrategicAnalysisEngine initialized');
    }
    static getInstance() {
        if (!StrategicAnalysisEngine.instance) {
            StrategicAnalysisEngine.instance = new StrategicAnalysisEngine();
        }
        return StrategicAnalysisEngine.instance;
    }
    // ============================================================================
    // SWOT ANALYSIS
    // ============================================================================
    async createSWOTAnalysis(input, userId) {
        const span = tracer.startSpan('analysisEngine.createSWOTAnalysis');
        try {
            const validated = types_js_1.CreateAnalysisInputSchema.parse({ ...input, type: 'SWOT' });
            const now = new Date();
            const id = (0, uuid_1.v4)();
            const addIds = (items = []) => items.map((item) => ({ ...item, id: (0, uuid_1.v4)() }));
            const analysis = {
                id,
                type: 'SWOT',
                title: validated.title,
                description: validated.description,
                scope: validated.scope,
                context: validated.context,
                timeHorizon: validated.timeHorizon,
                status: 'DRAFT',
                analyst: validated.analyst,
                reviewers: validated.reviewers,
                findings: [],
                recommendations: [],
                confidenceLevel: 0,
                dataSourceQuality: 0,
                linkedGoals: validated.linkedGoals,
                linkedDecisions: [],
                executiveSummary: '',
                strengths: addIds(input.strengths),
                weaknesses: addIds(input.weaknesses),
                opportunities: addIds(input.opportunities),
                threats: addIds(input.threats),
                strategicImplications: [],
                createdAt: now,
                createdBy: userId,
                updatedAt: now,
                updatedBy: userId,
                version: 1,
            };
            swotStore.set(id, analysis);
            analysesStore.set(id, analysis);
            logger_js_1.default.info({ analysisId: id }, 'SWOT analysis created');
            return analysis;
        }
        finally {
            span.end();
        }
    }
    async addSWOTItem(analysisId, quadrant, item, userId) {
        const analysis = swotStore.get(analysisId);
        if (!analysis) {
            throw new Error(`SWOT analysis not found: ${analysisId}`);
        }
        const newItem = { ...item, id: (0, uuid_1.v4)() };
        analysis[quadrant].push(newItem);
        analysis.updatedAt = new Date();
        analysis.updatedBy = userId;
        analysis.version++;
        swotStore.set(analysisId, analysis);
        return analysis;
    }
    async generateSWOTImplications(analysisId, userId) {
        const span = tracer.startSpan('analysisEngine.generateSWOTImplications');
        try {
            const analysis = swotStore.get(analysisId);
            if (!analysis) {
                throw new Error(`SWOT analysis not found: ${analysisId}`);
            }
            const implications = [];
            // SO Strategies (Strengths + Opportunities)
            for (const strength of analysis.strengths.slice(0, 3)) {
                for (const opportunity of analysis.opportunities.slice(0, 3)) {
                    if (strength.relevance > 50 && opportunity.relevance > 50) {
                        implications.push({
                            id: (0, uuid_1.v4)(),
                            implication: `Leverage "${strength.description}" to capitalize on "${opportunity.description}"`,
                            derivedFrom: [strength.id, opportunity.id],
                            priority: this.calculatePriority(strength.impact, opportunity.impact),
                            recommendedAction: `Develop action plan to use strength in capturing opportunity`,
                            timeframe: opportunity.timeframe,
                        });
                    }
                }
            }
            // WO Strategies (Weaknesses + Opportunities)
            for (const weakness of analysis.weaknesses.slice(0, 3)) {
                for (const opportunity of analysis.opportunities.slice(0, 3)) {
                    if (weakness.relevance > 50 && opportunity.relevance > 50) {
                        implications.push({
                            id: (0, uuid_1.v4)(),
                            implication: `Address "${weakness.description}" to enable pursuit of "${opportunity.description}"`,
                            derivedFrom: [weakness.id, opportunity.id],
                            priority: this.calculatePriority(weakness.impact, opportunity.impact),
                            recommendedAction: `Create improvement plan targeting weakness to unlock opportunity`,
                            timeframe: opportunity.timeframe,
                        });
                    }
                }
            }
            // ST Strategies (Strengths + Threats)
            for (const strength of analysis.strengths.slice(0, 3)) {
                for (const threat of analysis.threats.slice(0, 3)) {
                    if (strength.relevance > 50 && threat.relevance > 50) {
                        implications.push({
                            id: (0, uuid_1.v4)(),
                            implication: `Use "${strength.description}" to mitigate "${threat.description}"`,
                            derivedFrom: [strength.id, threat.id],
                            priority: this.calculatePriority(strength.impact, threat.impact),
                            recommendedAction: `Deploy strength as defensive measure against threat`,
                            timeframe: threat.timeframe,
                        });
                    }
                }
            }
            // WT Strategies (Weaknesses + Threats)
            for (const weakness of analysis.weaknesses.slice(0, 3)) {
                for (const threat of analysis.threats.slice(0, 3)) {
                    if (weakness.relevance > 50 && threat.relevance > 50) {
                        implications.push({
                            id: (0, uuid_1.v4)(),
                            implication: `"${weakness.description}" compounds exposure to "${threat.description}"`,
                            derivedFrom: [weakness.id, threat.id],
                            priority: 'CRITICAL',
                            recommendedAction: `Urgent: Address vulnerability created by weakness-threat combination`,
                            timeframe: 'IMMEDIATE',
                        });
                    }
                }
            }
            analysis.strategicImplications = implications;
            analysis.updatedAt = new Date();
            analysis.updatedBy = userId;
            analysis.version++;
            swotStore.set(analysisId, analysis);
            return analysis;
        }
        finally {
            span.end();
        }
    }
    async getSWOTAnalysis(id) {
        return swotStore.get(id) || null;
    }
    // ============================================================================
    // SCENARIO PLANNING
    // ============================================================================
    async createScenarioAnalysis(input, userId) {
        const span = tracer.startSpan('analysisEngine.createScenarioAnalysis');
        try {
            const validated = types_js_1.CreateAnalysisInputSchema.parse({ ...input, type: 'SCENARIO_PLANNING' });
            const now = new Date();
            const id = (0, uuid_1.v4)();
            const analysis = {
                id,
                type: 'SCENARIO_PLANNING',
                title: validated.title,
                description: validated.description,
                scope: validated.scope,
                context: validated.context,
                timeHorizon: validated.timeHorizon,
                status: 'DRAFT',
                analyst: validated.analyst,
                reviewers: validated.reviewers,
                findings: [],
                recommendations: [],
                confidenceLevel: 0,
                dataSourceQuality: 0,
                linkedGoals: validated.linkedGoals,
                linkedDecisions: [],
                executiveSummary: '',
                scenarios: [],
                keyUncertainties: (input.keyUncertainties || []).map((u) => ({ ...u, id: (0, uuid_1.v4)() })),
                criticalDrivers: (input.criticalDrivers || []).map((d) => ({ ...d, id: (0, uuid_1.v4)() })),
                preferredScenario: '',
                contingencyPlans: [],
                createdAt: now,
                createdBy: userId,
                updatedAt: now,
                updatedBy: userId,
                version: 1,
            };
            scenarioStore.set(id, analysis);
            analysesStore.set(id, analysis);
            logger_js_1.default.info({ analysisId: id }, 'Scenario analysis created');
            return analysis;
        }
        finally {
            span.end();
        }
    }
    async addScenario(analysisId, scenario, userId) {
        const analysis = scenarioStore.get(analysisId);
        if (!analysis) {
            throw new Error(`Scenario analysis not found: ${analysisId}`);
        }
        const newScenario = { ...scenario, id: (0, uuid_1.v4)() };
        analysis.scenarios.push(newScenario);
        analysis.updatedAt = new Date();
        analysis.updatedBy = userId;
        analysis.version++;
        scenarioStore.set(analysisId, analysis);
        return analysis;
    }
    async generateScenarios(analysisId, count, userId) {
        const span = tracer.startSpan('analysisEngine.generateScenarios');
        try {
            const analysis = scenarioStore.get(analysisId);
            if (!analysis) {
                throw new Error(`Scenario analysis not found: ${analysisId}`);
            }
            const scenarios = [];
            const scenarioNames = ['Optimistic', 'Base Case', 'Pessimistic', 'Disruptive'];
            for (let i = 0; i < Math.min(count, 4); i++) {
                const probability = i === 1 ? 0.5 : i === 0 ? 0.2 : i === 2 ? 0.25 : 0.05;
                scenarios.push({
                    id: (0, uuid_1.v4)(),
                    name: scenarioNames[i] || `Scenario ${i + 1}`,
                    narrative: `${scenarioNames[i]} scenario based on current analysis context`,
                    probability,
                    timeframe: analysis.timeHorizon,
                    assumptions: analysis.keyUncertainties.map((u) => u.description),
                    triggers: [],
                    implications: [],
                    opportunities: [],
                    threats: [],
                    preparednessScore: 0,
                    indicatorSignals: [],
                });
            }
            analysis.scenarios = scenarios;
            analysis.updatedAt = new Date();
            analysis.updatedBy = userId;
            analysis.version++;
            scenarioStore.set(analysisId, analysis);
            return analysis;
        }
        finally {
            span.end();
        }
    }
    async addContingencyPlan(analysisId, scenarioId, plan, userId) {
        const analysis = scenarioStore.get(analysisId);
        if (!analysis) {
            throw new Error(`Scenario analysis not found: ${analysisId}`);
        }
        const scenario = analysis.scenarios.find((s) => s.id === scenarioId);
        if (!scenario) {
            throw new Error(`Scenario not found: ${scenarioId}`);
        }
        const contingencyPlan = {
            ...plan,
            id: (0, uuid_1.v4)(),
            scenarioId,
        };
        analysis.contingencyPlans.push(contingencyPlan);
        analysis.updatedAt = new Date();
        analysis.updatedBy = userId;
        analysis.version++;
        scenarioStore.set(analysisId, analysis);
        return analysis;
    }
    async getScenarioAnalysis(id) {
        return scenarioStore.get(id) || null;
    }
    // ============================================================================
    // RISK ASSESSMENT
    // ============================================================================
    async createRiskAssessment(input, userId) {
        const span = tracer.startSpan('analysisEngine.createRiskAssessment');
        try {
            const validated = types_js_1.CreateAnalysisInputSchema.parse({ ...input, type: 'RISK_ASSESSMENT' });
            const now = new Date();
            const id = (0, uuid_1.v4)();
            const defaultRiskAppetite = {
                overallLevel: 'BALANCED',
                byCategory: {
                    STRATEGIC: 0.5,
                    OPERATIONAL: 0.4,
                    FINANCIAL: 0.3,
                    COMPLIANCE: 0.2,
                    REPUTATIONAL: 0.3,
                    TECHNOLOGICAL: 0.5,
                    MARKET: 0.5,
                    GEOPOLITICAL: 0.3,
                },
                toleranceThresholds: {},
                statement: 'Organization maintains balanced risk appetite with emphasis on compliance',
            };
            const assessment = {
                id,
                type: 'RISK_ASSESSMENT',
                title: validated.title,
                description: validated.description,
                scope: validated.scope,
                context: validated.context,
                timeHorizon: validated.timeHorizon,
                status: 'DRAFT',
                analyst: validated.analyst,
                reviewers: validated.reviewers,
                findings: [],
                recommendations: [],
                confidenceLevel: 0,
                dataSourceQuality: 0,
                linkedGoals: validated.linkedGoals,
                linkedDecisions: [],
                executiveSummary: '',
                risks: [],
                riskMatrix: {
                    lowRisks: [],
                    mediumRisks: [],
                    highRisks: [],
                    criticalRisks: [],
                    heatmapData: [],
                },
                aggregateRiskScore: 0,
                riskAppetite: { ...defaultRiskAppetite, ...input.riskAppetite },
                mitigationPlan: {
                    id: (0, uuid_1.v4)(),
                    riskId: '',
                    strategies: [],
                    timeline: '',
                    budget: 0,
                    expectedRiskReduction: 0,
                    status: 'PLANNED',
                },
                createdAt: now,
                createdBy: userId,
                updatedAt: now,
                updatedBy: userId,
                version: 1,
            };
            riskAssessmentStore.set(id, assessment);
            analysesStore.set(id, assessment);
            logger_js_1.default.info({ analysisId: id }, 'Risk assessment created');
            return assessment;
        }
        finally {
            span.end();
        }
    }
    async addRisk(assessmentId, risk, userId) {
        const assessment = riskAssessmentStore.get(assessmentId);
        if (!assessment) {
            throw new Error(`Risk assessment not found: ${assessmentId}`);
        }
        const impactScore = this.impactToNumeric(risk.impact);
        const inherentRisk = risk.probability * impactScore;
        const controlEffectiveness = risk.controls.reduce((sum, c) => sum + c.effectiveness, 0) / Math.max(1, risk.controls.length);
        const residualRisk = inherentRisk * (1 - controlEffectiveness / 100);
        const newRisk = {
            ...risk,
            id: (0, uuid_1.v4)(),
            riskScore: residualRisk,
            inherentRisk,
            residualRisk,
        };
        assessment.risks.push(newRisk);
        this.updateRiskMatrix(assessment);
        assessment.aggregateRiskScore = this.calculateAggregateRiskScore(assessment.risks);
        assessment.updatedAt = new Date();
        assessment.updatedBy = userId;
        assessment.version++;
        riskAssessmentStore.set(assessmentId, assessment);
        return assessment;
    }
    async getRiskAssessment(id) {
        return riskAssessmentStore.get(id) || null;
    }
    updateRiskMatrix(assessment) {
        assessment.riskMatrix = {
            lowRisks: assessment.risks.filter((r) => r.riskScore < 2.5).map((r) => r.id),
            mediumRisks: assessment.risks.filter((r) => r.riskScore >= 2.5 && r.riskScore < 5).map((r) => r.id),
            highRisks: assessment.risks.filter((r) => r.riskScore >= 5 && r.riskScore < 7.5).map((r) => r.id),
            criticalRisks: assessment.risks.filter((r) => r.riskScore >= 7.5).map((r) => r.id),
            heatmapData: this.generateHeatmapData(assessment.risks),
        };
    }
    generateHeatmapData(risks) {
        const heatmap = [];
        const probBuckets = [0.2, 0.4, 0.6, 0.8, 1.0];
        const impactBuckets = [1, 2, 3, 4, 5];
        for (const prob of probBuckets) {
            for (const impact of impactBuckets) {
                const cellRisks = risks.filter((r) => r.probability <= prob &&
                    r.probability > prob - 0.2 &&
                    this.impactToNumeric(r.impact) === impact);
                const colors = {
                    '0.2-1': '#4caf50', '0.2-2': '#8bc34a', '0.2-3': '#ffeb3b', '0.2-4': '#ff9800', '0.2-5': '#f44336',
                    '0.4-1': '#8bc34a', '0.4-2': '#ffeb3b', '0.4-3': '#ff9800', '0.4-4': '#f44336', '0.4-5': '#d32f2f',
                    '0.6-1': '#ffeb3b', '0.6-2': '#ff9800', '0.6-3': '#f44336', '0.6-4': '#d32f2f', '0.6-5': '#b71c1c',
                    '0.8-1': '#ff9800', '0.8-2': '#f44336', '0.8-3': '#d32f2f', '0.8-4': '#b71c1c', '0.8-5': '#b71c1c',
                    '1.0-1': '#f44336', '1.0-2': '#d32f2f', '1.0-3': '#b71c1c', '1.0-4': '#b71c1c', '1.0-5': '#b71c1c',
                };
                heatmap.push({
                    probability: prob,
                    impact,
                    riskIds: cellRisks.map((r) => r.id),
                    color: colors[`${prob}-${impact}`] || '#9e9e9e',
                });
            }
        }
        return heatmap;
    }
    calculateAggregateRiskScore(risks) {
        if (risks.length === 0)
            return 0;
        const totalScore = risks.reduce((sum, r) => sum + r.riskScore, 0);
        return Math.round((totalScore / risks.length) * 100) / 100;
    }
    // ============================================================================
    // GAP ANALYSIS
    // ============================================================================
    async createGapAnalysis(input, userId) {
        const span = tracer.startSpan('analysisEngine.createGapAnalysis');
        try {
            const validated = types_js_1.CreateAnalysisInputSchema.parse({ ...input, type: 'GAP_ANALYSIS' });
            const now = new Date();
            const id = (0, uuid_1.v4)();
            const defaultState = {
                description: '',
                capabilities: [],
                maturityLevel: 0,
                strengths: [],
                limitations: [],
            };
            const analysis = {
                id,
                type: 'GAP_ANALYSIS',
                title: validated.title,
                description: validated.description,
                scope: validated.scope,
                context: validated.context,
                timeHorizon: validated.timeHorizon,
                status: 'DRAFT',
                analyst: validated.analyst,
                reviewers: validated.reviewers,
                findings: [],
                recommendations: [],
                confidenceLevel: 0,
                dataSourceQuality: 0,
                linkedGoals: validated.linkedGoals,
                linkedDecisions: [],
                executiveSummary: '',
                currentState: { ...defaultState, ...input.currentState },
                targetState: { ...defaultState, ...input.targetState },
                gaps: [],
                closurePlan: {
                    phases: [],
                    totalDuration: '',
                    totalCost: 0,
                    quickWins: [],
                    criticalPath: [],
                },
                createdAt: now,
                createdBy: userId,
                updatedAt: now,
                updatedBy: userId,
                version: 1,
            };
            gapAnalysisStore.set(id, analysis);
            analysesStore.set(id, analysis);
            logger_js_1.default.info({ analysisId: id }, 'Gap analysis created');
            return analysis;
        }
        finally {
            span.end();
        }
    }
    async addGap(analysisId, gap, userId) {
        const analysis = gapAnalysisStore.get(analysisId);
        if (!analysis) {
            throw new Error(`Gap analysis not found: ${analysisId}`);
        }
        const newGap = { ...gap, id: (0, uuid_1.v4)() };
        analysis.gaps.push(newGap);
        analysis.updatedAt = new Date();
        analysis.updatedBy = userId;
        analysis.version++;
        gapAnalysisStore.set(analysisId, analysis);
        return analysis;
    }
    async generateGapClosurePlan(analysisId, userId) {
        const span = tracer.startSpan('analysisEngine.generateGapClosurePlan');
        try {
            const analysis = gapAnalysisStore.get(analysisId);
            if (!analysis) {
                throw new Error(`Gap analysis not found: ${analysisId}`);
            }
            const sortedGaps = [...analysis.gaps].sort((a, b) => {
                const priorityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
                return priorityOrder[a.priority] - priorityOrder[b.priority];
            });
            const quickWins = sortedGaps
                .filter((g) => g.estimatedEffort <= 10 && g.impact !== 'NEGLIGIBLE')
                .map((g) => g.id);
            const criticalPath = sortedGaps
                .filter((g) => g.priority === 'CRITICAL' || g.priority === 'HIGH')
                .map((g) => g.id);
            const phases = [];
            let phaseNum = 1;
            let remainingGaps = [...sortedGaps];
            while (remainingGaps.length > 0) {
                const phaseGaps = remainingGaps.splice(0, Math.min(3, remainingGaps.length));
                phases.push({
                    phase: phaseNum,
                    name: `Phase ${phaseNum}: ${phaseNum === 1 ? 'Foundation' : phaseNum === 2 ? 'Enhancement' : 'Optimization'}`,
                    duration: `${phaseGaps.length * 4} weeks`,
                    gaps: phaseGaps.map((g) => g.id),
                    milestones: phaseGaps.map((g) => `Complete: ${g.area}`),
                    resources: ['Project Team', 'Subject Matter Experts'],
                    cost: phaseGaps.reduce((sum, g) => sum + g.estimatedCost, 0),
                });
                phaseNum++;
            }
            analysis.closurePlan = {
                phases,
                totalDuration: `${phases.length * 4} weeks`,
                totalCost: analysis.gaps.reduce((sum, g) => sum + g.estimatedCost, 0),
                quickWins,
                criticalPath,
            };
            analysis.updatedAt = new Date();
            analysis.updatedBy = userId;
            analysis.version++;
            gapAnalysisStore.set(analysisId, analysis);
            return analysis;
        }
        finally {
            span.end();
        }
    }
    async getGapAnalysis(id) {
        return gapAnalysisStore.get(id) || null;
    }
    // ============================================================================
    // COMMON OPERATIONS
    // ============================================================================
    async getAnalysis(id) {
        return analysesStore.get(id) || null;
    }
    async getAllAnalyses(filters) {
        let analyses = Array.from(analysesStore.values());
        if (filters) {
            if (filters.type)
                analyses = analyses.filter((a) => a.type === filters.type);
            if (filters.status)
                analyses = analyses.filter((a) => a.status === filters.status);
            if (filters.analyst)
                analyses = analyses.filter((a) => a.analyst === filters.analyst);
            if (filters.timeHorizon)
                analyses = analyses.filter((a) => a.timeHorizon === filters.timeHorizon);
        }
        return analyses.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }
    async addFinding(analysisId, finding, userId) {
        const analysis = analysesStore.get(analysisId);
        if (!analysis) {
            throw new Error(`Analysis not found: ${analysisId}`);
        }
        const newFinding = { ...finding, id: (0, uuid_1.v4)() };
        analysis.findings.push(newFinding);
        analysis.updatedAt = new Date();
        analysis.updatedBy = userId;
        analysis.version++;
        analysesStore.set(analysisId, analysis);
        return analysis;
    }
    async addRecommendation(analysisId, recommendation, userId) {
        const analysis = analysesStore.get(analysisId);
        if (!analysis) {
            throw new Error(`Analysis not found: ${analysisId}`);
        }
        const newRec = { ...recommendation, id: (0, uuid_1.v4)() };
        analysis.recommendations.push(newRec);
        analysis.updatedAt = new Date();
        analysis.updatedBy = userId;
        analysis.version++;
        analysesStore.set(analysisId, analysis);
        return analysis;
    }
    async finalizeAnalysis(analysisId, executiveSummary, confidenceLevel, userId) {
        const analysis = analysesStore.get(analysisId);
        if (!analysis) {
            throw new Error(`Analysis not found: ${analysisId}`);
        }
        analysis.executiveSummary = executiveSummary;
        analysis.confidenceLevel = confidenceLevel;
        analysis.status = 'COMPLETED';
        analysis.updatedAt = new Date();
        analysis.updatedBy = userId;
        analysis.version++;
        analysesStore.set(analysisId, analysis);
        return analysis;
    }
    async deleteAnalysis(id) {
        const analysis = analysesStore.get(id);
        if (!analysis)
            return false;
        analysesStore.delete(id);
        swotStore.delete(id);
        scenarioStore.delete(id);
        riskAssessmentStore.delete(id);
        gapAnalysisStore.delete(id);
        logger_js_1.default.info({ analysisId: id }, 'Analysis deleted');
        return true;
    }
    // ============================================================================
    // HELPERS
    // ============================================================================
    calculatePriority(impact1, impact2) {
        const score1 = this.impactToNumeric(impact1);
        const score2 = this.impactToNumeric(impact2);
        const avg = (score1 + score2) / 2;
        if (avg >= 4.5)
            return 'CRITICAL';
        if (avg >= 3.5)
            return 'HIGH';
        if (avg >= 2.5)
            return 'MEDIUM';
        return 'LOW';
    }
    impactToNumeric(impact) {
        const scores = {
            TRANSFORMATIONAL: 5,
            SIGNIFICANT: 4,
            MODERATE: 3,
            MINOR: 2,
            NEGLIGIBLE: 1,
        };
        return scores[impact] || 3;
    }
}
exports.StrategicAnalysisEngine = StrategicAnalysisEngine;
exports.strategicAnalysisEngine = StrategicAnalysisEngine.getInstance();
