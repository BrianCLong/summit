/**
 * Strategic Planning Service
 *
 * Business logic layer for strategic planning workflows.
 * Provides analytics, progress tracking, risk management, and
 * integration with intelligence analysis workflows.
 */

import { EventEmitter } from 'events';
import { Pool } from 'pg';
import logger from '../config/logger.js';
import { cacheService } from './cacheService.js';
import { StrategicPlanRepo } from '../repos/StrategicPlanRepo.js';
import { getTracer } from '../otel.js';
import type {
  StrategicPlan,
  StrategicObjective,
  Initiative,
  RiskAssessment,
  Milestone,
  Stakeholder,
  ResourceAllocation,
  KeyPerformanceIndicator,
  KeyResult,
  MitigationStrategy,
  Deliverable,
  CreateStrategicPlanInput,
  UpdateStrategicPlanInput,
  CreateObjectiveInput,
  CreateInitiativeInput,
  CreateRiskInput,
  CreateMilestoneInput,
  AddStakeholderInput,
  AllocateResourceInput,
  CreateKPIInput,
  StrategicPlanFilter,
  PlanProgress,
  PlanTimeline,
  TimelineEvent,
  PlanScorecard,
  PlanStatus,
  ObjectiveStatus,
  MilestoneStatus,
} from '../types/strategic-planning.js';

const serviceLogger = logger.child({ name: 'StrategicPlanningService' });
const tracer = getTracer('strategic-planning-service');

// Cache TTL constants (seconds)
const CACHE_TTL = {
  PLAN: 300, // 5 minutes
  PROGRESS: 60, // 1 minute
  TIMELINE: 120, // 2 minutes
  SCORECARD: 300, // 5 minutes
};

export class StrategicPlanningService extends EventEmitter {
  private repo: StrategicPlanRepo;

  constructor(private pg: Pool) {
    super();
    this.repo = new StrategicPlanRepo(pg);
    serviceLogger.info('Strategic Planning Service initialized');
  }

  // ============================================================================
  // STRATEGIC PLANS
  // ============================================================================

  async createPlan(
    input: CreateStrategicPlanInput,
    userId: string,
  ): Promise<StrategicPlan> {
    const span = tracer.startSpan('strategicPlanning.createPlan');

    try {
      this.validatePlanInput(input);

      const plan = await this.repo.createPlan(input, userId);

      this.emit('planCreated', { plan, userId });
      serviceLogger.info({ planId: plan.id, userId }, 'Strategic plan created');

      return plan;
    } finally {
      span.end();
    }
  }

  async updatePlan(
    id: string,
    input: UpdateStrategicPlanInput,
    userId: string,
    tenantId: string,
  ): Promise<StrategicPlan | null> {
    const span = tracer.startSpan('strategicPlanning.updatePlan');

    try {
      const existingPlan = await this.repo.findPlanById(id, tenantId);
      if (!existingPlan) {
        return null;
      }

      this.validateStatusTransition(existingPlan.status, input.status);

      const plan = await this.repo.updatePlan(id, input, userId);

      if (plan) {
        await this.invalidatePlanCache(id);
        this.emit('planUpdated', { plan, previousStatus: existingPlan.status, userId });

        if (input.status && input.status !== existingPlan.status) {
          this.emit('planStatusChanged', {
            plan,
            previousStatus: existingPlan.status,
            newStatus: input.status,
            userId,
          });
        }
      }

      return plan;
    } finally {
      span.end();
    }
  }

  async deletePlan(id: string, userId: string, tenantId: string): Promise<boolean> {
    const span = tracer.startSpan('strategicPlanning.deletePlan');

    try {
      const plan = await this.repo.findPlanById(id, tenantId);
      if (!plan) return false;

      if (plan.status === 'ACTIVE' || plan.status === 'APPROVED') {
        throw new Error('Cannot delete an active or approved plan. Archive it first.');
      }

      const success = await this.repo.deletePlan(id, userId);

      if (success) {
        await this.invalidatePlanCache(id);
        this.emit('planDeleted', { planId: id, userId });
      }

      return success;
    } finally {
      span.end();
    }
  }

