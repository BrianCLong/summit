"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.productIncrementResolvers = void 0;
const graphql_1 = require("graphql");
const graphql_subscriptions_1 = require("graphql-subscriptions");
const logger_js_1 = __importDefault(require("../../config/logger.js"));
const ProductIncrementService_js_1 = require("../../services/ProductIncrementService.js");
const database_js_1 = require("../../config/database.js");
const ProductIncrementRepo_js_1 = require("../../repos/ProductIncrementRepo.js");
const resolverLogger = logger_js_1.default.child({ name: 'ProductIncrementResolvers' });
// PubSub for subscriptions
const pubsub = new graphql_subscriptions_1.PubSub();
// Subscription events
const EVENTS = {
    INCREMENT_UPDATED: 'INCREMENT_UPDATED',
    DELIVERABLE_UPDATED: 'DELIVERABLE_UPDATED',
    GOAL_UPDATED: 'GOAL_UPDATED',
};
// Helper to get user ID from context
function getUserId(context) {
    return context.user?.id || context.userId || 'anonymous';
}
// Helper to get tenant ID from context or args
function getTenantId(context, args) {
    return args?.tenantId || context.tenantId || context.user?.tenantId || 'default';
}
// Map GraphQL enum to database enum
function mapStatusToDb(status) {
    return status.toLowerCase();
}
function mapStatusToGraphQL(status) {
    return status.toUpperCase();
}
function mapGoalStatusToDb(status) {
    return status.toLowerCase().replace(/_/g, '_');
}
function mapDeliverableStatusToDb(status) {
    return status.toLowerCase().replace(/_/g, '_');
}
// Transform increment for GraphQL response
function transformIncrement(increment) {
    return {
        ...increment,
        status: mapStatusToGraphQL(increment.status),
    };
}
function transformGoal(goal) {
    return {
        ...goal,
        status: goal.status.toUpperCase(),
        category: goal.category.toUpperCase(),
        priority: goal.priority.toUpperCase(),
    };
}
function transformDeliverable(deliverable) {
    return {
        ...deliverable,
        status: deliverable.status.toUpperCase().replace(/_/g, '_'),
        deliverableType: deliverable.deliverableType.toUpperCase(),
        priority: deliverable.priority.toUpperCase(),
    };
}
function transformTeamAssignment(assignment) {
    return {
        ...assignment,
        role: assignment.role.toUpperCase(),
    };
}
// =============================================================================
// RESOLVERS
// =============================================================================
exports.productIncrementResolvers = {
    // ===========================================================================
    // QUERIES
    // ===========================================================================
    Query: {
        /**
         * Get a product increment by ID
         */
        productIncrement: async (_, { id }, context) => {
            resolverLogger.info({ id }, 'Fetching product increment');
            const increment = await ProductIncrementService_js_1.productIncrementService.getIncrement(id);
            if (!increment) {
                return null;
            }
            return transformIncrement(increment);
        },
        /**
         * Get increment with summary metrics
         */
        productIncrementSummary: async (_, { id }, context) => {
            resolverLogger.info({ id }, 'Fetching increment summary');
            const summary = await ProductIncrementService_js_1.productIncrementService.getIncrementSummary(id);
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
        productIncrementStatistics: async (_, { id }, context) => {
            resolverLogger.info({ id }, 'Fetching increment statistics');
            const stats = await ProductIncrementService_js_1.productIncrementService.getIncrementStatistics(id);
            if (!stats) {
                return null;
            }
            return {
                ...stats,
                status: mapStatusToGraphQL(stats.status),
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
        productIncrements: async (_, { tenantId, filter, limit, offset, }, context) => {
            resolverLogger.info({ tenantId, filter }, 'Listing product increments');
            // Transform filter status if provided
            const dbFilter = filter
                ? {
                    ...filter,
                    status: filter.status?.map(mapStatusToDb),
                }
                : undefined;
            const increments = await ProductIncrementService_js_1.productIncrementService.listIncrements(tenantId, dbFilter, limit, offset);
            return increments.map(transformIncrement);
        },
        /**
         * Get current active increment
         */
        currentProductIncrement: async (_, { tenantId }, context) => {
            resolverLogger.info({ tenantId }, 'Fetching current increment');
            const increment = await ProductIncrementService_js_1.productIncrementService.getCurrentIncrement(tenantId);
            return increment ? transformIncrement(increment) : null;
        },
        /**
         * Get a goal by ID
         */
        incrementGoal: async (_, { id }, context) => {
            const goal = await ProductIncrementService_js_1.productIncrementService.getGoal(id);
            return goal ? transformGoal(goal) : null;
        },
        /**
         * List goals for an increment
         */
        incrementGoals: async (_, { incrementId }, context) => {
            const goals = await ProductIncrementService_js_1.productIncrementService.listGoals(incrementId);
            return goals.map(transformGoal);
        },
        /**
         * Get a deliverable by ID
         */
        deliverable: async (_, { id }, context) => {
            const deliverable = await ProductIncrementService_js_1.productIncrementService.getDeliverable(id);
            return deliverable ? transformDeliverable(deliverable) : null;
        },
        /**
         * List deliverables for an increment
         */
        deliverables: async (_, { incrementId, filter }, context) => {
            const options = filter
                ? {
                    status: filter.status?.map(mapDeliverableStatusToDb),
                    assigneeId: filter.assigneeId,
                    goalId: filter.goalId,
                }
                : undefined;
            const deliverables = await ProductIncrementService_js_1.productIncrementService.listDeliverables(incrementId, options);
            return deliverables.map(transformDeliverable);
        },
        /**
         * Get team members for an increment
         */
        incrementTeamMembers: async (_, { incrementId }, context) => {
            const members = await ProductIncrementService_js_1.productIncrementService.listTeamMembers(incrementId);
            return members.map(transformTeamAssignment);
        },
        /**
         * Get burndown chart data
         */
        incrementBurndown: async (_, { incrementId }, context) => {
            return ProductIncrementService_js_1.productIncrementService.getBurndownData(incrementId);
        },
        /**
         * Get velocity history
         */
        velocityHistory: async (_, { tenantId, limit }, context) => {
            const history = await ProductIncrementService_js_1.productIncrementService.getVelocityHistory(tenantId, limit);
            return history.map(({ increment, velocity }) => ({
                increment: transformIncrement(increment),
                velocity,
            }));
        },
        /**
         * Get metrics history
         */
        incrementMetricsHistory: async (_, { incrementId, startDate, endDate, }, context) => {
            const pool = (0, database_js_1.getPostgresPool)();
            const repo = new ProductIncrementRepo_js_1.ProductIncrementRepo(pool);
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
        createProductIncrement: async (_, { input }, context) => {
            resolverLogger.info({ input }, 'Creating product increment');
            const userId = getUserId(context);
            const dbInput = {
                ...input,
                status: input.status ? mapStatusToDb(input.status) : undefined,
            };
            const result = await ProductIncrementService_js_1.productIncrementService.createIncrement(dbInput, userId);
            if (!result.success || !result.data) {
                throw new graphql_1.GraphQLError(result.error || 'Failed to create increment', {
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
        updateProductIncrement: async (_, { id, input }, context) => {
            resolverLogger.info({ id, input }, 'Updating product increment');
            const userId = getUserId(context);
            const dbInput = {
                ...input,
                status: input.status ? mapStatusToDb(input.status) : undefined,
            };
            const result = await ProductIncrementService_js_1.productIncrementService.updateIncrement(id, dbInput, userId);
            if (!result.success || !result.data) {
                throw new graphql_1.GraphQLError(result.error || 'Failed to update increment', {
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
        deleteProductIncrement: async (_, { id }, context) => {
            resolverLogger.info({ id }, 'Deleting product increment');
            const userId = getUserId(context);
            const result = await ProductIncrementService_js_1.productIncrementService.deleteIncrement(id, userId);
            if (!result.success) {
                throw new graphql_1.GraphQLError(result.error || 'Failed to delete increment', {
                    extensions: { code: 'BAD_REQUEST' },
                });
            }
            return true;
        },
        /**
         * Start an increment
         */
        startProductIncrement: async (_, { id }, context) => {
            resolverLogger.info({ id }, 'Starting product increment');
            const userId = getUserId(context);
            const result = await ProductIncrementService_js_1.productIncrementService.startIncrement(id, userId);
            if (!result.success || !result.data) {
                throw new graphql_1.GraphQLError(result.error || 'Failed to start increment', {
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
        completeProductIncrement: async (_, { id }, context) => {
            resolverLogger.info({ id }, 'Completing product increment');
            const userId = getUserId(context);
            const result = await ProductIncrementService_js_1.productIncrementService.completeIncrement(id, userId);
            if (!result.success || !result.data) {
                throw new graphql_1.GraphQLError(result.error || 'Failed to complete increment', {
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
        releaseProductIncrement: async (_, { id, releaseNotes, releaseTag, releaseUrl, }, context) => {
            resolverLogger.info({ id, releaseTag }, 'Releasing product increment');
            const userId = getUserId(context);
            const result = await ProductIncrementService_js_1.productIncrementService.releaseIncrement(id, releaseNotes, releaseTag, userId, releaseUrl);
            if (!result.success || !result.data) {
                throw new graphql_1.GraphQLError(result.error || 'Failed to release increment', {
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
        createIncrementGoal: async (_, { input }, context) => {
            resolverLogger.info({ input }, 'Creating increment goal');
            const userId = getUserId(context);
            const dbInput = {
                ...input,
                category: input.category?.toLowerCase(),
                priority: input.priority?.toLowerCase(),
            };
            const result = await ProductIncrementService_js_1.productIncrementService.createGoal(dbInput, userId);
            if (!result.success || !result.data) {
                throw new graphql_1.GraphQLError(result.error || 'Failed to create goal', {
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
        updateIncrementGoal: async (_, { id, input }, context) => {
            resolverLogger.info({ id, input }, 'Updating increment goal');
            const dbInput = {
                ...input,
                category: input.category?.toLowerCase(),
                priority: input.priority?.toLowerCase(),
                status: input.status ? mapGoalStatusToDb(input.status) : undefined,
            };
            const result = await ProductIncrementService_js_1.productIncrementService.updateGoal(id, dbInput);
            if (!result.success || !result.data) {
                throw new graphql_1.GraphQLError(result.error || 'Failed to update goal', {
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
        deleteIncrementGoal: async (_, { id }, context) => {
            const result = await ProductIncrementService_js_1.productIncrementService.deleteGoal(id);
            if (!result.success) {
                throw new graphql_1.GraphQLError(result.error || 'Failed to delete goal', {
                    extensions: { code: 'BAD_REQUEST' },
                });
            }
            return true;
        },
        /**
         * Create a deliverable
         */
        createDeliverable: async (_, { input }, context) => {
            resolverLogger.info({ input }, 'Creating deliverable');
            const userId = getUserId(context);
            const dbInput = {
                ...input,
                deliverableType: input.deliverableType?.toLowerCase(),
                priority: input.priority?.toLowerCase(),
            };
            const result = await ProductIncrementService_js_1.productIncrementService.createDeliverable(dbInput, userId);
            if (!result.success || !result.data) {
                throw new graphql_1.GraphQLError(result.error || 'Failed to create deliverable', {
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
        updateDeliverable: async (_, { id, input }, context) => {
            resolverLogger.info({ id, input }, 'Updating deliverable');
            const dbInput = {
                ...input,
                deliverableType: input.deliverableType?.toLowerCase(),
                priority: input.priority?.toLowerCase(),
                status: input.status ? mapDeliverableStatusToDb(input.status) : undefined,
            };
            const result = await ProductIncrementService_js_1.productIncrementService.updateDeliverable(id, dbInput);
            if (!result.success || !result.data) {
                throw new graphql_1.GraphQLError(result.error || 'Failed to update deliverable', {
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
        deleteDeliverable: async (_, { id }, context) => {
            const result = await ProductIncrementService_js_1.productIncrementService.deleteDeliverable(id);
            if (!result.success) {
                throw new graphql_1.GraphQLError(result.error || 'Failed to delete deliverable', {
                    extensions: { code: 'BAD_REQUEST' },
                });
            }
            return true;
        },
        /**
         * Assign a deliverable to a user
         */
        assignDeliverable: async (_, { id, assigneeId, assigneeName, }, context) => {
            const result = await ProductIncrementService_js_1.productIncrementService.assignDeliverable(id, assigneeId, assigneeName);
            if (!result.success || !result.data) {
                throw new graphql_1.GraphQLError(result.error || 'Failed to assign deliverable', {
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
        updateDeliverableStatus: async (_, { id, status }, context) => {
            const result = await ProductIncrementService_js_1.productIncrementService.updateDeliverableStatus(id, mapDeliverableStatusToDb(status));
            if (!result.success || !result.data) {
                throw new graphql_1.GraphQLError(result.error || 'Failed to update deliverable status', { extensions: { code: 'BAD_REQUEST' } });
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
        assignTeamMember: async (_, { input }, context) => {
            resolverLogger.info({ input }, 'Assigning team member');
            const dbInput = {
                ...input,
                role: input.role?.toLowerCase(),
            };
            const result = await ProductIncrementService_js_1.productIncrementService.assignTeamMember(dbInput);
            if (!result.success || !result.data) {
                throw new graphql_1.GraphQLError(result.error || 'Failed to assign team member', {
                    extensions: { code: 'BAD_REQUEST' },
                });
            }
            return transformTeamAssignment(result.data);
        },
        /**
         * Remove team member
         */
        removeTeamMember: async (_, { incrementId, userId }, context) => {
            const result = await ProductIncrementService_js_1.productIncrementService.removeTeamMember(incrementId, userId);
            if (!result.success) {
                throw new graphql_1.GraphQLError(result.error || 'Failed to remove team member', {
                    extensions: { code: 'BAD_REQUEST' },
                });
            }
            return true;
        },
        /**
         * Record metrics snapshot
         */
        recordIncrementMetrics: async (_, { incrementId }, context) => {
            return ProductIncrementService_js_1.productIncrementService.recordMetricsSnapshot(incrementId);
        },
    },
    // ===========================================================================
    // SUBSCRIPTIONS
    // ===========================================================================
    Subscription: {
        productIncrementUpdated: {
            subscribe: (_, { tenantId }) => {
                return pubsub.asyncIterator([EVENTS.INCREMENT_UPDATED]);
            },
        },
        deliverableUpdated: {
            subscribe: (_, { incrementId }) => {
                return pubsub.asyncIterator([EVENTS.DELIVERABLE_UPDATED]);
            },
        },
        goalUpdated: {
            subscribe: (_, { incrementId }) => {
                return pubsub.asyncIterator([EVENTS.GOAL_UPDATED]);
            },
        },
    },
    // ===========================================================================
    // TYPE RESOLVERS
    // ===========================================================================
    ProductIncrement: {
        goals: async (parent) => {
            const goals = await ProductIncrementService_js_1.productIncrementService.listGoals(parent.id);
            return goals.map(transformGoal);
        },
        deliverables: async (parent) => {
            const deliverables = await ProductIncrementService_js_1.productIncrementService.listDeliverables(parent.id);
            return deliverables.map(transformDeliverable);
        },
        teamMembers: async (parent) => {
            const members = await ProductIncrementService_js_1.productIncrementService.listTeamMembers(parent.id);
            return members.map(transformTeamAssignment);
        },
    },
    IncrementGoal: {
        increment: async (parent) => {
            const increment = await ProductIncrementService_js_1.productIncrementService.getIncrement(parent.incrementId);
            return increment ? transformIncrement(increment) : null;
        },
        deliverables: async (parent) => {
            const deliverables = await ProductIncrementService_js_1.productIncrementService.listDeliverables(parent.incrementId, { goalId: parent.id });
            return deliverables.map(transformDeliverable);
        },
    },
    Deliverable: {
        increment: async (parent) => {
            const increment = await ProductIncrementService_js_1.productIncrementService.getIncrement(parent.incrementId);
            return increment ? transformIncrement(increment) : null;
        },
        goal: async (parent) => {
            if (!parent.goalId)
                return null;
            const goal = await ProductIncrementService_js_1.productIncrementService.getGoal(parent.goalId);
            return goal ? transformGoal(goal) : null;
        },
        parent: async (parent) => {
            if (!parent.parentId)
                return null;
            const parentDeliverable = await ProductIncrementService_js_1.productIncrementService.getDeliverable(parent.parentId);
            return parentDeliverable ? transformDeliverable(parentDeliverable) : null;
        },
        children: async (parent) => {
            const pool = (0, database_js_1.getPostgresPool)();
            const repo = new ProductIncrementRepo_js_1.ProductIncrementRepo(pool);
            const deliverables = await repo.listDeliverables(parent.incrementId);
            return deliverables
                .filter((d) => d.parentId === parent.id)
                .map(transformDeliverable);
        },
        investigation: async (parent, _, context) => {
            if (!parent.investigationId)
                return null;
            // This would use the Investigation dataloader/resolver
            // For now, return a placeholder
            return { id: parent.investigationId };
        },
    },
    TeamAssignment: {
        increment: async (parent) => {
            const increment = await ProductIncrementService_js_1.productIncrementService.getIncrement(parent.incrementId);
            return increment ? transformIncrement(increment) : null;
        },
    },
};
exports.default = exports.productIncrementResolvers;
