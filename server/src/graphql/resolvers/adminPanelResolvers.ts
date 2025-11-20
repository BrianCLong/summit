/**
 * Admin Panel GraphQL Resolvers
 *
 * Implements all admin panel operations with RBAC enforcement
 */

import { GraphQLError } from 'graphql';
import { getAdminPanelService, UserRole } from '../../services/AdminPanelService.js';

// ============================================================================
// AUTHORIZATION HELPERS
// ============================================================================

function requireAdmin(context: any) {
  if (!context.user) {
    throw new GraphQLError('Authentication required', {
      extensions: { code: 'UNAUTHENTICATED' },
    });
  }

  const allowedRoles = [UserRole.ADMIN, UserRole.PLATFORM_ADMIN];
  if (!allowedRoles.includes(context.user.role)) {
    throw new GraphQLError('Admin privileges required', {
      extensions: { code: 'FORBIDDEN' },
    });
  }

  return context.user;
}

function requireModerator(context: any) {
  if (!context.user) {
    throw new GraphQLError('Authentication required', {
      extensions: { code: 'UNAUTHENTICATED' },
    });
  }

  const allowedRoles = [UserRole.ADMIN, UserRole.PLATFORM_ADMIN, UserRole.MODERATOR];
  if (!allowedRoles.includes(context.user.role)) {
    throw new GraphQLError('Moderator privileges required', {
      extensions: { code: 'FORBIDDEN' },
    });
  }

  return context.user;
}

// ============================================================================
// RESOLVERS
// ============================================================================