  async getPlan(id: string, tenantId: string): Promise<StrategicPlan | null> {
    const cacheKey = `strategic_plan:${id}`;
    const cached = await cacheService.get<StrategicPlan>(cacheKey);

    if (cached) {
      return cached;
    }

    const plan = await this.repo.findPlanById(id, tenantId);

    if (plan) {
      await cacheService.set(cacheKey, plan, CACHE_TTL.PLAN);
    }

    return plan;
  }

  async listPlans(
    tenantId: string,
    filter: StrategicPlanFilter = {},
    limit = 50,
    offset = 0,
  ): Promise<{ data: StrategicPlan[]; total: number; hasMore: boolean }> {
    const result = await this.repo.listPlans(tenantId, filter, limit, offset);

    return {
      data: result.data,
      total: result.total,
      hasMore: offset + result.data.length < result.total,
    };
  }

  async approvePlan(id: string, userId: string, tenantId: string): Promise<StrategicPlan | null> {
    const plan = await this.repo.findPlanById(id, tenantId);

    if (!plan) return null;
    if (plan.status !== 'UNDER_REVIEW') {
      throw new Error('Only plans under review can be approved');
    }

    const validation = await this.validatePlanForApproval(plan);
    if (!validation.valid) {
      throw new Error(`Plan cannot be approved: ${validation.issues.join(', ')}`);
    }

    return this.repo.updatePlan(id, { status: 'APPROVED' }, userId);
  }

  async activatePlan(id: string, userId: string, tenantId: string): Promise<StrategicPlan | null> {
    const plan = await this.repo.findPlanById(id, tenantId);

    if (!plan) return null;
    if (plan.status !== 'APPROVED') {
      throw new Error('Only approved plans can be activated');
    }

    return this.repo.updatePlan(id, { status: 'ACTIVE' }, userId);
  }

  // ============================================================================
  // OBJECTIVES
  // ============================================================================

  async createObjective(
    input: CreateObjectiveInput,
    userId: string,
    tenantId: string,
  ): Promise<StrategicObjective> {
    const plan = await this.repo.findPlanById(input.planId, tenantId);
    if (!plan) {
      throw new Error('Plan not found');
    }

    const objective = await this.repo.createObjective(input, userId);
    await this.invalidatePlanCache(input.planId);

    this.emit('objectiveCreated', { objective, planId: input.planId, userId });

    return objective;
  }

  async updateObjective(
    id: string,
    updates: Partial<StrategicObjective>,
    userId: string,
  ): Promise<StrategicObjective | null> {
    const objective = await this.repo.updateObjective(id, updates, userId);

    if (objective) {
      await this.invalidatePlanCache(objective.planId);
      this.emit('objectiveUpdated', { objective, userId });
    }

    return objective;
  }

  async updateObjectiveProgress(
    id: string,
    currentValue: number,
    userId: string,
  ): Promise<StrategicObjective | null> {
    const objective = await this.repo.findObjectiveById(id);
    if (!objective) return null;

    const progress = (currentValue / objective.targetValue) * 100;
    let status: ObjectiveStatus = objective.status;

    if (currentValue >= objective.targetValue) {
      status = 'COMPLETED';
    } else if (progress >= 75) {
      status = 'ON_TRACK';
    } else if (progress >= 25) {
      status = 'IN_PROGRESS';
    } else if (new Date() > new Date(objective.targetDate)) {
      status = 'AT_RISK';
    }

    return this.repo.updateObjective(id, { currentValue, status }, userId);
  }

  async addKeyResult(
    objectiveId: string,
    input: {
      description: string;
      targetValue: number;
      unit: string;
      weight?: number;
      dueDate: string;
    },
    userId: string,
  ): Promise<KeyResult> {
    const objective = await this.repo.findObjectiveById(objectiveId);
    if (!objective) {
      throw new Error('Objective not found');
    }

    const keyResult = await this.repo.createKeyResult(objectiveId, input);
    await this.invalidatePlanCache(objective.planId);

    return keyResult;
  }

  async updateKeyResultProgress(
    id: string,
    currentValue: number,
    userId: string,
  ): Promise<KeyResult | null> {
    return this.repo.updateKeyResultProgress(id, currentValue);
  }

  // ============================================================================
  // INITIATIVES
  // ============================================================================

