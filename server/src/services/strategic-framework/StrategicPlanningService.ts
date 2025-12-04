/**
 * Strategic Planning Service
 *
 * Provides comprehensive strategic planning capabilities including:
 * - Goal management and hierarchy
 * - Objective setting and tracking (OKRs)
 * - Initiative management
 * - Milestone and deliverable tracking
 * - Progress calculation and health assessment
 */

import { v4 as uuidv4 } from 'uuid';
import logger from '../../utils/logger.js';
import { getTracer } from '../../otel.js';
import {
  StrategicGoal,
  StrategicObjective,
  KeyResult,
  Initiative,
  Milestone,
  Deliverable,
  SuccessCriterion,
  StrategicStatus,
  StrategicPriority,
  TimeHorizon,
  BudgetAllocation,
  ImpactAssessment,
  CreateGoalInput,
  UpdateGoalInput,
  CreateObjectiveInput,
  CreateInitiativeInput,
  CreateGoalInputSchema,
  UpdateGoalInputSchema,
  CreateObjectiveInputSchema,
  CreateInitiativeInputSchema,
  InitiativeRisk,
  InitiativeDependency,
  MetricDataPoint,
} from './types.js';

const tracer = getTracer('strategic-planning-service');

// In-memory storage (in production, this would be backed by PostgreSQL/Neo4j)
const goalsStore = new Map<string, StrategicGoal>();
const objectivesStore = new Map<string, StrategicObjective>();
const keyResultsStore = new Map<string, KeyResult>();
const initiativesStore = new Map<string, Initiative>();
const milestonesStore = new Map<string, Milestone>();
const deliverablesStore = new Map<string, Deliverable>();

export class StrategicPlanningService {
  private static instance: StrategicPlanningService;

  private constructor() {
    logger.info('StrategicPlanningService initialized');
  }

  public static getInstance(): StrategicPlanningService {
    if (!StrategicPlanningService.instance) {
      StrategicPlanningService.instance = new StrategicPlanningService();
    }
    return StrategicPlanningService.instance;
  }

  // ============================================================================
  // GOAL MANAGEMENT
  // ============================================================================

  async createGoal(input: CreateGoalInput, userId: string): Promise<StrategicGoal> {
    const span = tracer.startSpan('strategicPlanning.createGoal');
    try {
      const validated = CreateGoalInputSchema.parse(input);
      const now = new Date();
      const id = uuidv4();

      const goal: StrategicGoal = {
        id,
        ...validated,
        vision: validated.vision || '',
        missionAlignment: validated.missionAlignment || '',
        status: StrategicStatus.DRAFT,
        objectives: [],
        successCriteria: [],
        dependencies: [],
        risks: [],
        progress: 0,
        healthScore: 100,
        lastAssessmentDate: now,
        createdAt: now,
        createdBy: userId,
        updatedAt: now,
        updatedBy: userId,
        version: 1,
      };

      goalsStore.set(id, goal);
      logger.info({ goalId: id, title: goal.title }, 'Strategic goal created');

      return goal;
    } catch (error) {
      logger.error({ error, input }, 'Failed to create strategic goal');
      throw error;
    } finally {
      span.end();
    }
  }

  async updateGoal(input: UpdateGoalInput, userId: string): Promise<StrategicGoal> {
    const span = tracer.startSpan('strategicPlanning.updateGoal');
    try {
      const validated = UpdateGoalInputSchema.parse(input);
      const existing = goalsStore.get(validated.id);

      if (!existing) {
        throw new Error(`Goal not found: ${validated.id}`);
      }

      const now = new Date();
      const updated: StrategicGoal = {
        ...existing,
        ...validated,
        updatedAt: now,
        updatedBy: userId,
        version: existing.version + 1,
      };

      // Recalculate health score based on status and progress
      updated.healthScore = this.calculateGoalHealthScore(updated);
      updated.lastAssessmentDate = now;

      goalsStore.set(updated.id, updated);
      logger.info({ goalId: updated.id }, 'Strategic goal updated');

      return updated;
    } catch (error) {
      logger.error({ error, input }, 'Failed to update strategic goal');
      throw error;
    } finally {
      span.end();
    }
  }

