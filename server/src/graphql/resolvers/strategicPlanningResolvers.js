"use strict";
// @ts-nocheck
/**
 * Strategic Planning GraphQL Resolvers
 *
 * Resolvers for strategic planning queries, mutations, and subscriptions.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const graphql_1 = require("graphql");
const graphql_subscriptions_1 = require("graphql-subscriptions");
const pino_1 = __importDefault(require("pino"));
const database_js_1 = require("../../config/database.js");
const StrategicPlanningService_js_1 = require("../../services/StrategicPlanningService.js");
const logger = pino_1.default({ name: 'strategicPlanningResolvers' });
const pubsub = new graphql_subscriptions_1.PubSub();
// Subscription event names
const EVENTS = {
    PLAN_UPDATED: 'STRATEGIC_PLAN_UPDATED',
    OBJECTIVE_PROGRESS_UPDATED: 'OBJECTIVE_PROGRESS_UPDATED',
    RISK_LEVEL_CHANGED: 'RISK_LEVEL_CHANGED',
    MILESTONE_COMPLETED: 'MILESTONE_COMPLETED',
};
function requireAuth(context) {
    if (!context.isAuthenticated || !context.user) {
        throw new graphql_1.GraphQLError('Authentication required', {
            extensions: { code: 'UNAUTHENTICATED' },
        });
    }
    if (!context.user.tenantId) {
        throw new graphql_1.GraphQLError('Tenant ID required', {
            extensions: { code: 'FORBIDDEN' },
        });
    }
    return {
        userId: context.user.id,
        tenantId: context.user.tenantId,
    };
}
function getService() {
    const pool = (0, database_js_1.getPostgresPool)();
    return (0, StrategicPlanningService_js_1.getStrategicPlanningService)(pool);
}
const strategicPlanningResolvers = {
    // ============================================================================
    // QUERIES
    // ============================================================================
    Query: {
        strategicPlan: async (_, { id }, context) => {
            const { tenantId } = requireAuth(context);
            const service = getService();
            logger.info({ planId: id, tenantId }, 'Fetching strategic plan');
            return service.getPlan(id, tenantId);
        },
        strategicPlans: async (_, { filter, limit = 50, offset = 0, }, context) => {
            const { tenantId } = requireAuth(context);
            const service = getService();
            logger.info({ filter, limit, offset, tenantId }, 'Listing strategic plans');
            return service.listPlans(tenantId, filter, limit, offset);
        },
        planProgress: async (_, { planId }, context) => {
            const { tenantId } = requireAuth(context);
            const service = getService();
            return service.getPlanProgress(planId, tenantId);
        },
        planTimeline: async (_, { planId }, context) => {
            const { tenantId } = requireAuth(context);
            const service = getService();
            return service.getPlanTimeline(planId, tenantId);
        },
        planScorecard: async (_, { planId, period, }, context) => {
            const { tenantId } = requireAuth(context);
            const service = getService();
            return service.getPlanScorecard(planId, tenantId, period);
        },
        planActivityLog: async (_, { planId, limit = 50 }, context) => {
            requireAuth(context);
            const service = getService();
            return service.getActivityLog(planId, limit);
        },
        strategicObjective: async (_, { id }, context) => {
            requireAuth(context);
            const pool = (0, database_js_1.getPostgresPool)();
            const { StrategicPlanRepo } = await Promise.resolve().then(() => __importStar(require('../../repos/StrategicPlanRepo.js')));
            const repo = new StrategicPlanRepo(pool);
            return repo.findObjectiveById(id);
        },
        initiative: async (_, { id }, context) => {
            requireAuth(context);
            const pool = (0, database_js_1.getPostgresPool)();
            const { StrategicPlanRepo } = await Promise.resolve().then(() => __importStar(require('../../repos/StrategicPlanRepo.js')));
            const repo = new StrategicPlanRepo(pool);
            return repo.findInitiativeById(id);
        },
        risk: async (_, { id }, context) => {
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
        createStrategicPlan: async (_, { input }, context) => {
            const { userId, tenantId } = requireAuth(context);
            const service = getService();
            logger.info({ input, userId, tenantId }, 'Creating strategic plan');
            const plan = await service.createPlan({ ...input, tenantId }, userId);
            return plan;
        },
        updateStrategicPlan: async (_, { id, input }, context) => {
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
        deleteStrategicPlan: async (_, { id }, context) => {
            const { userId, tenantId } = requireAuth(context);
            const service = getService();
            logger.info({ planId: id, userId }, 'Deleting strategic plan');
            return service.deletePlan(id, userId, tenantId);
        },
        approveStrategicPlan: async (_, { id }, context) => {
            const { userId, tenantId } = requireAuth(context);
            const service = getService();
            logger.info({ planId: id, userId }, 'Approving strategic plan');
            return service.approvePlan(id, userId, tenantId);
        },
        activateStrategicPlan: async (_, { id }, context) => {
            const { userId, tenantId } = requireAuth(context);
            const service = getService();
            logger.info({ planId: id, userId }, 'Activating strategic plan');
            return service.activatePlan(id, userId, tenantId);
        },
        // Objectives
        createObjective: async (_, { input }, context) => {
            const { userId, tenantId } = requireAuth(context);
            const service = getService();
            logger.info({ input, userId }, 'Creating objective');
            return service.createObjective(input, userId, tenantId);
        },
        updateObjective: async (_, { id, input }, context) => {
            const { userId } = requireAuth(context);
            const service = getService();
            return service.updateObjective(id, input, userId);
        },
        deleteObjective: async (_, { id }, context) => {
            const { userId } = requireAuth(context);
            const pool = (0, database_js_1.getPostgresPool)();
            const { StrategicPlanRepo } = await Promise.resolve().then(() => __importStar(require('../../repos/StrategicPlanRepo.js')));
            const repo = new StrategicPlanRepo(pool);
            return repo.deleteObjective(id, userId);
        },
        updateObjectiveProgress: async (_, { id, currentValue }, context) => {
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
        createKeyResult: async (_, { input }, context) => {
            const { userId } = requireAuth(context);
            const service = getService();
            return service.addKeyResult(input.objectiveId, input, userId);
        },
        updateKeyResultProgress: async (_, { id, currentValue }, context) => {
            const { userId } = requireAuth(context);
            const service = getService();
            return service.updateKeyResultProgress(id, currentValue, userId);
        },
        // Initiatives
        createInitiative: async (_, { input }, context) => {
            const { userId, tenantId } = requireAuth(context);
            const service = getService();
            return service.createInitiative(input, userId, tenantId);
        },
        updateInitiative: async (_, { id, input }, context) => {
            const { userId } = requireAuth(context);
            const service = getService();
            return service.updateInitiative(id, input, userId);
        },
        deleteInitiative: async (_, { id }, context) => {
            const { userId } = requireAuth(context);
            const pool = (0, database_js_1.getPostgresPool)();
            const { StrategicPlanRepo } = await Promise.resolve().then(() => __importStar(require('../../repos/StrategicPlanRepo.js')));
            const repo = new StrategicPlanRepo(pool);
            return repo.deleteInitiative(id, userId);
        },
        // Deliverables
        createDeliverable: async (_, { input }, context) => {
            const { userId } = requireAuth(context);
            const service = getService();
            return service.addDeliverable(input.initiativeId, input, userId);
        },
        completeDeliverable: async (_, { id }, context) => {
            const { userId } = requireAuth(context);
            const service = getService();
            return service.completeDeliverable(id, userId);
        },
        // Milestones
        createMilestone: async (_, { input }, context) => {
            const { userId } = requireAuth(context);
            const service = getService();
            return service.createMilestone(input, userId);
        },
        completeMilestone: async (_, { id }, context) => {
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
        deferMilestone: async (_, { id }, context) => {
            const { userId } = requireAuth(context);
            const service = getService();
            return service.deferMilestone(id, userId);
        },
        // Risks
        createRisk: async (_, { input }, context) => {
            const { userId, tenantId } = requireAuth(context);
            const service = getService();
            return service.createRisk(input, userId, tenantId);
        },
        updateRisk: async (_, { id, input }, context) => {
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
        createMitigation: async (_, { input }, context) => {
            const { userId } = requireAuth(context);
            const service = getService();
            return service.addMitigationStrategy(input.riskId, input, userId);
        },
        // Stakeholders
        addStakeholder: async (_, { input }, context) => {
            const { userId, tenantId } = requireAuth(context);
            const service = getService();
            return service.addStakeholder(input, userId, tenantId);
        },
        removeStakeholder: async (_, { planId, userId: stakeholderUserId }, context) => {
            const { userId, tenantId } = requireAuth(context);
            const service = getService();
            return service.removeStakeholder(planId, stakeholderUserId, userId, tenantId);
        },
        // Resources
        allocateResource: async (_, { input }, context) => {
            const { userId, tenantId } = requireAuth(context);
            const service = getService();
            return service.allocateResource(input, userId, tenantId);
        },
        updateResourceUsage: async (_, { id, used, status }, context) => {
            requireAuth(context);
            const service = getService();
            return service.updateResourceUsage(id, used, status);
        },
        // KPIs
        createKPI: async (_, { input }, context) => {
            const { userId, tenantId } = requireAuth(context);
            const service = getService();
            return service.createKPI(input, userId, tenantId);
        },
        updateKPIValue: async (_, { id, value, notes }, context) => {
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
            subscribe: (_, { planId }) => {
                return pubsub.asyncIterableIterator(`${EVENTS.PLAN_UPDATED}.${planId}`);
            },
        },
        objectiveProgressUpdated: {
            subscribe: (_, { planId }) => {
                return pubsub.asyncIterableIterator(`${EVENTS.OBJECTIVE_PROGRESS_UPDATED}.${planId}`);
            },
        },
        riskLevelChanged: {
            subscribe: (_, { planId }) => {
                return pubsub.asyncIterableIterator(`${EVENTS.RISK_LEVEL_CHANGED}.${planId}`);
            },
        },
        milestoneCompleted: {
            subscribe: (_, { planId }) => {
                return pubsub.asyncIterableIterator(`${EVENTS.MILESTONE_COMPLETED}.${planId}`);
            },
        },
    },
    // ============================================================================
    // TYPE RESOLVERS
    // ============================================================================
    StrategicPlan: {
        progress: async (parent, _, context) => {
            const { tenantId } = requireAuth(context);
            const service = getService();
            return service.getPlanProgress(parent.id, tenantId);
        },
        timeline: async (parent, _, context) => {
            const { tenantId } = requireAuth(context);
            const service = getService();
            return service.getPlanTimeline(parent.id, tenantId);
        },
    },
    StrategicObjective: {
        progress: (parent) => {
            if (parent.targetValue === 0)
                return 0;
            return Math.min(100, (parent.currentValue / parent.targetValue) * 100);
        },
    },
    KeyResult: {
        progress: (parent) => {
            if (parent.targetValue === 0)
                return 0;
            return Math.min(100, (parent.currentValue / parent.targetValue) * 100);
        },
    },
    Initiative: {
        budgetUtilization: (parent) => {
            if (!parent.budget || parent.budget === 0)
                return null;
            return ((parent.budgetUsed || 0) / parent.budget) * 100;
        },
    },
    Milestone: {
        isOverdue: (parent) => {
            if (parent.status === 'COMPLETED')
                return false;
            return new Date(parent.dueDate) < new Date();
        },
        daysUntilDue: (parent) => {
            const now = new Date();
            const due = new Date(parent.dueDate);
            const diffTime = due.getTime() - now.getTime();
            return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        },
    },
    ResourceAllocation: {
        utilizationRate: (parent) => {
            if (parent.allocated === 0)
                return 0;
            return (parent.used / parent.allocated) * 100;
        },
    },
    KeyPerformanceIndicator: {
        achievement: (parent) => {
            if (parent.targetValue === 0)
                return 0;
            return Math.min(100, (parent.currentValue / parent.targetValue) * 100);
        },
    },
};
exports.default = strategicPlanningResolvers;