  async createInitiative(
    input: CreateInitiativeInput,
    userId: string,
    tenantId: string,
  ): Promise<Initiative> {
    const plan = await this.repo.findPlanById(input.planId, tenantId);
    if (!plan) {
      throw new Error('Plan not found');
    }

    const initiative = await this.repo.createInitiative(input, userId);
    await this.invalidatePlanCache(input.planId);

    this.emit('initiativeCreated', { initiative, planId: input.planId, userId });

    return initiative;
  }

  async updateInitiative(
    id: string,
    updates: Partial<Initiative>,
    userId: string,
  ): Promise<Initiative | null> {
    const initiative = await this.repo.updateInitiative(id, updates, userId);

    if (initiative) {
      await this.invalidatePlanCache(initiative.planId);
      this.emit('initiativeUpdated', { initiative, userId });
    }

    return initiative;
  }

  async addDeliverable(
    initiativeId: string,
    input: {
      name: string;
      description: string;
      type: string;
      dueDate: string;
    },
    userId: string,
  ): Promise<Deliverable> {
    const initiative = await this.repo.findInitiativeById(initiativeId);
    if (!initiative) {
      throw new Error('Initiative not found');
    }

    const deliverable = await this.repo.createDeliverable(initiativeId, input);
    await this.invalidatePlanCache(initiative.planId);

    return deliverable;
  }

  async completeDeliverable(
    id: string,
    userId: string,
  ): Promise<Deliverable | null> {
    return this.repo.updateDeliverableStatus(id, 'COMPLETED', new Date());
  }

  // ============================================================================
  // MILESTONES
  // ============================================================================

  async createMilestone(
    input: CreateMilestoneInput,
    userId: string,
  ): Promise<Milestone> {
    return this.repo.createMilestone(input, userId);
  }

  async completeMilestone(id: string, userId: string): Promise<Milestone | null> {
    return this.repo.updateMilestoneStatus(id, 'COMPLETED', userId, new Date());
  }

  async deferMilestone(id: string, userId: string): Promise<Milestone | null> {
    return this.repo.updateMilestoneStatus(id, 'DEFERRED', userId);
  }

  // ============================================================================
  // RISKS
  // ============================================================================

  async createRisk(
    input: CreateRiskInput,
    userId: string,
    tenantId: string,
  ): Promise<RiskAssessment> {
    const plan = await this.repo.findPlanById(input.planId, tenantId);
    if (!plan) {
      throw new Error('Plan not found');
    }

    const risk = await this.repo.createRisk(input, userId);
    await this.invalidatePlanCache(input.planId);

    this.emit('riskIdentified', { risk, planId: input.planId, userId });

    if (risk.riskLevel === 'CRITICAL' || risk.riskLevel === 'HIGH') {
      this.emit('highRiskAlert', { risk, planId: input.planId });
    }

    return risk;
  }

  async updateRisk(
    id: string,
    updates: Partial<RiskAssessment>,
    userId: string,
  ): Promise<RiskAssessment | null> {
    const risk = await this.repo.updateRisk(id, updates, userId);

    if (risk) {
      await this.invalidatePlanCache(risk.planId);
      this.emit('riskUpdated', { risk, userId });
    }

    return risk;
  }

  async addMitigationStrategy(
    riskId: string,
    input: {
      description: string;
      type: 'AVOID' | 'MITIGATE' | 'TRANSFER' | 'ACCEPT';
      owner: string;
      deadline: string;
      cost?: number;
    },
    userId: string,
  ): Promise<MitigationStrategy> {
    return this.repo.createMitigationStrategy(riskId, input);
  }

  // ============================================================================
  // STAKEHOLDERS
  // ============================================================================

  async addStakeholder(
    input: AddStakeholderInput,
    userId: string,
    tenantId: string,
  ): Promise<Stakeholder> {
    const plan = await this.repo.findPlanById(input.planId, tenantId);
    if (!plan) {
      throw new Error('Plan not found');
    }

    const stakeholder = await this.repo.addStakeholder(input, userId);
    await this.invalidatePlanCache(input.planId);

    this.emit('stakeholderAdded', { stakeholder, planId: input.planId, userId });

    return stakeholder;
  }

  async removeStakeholder(
    planId: string,
    stakeholderUserId: string,
    userId: string,
    tenantId: string,
  ): Promise<boolean> {
    const plan = await this.repo.findPlanById(planId, tenantId);
    if (!plan) return false;

    const success = await this.repo.removeStakeholder(planId, stakeholderUserId);

    if (success) {
      await this.invalidatePlanCache(planId);
      this.emit('stakeholderRemoved', { planId, stakeholderUserId, userId });
    }

    return success;
  }