  async getGoal(id: string): Promise<StrategicGoal | null> {
    const span = tracer.startSpan('strategicPlanning.getGoal');
    try {
      const goal = goalsStore.get(id);
      if (!goal) return null;

      // Hydrate with objectives
      const objectives = await this.getObjectivesForGoal(id);
      return { ...goal, objectives };
    } finally {
      span.end();
    }
  }

  async getAllGoals(filters?: {
    status?: StrategicStatus;
    priority?: StrategicPriority;
    timeHorizon?: TimeHorizon;
    owner?: string;
  }): Promise<StrategicGoal[]> {
    const span = tracer.startSpan('strategicPlanning.getAllGoals');
    try {
      let goals = Array.from(goalsStore.values());

      if (filters) {
        if (filters.status) {
          goals = goals.filter((g) => g.status === filters.status);
        }
        if (filters.priority) {
          goals = goals.filter((g) => g.priority === filters.priority);
        }
        if (filters.timeHorizon) {
          goals = goals.filter((g) => g.timeHorizon === filters.timeHorizon);
        }
        if (filters.owner) {
          goals = goals.filter((g) => g.owner === filters.owner);
        }
      }

      // Hydrate each goal with objectives
      const hydratedGoals = await Promise.all(
        goals.map(async (goal) => {
          const objectives = await this.getObjectivesForGoal(goal.id);
          return { ...goal, objectives };
        }),
      );

      return hydratedGoals.sort((a, b) => {
        const priorityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      });
    } finally {
      span.end();
    }
  }

  async deleteGoal(id: string): Promise<boolean> {
    const span = tracer.startSpan('strategicPlanning.deleteGoal');
    try {
      const goal = goalsStore.get(id);
      if (!goal) return false;

      // Delete all related objectives
      const objectives = await this.getObjectivesForGoal(id);
      for (const obj of objectives) {
        await this.deleteObjective(obj.id);
      }

      goalsStore.delete(id);
      logger.info({ goalId: id }, 'Strategic goal deleted');
      return true;
    } finally {
      span.end();
    }
  }

  async activateGoal(id: string, userId: string): Promise<StrategicGoal> {
    return this.updateGoal({ id, status: StrategicStatus.ACTIVE }, userId);
  }

  async completeGoal(id: string, userId: string): Promise<StrategicGoal> {
    return this.updateGoal({ id, status: StrategicStatus.COMPLETED }, userId);
  }

  // ============================================================================
  // OBJECTIVE MANAGEMENT
  // ============================================================================

  async createObjective(input: CreateObjectiveInput, userId: string): Promise<StrategicObjective> {
    const span = tracer.startSpan('strategicPlanning.createObjective');
    try {
      const validated = CreateObjectiveInputSchema.parse(input);

      // Verify goal exists
      const goal = goalsStore.get(validated.goalId);
      if (!goal) {
        throw new Error(`Goal not found: ${validated.goalId}`);
      }

      const now = new Date();
      const id = uuidv4();

      const objective: StrategicObjective = {
        id,
        ...validated,
        keyResults: [],
        initiatives: [],
        status: StrategicStatus.DRAFT,
        progress: 0,
        createdAt: now,
        createdBy: userId,
        updatedAt: now,
        updatedBy: userId,
        version: 1,
      };

      objectivesStore.set(id, objective);
      logger.info({ objectiveId: id, goalId: validated.goalId }, 'Strategic objective created');

      // Update goal progress
      await this.recalculateGoalProgress(validated.goalId);

      return objective;
    } catch (error) {
      logger.error({ error, input }, 'Failed to create strategic objective');
      throw error;
    } finally {
      span.end();
    }
  }

  async getObjective(id: string): Promise<StrategicObjective | null> {
    const span = tracer.startSpan('strategicPlanning.getObjective');
    try {
      const objective = objectivesStore.get(id);
      if (!objective) return null;

      // Hydrate with key results and initiatives
      const keyResults = await this.getKeyResultsForObjective(id);
      const initiatives = await this.getInitiativesForObjective(id);

      return { ...objective, keyResults, initiatives };
    } finally {
      span.end();
    }
  }

