/**
 * Strategic Planning GraphQL Resolvers
 *
 * Resolvers for strategic planning queries, mutations, and subscriptions.
 */

import { GraphQLError } from 'graphql';
import { PubSub } from 'graphql-subscriptions';
import pino from 'pino';
import { getPostgresPool } from '../../config/database.js';
import { getStrategicPlanningService } from '../../services/StrategicPlanningService.js';
import type {
  StrategicPlan,
  StrategicObjective,
  Initiative,
  KeyResult,
  Milestone,
  RiskAssessment,
  Deliverable,
  Stakeholder,
  ResourceAllocation,
  KeyPerformanceIndicator,
  MitigationStrategy,
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
} from '../../types/strategic-planning.js';

const logger = pino({ name: 'strategicPlanningResolvers' });
const pubsub = new PubSub();

// Subscription event names
const EVENTS = {
  PLAN_UPDATED: 'STRATEGIC_PLAN_UPDATED',
  OBJECTIVE_PROGRESS_UPDATED: 'OBJECTIVE_PROGRESS_UPDATED',
  RISK_LEVEL_CHANGED: 'RISK_LEVEL_CHANGED',
  MILESTONE_COMPLETED: 'MILESTONE_COMPLETED',
};

interface GraphQLContext {
  user?: {
    id: string;
    tenantId: string;
    email?: string;
  };
  isAuthenticated: boolean;
  requestId: string;
}

function requireAuth(context: GraphQLContext): { userId: string; tenantId: string } {
  if (!context.isAuthenticated || !context.user) {
    throw new GraphQLError('Authentication required', {
      extensions: { code: 'UNAUTHENTICATED' },
    });
  }

  if (!context.user.tenantId) {
    throw new GraphQLError('Tenant ID required', {
      extensions: { code: 'FORBIDDEN' },
    });
  }

  return {
    userId: context.user.id,
    tenantId: context.user.tenantId,
  };
}

function getService() {
  const pool = getPostgresPool();
  return getStrategicPlanningService(pool);
}