  // ============================================================================
  // RESOURCES
  // ============================================================================

  async allocateResource(
    input: AllocateResourceInput,
    userId: string,
    tenantId: string,
  ): Promise<ResourceAllocation> {
    const plan = await this.repo.findPlanById(input.planId, tenantId);
    if (!plan) {
      throw new Error('Plan not found');
    }

    const resource = await this.repo.allocateResource(input);
    await this.invalidatePlanCache(input.planId);

    this.emit('resourceAllocated', { resource, planId: input.planId, userId });

    return resource;
  }

  async updateResourceUsage(
    id: string,
    used: number,
    status?: 'PLANNED' | 'ALLOCATED' | 'IN_USE' | 'RELEASED',
  ): Promise<ResourceAllocation | null> {
    return this.repo.updateResourceUsage(id, used, status);
  }

  // ============================================================================
  // KPIs
  // ============================================================================

  async createKPI(
    input: CreateKPIInput,
    userId: string,
    tenantId: string,
  ): Promise<KeyPerformanceIndicator> {
    const plan = await this.repo.findPlanById(input.planId, tenantId);
    if (!plan) {
      throw new Error('Plan not found');
    }

    const kpi = await this.repo.createKPI(input);
    await this.invalidatePlanCache(input.planId);

    return kpi;
  }

  async updateKPIValue(
    id: string,
    currentValue: number,
    notes?: string,
  ): Promise<KeyPerformanceIndicator | null> {
    return this.repo.updateKPIValue(id, currentValue, notes);
  }

  // ============================================================================
  // ANALYTICS & PROGRESS
  // ============================================================================

  async getPlanProgress(planId: string, tenantId: string): Promise<PlanProgress | null> {
    const cacheKey = `strategic_plan_progress:${planId}`;
    const cached = await cacheService.get<PlanProgress>(cacheKey);

    if (cached) {
      return cached;
    }

    const plan = await this.repo.findPlanById(planId, tenantId);
    if (!plan) return null;

    const progress = this.calculateProgress(plan);

    await cacheService.set(cacheKey, progress, CACHE_TTL.PROGRESS);

    return progress;
  }

  async getPlanTimeline(planId: string, tenantId: string): Promise<PlanTimeline | null> {
    const cacheKey = `strategic_plan_timeline:${planId}`;
    const cached = await cacheService.get<PlanTimeline>(cacheKey);

    if (cached) {
      return cached;
    }

    const plan = await this.repo.findPlanById(planId, tenantId);
    if (!plan) return null;

    const timeline = this.buildTimeline(plan);

    await cacheService.set(cacheKey, timeline, CACHE_TTL.TIMELINE);

    return timeline;
  }

  async getPlanScorecard(
    planId: string,
    tenantId: string,
    period?: { start: Date; end: Date },
  ): Promise<PlanScorecard | null> {
    const plan = await this.repo.findPlanById(planId, tenantId);
    if (!plan) return null;

    const scorecard = this.calculateScorecard(plan, period);

    return scorecard;
  }

  async getActivityLog(planId: string, limit = 50): Promise<
    Array<{
      id: string;
      entityType: string;
      entityId: string;
      action: string;
      actorId: string;
      changes: Record<string, unknown>;
      createdAt: Date;
    }>
  > {
    return this.repo.getActivityLog(planId, limit);
  }

  // ============================================================================
  // BATCH OPERATIONS
  // ============================================================================

  async batchLoadPlans(
    ids: readonly string[],
    tenantId: string,
  ): Promise<(StrategicPlan | null)[]> {
    return this.repo.batchByIds(ids, tenantId);
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private validatePlanInput(input: CreateStrategicPlanInput): void {
    if (!input.name || input.name.trim().length === 0) {
      throw new Error('Plan name is required');
    }

    if (!input.description || input.description.trim().length === 0) {
      throw new Error('Plan description is required');
    }

    const startDate = new Date(input.startDate);
    const endDate = new Date(input.endDate);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new Error('Invalid date format');
    }

    if (endDate <= startDate) {
      throw new Error('End date must be after start date');
    }
  }