  async getObjectivesForGoal(goalId: string): Promise<StrategicObjective[]> {
    const span = tracer.startSpan('strategicPlanning.getObjectivesForGoal');
    try {
      const objectives = Array.from(objectivesStore.values()).filter(
        (obj) => obj.goalId === goalId,
      );

      // Hydrate each objective
      const hydratedObjectives = await Promise.all(
        objectives.map(async (obj) => {
          const keyResults = await this.getKeyResultsForObjective(obj.id);
          const initiatives = await this.getInitiativesForObjective(obj.id);
          return { ...obj, keyResults, initiatives };
        }),
      );

      return hydratedObjectives.sort((a, b) => {
        const priorityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      });
    } finally {
      span.end();
    }
  }

  async updateObjective(
    id: string,
    updates: Partial<StrategicObjective>,
    userId: string,
  ): Promise<StrategicObjective> {
    const span = tracer.startSpan('strategicPlanning.updateObjective');
    try {
      const existing = objectivesStore.get(id);
      if (!existing) {
        throw new Error(`Objective not found: ${id}`);
      }

      const now = new Date();
      const updated: StrategicObjective = {
        ...existing,
        ...updates,
        id: existing.id,
        goalId: existing.goalId,
        updatedAt: now,
        updatedBy: userId,
        version: existing.version + 1,
      };

      objectivesStore.set(id, updated);
      logger.info({ objectiveId: id }, 'Strategic objective updated');

      // Recalculate goal progress
      await this.recalculateGoalProgress(existing.goalId);

      return updated;
    } finally {
      span.end();
    }
  }

  async deleteObjective(id: string): Promise<boolean> {
    const span = tracer.startSpan('strategicPlanning.deleteObjective');
    try {
      const objective = objectivesStore.get(id);
      if (!objective) return false;

      // Delete all related key results
      const keyResults = await this.getKeyResultsForObjective(id);
      for (const kr of keyResults) {
        keyResultsStore.delete(kr.id);
      }

      // Delete all related initiatives
      const initiatives = await this.getInitiativesForObjective(id);
      for (const init of initiatives) {
        await this.deleteInitiative(init.id);
      }

      objectivesStore.delete(id);

      // Recalculate goal progress
      await this.recalculateGoalProgress(objective.goalId);

      logger.info({ objectiveId: id }, 'Strategic objective deleted');
      return true;
    } finally {
      span.end();
    }
  }

  // ============================================================================
  // KEY RESULT MANAGEMENT
  // ============================================================================

  async createKeyResult(
    objectiveId: string,
    input: {
      title: string;
      description: string;
      baseline: number;
      target: number;
      unit: string;
      frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY';
      dataSource: string;
      owner: string;
    },
    userId: string,
  ): Promise<KeyResult> {
    const span = tracer.startSpan('strategicPlanning.createKeyResult');
    try {
      const objective = objectivesStore.get(objectiveId);
      if (!objective) {
        throw new Error(`Objective not found: ${objectiveId}`);
      }

      const now = new Date();
      const id = uuidv4();

      const keyResult: KeyResult = {
        id,
        objectiveId,
        ...input,
        metricType: 'OKR',
        current: input.baseline,
        status: StrategicStatus.ACTIVE,
        trend: 'STABLE',
        confidence: 100,
        history: [{ timestamp: now, value: input.baseline }],
        createdAt: now,
        createdBy: userId,
        updatedAt: now,
        updatedBy: userId,
        version: 1,
      };

      keyResultsStore.set(id, keyResult);
      logger.info({ keyResultId: id, objectiveId }, 'Key result created');

      // Update objective progress
      await this.recalculateObjectiveProgress(objectiveId);

      return keyResult;
    } finally {
      span.end();
    }
  }