export const adminPanelResolvers = {
  Query: {
    /**
     * Get admin dashboard statistics
     */
    adminDashboard: async (_parent: any, _args: any, context: any) => {
      requireAdmin(context);
      const service = getAdminPanelService();
      return await service.getDashboardStats();
    },

    /**
     * Search users with filters and pagination
     */
    users: async (_parent: any, args: any, context: any) => {
      requireAdmin(context);
      const service = getAdminPanelService();

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
    },

    /**
     * Get single user by ID
     */
    user: async (_parent: any, args: any, context: any) => {
      requireAdmin(context);
      const service = getAdminPanelService();
      const user = await service.getUserById(args.id);

      if (!user) {
        throw new GraphQLError('User not found', {
          extensions: { code: 'NOT_FOUND' },
        });
      }

      return user;
    },

    /**
     * Search users by query string
     */
    searchUsers: async (_parent: any, args: any, context: any) => {
      requireAdmin(context);
      const service = getAdminPanelService();
      const { users } = await service.searchUsers(
        { query: args.query },
        args.limit || 20,
        0
      );
      return users;
    },

    /**
     * Get audit logs with filters
     */
    auditLogs: async (_parent: any, args: any, context: any) => {
      requireAdmin(context);
      const service = getAdminPanelService();

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
    },

    /**
     * Get moderation queue
     */
    moderationQueue: async (_parent: any, args: any, context: any) => {
      requireModerator(context);
      const service = getAdminPanelService();

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
    },

    /**
     * Get all feature flags
     */
    featureFlags: async (_parent: any, _args: any, context: any) => {
      requireAdmin(context);
      const service = getAdminPanelService();
      return await service.getFeatureFlags();
    },
  },

  Mutation: {
    /**
     * Create new user
     */
    createUser: async (_parent: any, args: any, context: any) => {
      const admin = requireAdmin(context);
      const service = getAdminPanelService();

      return await service.createUser(args.input, admin.id);
    },

    /**
     * Update user
     */
    updateUser: async (_parent: any, args: any, context: any) => {
      const admin = requireAdmin(context);
      const service = getAdminPanelService();

      return await service.updateUser(args.id, args.input, admin.id);
    },

    /**
     * Delete user
     */
    deleteUser: async (_parent: any, args: any, context: any) => {
      const admin = requireAdmin(context);
      const service = getAdminPanelService();

      return await service.deleteUser(args.id, admin.id, args.reason);
    },

    /**
     * Suspend user
     */
    suspendUser: async (_parent: any, args: any, context: any) => {
      const admin = requireAdmin(context);
      const service = getAdminPanelService();

      return await service.suspendUser(
        args.input.userId,
        admin.id,
        args.input.reason,
        args.input.duration
      );
    },

    /**
     * Unsuspend user
     */
    unsuspendUser: async (_parent: any, args: any, context: any) => {
      const admin = requireAdmin(context);
      const service = getAdminPanelService();

      return await service.unsuspendUser(args.userId, admin.id);
    },

    /**
     * Reset user password
     */
    resetUserPassword: async (_parent: any, args: any, context: any) => {
      const admin = requireAdmin(context);
      const service = getAdminPanelService();

      return await service.resetUserPassword(args.userId, admin.id);
    },

    /**
     * Start user impersonation
     */
    startImpersonation: async (_parent: any, args: any, context: any) => {
      const admin = requireAdmin(context);
      const service = getAdminPanelService();

      const impersonationId = await service.startImpersonation(
        admin.id,
        args.input.targetUserId,
        args.input.reason,
        context.ip,
        context.userAgent
      );

      return {
        id: impersonationId,
        adminUser: admin,
        targetUser: await service.getUserById(args.input.targetUserId),
        reason: args.input.reason,
        startedAt: new Date(),
        isActive: true,
      };
    },

    /**
     * End user impersonation
     */
    endImpersonation: async (_parent: any, args: any, context: any) => {
      const admin = requireAdmin(context);
      const service = getAdminPanelService();

      await service.endImpersonation(args.impersonationId, admin.id);

      return {
        id: args.impersonationId,
        endedAt: new Date(),
        isActive: false,
      };
    },

    /**
     * Review moderation item
     */
    reviewModeration: async (_parent: any, args: any, context: any) => {
      const moderator = requireModerator(context);
      const service = getAdminPanelService();

      return await service.reviewModerationItem(
        args.input.itemId,
        moderator.id,
        args.input.status,
        args.input.actionTaken,
        args.input.resolution,
        args.input.notes
      );
    },

    /**
     * Update feature flag
     */
    updateFeatureFlag: async (_parent: any, args: any, context: any) => {
      const admin = requireAdmin(context);
      const service = getAdminPanelService();

      return await service.updateFeatureFlag(
        args.id,
        args.input,
        admin.id,
        args.input.reason
      );
    },

    /**
     * Toggle feature flag
     */
    toggleFeatureFlag: async (_parent: any, args: any, context: any) => {
      const admin = requireAdmin(context);
      const service = getAdminPanelService();

      return await service.updateFeatureFlag(
        args.id,
        { enabled: args.enabled },
        admin.id,
        args.reason
      );
    },

    /**
     * Bulk suspend users
     */
    bulkSuspendUsers: async (_parent: any, args: any, context: any) => {
      const admin = requireAdmin(context);
      const service = getAdminPanelService();

      const results = [];
      for (const userId of args.userIds) {
        const user = await service.suspendUser(userId, admin.id, args.reason);
        results.push(user);
      }

      return results;
    },

    /**
     * Bulk update user role
     */
    bulkUpdateUserRole: async (_parent: any, args: any, context: any) => {
      const admin = requireAdmin(context);
      const service = getAdminPanelService();

      const results = [];
      for (const userId of args.userIds) {
        const user = await service.updateUser(userId, { role: args.role }, admin.id);
        results.push(user);
      }

      return results;
    },

    /**
     * Bulk delete users
     */
    bulkDeleteUsers: async (_parent: any, args: any, context: any) => {
      const admin = requireAdmin(context);
      const service = getAdminPanelService();

      for (const userId of args.userIds) {
        await service.deleteUser(userId, admin.id, args.reason);
      }

      return true;
    },
  },

  // Field resolvers
  User: {
    fullName: (user: any) => {
      if (user.firstName && user.lastName) {
        return `${user.firstName} ${user.lastName}`;
      }
      return user.firstName || user.lastName || user.username || user.email;
    },

    suspendedBy: async (user: any) => {
      if (!user.suspendedBy) return null;
      const service = getAdminPanelService();
      return await service.getUserById(user.suspendedBy);
    },

    activitySummary: async (user: any, _args: any, context: any) => {
      requireAdmin(context);
      const service = getAdminPanelService();

      // Get user's recent activity from audit logs
      const { logs } = await service.getAuditLogs(
        { userId: user.id },
        10,
        0
      );

      return {
        totalActions: logs.length,
        lastAction: logs[0]?.timestamp,
        investigationsCreated: logs.filter(l => l.action === 'investigation.create').length,
        entitiesCreated: logs.filter(l => l.action === 'entity.create').length,
        relationshipsCreated: logs.filter(l => l.action === 'relationship.create').length,
        recentActions: logs,
      };
    },
  },

  AuditLog: {
    user: async (log: any) => {
      if (!log.userId) return null;
      const service = getAdminPanelService();
      return await service.getUserById(log.userId);
    },
  },

  ModerationItem: {
    reporter: async (item: any) => {
      if (!item.reporterUserId) return null;
      const service = getAdminPanelService();
      return await service.getUserById(item.reporterUserId);
    },

    assignedTo: async (item: any) => {
      if (!item.assignedTo) return null;
      const service = getAdminPanelService();
      return await service.getUserById(item.assignedTo);
    },

    reviewedBy: async (item: any) => {
      if (!item.reviewedBy) return null;
      const service = getAdminPanelService();
      return await service.getUserById(item.reviewedBy);
    },
  },

  FeatureFlag: {
    createdBy: async (flag: any) => {
      if (!flag.createdBy) return null;
      const service = getAdminPanelService();
      return await service.getUserById(flag.createdBy);
    },

    updatedBy: async (flag: any) => {
      if (!flag.updatedBy) return null;
      const service = getAdminPanelService();
      return await service.getUserById(flag.updatedBy);
    },
  },
};

export default adminPanelResolvers;