  private validateStatusTransition(
    currentStatus: PlanStatus | undefined,
    newStatus: PlanStatus | undefined,
  ): void {
    if (!newStatus || !currentStatus) return;

    const validTransitions: Record<PlanStatus, PlanStatus[]> = {
      DRAFT: ['UNDER_REVIEW', 'CANCELLED'],
      UNDER_REVIEW: ['DRAFT', 'APPROVED', 'CANCELLED'],
      APPROVED: ['ACTIVE', 'ON_HOLD', 'CANCELLED'],
      ACTIVE: ['ON_HOLD', 'COMPLETED', 'CANCELLED'],
      ON_HOLD: ['ACTIVE', 'CANCELLED'],
      COMPLETED: ['ARCHIVED'],
      ARCHIVED: [],
      CANCELLED: ['ARCHIVED'],
    };

    if (!validTransitions[currentStatus].includes(newStatus)) {
      throw new Error(
        `Invalid status transition from ${currentStatus} to ${newStatus}`,
      );
    }
  }

  private async validatePlanForApproval(
    plan: StrategicPlan,
  ): Promise<{ valid: boolean; issues: string[] }> {
    const issues: string[] = [];

    if (plan.objectives.length === 0) {
      issues.push('Plan must have at least one objective');
    }

    const objectivesWithoutMilestones = plan.objectives.filter(
      (obj) => obj.milestones.length === 0,
    );
    if (objectivesWithoutMilestones.length > 0) {
      issues.push('All objectives must have at least one milestone');
    }

    const owners = plan.stakeholders.filter((s) => s.role === 'OWNER');
    if (owners.length === 0) {
      issues.push('Plan must have an owner');
    }

    if (plan.kpis.length === 0) {
      issues.push('Plan must have at least one KPI');
    }

    return {
      valid: issues.length === 0,
      issues,
    };
  }

  private calculateProgress(plan: StrategicPlan): PlanProgress {
    const objectiveStats = {
      total: plan.objectives.length,
      completed: 0,
      onTrack: 0,
      atRisk: 0,
      blocked: 0,
    };

    let objectivesProgressSum = 0;

    for (const obj of plan.objectives) {
      const progress = (obj.currentValue / obj.targetValue) * 100;
      objectivesProgressSum += Math.min(progress, 100);

      switch (obj.status) {
        case 'COMPLETED':
          objectiveStats.completed++;
          break;
        case 'ON_TRACK':
          objectiveStats.onTrack++;
          break;
        case 'AT_RISK':
          objectiveStats.atRisk++;
          break;
        case 'BLOCKED':
          objectiveStats.blocked++;
          break;
      }
    }

    const initiativeStats = {
      total: plan.initiatives.length,
      completed: 0,
      inProgress: 0,
      notStarted: 0,
    };

    for (const init of plan.initiatives) {
      switch (init.status) {
        case 'COMPLETED':
          initiativeStats.completed++;
          break;
        case 'IN_PROGRESS':
        case 'ON_TRACK':
        case 'AT_RISK':
          initiativeStats.inProgress++;
          break;
        default:
          initiativeStats.notStarted++;
      }
    }

    const allMilestones = [
      ...plan.objectives.flatMap((o) => o.milestones),
      ...plan.initiatives.flatMap((i) => i.milestones),
    ];

    const now = new Date();
    const milestoneStats = {
      total: allMilestones.length,
      completed: 0,
      upcoming: 0,
      overdue: 0,
    };

    for (const ms of allMilestones) {
      if (ms.status === 'COMPLETED') {
        milestoneStats.completed++;
      } else if (new Date(ms.dueDate) < now) {
        milestoneStats.overdue++;
      } else {
        milestoneStats.upcoming++;
      }
    }

    const riskStats = {
      total: plan.risks.length,
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
    };

    for (const risk of plan.risks) {
      riskStats[risk.riskLevel.toLowerCase() as keyof typeof riskStats]++;
    }

    let budgetAllocated = 0;
    let budgetUsed = 0;
    let personnelAllocated = 0;
    let personnelAssigned = 0;

    for (const res of plan.resources) {
      if (res.type === 'BUDGET') {
        budgetAllocated += res.allocated;
        budgetUsed += res.used;
      } else if (res.type === 'PERSONNEL') {
        personnelAllocated += res.allocated;
        personnelAssigned += res.used;
      }
    }

    const overallProgress =
      objectiveStats.total > 0
        ? objectivesProgressSum / objectiveStats.total
        : 0;

    const healthScore = this.calculateHealthScore(
      objectiveStats,
      milestoneStats,
      riskStats,
    );

    return {
      planId: plan.id,
      overallProgress: Math.round(overallProgress * 10) / 10,
      objectivesProgress: objectiveStats,
      initiativesProgress: initiativeStats,
      milestonesProgress: milestoneStats,
      riskSummary: riskStats,
      resourceUtilization: {
        budget: { allocated: budgetAllocated, used: budgetUsed },
        personnel: { allocated: personnelAllocated, assigned: personnelAssigned },
      },
      healthScore: Math.round(healthScore * 10) / 10,
      updatedAt: new Date(),
    };
  }