  async updateKeyResultValue(
    id: string,
    value: number,
    note: string,
    userId: string,
  ): Promise<KeyResult> {
    const span = tracer.startSpan('strategicPlanning.updateKeyResultValue');
    try {
      const keyResult = keyResultsStore.get(id);
      if (!keyResult) {
        throw new Error(`Key result not found: ${id}`);
      }

      const now = new Date();
      const previousValue = keyResult.current;

      // Determine trend
      let trend: 'IMPROVING' | 'STABLE' | 'DECLINING' = 'STABLE';
      const improvement = value - previousValue;
      const targetDirection = keyResult.target > keyResult.baseline ? 1 : -1;
      if (improvement * targetDirection > 0) {
        trend = 'IMPROVING';
      } else if (improvement * targetDirection < 0) {
        trend = 'DECLINING';
      }

      const updated: KeyResult = {
        ...keyResult,
        current: value,
        trend,
        history: [
          ...keyResult.history,
          { timestamp: now, value, note },
        ],
        updatedAt: now,
        updatedBy: userId,
        version: keyResult.version + 1,
      };

      keyResultsStore.set(id, updated);

      // Update objective progress
      await this.recalculateObjectiveProgress(keyResult.objectiveId);

      logger.info({ keyResultId: id, value, trend }, 'Key result value updated');
      return updated;
    } finally {
      span.end();
    }
  }

  async getKeyResultsForObjective(objectiveId: string): Promise<KeyResult[]> {
    return Array.from(keyResultsStore.values()).filter(
      (kr) => kr.objectiveId === objectiveId,
    );
  }

  // ============================================================================
  // INITIATIVE MANAGEMENT
  // ============================================================================

  async createInitiative(input: CreateInitiativeInput, userId: string): Promise<Initiative> {
    const span = tracer.startSpan('strategicPlanning.createInitiative');
    try {
      const validated = CreateInitiativeInputSchema.parse(input);

      // Verify objective exists
      const objective = objectivesStore.get(validated.objectiveId);
      if (!objective) {
        throw new Error(`Objective not found: ${validated.objectiveId}`);
      }

      const now = new Date();
      const id = uuidv4();

      const budget: BudgetAllocation = validated.budget
        ? {
            total: validated.budget.total,
            currency: validated.budget.currency,
            allocated: 0,
            spent: 0,
            committed: 0,
            forecast: validated.budget.total,
            categories: [],
          }
        : {
            total: 0,
            currency: 'USD',
            allocated: 0,
            spent: 0,
            committed: 0,
            forecast: 0,
            categories: [],
          };

      const initiative: Initiative = {
        id,
        objectiveId: validated.objectiveId,
        title: validated.title,
        description: validated.description,
        rationale: validated.rationale,
        priority: validated.priority,
        status: StrategicStatus.DRAFT,
        owner: validated.owner,
        team: validated.team,
        startDate: validated.startDate,
        targetDate: validated.targetDate,
        budget,
        milestones: [],
        deliverables: [],
        dependencies: [],
        risks: [],
        progress: 0,
        effortEstimate: validated.effortEstimate || 0,
        actualEffort: 0,
        impactAssessment: {
          strategicAlignment: 0,
          valueCreation: 0,
          riskReduction: 0,
          capabilityEnhancement: 0,
          resourceEfficiency: 0,
          overallScore: 0,
          narrative: '',
        },
        tags: validated.tags,
        labels: validated.labels,
        createdAt: now,
        createdBy: userId,
        updatedAt: now,
        updatedBy: userId,
        version: 1,
      };

      initiativesStore.set(id, initiative);
      logger.info({ initiativeId: id, objectiveId: validated.objectiveId }, 'Initiative created');

      // Update objective progress
      await this.recalculateObjectiveProgress(validated.objectiveId);

      return initiative;
    } catch (error) {
      logger.error({ error, input }, 'Failed to create initiative');
      throw error;
    } finally {
      span.end();
    }
  }

  async getInitiative(id: string): Promise<Initiative | null> {
    const span = tracer.startSpan('strategicPlanning.getInitiative');
    try {
      const initiative = initiativesStore.get(id);
      if (!initiative) return null;

      // Hydrate with milestones and deliverables
      const milestones = await this.getMilestonesForInitiative(id);
      const deliverables = await this.getDeliverablesForInitiative(id);

      return { ...initiative, milestones, deliverables };
    } finally {
      span.end();
    }
  }

