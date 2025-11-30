/**
 * Strategic Decision Support Service
 *
 * Provides comprehensive decision support capabilities including:
 * - Multi-criteria decision analysis
 * - Option evaluation and scoring
 * - Sensitivity analysis
 * - Decision tracking and outcome assessment
 */

import { v4 as uuidv4 } from 'uuid';
import logger from '../../utils/logger.js';
import { getTracer } from '../../otel.js';
import {
  StrategicDecision,
  DecisionOption,
  DecisionCriterion,
  DecisionAnalysis,
  DecisionRisk,
  ResourceRequirement,
  CostEstimate,
  ExpectedOutcome,
  DecisionImplementation,
  DecisionOutcome,
  MultiCriteriaResult,
  SensitivityResult,
  TradeoffEntry,
  DecisionType,
  ImpactLevel,
  CreateDecisionInput,
  CreateDecisionInputSchema,
} from './types.js';

const tracer = getTracer('strategic-decision-service');

// In-memory storage
const decisionsStore = new Map<string, StrategicDecision>();
const optionsStore = new Map<string, DecisionOption>();
const criteriaStore = new Map<string, DecisionCriterion>();

export class StrategicDecisionService {
  private static instance: StrategicDecisionService;

  private constructor() {
    logger.info('StrategicDecisionService initialized');
  }

  public static getInstance(): StrategicDecisionService {
    if (!StrategicDecisionService.instance) {
      StrategicDecisionService.instance = new StrategicDecisionService();
    }
    return StrategicDecisionService.instance;
  }

  // ============================================================================
  // DECISION MANAGEMENT
  // ============================================================================

  async createDecision(input: CreateDecisionInput, userId: string): Promise<StrategicDecision> {
    const span = tracer.startSpan('decisionService.createDecision');
    try {
      const validated = CreateDecisionInputSchema.parse(input);
      const now = new Date();
      const id = uuidv4();

      const decision: StrategicDecision = {
        id,
        title: validated.title,
        description: validated.description,
        type: validated.type,
        context: validated.context,
        urgency: validated.urgency,
        importance: validated.importance,
        status: 'PENDING',
        decisionMaker: validated.decisionMaker,
        stakeholders: validated.stakeholders,
        deadline: validated.deadline,
        options: [],
        criteria: [],
        analysis: {
          multiCriteriaAnalysis: [],
          sensitivityAnalysis: [],
          scenarioImpacts: [],
          tradeoffMatrix: [],
          recommendation: '',
          confidenceLevel: 0,
          keyConsiderations: [],
          risksAndMitigations: [],
        },
        linkedGoals: validated.linkedGoals,
        linkedAnalyses: validated.linkedAnalyses,
        supportingEvidence: [],
        createdAt: now,
        createdBy: userId,
        updatedAt: now,
        updatedBy: userId,
        version: 1,
      };

      decisionsStore.set(id, decision);
      logger.info({ decisionId: id, title: decision.title }, 'Strategic decision created');

      return decision;
    } catch (error) {
      logger.error({ error, input }, 'Failed to create strategic decision');
      throw error;
    } finally {
      span.end();
    }
  }

  async getDecision(id: string): Promise<StrategicDecision | null> {
    const decision = decisionsStore.get(id);
    if (!decision) return null;

    // Hydrate with options and criteria
    const options = await this.getOptionsForDecision(id);
    const criteria = await this.getCriteriaForDecision(id);

    return { ...decision, options, criteria };
  }

  async getAllDecisions(filters?: {
    status?: string;
    type?: DecisionType;
    decisionMaker?: string;
    urgency?: string;
  }): Promise<StrategicDecision[]> {
    let decisions = Array.from(decisionsStore.values());

    if (filters) {
      if (filters.status) decisions = decisions.filter((d) => d.status === filters.status);
      if (filters.type) decisions = decisions.filter((d) => d.type === filters.type);
      if (filters.decisionMaker) decisions = decisions.filter((d) => d.decisionMaker === filters.decisionMaker);
      if (filters.urgency) decisions = decisions.filter((d) => d.urgency === filters.urgency);
    }

    // Hydrate each decision
    const hydratedDecisions = await Promise.all(
      decisions.map(async (d) => {
        const options = await this.getOptionsForDecision(d.id);
        const criteria = await this.getCriteriaForDecision(d.id);
        return { ...d, options, criteria };
      }),
    );

    return hydratedDecisions.sort((a, b) => {
      const urgencyOrder = { IMMEDIATE: 0, URGENT: 1, NORMAL: 2, LOW: 3 };
      return urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
    });
  }