  private calculateHealthScore(
    objectives: { total: number; completed: number; atRisk: number; blocked: number },
    milestones: { total: number; completed: number; overdue: number },
    risks: { critical: number; high: number },
  ): number {
    let score = 100;

    if (objectives.total > 0) {
      const objectiveIssueRate =
        (objectives.atRisk + objectives.blocked) / objectives.total;
      score -= objectiveIssueRate * 30;
    }

    if (milestones.total > 0) {
      const overdueRate = milestones.overdue / milestones.total;
      score -= overdueRate * 25;
    }

    score -= risks.critical * 10;
    score -= risks.high * 5;

    return Math.max(0, Math.min(100, score));
  }

  private buildTimeline(plan: StrategicPlan): PlanTimeline {
    const events: TimelineEvent[] = [];

    events.push({
      id: `plan-start-${plan.id}`,
      type: 'objective_start',
      date: plan.startDate,
      title: 'Plan Start',
      description: `Strategic plan "${plan.name}" begins`,
      status: 'ACTIVE',
      relatedEntityId: plan.id,
      relatedEntityType: 'plan',
    });

    events.push({
      id: `plan-end-${plan.id}`,
      type: 'objective_end',
      date: plan.endDate,
      title: 'Plan Target End',
      description: `Strategic plan "${plan.name}" target completion`,
      status: plan.status === 'COMPLETED' ? 'COMPLETED' : 'PENDING',
      relatedEntityId: plan.id,
      relatedEntityType: 'plan',
    });

    for (const obj of plan.objectives) {
      events.push({
        id: `obj-start-${obj.id}`,
        type: 'objective_start',
        date: obj.startDate,
        title: `Objective: ${obj.name}`,
        description: obj.description,
        status: obj.status,
        relatedEntityId: obj.id,
        relatedEntityType: 'objective',
      });

      for (const ms of obj.milestones) {
        events.push({
          id: `milestone-${ms.id}`,
          type: 'milestone',
          date: ms.dueDate,
          title: ms.name,
          description: ms.description,
          status: ms.status,
          relatedEntityId: ms.id,
          relatedEntityType: 'milestone',
        });
      }
    }

    for (const init of plan.initiatives) {
      events.push({
        id: `init-start-${init.id}`,
        type: 'initiative_start',
        date: init.startDate,
        title: `Initiative: ${init.name}`,
        description: init.description,
        status: init.status,
        relatedEntityId: init.id,
        relatedEntityType: 'initiative',
      });

      events.push({
        id: `init-end-${init.id}`,
        type: 'initiative_end',
        date: init.endDate,
        title: `Initiative End: ${init.name}`,
        description: `Target completion for ${init.name}`,
        status: init.status === 'COMPLETED' ? 'COMPLETED' : 'PENDING',
        relatedEntityId: init.id,
        relatedEntityType: 'initiative',
      });

      for (const ms of init.milestones) {
        events.push({
          id: `milestone-${ms.id}`,
          type: 'milestone',
          date: ms.dueDate,
          title: ms.name,
          description: ms.description,
          status: ms.status,
          relatedEntityId: ms.id,
          relatedEntityType: 'milestone',
        });
      }
    }

    for (const risk of plan.risks) {
      if (risk.riskLevel === 'CRITICAL' || risk.riskLevel === 'HIGH') {
        events.push({
          id: `risk-review-${risk.id}`,
          type: 'review',
          date: risk.reviewDate,
          title: `Risk Review: ${risk.name}`,
          description: `Scheduled review for ${risk.riskLevel} risk`,
          status: risk.status,
          relatedEntityId: risk.id,
          relatedEntityType: 'risk',
        });
      }
    }

    events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return {
      planId: plan.id,
      events,
    };
  }