  async getInitiativesForObjective(objectiveId: string): Promise<Initiative[]> {
    const initiatives = Array.from(initiativesStore.values()).filter(
      (init) => init.objectiveId === objectiveId,
    );

    return Promise.all(
      initiatives.map(async (init) => {
        const milestones = await this.getMilestonesForInitiative(init.id);
        const deliverables = await this.getDeliverablesForInitiative(init.id);
        return { ...init, milestones, deliverables };
      }),
    );
  }

  async updateInitiative(
    id: string,
    updates: Partial<Initiative>,
    userId: string,
  ): Promise<Initiative> {
    const span = tracer.startSpan('strategicPlanning.updateInitiative');
    try {
      const existing = initiativesStore.get(id);
      if (!existing) {
        throw new Error(`Initiative not found: ${id}`);
      }

      const now = new Date();
      const updated: Initiative = {
        ...existing,
        ...updates,
        id: existing.id,
        objectiveId: existing.objectiveId,
        updatedAt: now,
        updatedBy: userId,
        version: existing.version + 1,
      };

      initiativesStore.set(id, updated);
      logger.info({ initiativeId: id }, 'Initiative updated');

      // Update objective progress
      await this.recalculateObjectiveProgress(existing.objectiveId);

      return updated;
    } finally {
      span.end();
    }
  }

  async deleteInitiative(id: string): Promise<boolean> {
    const span = tracer.startSpan('strategicPlanning.deleteInitiative');
    try {
      const initiative = initiativesStore.get(id);
      if (!initiative) return false;

      // Delete all related milestones
      const milestones = await this.getMilestonesForInitiative(id);
      for (const ms of milestones) {
        milestonesStore.delete(ms.id);
      }

      // Delete all related deliverables
      const deliverables = await this.getDeliverablesForInitiative(id);
      for (const del of deliverables) {
        deliverablesStore.delete(del.id);
      }

      initiativesStore.delete(id);

      // Update objective progress
      await this.recalculateObjectiveProgress(initiative.objectiveId);

      logger.info({ initiativeId: id }, 'Initiative deleted');
      return true;
    } finally {
      span.end();
    }
  }

  async addInitiativeRisk(
    initiativeId: string,
    risk: Omit<InitiativeRisk, 'id' | 'initiativeId'>,
    userId: string,
  ): Promise<Initiative> {
    const initiative = initiativesStore.get(initiativeId);
    if (!initiative) {
      throw new Error(`Initiative not found: ${initiativeId}`);
    }

    const riskId = uuidv4();
    const newRisk: InitiativeRisk = {
      ...risk,
      id: riskId,
      initiativeId,
      riskScore: risk.probability * this.impactToScore(risk.impact),
    };

    return this.updateInitiative(
      initiativeId,
      { risks: [...initiative.risks, newRisk] },
      userId,
    );
  }

  async addInitiativeDependency(
    initiativeId: string,
    dependency: Omit<InitiativeDependency, 'status'>,
    userId: string,
  ): Promise<Initiative> {
    const initiative = initiativesStore.get(initiativeId);
    if (!initiative) {
      throw new Error(`Initiative not found: ${initiativeId}`);
    }

    const newDependency: InitiativeDependency = {
      ...dependency,
      status: 'PENDING',
    };

    return this.updateInitiative(
      initiativeId,
      { dependencies: [...initiative.dependencies, newDependency] },
      userId,
    );
  }

  // ============================================================================
  // MILESTONE MANAGEMENT
  // ============================================================================

  async createMilestone(
    initiativeId: string,
    input: {
      title: string;
      description: string;
      targetDate: Date;
      deliverables: string[];
    },
  ): Promise<Milestone> {
    const span = tracer.startSpan('strategicPlanning.createMilestone');
    try {
      const initiative = initiativesStore.get(initiativeId);
      if (!initiative) {
        throw new Error(`Initiative not found: ${initiativeId}`);
      }

      const id = uuidv4();
      const milestone: Milestone = {
        id,
        initiativeId,
        ...input,
        status: 'PENDING',
        blockers: [],
        notes: '',
      };

      milestonesStore.set(id, milestone);
      logger.info({ milestoneId: id, initiativeId }, 'Milestone created');

      // Update initiative progress
      await this.recalculateInitiativeProgress(initiativeId);

      return milestone;
    } finally {
      span.end();
    }
  }

