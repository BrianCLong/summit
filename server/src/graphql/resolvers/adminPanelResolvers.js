"use strict";
/**
 * Admin Panel GraphQL Resolvers
 *
 * Implements all admin panel operations with RBAC enforcement
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminPanelResolvers = void 0;
const graphql_1 = require("graphql");
const AdminPanelService_js_1 = require("../../services/AdminPanelService.js");
const auth_js_1 = require("../utils/auth.js");
// ============================================================================
// RESOLVERS
// ============================================================================
exports.adminPanelResolvers = {
    Query: {
        /**
         * Get admin dashboard statistics
         */
        adminDashboard: (0, auth_js_1.authGuard)(async (_parent, _args, context) => {
            // Role check
            if (!context.user.roles.includes(AdminPanelService_js_1.UserRole.ADMIN) && !context.user.roles.includes(AdminPanelService_js_1.UserRole.PLATFORM_ADMIN)) {
                throw new graphql_1.GraphQLError('Admin privileges required', { extensions: { code: 'FORBIDDEN' } });
            }
            const service = (0, AdminPanelService_js_1.getAdminPanelService)();
            return await service.getDashboardStats();
        }),
        /**
         * Search users with filters and pagination
         */
        users: (0, auth_js_1.authGuard)(async (_parent, args, context) => {
            if (!context.user.roles.includes(AdminPanelService_js_1.UserRole.ADMIN) && !context.user.roles.includes(AdminPanelService_js_1.UserRole.PLATFORM_ADMIN)) {
                throw new graphql_1.GraphQLError('Admin privileges required', { extensions: { code: 'FORBIDDEN' } });
            }
            const service = (0, AdminPanelService_js_1.getAdminPanelService)();
            const limit = args.first || 50;
            const offset = args.after ? parseInt(Buffer.from(args.after, 'base64').toString()) : 0;
            const { users, total } = await service.searchUsers(args.filters, limit, offset + 1);
            const hasNextPage = users.length > limit;
            const edges = (hasNextPage ? users.slice(0, limit) : users).map((user, index) => ({
                node: user,
                cursor: Buffer.from((offset + index).toString()).toString('base64'),
            }));
            return {
                edges,
                pageInfo: {
                    hasNextPage,
                    hasPreviousPage: offset > 0,
                    startCursor: edges[0]?.cursor,
                    endCursor: edges[edges.length - 1]?.cursor,
                },
                totalCount: total,
            };
        }),
        /**
         * Get single user by ID
         */
        user: (0, auth_js_1.authGuard)(async (_parent, args, context) => {
            if (!context.user.roles.includes(AdminPanelService_js_1.UserRole.ADMIN) && !context.user.roles.includes(AdminPanelService_js_1.UserRole.PLATFORM_ADMIN)) {
                throw new graphql_1.GraphQLError('Admin privileges required', { extensions: { code: 'FORBIDDEN' } });
            }
            const service = (0, AdminPanelService_js_1.getAdminPanelService)();
            const user = await service.getUserById(args.id);
            if (!user) {
                throw new graphql_1.GraphQLError('User not found', {
                    extensions: { code: 'NOT_FOUND' },
                });
            }
            return user;
        }),
        /**
         * Search users by query string
         */
        searchUsers: (0, auth_js_1.authGuard)(async (_parent, args, context) => {
            if (!context.user.roles.includes(AdminPanelService_js_1.UserRole.ADMIN) && !context.user.roles.includes(AdminPanelService_js_1.UserRole.PLATFORM_ADMIN)) {
                throw new graphql_1.GraphQLError('Admin privileges required', { extensions: { code: 'FORBIDDEN' } });
            }
            const service = (0, AdminPanelService_js_1.getAdminPanelService)();
            const { users } = await service.searchUsers({ query: args.query }, args.limit || 20, 0);
            return users;
        }),
        /**
         * Get audit logs with filters
         */
        auditLogs: (0, auth_js_1.authGuard)(async (_parent, args, context) => {
            if (!context.user.roles.includes(AdminPanelService_js_1.UserRole.ADMIN) && !context.user.roles.includes(AdminPanelService_js_1.UserRole.PLATFORM_ADMIN)) {
                throw new graphql_1.GraphQLError('Admin privileges required', { extensions: { code: 'FORBIDDEN' } });
            }
            const service = (0, AdminPanelService_js_1.getAdminPanelService)();
            const limit = args.first || 100;
            const offset = args.after ? parseInt(Buffer.from(args.after, 'base64').toString()) : 0;
            const { logs, total } = await service.getAuditLogs(args.filters, limit, offset + 1);
            const hasNextPage = logs.length > limit;
            const edges = (hasNextPage ? logs.slice(0, limit) : logs).map((log, index) => ({
                node: log,
                cursor: Buffer.from((offset + index).toString()).toString('base64'),
            }));
            return {
                edges,
                pageInfo: {
                    hasNextPage,
                    hasPreviousPage: offset > 0,
                    startCursor: edges[0]?.cursor,
                    endCursor: edges[edges.length - 1]?.cursor,
                },
                totalCount: total,
            };
        }),
        /**
         * Get moderation queue
         */
        moderationQueue: (0, auth_js_1.authGuard)(async (_parent, args, context) => {
            const allowedRoles = [AdminPanelService_js_1.UserRole.ADMIN, AdminPanelService_js_1.UserRole.PLATFORM_ADMIN, AdminPanelService_js_1.UserRole.MODERATOR];
            if (!context.user.roles.some(r => allowedRoles.includes(r))) {
                throw new graphql_1.GraphQLError('Moderator privileges required', { extensions: { code: 'FORBIDDEN' } });
            }
            const service = (0, AdminPanelService_js_1.getAdminPanelService)();
            const limit = args.first || 50;
            const offset = args.after ? parseInt(Buffer.from(args.after, 'base64').toString()) : 0;
            const { items, total } = await service.getModerationQueue(args.filters, limit, offset + 1);
            const hasNextPage = items.length > limit;
            const edges = (hasNextPage ? items.slice(0, limit) : items).map((item, index) => ({
                node: item,
                cursor: Buffer.from((offset + index).toString()).toString('base64'),
            }));
            return {
                edges,
                pageInfo: {
                    hasNextPage,
                    hasPreviousPage: offset > 0,
                    startCursor: edges[0]?.cursor,
                    endCursor: edges[edges.length - 1]?.cursor,
                },
                totalCount: total,
            };
        }),
        /**
         * Get all feature flags
         */
        featureFlags: (0, auth_js_1.authGuard)(async (_parent, _args, context) => {
            if (!context.user.roles.includes(AdminPanelService_js_1.UserRole.ADMIN) && !context.user.roles.includes(AdminPanelService_js_1.UserRole.PLATFORM_ADMIN)) {
                throw new graphql_1.GraphQLError('Admin privileges required', { extensions: { code: 'FORBIDDEN' } });
            }
            const service = (0, AdminPanelService_js_1.getAdminPanelService)();
            return await service.getFeatureFlags();
        }),
    },
    Mutation: {
        /**
         * Create new user
         */
        createUser: (0, auth_js_1.authGuard)(async (_parent, args, context) => {
            if (!context.user.roles.includes(AdminPanelService_js_1.UserRole.ADMIN) && !context.user.roles.includes(AdminPanelService_js_1.UserRole.PLATFORM_ADMIN)) {
                throw new graphql_1.GraphQLError('Admin privileges required', { extensions: { code: 'FORBIDDEN' } });
            }
            const service = (0, AdminPanelService_js_1.getAdminPanelService)();
            return await service.createUser(args.input, context.user.id);
        }),
        /**
         * Update user
         */
        updateUser: (0, auth_js_1.authGuard)(async (_parent, args, context) => {
            if (!context.user.roles.includes(AdminPanelService_js_1.UserRole.ADMIN) && !context.user.roles.includes(AdminPanelService_js_1.UserRole.PLATFORM_ADMIN)) {
                throw new graphql_1.GraphQLError('Admin privileges required', { extensions: { code: 'FORBIDDEN' } });
            }
            const service = (0, AdminPanelService_js_1.getAdminPanelService)();
            return await service.updateUser(args.id, args.input, context.user.id);
        }),
        /**
         * Delete user
         */
        deleteUser: (0, auth_js_1.authGuard)(async (_parent, args, context) => {
            if (!context.user.roles.includes(AdminPanelService_js_1.UserRole.ADMIN) && !context.user.roles.includes(AdminPanelService_js_1.UserRole.PLATFORM_ADMIN)) {
                throw new graphql_1.GraphQLError('Admin privileges required', { extensions: { code: 'FORBIDDEN' } });
            }
            const service = (0, AdminPanelService_js_1.getAdminPanelService)();
            return await service.deleteUser(args.id, context.user.id, args.reason);
        }),
        /**
         * Suspend user
         */
        suspendUser: (0, auth_js_1.authGuard)(async (_parent, args, context) => {
            if (!context.user.roles.includes(AdminPanelService_js_1.UserRole.ADMIN) && !context.user.roles.includes(AdminPanelService_js_1.UserRole.PLATFORM_ADMIN)) {
                throw new graphql_1.GraphQLError('Admin privileges required', { extensions: { code: 'FORBIDDEN' } });
            }
            const service = (0, AdminPanelService_js_1.getAdminPanelService)();
            return await service.suspendUser(args.input.userId, context.user.id, args.input.reason, args.input.duration);
        }),
        /**
         * Unsuspend user
         */
        unsuspendUser: (0, auth_js_1.authGuard)(async (_parent, args, context) => {
            if (!context.user.roles.includes(AdminPanelService_js_1.UserRole.ADMIN) && !context.user.roles.includes(AdminPanelService_js_1.UserRole.PLATFORM_ADMIN)) {
                throw new graphql_1.GraphQLError('Admin privileges required', { extensions: { code: 'FORBIDDEN' } });
            }
            const service = (0, AdminPanelService_js_1.getAdminPanelService)();
            return await service.unsuspendUser(args.userId, context.user.id);
        }),
        /**
         * Reset user password
         */
        resetUserPassword: (0, auth_js_1.authGuard)(async (_parent, args, context) => {
            if (!context.user.roles.includes(AdminPanelService_js_1.UserRole.ADMIN) && !context.user.roles.includes(AdminPanelService_js_1.UserRole.PLATFORM_ADMIN)) {
                throw new graphql_1.GraphQLError('Admin privileges required', { extensions: { code: 'FORBIDDEN' } });
            }
            const service = (0, AdminPanelService_js_1.getAdminPanelService)();
            return await service.resetUserPassword(args.userId, context.user.id);
        }),
        /**
         * Start user impersonation
         */
        startImpersonation: (0, auth_js_1.authGuard)(async (_parent, args, context) => {
            if (!context.user.roles.includes(AdminPanelService_js_1.UserRole.ADMIN) && !context.user.roles.includes(AdminPanelService_js_1.UserRole.PLATFORM_ADMIN)) {
                throw new graphql_1.GraphQLError('Admin privileges required', { extensions: { code: 'FORBIDDEN' } });
            }
            const service = (0, AdminPanelService_js_1.getAdminPanelService)();
            const impersonationId = await service.startImpersonation(context.user.id, args.input.targetUserId, args.input.reason, context.request.ip, context.request.userAgent);
            return {
                id: impersonationId,
                adminUser: context.user,
                targetUser: await service.getUserById(args.input.targetUserId),
                reason: args.input.reason,
                startedAt: new Date(),
                isActive: true,
            };
        }),
        /**
         * End user impersonation
         */
        endImpersonation: (0, auth_js_1.authGuard)(async (_parent, args, context) => {
            if (!context.user.roles.includes(AdminPanelService_js_1.UserRole.ADMIN) && !context.user.roles.includes(AdminPanelService_js_1.UserRole.PLATFORM_ADMIN)) {
                throw new graphql_1.GraphQLError('Admin privileges required', { extensions: { code: 'FORBIDDEN' } });
            }
            const service = (0, AdminPanelService_js_1.getAdminPanelService)();
            await service.endImpersonation(args.impersonationId, context.user.id);
            return {
                id: args.impersonationId,
                endedAt: new Date(),
                isActive: false,
            };
        }),
        /**
         * Review moderation item
         */
        reviewModeration: (0, auth_js_1.authGuard)(async (_parent, args, context) => {
            const allowedRoles = [AdminPanelService_js_1.UserRole.ADMIN, AdminPanelService_js_1.UserRole.PLATFORM_ADMIN, AdminPanelService_js_1.UserRole.MODERATOR];
            if (!context.user.roles.some(r => allowedRoles.includes(r))) {
                throw new graphql_1.GraphQLError('Moderator privileges required', { extensions: { code: 'FORBIDDEN' } });
            }
            const service = (0, AdminPanelService_js_1.getAdminPanelService)();
            return await service.reviewModerationItem(args.input.itemId, context.user.id, args.input.status, args.input.actionTaken, args.input.resolution, args.input.notes);
        }),
        /**
         * Update feature flag
         */
        updateFeatureFlag: (0, auth_js_1.authGuard)(async (_parent, args, context) => {
            if (!context.user.roles.includes(AdminPanelService_js_1.UserRole.ADMIN) && !context.user.roles.includes(AdminPanelService_js_1.UserRole.PLATFORM_ADMIN)) {
                throw new graphql_1.GraphQLError('Admin privileges required', { extensions: { code: 'FORBIDDEN' } });
            }
            const service = (0, AdminPanelService_js_1.getAdminPanelService)();
            return await service.updateFeatureFlag(args.id, args.input, context.user.id, args.input.reason);
        }),
        /**
         * Toggle feature flag
         */
        toggleFeatureFlag: (0, auth_js_1.authGuard)(async (_parent, args, context) => {
            if (!context.user.roles.includes(AdminPanelService_js_1.UserRole.ADMIN) && !context.user.roles.includes(AdminPanelService_js_1.UserRole.PLATFORM_ADMIN)) {
                throw new graphql_1.GraphQLError('Admin privileges required', { extensions: { code: 'FORBIDDEN' } });
            }
            const service = (0, AdminPanelService_js_1.getAdminPanelService)();
            return await service.updateFeatureFlag(args.id, { enabled: args.enabled }, context.user.id, args.reason);
        }),
        /**
         * Bulk suspend users
         */
        bulkSuspendUsers: (0, auth_js_1.authGuard)(async (_parent, args, context) => {
            if (!context.user.roles.includes(AdminPanelService_js_1.UserRole.ADMIN) && !context.user.roles.includes(AdminPanelService_js_1.UserRole.PLATFORM_ADMIN)) {
                throw new graphql_1.GraphQLError('Admin privileges required', { extensions: { code: 'FORBIDDEN' } });
            }
            const service = (0, AdminPanelService_js_1.getAdminPanelService)();
            const results = [];
            for (const userId of args.userIds) {
                const user = await service.suspendUser(userId, context.user.id, args.reason);
                results.push(user);
            }
            return results;
        }),
        /**
         * Bulk update user role
         */
        bulkUpdateUserRole: (0, auth_js_1.authGuard)(async (_parent, args, context) => {
            if (!context.user.roles.includes(AdminPanelService_js_1.UserRole.ADMIN) && !context.user.roles.includes(AdminPanelService_js_1.UserRole.PLATFORM_ADMIN)) {
                throw new graphql_1.GraphQLError('Admin privileges required', { extensions: { code: 'FORBIDDEN' } });
            }
            const service = (0, AdminPanelService_js_1.getAdminPanelService)();
            const results = [];
            for (const userId of args.userIds) {
                const user = await service.updateUser(userId, { role: args.role }, context.user.id);
                results.push(user);
            }
            return results;
        }),
        /**
         * Bulk delete users
         */
        bulkDeleteUsers: (0, auth_js_1.authGuard)(async (_parent, args, context) => {
            if (!context.user.roles.includes(AdminPanelService_js_1.UserRole.ADMIN) && !context.user.roles.includes(AdminPanelService_js_1.UserRole.PLATFORM_ADMIN)) {
                throw new graphql_1.GraphQLError('Admin privileges required', { extensions: { code: 'FORBIDDEN' } });
            }
            const service = (0, AdminPanelService_js_1.getAdminPanelService)();
            for (const userId of args.userIds) {
                await service.deleteUser(userId, context.user.id, args.reason);
            }
            return true;
        }),
    },
    // Field resolvers
    User: {
        fullName: (user) => {
            if (user.firstName && user.lastName) {
                return `${user.firstName} ${user.lastName}`;
            }
            return user.firstName || user.lastName || user.username || user.email;
        },
        suspendedBy: async (user) => {
            if (!user.suspendedBy)
                return null;
            const service = (0, AdminPanelService_js_1.getAdminPanelService)();
            return await service.getUserById(user.suspendedBy);
        },
        activitySummary: (0, auth_js_1.authGuard)(async (user, _args, context) => {
            if (!context.user.roles.includes(AdminPanelService_js_1.UserRole.ADMIN) && !context.user.roles.includes(AdminPanelService_js_1.UserRole.PLATFORM_ADMIN)) {
                throw new graphql_1.GraphQLError('Admin privileges required', { extensions: { code: 'FORBIDDEN' } });
            }
            const service = (0, AdminPanelService_js_1.getAdminPanelService)();
            // Get user's recent activity from audit logs
            const { logs } = await service.getAuditLogs({ userId: user.id }, 10, 0);
            return {
                totalActions: logs.length,
                lastAction: logs[0]?.timestamp,
                investigationsCreated: logs.filter(l => l.action === 'investigation.create').length,
                entitiesCreated: logs.filter(l => l.action === 'entity.create').length,
                relationshipsCreated: logs.filter(l => l.action === 'relationship.create').length,
                recentActions: logs,
            };
        }),
    },
    AuditLog: {
        user: async (log) => {
            if (!log.userId)
                return null;
            const service = (0, AdminPanelService_js_1.getAdminPanelService)();
            return await service.getUserById(log.userId);
        },
    },
    ModerationItem: {
        reporter: async (item) => {
            if (!item.reporterUserId)
                return null;
            const service = (0, AdminPanelService_js_1.getAdminPanelService)();
            return await service.getUserById(item.reporterUserId);
        },
        assignedTo: async (item) => {
            if (!item.assignedTo)
                return null;
            const service = (0, AdminPanelService_js_1.getAdminPanelService)();
            return await service.getUserById(item.assignedTo);
        },
        reviewedBy: async (item) => {
            if (!item.reviewedBy)
                return null;
            const service = (0, AdminPanelService_js_1.getAdminPanelService)();
            return await service.getUserById(item.reviewedBy);
        },
    },
    FeatureFlag: {
        createdBy: async (flag) => {
            if (!flag.createdBy)
                return null;
            const service = (0, AdminPanelService_js_1.getAdminPanelService)();
            return await service.getUserById(flag.createdBy);
        },
        updatedBy: async (flag) => {
            if (!flag.updatedBy)
                return null;
            const service = (0, AdminPanelService_js_1.getAdminPanelService)();
            return await service.getUserById(flag.updatedBy);
        },
    },
};
exports.default = exports.adminPanelResolvers;