  private calculateScorecard(
    plan: StrategicPlan,
    period?: { start: Date; end: Date },
  ): PlanScorecard {
    const now = new Date();
    const periodStart = period?.start || plan.startDate;
    const periodEnd = period?.end || now;

    const kpiScores = plan.kpis.map((kpi) => {
      const achievement =
        kpi.targetValue > 0
          ? (kpi.currentValue / kpi.targetValue) * 100
          : 0;

      return {
        kpiId: kpi.id,
        name: kpi.name,
        target: kpi.targetValue,
        actual: kpi.currentValue,
        achievement: Math.round(achievement * 10) / 10,
        trend: kpi.trend,
      };
    });

    const objectiveScores = plan.objectives.map((obj) => {
      const progress =
        obj.targetValue > 0
          ? (obj.currentValue / obj.targetValue) * 100
          : 0;

      let keyResultsAchievement = 0;
      if (obj.keyResults && obj.keyResults.length > 0) {
        const totalWeight = obj.keyResults.reduce((sum, kr) => sum + kr.weight, 0);
        keyResultsAchievement = obj.keyResults.reduce((sum, kr) => {
          const krProgress = kr.targetValue > 0 ? (kr.currentValue / kr.targetValue) * 100 : 0;
          return sum + (krProgress * kr.weight);
        }, 0) / totalWeight;
      }

      return {
        objectiveId: obj.id,
        name: obj.name,
        progress: Math.round(progress * 10) / 10,
        keyResultsAchievement: Math.round(keyResultsAchievement * 10) / 10,
      };
    });

    const kpiAverage = kpiScores.length > 0
      ? kpiScores.reduce((sum, k) => sum + k.achievement, 0) / kpiScores.length
      : 0;

    const objectiveAverage = objectiveScores.length > 0
      ? objectiveScores.reduce((sum, o) => sum + o.progress, 0) / objectiveScores.length
      : 0;

    const overallScore = (kpiAverage * 0.4 + objectiveAverage * 0.6);

    const recommendations: string[] = [];

    const lowKPIs = kpiScores.filter((k) => k.achievement < 50);
    if (lowKPIs.length > 0) {
      recommendations.push(
        `Focus on improving ${lowKPIs.map((k) => k.name).join(', ')} - currently below 50% achievement`,
      );
    }

    const atRiskObjectives = plan.objectives.filter((o) => o.status === 'AT_RISK');
    if (atRiskObjectives.length > 0) {
      recommendations.push(
        `Review at-risk objectives: ${atRiskObjectives.map((o) => o.name).join(', ')}`,
      );
    }

    const criticalRisks = plan.risks.filter((r) => r.riskLevel === 'CRITICAL');
    if (criticalRisks.length > 0) {
      recommendations.push(
        `Address critical risks immediately: ${criticalRisks.map((r) => r.name).join(', ')}`,
      );
    }

    return {
      planId: plan.id,
      period: { start: periodStart, end: periodEnd },
      kpiScores,
      objectiveScores,
      overallScore: Math.round(overallScore * 10) / 10,
      recommendations,
      generatedAt: new Date(),
    };
  }

  private async invalidatePlanCache(planId: string): Promise<void> {
    const cacheKeys = [
      `strategic_plan:${planId}`,
      `strategic_plan_progress:${planId}`,
      `strategic_plan_timeline:${planId}`,
    ];

    await Promise.all(cacheKeys.map((key) => cacheService.del(key)));
  }
}

let strategicPlanningServiceInstance: StrategicPlanningService | null = null;

export function getStrategicPlanningService(pg: Pool): StrategicPlanningService {
  if (!strategicPlanningServiceInstance) {
    strategicPlanningServiceInstance = new StrategicPlanningService(pg);
  }
  return strategicPlanningServiceInstance;
}

export function createStrategicPlanningService(pg: Pool): StrategicPlanningService {
  return new StrategicPlanningService(pg);
}