  async updateMilestoneStatus(
    id: string,
    status: Milestone['status'],
    notes?: string,
  ): Promise<Milestone> {
    const milestone = milestonesStore.get(id);
    if (!milestone) {
      throw new Error(`Milestone not found: ${id}`);
    }

    const updated: Milestone = {
      ...milestone,
      status,
      actualDate: status === 'COMPLETED' ? new Date() : milestone.actualDate,
      notes: notes || milestone.notes,
    };

    milestonesStore.set(id, updated);

    // Update initiative progress
    await this.recalculateInitiativeProgress(milestone.initiativeId);

    return updated;
  }

  async getMilestonesForInitiative(initiativeId: string): Promise<Milestone[]> {
    return Array.from(milestonesStore.values())
      .filter((ms) => ms.initiativeId === initiativeId)
      .sort((a, b) => a.targetDate.getTime() - b.targetDate.getTime());
  }

  // ============================================================================
  // DELIVERABLE MANAGEMENT
  // ============================================================================

  async createDeliverable(
    initiativeId: string,
    input: {
      title: string;
      description: string;
      type: Deliverable['type'];
      owner: string;
      dueDate: Date;
      acceptanceCriteria: string[];
    },
  ): Promise<Deliverable> {
    const span = tracer.startSpan('strategicPlanning.createDeliverable');
    try {
      const initiative = initiativesStore.get(initiativeId);
      if (!initiative) {
        throw new Error(`Initiative not found: ${initiativeId}`);
      }

      const id = uuidv4();
      const deliverable: Deliverable = {
        id,
        initiativeId,
        ...input,
        status: 'NOT_STARTED',
        artifacts: [],
      };

      deliverablesStore.set(id, deliverable);
      logger.info({ deliverableId: id, initiativeId }, 'Deliverable created');

      return deliverable;
    } finally {
      span.end();
    }
  }

  async updateDeliverableStatus(
    id: string,
    status: Deliverable['status'],
  ): Promise<Deliverable> {
    const deliverable = deliverablesStore.get(id);
    if (!deliverable) {
      throw new Error(`Deliverable not found: ${id}`);
    }

    const updated: Deliverable = {
      ...deliverable,
      status,
      completedDate: status === 'COMPLETED' ? new Date() : deliverable.completedDate,
    };

    deliverablesStore.set(id, updated);
    return updated;
  }

  async getDeliverablesForInitiative(initiativeId: string): Promise<Deliverable[]> {
    return Array.from(deliverablesStore.values())
      .filter((del) => del.initiativeId === initiativeId)
      .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
  }

  // ============================================================================
  // SUCCESS CRITERIA MANAGEMENT
  // ============================================================================

  async addSuccessCriterion(
    goalId: string,
    input: {
      criterion: string;
      measurementMethod: string;
      threshold: string;
    },
    userId: string,
  ): Promise<StrategicGoal> {
    const goal = goalsStore.get(goalId);
    if (!goal) {
      throw new Error(`Goal not found: ${goalId}`);
    }

    const criterion: SuccessCriterion = {
      id: uuidv4(),
      goalId,
      ...input,
      achieved: false,
      evidence: '',
      assessmentDate: new Date(),
    };

    return this.updateGoal(
      {
        id: goalId,
      },
      userId,
    ).then(() => {
      const updatedGoal = goalsStore.get(goalId)!;
      updatedGoal.successCriteria.push(criterion);
      goalsStore.set(goalId, updatedGoal);
      return updatedGoal;
    });
  }

  async assessSuccessCriterion(
    goalId: string,
    criterionId: string,
    achieved: boolean,
    evidence: string,
    userId: string,
  ): Promise<StrategicGoal> {
    const goal = goalsStore.get(goalId);
    if (!goal) {
      throw new Error(`Goal not found: ${goalId}`);
    }

    const criterionIndex = goal.successCriteria.findIndex((c) => c.id === criterionId);
    if (criterionIndex === -1) {
      throw new Error(`Success criterion not found: ${criterionId}`);
    }

    goal.successCriteria[criterionIndex] = {
      ...goal.successCriteria[criterionIndex],
      achieved,
      evidence,
      assessmentDate: new Date(),
    };

    return this.updateGoal({ id: goalId }, userId);
  }