  async updateDecision(
    id: string,
    updates: Partial<StrategicDecision>,
    userId: string,
  ): Promise<StrategicDecision> {
    const existing = decisionsStore.get(id);
    if (!existing) {
      throw new Error(`Decision not found: ${id}`);
    }

    const now = new Date();
    const updated: StrategicDecision = {
      ...existing,
      ...updates,
      id: existing.id,
      updatedAt: now,
      updatedBy: userId,
      version: existing.version + 1,
    };

    decisionsStore.set(id, updated);
    logger.info({ decisionId: id }, 'Strategic decision updated');

    return updated;
  }

  async deleteDecision(id: string): Promise<boolean> {
    const decision = decisionsStore.get(id);
    if (!decision) return false;

    // Delete related options and criteria
    const options = await this.getOptionsForDecision(id);
    for (const opt of options) {
      optionsStore.delete(opt.id);
    }

    const criteria = await this.getCriteriaForDecision(id);
    for (const crit of criteria) {
      criteriaStore.delete(crit.id);
    }

    decisionsStore.delete(id);
    logger.info({ decisionId: id }, 'Strategic decision deleted');
    return true;
  }

  // ============================================================================
  // OPTION MANAGEMENT
  // ============================================================================

  async addOption(
    decisionId: string,
    input: {
      name: string;
      description: string;
      pros: string[];
      cons: string[];
      assumptions: string[];
      risks?: Omit<DecisionRisk, 'id'>[];
      resourceRequirements?: ResourceRequirement[];
      timeline: string;
      cost?: Partial<CostEstimate>;
      expectedOutcomes?: Omit<ExpectedOutcome, 'id'>[];
    },
    userId: string,
  ): Promise<DecisionOption> {
    const span = tracer.startSpan('decisionService.addOption');
    try {
      const decision = decisionsStore.get(decisionId);
      if (!decision) {
        throw new Error(`Decision not found: ${decisionId}`);
      }

      const id = uuidv4();
      const existingOptions = await this.getOptionsForDecision(decisionId);

      const option: DecisionOption = {
        id,
        decisionId,
        name: input.name,
        description: input.description,
        pros: input.pros,
        cons: input.cons,
        assumptions: input.assumptions,
        risks: input.risks || [],
        resourceRequirements: input.resourceRequirements || [],
        timeline: input.timeline,
        cost: {
          initialInvestment: input.cost?.initialInvestment || 0,
          ongoingCosts: input.cost?.ongoingCosts || 0,
          totalCostOfOwnership: input.cost?.totalCostOfOwnership || 0,
          currency: input.cost?.currency || 'USD',
          confidenceLevel: input.cost?.confidenceLevel || 0,
          assumptions: input.cost?.assumptions || [],
          breakdown: input.cost?.breakdown || [],
        },
        expectedOutcomes: input.expectedOutcomes || [],
        feasibilityScore: 0,
        alignmentScore: 0,
        overallScore: 0,
        rank: existingOptions.length + 1,
      };

      optionsStore.set(id, option);

      // Update decision status
      decision.status = 'IN_ANALYSIS';
      decision.updatedAt = new Date();
      decision.updatedBy = userId;
      decisionsStore.set(decisionId, decision);

      logger.info({ optionId: id, decisionId }, 'Decision option added');
      return option;
    } finally {
      span.end();
    }
  }

  async getOptionsForDecision(decisionId: string): Promise<DecisionOption[]> {
    return Array.from(optionsStore.values())
      .filter((opt) => opt.decisionId === decisionId)
      .sort((a, b) => a.rank - b.rank);
  }

  async updateOption(
    optionId: string,
    updates: Partial<DecisionOption>,
    userId: string,
  ): Promise<DecisionOption> {
    const option = optionsStore.get(optionId);
    if (!option) {
      throw new Error(`Option not found: ${optionId}`);
    }

    const updated: DecisionOption = {
      ...option,
      ...updates,
      id: option.id,
      decisionId: option.decisionId,
    };

    optionsStore.set(optionId, updated);
    return updated;
  }

