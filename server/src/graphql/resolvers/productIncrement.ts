/**
 * Product Increment GraphQL Resolvers
 *
 * Handles all GraphQL operations for product increments including:
 * - Increment CRUD and lifecycle management
 * - Goal management
 * - Deliverable management
 * - Team assignments
 * - Metrics and analytics
 */

import { GraphQLError } from 'graphql';
import { PubSub } from 'graphql-subscriptions';
import logger from '../../config/logger.js';
import {
  productIncrementService,
  ProductIncrementService,
  IncrementStatistics,
  BurndownDataPoint,
} from '../../services/ProductIncrementService.js';
import { getPostgresPool } from '../../config/database.js';
import {
  ProductIncrementRepo,
  ProductIncrement,
  IncrementGoal,
  Deliverable,
  TeamAssignment,
  MetricsSnapshot,
  IncrementSummary,
  IncrementStatus,
  GoalStatus,
  DeliverableStatus,
} from '../../repos/ProductIncrementRepo.js';

const resolverLogger = logger.child({ name: 'ProductIncrementResolvers' });

// PubSub for subscriptions
const pubsub = new PubSub();

// Subscription events
const EVENTS = {
  INCREMENT_UPDATED: 'INCREMENT_UPDATED',
  DELIVERABLE_UPDATED: 'DELIVERABLE_UPDATED',
  GOAL_UPDATED: 'GOAL_UPDATED',
};

// Helper to get user ID from context
function getUserId(context: any): string {
  return context.user?.id || context.userId || 'anonymous';
}

// Helper to get tenant ID from context or args
function getTenantId(context: any, args?: any): string {
  return args?.tenantId || context.tenantId || context.user?.tenantId || 'default';
}

// Map GraphQL enum to database enum
function mapStatusToDb(status: string): IncrementStatus {
  return status.toLowerCase() as IncrementStatus;
}

function mapStatusToGraphQL(status: IncrementStatus): string {
  return status.toUpperCase();
}

function mapGoalStatusToDb(status: string): GoalStatus {
  return status.toLowerCase().replace(/_/g, '_') as GoalStatus;
}

function mapDeliverableStatusToDb(status: string): DeliverableStatus {
  return status.toLowerCase().replace(/_/g, '_') as DeliverableStatus;
}

// Transform increment for GraphQL response
function transformIncrement(increment: ProductIncrement): any {
  return {
    ...increment,
    status: mapStatusToGraphQL(increment.status),
  };
}

function transformGoal(goal: IncrementGoal): any {
  return {
    ...goal,
    status: goal.status.toUpperCase(),
    category: goal.category.toUpperCase(),
    priority: goal.priority.toUpperCase(),
  };
}

function transformDeliverable(deliverable: Deliverable): any {
  return {
    ...deliverable,
    status: deliverable.status.toUpperCase().replace(/_/g, '_'),
    deliverableType: deliverable.deliverableType.toUpperCase(),
    priority: deliverable.priority.toUpperCase(),
  };
}

function transformTeamAssignment(assignment: TeamAssignment): any {
  return {
    ...assignment,
    role: assignment.role.toUpperCase(),
  };
}

// =============================================================================
// RESOLVERS
// =============================================================================