  // ============================================================================
  // PROGRESS & HEALTH CALCULATION
  // ============================================================================

  private async recalculateGoalProgress(goalId: string): Promise<void> {
    const goal = goalsStore.get(goalId);
    if (!goal) return;

    const objectives = await this.getObjectivesForGoal(goalId);
    if (objectives.length === 0) {
      goal.progress = 0;
    } else {
      // Weighted average based on priority
      const weights = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
      let totalWeight = 0;
      let weightedProgress = 0;

      for (const obj of objectives) {
        const weight = weights[obj.priority];
        totalWeight += weight;
        weightedProgress += obj.progress * weight;
      }

      goal.progress = totalWeight > 0 ? Math.round(weightedProgress / totalWeight) : 0;
    }

    goal.healthScore = this.calculateGoalHealthScore(goal);
    goal.lastAssessmentDate = new Date();
    goalsStore.set(goalId, goal);
  }

  private async recalculateObjectiveProgress(objectiveId: string): Promise<void> {
    const objective = objectivesStore.get(objectiveId);
    if (!objective) return;

    const keyResults = await this.getKeyResultsForObjective(objectiveId);
    const initiatives = await this.getInitiativesForObjective(objectiveId);

    // Calculate progress from key results (60% weight) and initiatives (40% weight)
    let krProgress = 0;
    if (keyResults.length > 0) {
      krProgress = keyResults.reduce((sum, kr) => {
        const range = Math.abs(kr.target - kr.baseline);
        const progress = range > 0
          ? Math.min(100, Math.abs(kr.current - kr.baseline) / range * 100)
          : 0;
        return sum + progress;
      }, 0) / keyResults.length;
    }

    let initProgress = 0;
    if (initiatives.length > 0) {
      initProgress = initiatives.reduce((sum, init) => sum + init.progress, 0) / initiatives.length;
    }

    objective.progress = Math.round(
      keyResults.length > 0 && initiatives.length > 0
        ? krProgress * 0.6 + initProgress * 0.4
        : keyResults.length > 0
          ? krProgress
          : initProgress,
    );

    objectivesStore.set(objectiveId, objective);

    // Propagate to goal
    await this.recalculateGoalProgress(objective.goalId);
  }

  private async recalculateInitiativeProgress(initiativeId: string): Promise<void> {
    const initiative = initiativesStore.get(initiativeId);
    if (!initiative) return;

    const milestones = await this.getMilestonesForInitiative(initiativeId);
    if (milestones.length === 0) {
      initiative.progress = 0;
    } else {
      const completed = milestones.filter((ms) => ms.status === 'COMPLETED').length;
      initiative.progress = Math.round((completed / milestones.length) * 100);
    }

    initiativesStore.set(initiativeId, initiative);

    // Propagate to objective
    await this.recalculateObjectiveProgress(initiative.objectiveId);
  }

  private calculateGoalHealthScore(goal: StrategicGoal): number {
    let score = 100;

    // Status penalty
    if (goal.status === StrategicStatus.AT_RISK) score -= 30;
    if (goal.status === StrategicStatus.ON_HOLD) score -= 20;

    // Progress vs time penalty
    const now = new Date();
    const totalDuration = goal.targetDate.getTime() - goal.startDate.getTime();
    const elapsed = now.getTime() - goal.startDate.getTime();
    const expectedProgress = Math.min(100, (elapsed / totalDuration) * 100);

    if (goal.progress < expectedProgress - 20) {
      score -= 25; // Significantly behind
    } else if (goal.progress < expectedProgress - 10) {
      score -= 15; // Moderately behind
    } else if (goal.progress < expectedProgress - 5) {
      score -= 5; // Slightly behind
    }

    // Risk penalty (simplified - in production, would analyze actual risks)
    if (goal.risks.length > 5) score -= 10;
    if (goal.risks.length > 10) score -= 10;

    return Math.max(0, Math.min(100, score));
  }