  async deleteOption(optionId: string): Promise<boolean> {
    return optionsStore.delete(optionId);
  }

  // ============================================================================
  // CRITERIA MANAGEMENT
  // ============================================================================

  async addCriterion(
    decisionId: string,
    input: {
      name: string;
      description: string;
      weight: number;
      type: 'QUANTITATIVE' | 'QUALITATIVE';
      measurementMethod: string;
      minimumThreshold?: number;
      idealValue?: number;
      mustHave: boolean;
    },
  ): Promise<DecisionCriterion> {
    const span = tracer.startSpan('decisionService.addCriterion');
    try {
      const decision = decisionsStore.get(decisionId);
      if (!decision) {
        throw new Error(`Decision not found: ${decisionId}`);
      }

      const id = uuidv4();

      const criterion: DecisionCriterion = {
        id,
        ...input,
      };

      criteriaStore.set(id, criterion);

      // Link to decision
      decision.criteria.push(criterion);
      decisionsStore.set(decisionId, decision);

      logger.info({ criterionId: id, decisionId }, 'Decision criterion added');
      return criterion;
    } finally {
      span.end();
    }
  }

  async getCriteriaForDecision(decisionId: string): Promise<DecisionCriterion[]> {
    const decision = decisionsStore.get(decisionId);
    if (!decision) return [];
    return decision.criteria;
  }

  async updateCriterionWeight(criterionId: string, weight: number): Promise<DecisionCriterion> {
    const criterion = criteriaStore.get(criterionId);
    if (!criterion) {
      throw new Error(`Criterion not found: ${criterionId}`);
    }

    criterion.weight = weight;
    criteriaStore.set(criterionId, criterion);
    return criterion;
  }

  // ============================================================================
  // MULTI-CRITERIA ANALYSIS
  // ============================================================================