const strategicPlanningResolvers = {
  // ============================================================================
  // QUERIES
  // ============================================================================

  Query: {
    strategicPlan: async (
      _: unknown,
      { id }: { id: string },
      context: GraphQLContext,
    ): Promise<StrategicPlan | null> => {
      const { tenantId } = requireAuth(context);
      const service = getService();

      logger.info({ planId: id, tenantId }, 'Fetching strategic plan');

      return service.getPlan(id, tenantId);
    },

    strategicPlans: async (
      _: unknown,
      {
        filter,
        limit = 50,
        offset = 0,
      }: { filter?: StrategicPlanFilter; limit?: number; offset?: number },
      context: GraphQLContext,
    ): Promise<{ data: StrategicPlan[]; total: number; hasMore: boolean }> => {
      const { tenantId } = requireAuth(context);
      const service = getService();

      logger.info({ filter, limit, offset, tenantId }, 'Listing strategic plans');

      return service.listPlans(tenantId, filter, limit, offset);
    },

    planProgress: async (
      _: unknown,
      { planId }: { planId: string },
      context: GraphQLContext,
    ) => {
      const { tenantId } = requireAuth(context);
      const service = getService();

      return service.getPlanProgress(planId, tenantId);
    },

    planTimeline: async (
      _: unknown,
      { planId }: { planId: string },
      context: GraphQLContext,
    ) => {
      const { tenantId } = requireAuth(context);
      const service = getService();

      return service.getPlanTimeline(planId, tenantId);
    },

    planScorecard: async (
      _: unknown,
      {
        planId,
        period,
      }: { planId: string; period?: { start: Date; end: Date } },
      context: GraphQLContext,
    ) => {
      const { tenantId } = requireAuth(context);
      const service = getService();

      return service.getPlanScorecard(planId, tenantId, period);
    },

    planActivityLog: async (
      _: unknown,
      { planId, limit = 50 }: { planId: string; limit?: number },
      context: GraphQLContext,
    ) => {
      requireAuth(context);
      const service = getService();

      return service.getActivityLog(planId, limit);
    },

    strategicObjective: async (
      _: unknown,
      { id }: { id: string },
      context: GraphQLContext,
    ): Promise<StrategicObjective | null> => {
      requireAuth(context);
      const pool = getPostgresPool();
      const { StrategicPlanRepo } = await import('../../repos/StrategicPlanRepo.js');
      const repo = new StrategicPlanRepo(pool);

      return repo.findObjectiveById(id);
    },

    initiative: async (
      _: unknown,
      { id }: { id: string },
      context: GraphQLContext,
    ): Promise<Initiative | null> => {
      requireAuth(context);
      const pool = getPostgresPool();
      const { StrategicPlanRepo } = await import('../../repos/StrategicPlanRepo.js');
      const repo = new StrategicPlanRepo(pool);

      return repo.findInitiativeById(id);
    },

    risk: async (
      _: unknown,
      { id }: { id: string },
      context: GraphQLContext,
    ): Promise<RiskAssessment | null> => {
      requireAuth(context);
      // Note: Risk by ID would need to be added to repo
      // For now, return null - full implementation would add this
      logger.info({ riskId: id }, 'Fetching risk by ID');
      return null;
    },
  },

  // ============================================================================
  // MUTATIONS
  // ============================================================================

  Mutation: {
    // Strategic Plans
    createStrategicPlan: async (
      _: unknown,
      { input }: { input: Omit<CreateStrategicPlanInput, 'tenantId'> },
      context: GraphQLContext,
    ): Promise<StrategicPlan> => {
      const { userId, tenantId } = requireAuth(context);
      const service = getService();

      logger.info({ input, userId, tenantId }, 'Creating strategic plan');

      const plan = await service.createPlan({ ...input, tenantId }, userId);

      return plan;
    },

    updateStrategicPlan: async (
      _: unknown,
      { id, input }: { id: string; input: UpdateStrategicPlanInput },
      context: GraphQLContext,
    ): Promise<StrategicPlan | null> => {
      const { userId, tenantId } = requireAuth(context);
      const service = getService();

      logger.info({ planId: id, input, userId }, 'Updating strategic plan');

      const plan = await service.updatePlan(id, input, userId, tenantId);

      if (plan) {
        pubsub.publish(`${EVENTS.PLAN_UPDATED}.${id}`, {
          strategicPlanUpdated: plan,
        });
      }

      return plan;
    },

    deleteStrategicPlan: async (
      _: unknown,
      { id }: { id: string },
      context: GraphQLContext,
    ): Promise<boolean> => {
      const { userId, tenantId } = requireAuth(context);
      const service = getService();

      logger.info({ planId: id, userId }, 'Deleting strategic plan');

      return service.deletePlan(id, userId, tenantId);
    },

    approveStrategicPlan: async (
      _: unknown,
      { id }: { id: string },
      context: GraphQLContext,
    ): Promise<StrategicPlan | null> => {
      const { userId, tenantId } = requireAuth(context);
      const service = getService();

      logger.info({ planId: id, userId }, 'Approving strategic plan');

      return service.approvePlan(id, userId, tenantId);
    },

    activateStrategicPlan: async (
      _: unknown,
      { id }: { id: string },
      context: GraphQLContext,
    ): Promise<StrategicPlan | null> => {
      const { userId, tenantId } = requireAuth(context);
      const service = getService();

      logger.info({ planId: id, userId }, 'Activating strategic plan');

      return service.activatePlan(id, userId, tenantId);
    },

    // Objectives
    createObjective: async (
      _: unknown,
      { input }: { input: CreateObjectiveInput },
      context: GraphQLContext,
    ): Promise<StrategicObjective> => {
      const { userId, tenantId } = requireAuth(context);
      const service = getService();

      logger.info({ input, userId }, 'Creating objective');

      return service.createObjective(input, userId, tenantId);
    },

    updateObjective: async (
      _: unknown,
      { id, input }: { id: string; input: Partial<StrategicObjective> },
      context: GraphQLContext,
    ): Promise<StrategicObjective | null> => {
      const { userId } = requireAuth(context);
      const service = getService();

      return service.updateObjective(id, input, userId);
    },

    deleteObjective: async (
      _: unknown,
      { id }: { id: string },
      context: GraphQLContext,
    ): Promise<boolean> => {
      const { userId } = requireAuth(context);
      const pool = getPostgresPool();
      const { StrategicPlanRepo } = await import('../../repos/StrategicPlanRepo.js');
      const repo = new StrategicPlanRepo(pool);

      return repo.deleteObjective(id, userId);
    },

    updateObjectiveProgress: async (
      _: unknown,
      { id, currentValue }: { id: string; currentValue: number },
      context: GraphQLContext,
    ): Promise<StrategicObjective | null> => {
      const { userId } = requireAuth(context);
      const service = getService();

      const objective = await service.updateObjectiveProgress(id, currentValue, userId);

      if (objective) {
        pubsub.publish(`${EVENTS.OBJECTIVE_PROGRESS_UPDATED}.${objective.planId}`, {
          objectiveProgressUpdated: objective,
        });
      }

      return objective;
    },

    // Key Results
    createKeyResult: async (
      _: unknown,
      { input }: { input: { objectiveId: string; description: string; targetValue: number; unit: string; weight?: number; dueDate: string } },
      context: GraphQLContext,
    ): Promise<KeyResult> => {
      const { userId } = requireAuth(context);
      const service = getService();

      return service.addKeyResult(input.objectiveId, input, userId);
    },

    updateKeyResultProgress: async (
      _: unknown,
      { id, currentValue }: { id: string; currentValue: number },
      context: GraphQLContext,
    ): Promise<KeyResult | null> => {
      const { userId } = requireAuth(context);
      const service = getService();

      return service.updateKeyResultProgress(id, currentValue, userId);
    },

    // Initiatives
    createInitiative: async (
      _: unknown,
      { input }: { input: CreateInitiativeInput },
      context: GraphQLContext,
    ): Promise<Initiative> => {
      const { userId, tenantId } = requireAuth(context);
      const service = getService();

      return service.createInitiative(input, userId, tenantId);
    },

    updateInitiative: async (
      _: unknown,
      { id, input }: { id: string; input: Partial<Initiative> },
      context: GraphQLContext,
    ): Promise<Initiative | null> => {
      const { userId } = requireAuth(context);
      const service = getService();

      return service.updateInitiative(id, input, userId);
    },

    deleteInitiative: async (
      _: unknown,
      { id }: { id: string },
      context: GraphQLContext,
    ): Promise<boolean> => {
      const { userId } = requireAuth(context);
      const pool = getPostgresPool();
      const { StrategicPlanRepo } = await import('../../repos/StrategicPlanRepo.js');
      const repo = new StrategicPlanRepo(pool);

      return repo.deleteInitiative(id, userId);
    },

    // Deliverables
    createDeliverable: async (
      _: unknown,
      { input }: { input: { initiativeId: string; name: string; description: string; type: string; dueDate: string } },
      context: GraphQLContext,
    ): Promise<Deliverable> => {
      const { userId } = requireAuth(context);
      const service = getService();

      return service.addDeliverable(input.initiativeId, input, userId);
    },

    completeDeliverable: async (
      _: unknown,
      { id }: { id: string },
      context: GraphQLContext,
    ): Promise<Deliverable | null> => {
      const { userId } = requireAuth(context);
      const service = getService();

      return service.completeDeliverable(id, userId);
    },

    // Milestones
    createMilestone: async (
      _: unknown,
      { input }: { input: CreateMilestoneInput },
      context: GraphQLContext,
    ): Promise<Milestone> => {
      const { userId } = requireAuth(context);
      const service = getService();

      return service.createMilestone(input, userId);
    },

    completeMilestone: async (
      _: unknown,
      { id }: { id: string },
      context: GraphQLContext,
    ): Promise<Milestone | null> => {
      const { userId } = requireAuth(context);
      const service = getService();

      const milestone = await service.completeMilestone(id, userId);

      if (milestone) {
        pubsub.publish(`${EVENTS.MILESTONE_COMPLETED}.${milestone.parentId}`, {
          milestoneCompleted: milestone,
        });
      }

      return milestone;
    },

    deferMilestone: async (
      _: unknown,
      { id }: { id: string },
      context: GraphQLContext,
    ): Promise<Milestone | null> => {
      const { userId } = requireAuth(context);
      const service = getService();

      return service.deferMilestone(id, userId);
    },

    // Risks
    createRisk: async (
      _: unknown,
      { input }: { input: CreateRiskInput },
      context: GraphQLContext,
    ): Promise<RiskAssessment> => {
      const { userId, tenantId } = requireAuth(context);
      const service = getService();

      return service.createRisk(input, userId, tenantId);
    },

    updateRisk: async (
      _: unknown,
      { id, input }: { id: string; input: Partial<RiskAssessment> },
      context: GraphQLContext,
    ): Promise<RiskAssessment | null> => {
      const { userId } = requireAuth(context);
      const service = getService();

      const previousRisk = await service.updateRisk(id, {}, userId);
      const risk = await service.updateRisk(id, input, userId);

      if (risk && previousRisk && risk.riskLevel !== previousRisk.riskLevel) {
        pubsub.publish(`${EVENTS.RISK_LEVEL_CHANGED}.${risk.planId}`, {
          riskLevelChanged: risk,
        });
      }

      return risk;
    },

    createMitigation: async (
      _: unknown,
      { input }: { input: { riskId: string; description: string; type: 'AVOID' | 'MITIGATE' | 'TRANSFER' | 'ACCEPT'; owner: string; deadline: string; cost?: number } },
      context: GraphQLContext,
    ): Promise<MitigationStrategy> => {
      const { userId } = requireAuth(context);
      const service = getService();

      return service.addMitigationStrategy(input.riskId, input, userId);
    },

    // Stakeholders
    addStakeholder: async (
      _: unknown,
      { input }: { input: AddStakeholderInput },
      context: GraphQLContext,
    ): Promise<Stakeholder> => {
      const { userId, tenantId } = requireAuth(context);
      const service = getService();

      return service.addStakeholder(input, userId, tenantId);
    },

    removeStakeholder: async (
      _: unknown,
      { planId, userId: stakeholderUserId }: { planId: string; userId: string },
      context: GraphQLContext,
    ): Promise<boolean> => {
      const { userId, tenantId } = requireAuth(context);
      const service = getService();

      return service.removeStakeholder(planId, stakeholderUserId, userId, tenantId);
    },

    // Resources
    allocateResource: async (
      _: unknown,
      { input }: { input: AllocateResourceInput },
      context: GraphQLContext,
    ): Promise<ResourceAllocation> => {
      const { userId, tenantId } = requireAuth(context);
      const service = getService();

      return service.allocateResource(input, userId, tenantId);
    },

    updateResourceUsage: async (
      _: unknown,
      { id, used, status }: { id: string; used: number; status?: 'PLANNED' | 'ALLOCATED' | 'IN_USE' | 'RELEASED' },
      context: GraphQLContext,
    ): Promise<ResourceAllocation | null> => {
      requireAuth(context);
      const service = getService();

      return service.updateResourceUsage(id, used, status);
    },

    // KPIs
    createKPI: async (
      _: unknown,
      { input }: { input: CreateKPIInput },
      context: GraphQLContext,
    ): Promise<KeyPerformanceIndicator> => {
      const { userId, tenantId } = requireAuth(context);
      const service = getService();

      return service.createKPI(input, userId, tenantId);
    },

    updateKPIValue: async (
      _: unknown,
      { id, value, notes }: { id: string; value: number; notes?: string },
      context: GraphQLContext,
    ): Promise<KeyPerformanceIndicator | null> => {
      requireAuth(context);
      const service = getService();

      return service.updateKPIValue(id, value, notes);
    },
  },

  // ============================================================================
  // SUBSCRIPTIONS
  // ============================================================================

  Subscription: {
    strategicPlanUpdated: {
      subscribe: (_: unknown, { planId }: { planId: string }) => {
        return pubsub.asyncIterableIterator(`${EVENTS.PLAN_UPDATED}.${planId}`);
      },
    },

    objectiveProgressUpdated: {
      subscribe: (_: unknown, { planId }: { planId: string }) => {
        return pubsub.asyncIterableIterator(`${EVENTS.OBJECTIVE_PROGRESS_UPDATED}.${planId}`);
      },
    },

    riskLevelChanged: {
      subscribe: (_: unknown, { planId }: { planId: string }) => {
        return pubsub.asyncIterableIterator(`${EVENTS.RISK_LEVEL_CHANGED}.${planId}`);
      },
    },

    milestoneCompleted: {
      subscribe: (_: unknown, { planId }: { planId: string }) => {
        return pubsub.asyncIterableIterator(`${EVENTS.MILESTONE_COMPLETED}.${planId}`);
      },
    },
  },

  // ============================================================================
  // TYPE RESOLVERS
  // ============================================================================

  StrategicPlan: {
    progress: async (parent: StrategicPlan, _: unknown, context: GraphQLContext) => {
      const { tenantId } = requireAuth(context);
      const service = getService();

      return service.getPlanProgress(parent.id, tenantId);
    },

    timeline: async (parent: StrategicPlan, _: unknown, context: GraphQLContext) => {
      const { tenantId } = requireAuth(context);
      const service = getService();

      return service.getPlanTimeline(parent.id, tenantId);
    },
  },

  StrategicObjective: {
    progress: (parent: StrategicObjective) => {
      if (parent.targetValue === 0) return 0;
      return Math.min(100, (parent.currentValue / parent.targetValue) * 100);
    },
  },

  KeyResult: {
    progress: (parent: KeyResult) => {
      if (parent.targetValue === 0) return 0;
      return Math.min(100, (parent.currentValue / parent.targetValue) * 100);
    },
  },

  Initiative: {
    budgetUtilization: (parent: Initiative) => {
      if (!parent.budget || parent.budget === 0) return null;
      return ((parent.budgetUsed || 0) / parent.budget) * 100;
    },
  },

  Milestone: {
    isOverdue: (parent: Milestone) => {
      if (parent.status === 'COMPLETED') return false;
      return new Date(parent.dueDate) < new Date();
    },

    daysUntilDue: (parent: Milestone) => {
      const now = new Date();
      const due = new Date(parent.dueDate);
      const diffTime = due.getTime() - now.getTime();
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    },
  },

  ResourceAllocation: {
    utilizationRate: (parent: ResourceAllocation) => {
      if (parent.allocated === 0) return 0;
      return (parent.used / parent.allocated) * 100;
    },
  },

  KeyPerformanceIndicator: {
    achievement: (parent: KeyPerformanceIndicator) => {
      if (parent.targetValue === 0) return 0;
      return Math.min(100, (parent.currentValue / parent.targetValue) * 100);
    },
  },
};

export default strategicPlanningResolvers;