export const productIncrementResolvers = {
  // ===========================================================================
  // QUERIES
  // ===========================================================================
  Query: {
    /**
     * Get a product increment by ID
     */
    productIncrement: async (_: any, { id }: { id: string }, context: any) => {
      resolverLogger.info({ id }, 'Fetching product increment');

      const increment = await productIncrementService.getIncrement(id);
      if (!increment) {
        return null;
      }

      return transformIncrement(increment);
    },

    /**
     * Get increment with summary metrics
     */
    productIncrementSummary: async (
      _: any,
      { id }: { id: string },
      context: any,
    ) => {
      resolverLogger.info({ id }, 'Fetching increment summary');

      const summary = await productIncrementService.getIncrementSummary(id);
      if (!summary) {
        return null;
      }

      return {
        ...transformIncrement(summary),
        totalGoals: summary.totalGoals,
        completedGoals: summary.completedGoals,
        totalDeliverables: summary.totalDeliverables,
        completedDeliverables: summary.completedDeliverables,
        inProgressDeliverables: summary.inProgressDeliverables,
        blockedDeliverables: summary.blockedDeliverables,
        teamSize: summary.teamSize,
      };
    },

    /**
     * Get computed statistics for an increment
     */
    productIncrementStatistics: async (
      _: any,
      { id }: { id: string },
      context: any,
    ) => {
      resolverLogger.info({ id }, 'Fetching increment statistics');

      const stats = await productIncrementService.getIncrementStatistics(id);
      if (!stats) {
        return null;
      }

      return {
        ...stats,
        status: mapStatusToGraphQL(stats.status as IncrementStatus),
        summary: {
          ...transformIncrement(stats.summary),
          totalGoals: stats.summary.totalGoals,
          completedGoals: stats.summary.completedGoals,
          totalDeliverables: stats.summary.totalDeliverables,
          completedDeliverables: stats.summary.completedDeliverables,
          inProgressDeliverables: stats.summary.inProgressDeliverables,
          blockedDeliverables: stats.summary.blockedDeliverables,
          teamSize: stats.summary.teamSize,
        },
      };
    },

    /**
     * List product increments
     */
    productIncrements: async (
      _: any,
      {
        tenantId,
        filter,
        limit,
        offset,
      }: {
        tenantId: string;
        filter?: any;
        limit?: number;
        offset?: number;
      },
      context: any,
    ) => {
      resolverLogger.info({ tenantId, filter }, 'Listing product increments');

      // Transform filter status if provided
      const dbFilter = filter
        ? {
            ...filter,
            status: filter.status?.map(mapStatusToDb),
          }
        : undefined;

      const increments = await productIncrementService.listIncrements(
        tenantId,
        dbFilter,
        limit,
        offset,
      );

      return increments.map(transformIncrement);
    },

    /**
     * Get current active increment
     */
    currentProductIncrement: async (
      _: any,
      { tenantId }: { tenantId: string },
      context: any,
    ) => {
      resolverLogger.info({ tenantId }, 'Fetching current increment');

      const increment = await productIncrementService.getCurrentIncrement(tenantId);
      return increment ? transformIncrement(increment) : null;
    },

    /**
     * Get a goal by ID
     */
    incrementGoal: async (_: any, { id }: { id: string }, context: any) => {
      const goal = await productIncrementService.getGoal(id);
      return goal ? transformGoal(goal) : null;
    },

    /**
     * List goals for an increment
     */
    incrementGoals: async (
      _: any,
      { incrementId }: { incrementId: string },
      context: any,
    ) => {
      const goals = await productIncrementService.listGoals(incrementId);
      return goals.map(transformGoal);
    },

    /**
     * Get a deliverable by ID
     */
    deliverable: async (_: any, { id }: { id: string }, context: any) => {
      const deliverable = await productIncrementService.getDeliverable(id);
      return deliverable ? transformDeliverable(deliverable) : null;
    },

    /**
     * List deliverables for an increment
     */
    deliverables: async (
      _: any,
      { incrementId, filter }: { incrementId: string; filter?: any },
      context: any,
    ) => {
      const options = filter
        ? {
            status: filter.status?.map(mapDeliverableStatusToDb),
            assigneeId: filter.assigneeId,
            goalId: filter.goalId,
          }
        : undefined;

      const deliverables = await productIncrementService.listDeliverables(
        incrementId,
        options,
      );

      return deliverables.map(transformDeliverable);
    },

    /**
     * Get team members for an increment
     */
    incrementTeamMembers: async (
      _: any,
      { incrementId }: { incrementId: string },
      context: any,
    ) => {
      const members = await productIncrementService.listTeamMembers(incrementId);
      return members.map(transformTeamAssignment);
    },

    /**
     * Get burndown chart data
     */
    incrementBurndown: async (
      _: any,
      { incrementId }: { incrementId: string },
      context: any,
    ) => {
      return productIncrementService.getBurndownData(incrementId);
    },

    /**
     * Get velocity history
     */
    velocityHistory: async (
      _: any,
      { tenantId, limit }: { tenantId: string; limit?: number },
      context: any,
    ) => {
      const history = await productIncrementService.getVelocityHistory(
        tenantId,
        limit,
      );

      return history.map(({ increment, velocity }) => ({
        increment: transformIncrement(increment),
        velocity,
      }));
    },

    /**
     * Get metrics history
     */
    incrementMetricsHistory: async (
      _: any,
      {
        incrementId,
        startDate,
        endDate,
      }: { incrementId: string; startDate?: Date; endDate?: Date },
      context: any,
    ) => {
      const pool = getPostgresPool();
      const repo = new ProductIncrementRepo(pool);
      return repo.getMetricsHistory(incrementId, startDate, endDate);
    },
  },

  // ===========================================================================
  // MUTATIONS
  // ===========================================================================
  Mutation: {
    /**
     * Create a new product increment
     */
    createProductIncrement: async (
      _: any,
      { input }: { input: any },
      context: any,
    ) => {
      resolverLogger.info({ input }, 'Creating product increment');

      const userId = getUserId(context);
      const dbInput = {
        ...input,
        status: input.status ? mapStatusToDb(input.status) : undefined,
      };

      const result = await productIncrementService.createIncrement(dbInput, userId);

      if (!result.success || !result.data) {
        throw new GraphQLError(result.error || 'Failed to create increment', {
          extensions: { code: 'BAD_REQUEST' },
        });
      }

      const increment = transformIncrement(result.data);

      // Publish subscription event
      pubsub.publish(EVENTS.INCREMENT_UPDATED, {
        productIncrementUpdated: increment,
      });

      return increment;
    },

    /**
     * Update a product increment
     */
    updateProductIncrement: async (
      _: any,
      { id, input }: { id: string; input: any },
      context: any,
    ) => {
      resolverLogger.info({ id, input }, 'Updating product increment');

      const userId = getUserId(context);
      const dbInput = {
        ...input,
        status: input.status ? mapStatusToDb(input.status) : undefined,
      };

      const result = await productIncrementService.updateIncrement(id, dbInput, userId);

      if (!result.success || !result.data) {
        throw new GraphQLError(result.error || 'Failed to update increment', {
          extensions: { code: 'BAD_REQUEST' },
        });
      }

      const increment = transformIncrement(result.data);

      pubsub.publish(EVENTS.INCREMENT_UPDATED, {
        productIncrementUpdated: increment,
      });

      return increment;
    },

    /**
     * Delete a product increment
     */
    deleteProductIncrement: async (
      _: any,
      { id }: { id: string },
      context: any,
    ) => {
      resolverLogger.info({ id }, 'Deleting product increment');

      const userId = getUserId(context);
      const result = await productIncrementService.deleteIncrement(id, userId);

      if (!result.success) {
        throw new GraphQLError(result.error || 'Failed to delete increment', {
          extensions: { code: 'BAD_REQUEST' },
        });
      }

      return true;
    },

    /**
     * Start an increment
     */
    startProductIncrement: async (
      _: any,
      { id }: { id: string },
      context: any,
    ) => {
      resolverLogger.info({ id }, 'Starting product increment');

      const userId = getUserId(context);
      const result = await productIncrementService.startIncrement(id, userId);

      if (!result.success || !result.data) {
        throw new GraphQLError(result.error || 'Failed to start increment', {
          extensions: { code: 'BAD_REQUEST' },
        });
      }

      const increment = transformIncrement(result.data);

      pubsub.publish(EVENTS.INCREMENT_UPDATED, {
        productIncrementUpdated: increment,
      });

      return increment;
    },

    /**
     * Complete an increment
     */
    completeProductIncrement: async (
      _: any,
      { id }: { id: string },
      context: any,
    ) => {
      resolverLogger.info({ id }, 'Completing product increment');

      const userId = getUserId(context);
      const result = await productIncrementService.completeIncrement(id, userId);

      if (!result.success || !result.data) {
        throw new GraphQLError(result.error || 'Failed to complete increment', {
          extensions: { code: 'BAD_REQUEST' },
        });
      }

      const increment = transformIncrement(result.data);

      pubsub.publish(EVENTS.INCREMENT_UPDATED, {
        productIncrementUpdated: increment,
      });

      return increment;
    },

    /**
     * Release an increment
     */
    releaseProductIncrement: async (
      _: any,
      {
        id,
        releaseNotes,
        releaseTag,
        releaseUrl,
      }: {
        id: string;
        releaseNotes: string;
        releaseTag: string;
        releaseUrl?: string;
      },
      context: any,
    ) => {
      resolverLogger.info({ id, releaseTag }, 'Releasing product increment');

      const userId = getUserId(context);
      const result = await productIncrementService.releaseIncrement(
        id,
        releaseNotes,
        releaseTag,
        userId,
        releaseUrl,
      );

      if (!result.success || !result.data) {
        throw new GraphQLError(result.error || 'Failed to release increment', {
          extensions: { code: 'BAD_REQUEST' },
        });
      }

      const increment = transformIncrement(result.data);

      pubsub.publish(EVENTS.INCREMENT_UPDATED, {
        productIncrementUpdated: increment,
      });

      return increment;
    },

    /**
     * Create a goal
     */
    createIncrementGoal: async (
      _: any,
      { input }: { input: any },
      context: any,
    ) => {
      resolverLogger.info({ input }, 'Creating increment goal');

      const userId = getUserId(context);
      const dbInput = {
        ...input,
        category: input.category?.toLowerCase(),
        priority: input.priority?.toLowerCase(),
      };

      const result = await productIncrementService.createGoal(dbInput, userId);

      if (!result.success || !result.data) {
        throw new GraphQLError(result.error || 'Failed to create goal', {
          extensions: { code: 'BAD_REQUEST' },
        });
      }

      const goal = transformGoal(result.data);

      pubsub.publish(EVENTS.GOAL_UPDATED, {
        goalUpdated: goal,
      });

      return goal;
    },

    /**
     * Update a goal
     */
    updateIncrementGoal: async (
      _: any,
      { id, input }: { id: string; input: any },
      context: any,
    ) => {
      resolverLogger.info({ id, input }, 'Updating increment goal');

      const dbInput = {
        ...input,
        category: input.category?.toLowerCase(),
        priority: input.priority?.toLowerCase(),
        status: input.status ? mapGoalStatusToDb(input.status) : undefined,
      };

      const result = await productIncrementService.updateGoal(id, dbInput);

      if (!result.success || !result.data) {
        throw new GraphQLError(result.error || 'Failed to update goal', {
          extensions: { code: 'BAD_REQUEST' },
        });
      }

      const goal = transformGoal(result.data);

      pubsub.publish(EVENTS.GOAL_UPDATED, {
        goalUpdated: goal,
      });

      return goal;
    },

    /**
     * Delete a goal
     */
    deleteIncrementGoal: async (
      _: any,
      { id }: { id: string },
      context: any,
    ) => {
      const result = await productIncrementService.deleteGoal(id);

      if (!result.success) {
        throw new GraphQLError(result.error || 'Failed to delete goal', {
          extensions: { code: 'BAD_REQUEST' },
        });
      }

      return true;
    },

    /**
     * Create a deliverable
     */
    createDeliverable: async (
      _: any,
      { input }: { input: any },
      context: any,
    ) => {
      resolverLogger.info({ input }, 'Creating deliverable');

      const userId = getUserId(context);
      const dbInput = {
        ...input,
        deliverableType: input.deliverableType?.toLowerCase(),
        priority: input.priority?.toLowerCase(),
      };

      const result = await productIncrementService.createDeliverable(dbInput, userId);

      if (!result.success || !result.data) {
        throw new GraphQLError(result.error || 'Failed to create deliverable', {
          extensions: { code: 'BAD_REQUEST' },
        });
      }

      const deliverable = transformDeliverable(result.data);

      pubsub.publish(EVENTS.DELIVERABLE_UPDATED, {
        deliverableUpdated: deliverable,
      });

      return deliverable;
    },

    /**
     * Update a deliverable
     */
    updateDeliverable: async (
      _: any,
      { id, input }: { id: string; input: any },
      context: any,
    ) => {
      resolverLogger.info({ id, input }, 'Updating deliverable');

      const dbInput = {
        ...input,
        deliverableType: input.deliverableType?.toLowerCase(),
        priority: input.priority?.toLowerCase(),
        status: input.status ? mapDeliverableStatusToDb(input.status) : undefined,
      };

      const result = await productIncrementService.updateDeliverable(id, dbInput);

      if (!result.success || !result.data) {
        throw new GraphQLError(result.error || 'Failed to update deliverable', {
          extensions: { code: 'BAD_REQUEST' },
        });
      }

      const deliverable = transformDeliverable(result.data);

      pubsub.publish(EVENTS.DELIVERABLE_UPDATED, {
        deliverableUpdated: deliverable,
      });

      return deliverable;
    },

    /**
     * Delete a deliverable
     */
    deleteDeliverable: async (
      _: any,
      { id }: { id: string },
      context: any,
    ) => {
      const result = await productIncrementService.deleteDeliverable(id);

      if (!result.success) {
        throw new GraphQLError(result.error || 'Failed to delete deliverable', {
          extensions: { code: 'BAD_REQUEST' },
        });
      }

      return true;
    },

    /**
     * Assign a deliverable to a user
     */
    assignDeliverable: async (
      _: any,
      {
        id,
        assigneeId,
        assigneeName,
      }: { id: string; assigneeId: string; assigneeName?: string },
      context: any,
    ) => {
      const result = await productIncrementService.assignDeliverable(
        id,
        assigneeId,
        assigneeName,
      );

      if (!result.success || !result.data) {
        throw new GraphQLError(result.error || 'Failed to assign deliverable', {
          extensions: { code: 'BAD_REQUEST' },
        });
      }

      const deliverable = transformDeliverable(result.data);

      pubsub.publish(EVENTS.DELIVERABLE_UPDATED, {
        deliverableUpdated: deliverable,
      });

      return deliverable;
    },

    /**
     * Update deliverable status
     */
    updateDeliverableStatus: async (
      _: any,
      { id, status }: { id: string; status: string },
      context: any,
    ) => {
      const result = await productIncrementService.updateDeliverableStatus(
        id,
        mapDeliverableStatusToDb(status),
      );

      if (!result.success || !result.data) {
        throw new GraphQLError(
          result.error || 'Failed to update deliverable status',
          { extensions: { code: 'BAD_REQUEST' } },
        );
      }

      const deliverable = transformDeliverable(result.data);

      pubsub.publish(EVENTS.DELIVERABLE_UPDATED, {
        deliverableUpdated: deliverable,
      });

      return deliverable;
    },

    /**
     * Assign team member
     */
    assignTeamMember: async (
      _: any,
      { input }: { input: any },
      context: any,
    ) => {
      resolverLogger.info({ input }, 'Assigning team member');

      const dbInput = {
        ...input,
        role: input.role?.toLowerCase(),
      };

      const result = await productIncrementService.assignTeamMember(dbInput);

      if (!result.success || !result.data) {
        throw new GraphQLError(result.error || 'Failed to assign team member', {
          extensions: { code: 'BAD_REQUEST' },
        });
      }

      return transformTeamAssignment(result.data);
    },

    /**
     * Remove team member
     */
    removeTeamMember: async (
      _: any,
      { incrementId, userId }: { incrementId: string; userId: string },
      context: any,
    ) => {
      const result = await productIncrementService.removeTeamMember(
        incrementId,
        userId,
      );

      if (!result.success) {
        throw new GraphQLError(result.error || 'Failed to remove team member', {
          extensions: { code: 'BAD_REQUEST' },
        });
      }

      return true;
    },

    /**
     * Record metrics snapshot
     */
    recordIncrementMetrics: async (
      _: any,
      { incrementId }: { incrementId: string },
      context: any,
    ) => {
      return productIncrementService.recordMetricsSnapshot(incrementId);
    },
  },

  // ===========================================================================
  // SUBSCRIPTIONS
  // ===========================================================================
  Subscription: {
    productIncrementUpdated: {
      subscribe: (_: any, { tenantId }: { tenantId: string }) => {
        return pubsub.asyncIterator([EVENTS.INCREMENT_UPDATED]);
      },
    },

    deliverableUpdated: {
      subscribe: (_: any, { incrementId }: { incrementId: string }) => {
        return pubsub.asyncIterator([EVENTS.DELIVERABLE_UPDATED]);
      },
    },

    goalUpdated: {
      subscribe: (_: any, { incrementId }: { incrementId: string }) => {
        return pubsub.asyncIterator([EVENTS.GOAL_UPDATED]);
      },
    },
  },

  // ===========================================================================
  // TYPE RESOLVERS
  // ===========================================================================
  ProductIncrement: {
    goals: async (parent: any) => {
      const goals = await productIncrementService.listGoals(parent.id);
      return goals.map(transformGoal);
    },

    deliverables: async (parent: any) => {
      const deliverables = await productIncrementService.listDeliverables(parent.id);
      return deliverables.map(transformDeliverable);
    },

    teamMembers: async (parent: any) => {
      const members = await productIncrementService.listTeamMembers(parent.id);
      return members.map(transformTeamAssignment);
    },
  },

  IncrementGoal: {
    increment: async (parent: any) => {
      const increment = await productIncrementService.getIncrement(parent.incrementId);
      return increment ? transformIncrement(increment) : null;
    },

    deliverables: async (parent: any) => {
      const deliverables = await productIncrementService.listDeliverables(
        parent.incrementId,
        { goalId: parent.id },
      );
      return deliverables.map(transformDeliverable);
    },
  },

  Deliverable: {
    increment: async (parent: any) => {
      const increment = await productIncrementService.getIncrement(parent.incrementId);
      return increment ? transformIncrement(increment) : null;
    },

    goal: async (parent: any) => {
      if (!parent.goalId) return null;
      const goal = await productIncrementService.getGoal(parent.goalId);
      return goal ? transformGoal(goal) : null;
    },

    parent: async (parent: any) => {
      if (!parent.parentId) return null;
      const parentDeliverable = await productIncrementService.getDeliverable(
        parent.parentId,
      );
      return parentDeliverable ? transformDeliverable(parentDeliverable) : null;
    },

    children: async (parent: any) => {
      const pool = getPostgresPool();
      const repo = new ProductIncrementRepo(pool);
      const deliverables = await repo.listDeliverables(parent.incrementId);
      return deliverables
        .filter((d) => d.parentId === parent.id)
        .map(transformDeliverable);
    },

    investigation: async (parent: any, _: any, context: any) => {
      if (!parent.investigationId) return null;
      // This would use the Investigation dataloader/resolver
      // For now, return a placeholder
      return { id: parent.investigationId };
    },
  },

  TeamAssignment: {
    increment: async (parent: any) => {
      const increment = await productIncrementService.getIncrement(parent.incrementId);
      return increment ? transformIncrement(increment) : null;
    },
  },
};

export default productIncrementResolvers;