  async performMultiCriteriaAnalysis(
    decisionId: string,
    scores: Record<string, Record<string, number>>, // optionId -> criterionId -> score (0-10)
    userId: string,
  ): Promise<StrategicDecision> {
    const span = tracer.startSpan('decisionService.performMultiCriteriaAnalysis');
    try {
      const decision = await this.getDecision(decisionId);
      if (!decision) {
        throw new Error(`Decision not found: ${decisionId}`);
      }

      const options = decision.options;
      const criteria = decision.criteria;

      if (options.length === 0 || criteria.length === 0) {
        throw new Error('Decision must have at least one option and one criterion');
      }

      // Normalize weights to sum to 1
      const totalWeight = criteria.reduce((sum, c) => sum + c.weight, 0);
      const normalizedWeights = criteria.map((c) => c.weight / totalWeight);

      const results: MultiCriteriaResult[] = [];

      for (const option of options) {
        const criterionScores: Record<string, number> = {};
        let weightedScore = 0;

        criteria.forEach((criterion, index) => {
          const score = scores[option.id]?.[criterion.id] || 0;
          criterionScores[criterion.id] = score;
          weightedScore += score * normalizedWeights[index];
        });

        results.push({
          optionId: option.id,
          criterionScores,
          weightedScore,
          normalizedScore: weightedScore / 10, // Normalize to 0-1
        });
      }

      // Sort by weighted score and assign ranks
      results.sort((a, b) => b.weightedScore - a.weightedScore);

      // Update option scores and ranks
      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        const option = optionsStore.get(result.optionId);
        if (option) {
          option.overallScore = result.weightedScore;
          option.rank = i + 1;
          optionsStore.set(option.id, option);
        }
      }

      // Generate tradeoff matrix
      const tradeoffMatrix = this.generateTradeoffMatrix(options, criteria, scores);

      // Update decision analysis
      const updatedDecision = decisionsStore.get(decisionId)!;
      updatedDecision.analysis = {
        ...updatedDecision.analysis,
        multiCriteriaAnalysis: results,
        tradeoffMatrix,
        recommendation: results.length > 0
          ? `Based on multi-criteria analysis, "${options.find((o) => o.id === results[0].optionId)?.name}" is recommended with a score of ${results[0].weightedScore.toFixed(2)}`
          : '',
        confidenceLevel: this.calculateConfidenceLevel(criteria, scores),
      };
      updatedDecision.status = 'READY_FOR_DECISION';
      updatedDecision.updatedAt = new Date();
      updatedDecision.updatedBy = userId;
      updatedDecision.version++;

      decisionsStore.set(decisionId, updatedDecision);

      logger.info({ decisionId }, 'Multi-criteria analysis completed');
      return this.getDecision(decisionId) as Promise<StrategicDecision>;
    } finally {
      span.end();
    }
  }

  async performSensitivityAnalysis(
    decisionId: string,
    userId: string,
  ): Promise<SensitivityResult[]> {
    const span = tracer.startSpan('decisionService.performSensitivityAnalysis');
    try {
      const decision = await this.getDecision(decisionId);
      if (!decision) {
        throw new Error(`Decision not found: ${decisionId}`);
      }

      const results: SensitivityResult[] = [];
      const criteria = decision.criteria;
      const mcaResults = decision.analysis.multiCriteriaAnalysis;

      if (mcaResults.length === 0) {
        throw new Error('Multi-criteria analysis must be performed first');
      }

      const topOption = mcaResults[0];
      const secondOption = mcaResults[1];

      for (const criterion of criteria) {
        // Calculate weight range where ranking remains stable
        const currentWeight = criterion.weight;
        let lowerBound = 0;
        let upperBound = 1;

        if (secondOption) {
          const topScore = topOption.criterionScores[criterion.id] || 0;
          const secondScore = secondOption.criterionScores[criterion.id] || 0;

          if (topScore !== secondScore) {
            // Simplified sensitivity calculation
            const scoreDiff = topScore - secondScore;
            const breakEven = scoreDiff > 0 ? currentWeight * 0.5 : currentWeight * 1.5;
            lowerBound = Math.max(0, currentWeight - Math.abs(breakEven - currentWeight));
            upperBound = Math.min(1, currentWeight + Math.abs(breakEven - currentWeight));
          }
        }

        results.push({
          criterionId: criterion.id,
          weightRange: [lowerBound, upperBound],
          impactOnRanking: lowerBound === 0 && upperBound === 1
            ? 'No impact on ranking'
            : `Ranking stable within ${(lowerBound * 100).toFixed(0)}%-${(upperBound * 100).toFixed(0)}% weight`,
          breakEvenPoint: (lowerBound + upperBound) / 2,
          robustness: (upperBound - lowerBound) * 100,
        });
      }

      // Update decision
      const updatedDecision = decisionsStore.get(decisionId)!;
      updatedDecision.analysis.sensitivityAnalysis = results;
      updatedDecision.updatedAt = new Date();
      updatedDecision.updatedBy = userId;
      updatedDecision.version++;
      decisionsStore.set(decisionId, updatedDecision);

      logger.info({ decisionId }, 'Sensitivity analysis completed');
      return results;
    } finally {
      span.end();
    }
  }

  private generateTradeoffMatrix(
    options: DecisionOption[],
    criteria: DecisionCriterion[],
    scores: Record<string, Record<string, number>>,
  ): TradeoffEntry[] {
    const tradeoffs: TradeoffEntry[] = [];

    for (let i = 0; i < options.length; i++) {
      for (let j = i + 1; j < options.length; j++) {
        const optA = options[i];
        const optB = options[j];

        const advantagesA: string[] = [];
        const advantagesB: string[] = [];

        for (const criterion of criteria) {
          const scoreA = scores[optA.id]?.[criterion.id] || 0;
          const scoreB = scores[optB.id]?.[criterion.id] || 0;

          if (scoreA > scoreB) {
            advantagesA.push(`Better on ${criterion.name} (${scoreA} vs ${scoreB})`);
          } else if (scoreB > scoreA) {
            advantagesB.push(`Better on ${criterion.name} (${scoreB} vs ${scoreA})`);
          }
        }

        tradeoffs.push({
          optionA: optA.id,
          optionB: optB.id,
          advantagesA,
          advantagesB,
          keyTradeoff: advantagesA.length > advantagesB.length
            ? `${optA.name} generally outperforms ${optB.name}`
            : advantagesB.length > advantagesA.length
              ? `${optB.name} generally outperforms ${optA.name}`
              : 'Options are roughly equivalent',
        });
      }
    }

    return tradeoffs;
  }

  private calculateConfidenceLevel(
    criteria: DecisionCriterion[],
    scores: Record<string, Record<string, number>>,
  ): number {
    // Confidence based on:
    // 1. Number of criteria (more = higher confidence)
    // 2. Completeness of scores
    // 3. Spread of scores (more differentiation = higher confidence)

    const numCriteria = criteria.length;
    let totalScores = 0;
    let completedScores = 0;
    let scoreVariance = 0;

    const allScores: number[] = [];

    for (const optionScores of Object.values(scores)) {
      for (const criterionId of Object.keys(optionScores)) {
        totalScores++;
        if (optionScores[criterionId] !== undefined) {
          completedScores++;
          allScores.push(optionScores[criterionId]);
        }
      }
    }

    if (allScores.length > 0) {
      const mean = allScores.reduce((a, b) => a + b, 0) / allScores.length;
      scoreVariance = allScores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / allScores.length;
    }

    const criteriaFactor = Math.min(100, numCriteria * 20); // Max 100 with 5+ criteria
    const completionFactor = totalScores > 0 ? (completedScores / totalScores) * 100 : 0;
    const varianceFactor = Math.min(100, scoreVariance * 10); // Higher variance = more differentiation

    return Math.round((criteriaFactor + completionFactor + varianceFactor) / 3);
  }

  // ============================================================================
  // DECISION RECORDING
  // ============================================================================

  async recordDecision(
    decisionId: string,
    selectedOptionId: string,
    rationale: string,
    userId: string,
  ): Promise<StrategicDecision> {
    const span = tracer.startSpan('decisionService.recordDecision');
    try {
      const decision = decisionsStore.get(decisionId);
      if (!decision) {
        throw new Error(`Decision not found: ${decisionId}`);
      }

      const option = optionsStore.get(selectedOptionId);
      if (!option || option.decisionId !== decisionId) {
        throw new Error(`Option not found or doesn't belong to decision: ${selectedOptionId}`);
      }

      decision.selectedOption = selectedOptionId;
      decision.rationale = rationale;
      decision.decision = `Selected: ${option.name}`;
      decision.decisionDate = new Date();
      decision.status = 'DECIDED';
      decision.updatedAt = new Date();
      decision.updatedBy = userId;
      decision.version++;

      decisionsStore.set(decisionId, decision);

      logger.info({ decisionId, selectedOptionId }, 'Decision recorded');
      return this.getDecision(decisionId) as Promise<StrategicDecision>;
    } finally {
      span.end();
    }
  }

  async createImplementationPlan(
    decisionId: string,
    plan: Omit<DecisionImplementation, 'status' | 'progress' | 'issues' | 'lessons'>,
    userId: string,
  ): Promise<StrategicDecision> {
    const span = tracer.startSpan('decisionService.createImplementationPlan');
    try {
      const decision = decisionsStore.get(decisionId);
      if (!decision) {
        throw new Error(`Decision not found: ${decisionId}`);
      }

      if (decision.status !== 'DECIDED') {
        throw new Error('Decision must be decided before creating implementation plan');
      }

      decision.implementation = {
        ...plan,
        status: 'NOT_STARTED',
        progress: 0,
        issues: [],
        lessons: [],
      };
      decision.status = 'IMPLEMENTED';
      decision.updatedAt = new Date();
      decision.updatedBy = userId;
      decision.version++;

      decisionsStore.set(decisionId, decision);

      logger.info({ decisionId }, 'Implementation plan created');
      return this.getDecision(decisionId) as Promise<StrategicDecision>;
    } finally {
      span.end();
    }
  }

  async updateImplementationProgress(
    decisionId: string,
    stepIndex: number,
    status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'BLOCKED',
    notes?: string,
    userId?: string,
  ): Promise<StrategicDecision> {
    const decision = decisionsStore.get(decisionId);
    if (!decision || !decision.implementation) {
      throw new Error(`Decision or implementation not found: ${decisionId}`);
    }

    const step = decision.implementation.plan[stepIndex];
    if (!step) {
      throw new Error(`Implementation step not found: ${stepIndex}`);
    }

    step.status = status;
    step.notes = notes || step.notes;
    if (status === 'COMPLETED') {
      step.actualDate = new Date();
    }

    // Calculate progress
    const completedSteps = decision.implementation.plan.filter((s) => s.status === 'COMPLETED').length;
    decision.implementation.progress = Math.round((completedSteps / decision.implementation.plan.length) * 100);

    if (decision.implementation.progress === 100) {
      decision.implementation.status = 'COMPLETED';
      decision.implementation.actualEndDate = new Date();
    } else if (decision.implementation.plan.some((s) => s.status === 'BLOCKED')) {
      decision.implementation.status = 'BLOCKED';
    } else if (decision.implementation.plan.some((s) => s.status === 'IN_PROGRESS')) {
      decision.implementation.status = 'IN_PROGRESS';
    }

    decision.updatedAt = new Date();
    if (userId) decision.updatedBy = userId;
    decision.version++;

    decisionsStore.set(decisionId, decision);
    return this.getDecision(decisionId) as Promise<StrategicDecision>;
  }

  async recordOutcome(
    decisionId: string,
    outcome: Omit<DecisionOutcome, 'assessmentDate'>,
    userId: string,
  ): Promise<StrategicDecision> {
    const span = tracer.startSpan('decisionService.recordOutcome');
    try {
      const decision = decisionsStore.get(decisionId);
      if (!decision) {
        throw new Error(`Decision not found: ${decisionId}`);
      }

      decision.outcome = {
        ...outcome,
        assessmentDate: new Date(),
      };
      decision.status = 'REVIEWED';
      decision.updatedAt = new Date();
      decision.updatedBy = userId;
      decision.version++;

      decisionsStore.set(decisionId, decision);

      logger.info({ decisionId }, 'Decision outcome recorded');
      return this.getDecision(decisionId) as Promise<StrategicDecision>;
    } finally {
      span.end();
    }
  }

  // ============================================================================
  // DECISION INSIGHTS
  // ============================================================================

  async getDecisionInsights(): Promise<{
    totalDecisions: number;
    pendingDecisions: number;
    overdueDecisions: number;
    decidedThisMonth: number;
    averageTimeToDecision: number;
    decisionsByType: Record<string, number>;
    decisionsByUrgency: Record<string, number>;
    outcomeSuccessRate: number;
  }> {
    const span = tracer.startSpan('decisionService.getDecisionInsights');
    try {
      const decisions = Array.from(decisionsStore.values());
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const pendingDecisions = decisions.filter((d) =>
        ['PENDING', 'IN_ANALYSIS', 'READY_FOR_DECISION'].includes(d.status),
      );

      const overdueDecisions = pendingDecisions.filter((d) => d.deadline < now);

      const decidedThisMonth = decisions.filter(
        (d) => d.decisionDate && d.decisionDate >= startOfMonth,
      );

      const decisionsWithTime = decisions.filter((d) => d.decisionDate);
      const avgTimeToDecision =
        decisionsWithTime.length > 0
          ? decisionsWithTime.reduce((sum, d) => {
              const time = d.decisionDate!.getTime() - d.createdAt.getTime();
              return sum + time / (1000 * 60 * 60 * 24); // Convert to days
            }, 0) / decisionsWithTime.length
          : 0;

      const decisionsByType = decisions.reduce(
        (acc, d) => {
          acc[d.type] = (acc[d.type] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      );

      const decisionsByUrgency = decisions.reduce(
        (acc, d) => {
          acc[d.urgency] = (acc[d.urgency] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      );

      const reviewedDecisions = decisions.filter((d) => d.outcome);
      const successfulDecisions = reviewedDecisions.filter((d) => d.outcome!.overallSuccess >= 70);
      const outcomeSuccessRate =
        reviewedDecisions.length > 0
          ? (successfulDecisions.length / reviewedDecisions.length) * 100
          : 0;

      return {
        totalDecisions: decisions.length,
        pendingDecisions: pendingDecisions.length,
        overdueDecisions: overdueDecisions.length,
        decidedThisMonth: decidedThisMonth.length,
        averageTimeToDecision: Math.round(avgTimeToDecision * 10) / 10,
        decisionsByType,
        decisionsByUrgency,
        outcomeSuccessRate: Math.round(outcomeSuccessRate),
      };
    } finally {
      span.end();
    }
  }
}

export const strategicDecisionService = StrategicDecisionService.getInstance();