  private impactToScore(impact: string): number {
    const scores: Record<string, number> = {
      TRANSFORMATIONAL: 5,
      SIGNIFICANT: 4,
      MODERATE: 3,
      MINOR: 2,
      NEGLIGIBLE: 1,
    };
    return scores[impact] || 3;
  }

  // ============================================================================
  // STRATEGIC INSIGHTS
  // ============================================================================

  async getStrategicOverview(): Promise<{
    totalGoals: number;
    activeGoals: number;
    completedGoals: number;
    atRiskGoals: number;
    averageProgress: number;
    averageHealthScore: number;
    goalsByPriority: Record<string, number>;
    goalsByTimeHorizon: Record<string, number>;
    upcomingMilestones: Milestone[];
    blockedInitiatives: Initiative[];
  }> {
    const span = tracer.startSpan('strategicPlanning.getStrategicOverview');
    try {
      const goals = Array.from(goalsStore.values());
      const initiatives = Array.from(initiativesStore.values());
      const milestones = Array.from(milestonesStore.values());

      const activeGoals = goals.filter((g) => g.status === StrategicStatus.ACTIVE);
      const completedGoals = goals.filter((g) => g.status === StrategicStatus.COMPLETED);
      const atRiskGoals = goals.filter((g) => g.status === StrategicStatus.AT_RISK);

      const goalsByPriority = goals.reduce(
        (acc, g) => {
          acc[g.priority] = (acc[g.priority] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      );

      const goalsByTimeHorizon = goals.reduce(
        (acc, g) => {
          acc[g.timeHorizon] = (acc[g.timeHorizon] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      );

      const now = new Date();
      const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      const upcomingMilestones = milestones
        .filter(
          (ms) =>
            ms.status !== 'COMPLETED' &&
            ms.targetDate <= thirtyDaysFromNow &&
            ms.targetDate >= now,
        )
        .sort((a, b) => a.targetDate.getTime() - b.targetDate.getTime())
        .slice(0, 10);

      const blockedInitiatives = initiatives.filter(
        (init) =>
          init.status === StrategicStatus.ACTIVE &&
          init.dependencies.some((d) => d.status === 'BLOCKED'),
      );

      return {
        totalGoals: goals.length,
        activeGoals: activeGoals.length,
        completedGoals: completedGoals.length,
        atRiskGoals: atRiskGoals.length,
        averageProgress:
          goals.length > 0
            ? Math.round(goals.reduce((sum, g) => sum + g.progress, 0) / goals.length)
            : 0,
        averageHealthScore:
          goals.length > 0
            ? Math.round(goals.reduce((sum, g) => sum + g.healthScore, 0) / goals.length)
            : 0,
        goalsByPriority,
        goalsByTimeHorizon,
        upcomingMilestones,
        blockedInitiatives,
      };
    } finally {
      span.end();
    }
  }

  async getGoalHierarchy(goalId: string): Promise<{
    goal: StrategicGoal;
    objectives: Array<{
      objective: StrategicObjective;
      keyResults: KeyResult[];
      initiatives: Array<{
        initiative: Initiative;
        milestones: Milestone[];
        deliverables: Deliverable[];
      }>;
    }>;
  } | null> {
    const span = tracer.startSpan('strategicPlanning.getGoalHierarchy');
    try {
      const goal = await this.getGoal(goalId);
      if (!goal) return null;

      const objectives = await this.getObjectivesForGoal(goalId);

      const hierarchy = await Promise.all(
        objectives.map(async (objective) => {
          const keyResults = await this.getKeyResultsForObjective(objective.id);
          const initiatives = await this.getInitiativesForObjective(objective.id);

          const initiativeDetails = await Promise.all(
            initiatives.map(async (initiative) => {
              const milestones = await this.getMilestonesForInitiative(initiative.id);
              const deliverables = await this.getDeliverablesForInitiative(initiative.id);
              return { initiative, milestones, deliverables };
            }),
          );

          return {
            objective,
            keyResults,
            initiatives: initiativeDetails,
          };
        }),
      );

      return { goal, objectives: hierarchy };
    } finally {
      span.end();
    }
  }
}

export const strategicPlanningService = StrategicPlanningService.getInstance();
