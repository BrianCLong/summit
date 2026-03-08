"use strict";
// @ts-nocheck
/**
 * Admin Panel Service
 *
 * Comprehensive service for admin panel operations including:
 * - User management (CRUD, suspend, impersonate)
 * - Audit log management and search
 * - Content moderation
 * - Feature flag management
 * - System metrics and alerts
 * - Data exports
 * - System configuration
 *
 * @module services/AdminPanelService
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
exports.AdminPanelService = exports.AlertStatus = exports.AlertSeverity = exports.AlertType = exports.ModerationPriority = exports.ModerationStatus = exports.ModerationCategory = exports.UserRole = void 0;
exports.getAdminPanelService = getAdminPanelService;
const database_js_1 = require("../config/database.js");
const pino_1 = __importDefault(require("pino"));
const argon2 = __importStar(require("argon2"));
const crypto_1 = require("crypto");
var UserRole;
(function (UserRole) {
    UserRole["ADMIN"] = "ADMIN";
    UserRole["ANALYST"] = "ANALYST";
    UserRole["VIEWER"] = "VIEWER";
    UserRole["MODERATOR"] = "MODERATOR";
    UserRole["PLATFORM_ADMIN"] = "PLATFORM_ADMIN";
})(UserRole || (exports.UserRole = UserRole = {}));
var ModerationCategory;
(function (ModerationCategory) {
    ModerationCategory["ABUSE"] = "ABUSE";
    ModerationCategory["SPAM"] = "SPAM";
    ModerationCategory["INAPPROPRIATE"] = "INAPPROPRIATE";
    ModerationCategory["VIOLATION"] = "VIOLATION";
    ModerationCategory["OTHER"] = "OTHER";
})(ModerationCategory || (exports.ModerationCategory = ModerationCategory = {}));
var ModerationStatus;
(function (ModerationStatus) {
    ModerationStatus["PENDING"] = "pending";
    ModerationStatus["APPROVED"] = "approved";
    ModerationStatus["REJECTED"] = "rejected";
    ModerationStatus["ESCALATED"] = "escalated";
})(ModerationStatus || (exports.ModerationStatus = ModerationStatus = {}));
var ModerationPriority;
(function (ModerationPriority) {
    ModerationPriority["LOW"] = "low";
    ModerationPriority["NORMAL"] = "normal";
    ModerationPriority["HIGH"] = "high";
    ModerationPriority["CRITICAL"] = "critical";
})(ModerationPriority || (exports.ModerationPriority = ModerationPriority = {}));
var AlertType;
(function (AlertType) {
    AlertType["SECURITY"] = "security";
    AlertType["PERFORMANCE"] = "performance";
    AlertType["ERROR"] = "error";
    AlertType["WARNING"] = "warning";
    AlertType["INFO"] = "info";
})(AlertType || (exports.AlertType = AlertType = {}));
var AlertSeverity;
(function (AlertSeverity) {
    AlertSeverity["CRITICAL"] = "critical";
    AlertSeverity["HIGH"] = "high";
    AlertSeverity["MEDIUM"] = "medium";
    AlertSeverity["LOW"] = "low";
    AlertSeverity["INFO"] = "info";
})(AlertSeverity || (exports.AlertSeverity = AlertSeverity = {}));
var AlertStatus;
(function (AlertStatus) {
    AlertStatus["ACTIVE"] = "active";
    AlertStatus["ACKNOWLEDGED"] = "acknowledged";
    AlertStatus["RESOLVED"] = "resolved";
    AlertStatus["DISMISSED"] = "dismissed";
})(AlertStatus || (exports.AlertStatus = AlertStatus = {}));
// ============================================================================
// SERVICE
// ============================================================================
class AdminPanelService {
    pool;
    logger;
    constructor(pool, logger) {
        this.pool = (pool || (0, database_js_1.getPostgresPool)());
        this.logger = logger || pino_1.default({ name: 'AdminPanelService' });
    }
    // ==========================================================================
    // USER MANAGEMENT
    // ==========================================================================
    /**
     * Search users with filters and pagination
     */
    async searchUsers(filters = {}, limit = 50, offset = 0) {
        const conditions = ['1=1'];
        const params = [];
        let paramCount = 0;
        if (filters.query) {
            paramCount++;
            conditions.push(`(
        email ILIKE $${paramCount} OR
        username ILIKE $${paramCount} OR
        first_name ILIKE $${paramCount} OR
        last_name ILIKE $${paramCount}
      )`);
            params.push(`%${filters.query}%`);
        }
        if (filters.role) {
            paramCount++;
            conditions.push(`role = $${paramCount}`);
            params.push(filters.role);
        }
        if (filters.isActive !== undefined) {
            paramCount++;
            conditions.push(`is_active = $${paramCount}`);
            params.push(filters.isActive);
        }
        if (filters.isSuspended !== undefined) {
            paramCount++;
            conditions.push(`is_suspended = $${paramCount}`);
            params.push(filters.isSuspended);
        }
        if (filters.createdAfter) {
            paramCount++;
            conditions.push(`created_at >= $${paramCount}`);
            params.push(filters.createdAfter);
        }
        if (filters.createdBefore) {
            paramCount++;
            conditions.push(`created_at <= $${paramCount}`);
            params.push(filters.createdBefore);
        }
        const whereClause = conditions.join(' AND ');
        // Get total count
        const countResult = await this.pool.query(`SELECT COUNT(*) as total FROM users WHERE ${whereClause}`, params);
        const total = parseInt(countResult.rows[0].total, 10);
        // Get users
        params.push(limit, offset);
        const result = await this.pool.query(`SELECT * FROM users WHERE ${whereClause} ORDER BY created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`, params);
        const users = result.rows.map(this.mapDatabaseUserToUser);
        return { users, total };
    }
    /**
     * Get user by ID
     */
    async getUserById(userId) {
        const result = await this.pool.query('SELECT * FROM users WHERE id = $1', [userId]);
        if (result.rows.length === 0) {
            return null;
        }
        return this.mapDatabaseUserToUser(result.rows[0]);
    }
    /**
     * Create new user
     */
    async createUser(data, createdBy) {
        const passwordHash = await argon2.hash(data.password);
        const result = await this.pool.query(`INSERT INTO users (
        email, username, first_name, last_name, password_hash, role, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`, [
            data.email,
            data.username || null,
            data.firstName || null,
            data.lastName || null,
            passwordHash,
            data.role,
            JSON.stringify(data.metadata || {}),
        ]);
        await this.logAudit({
            userId: createdBy,
            action: 'admin.user.create',
            resourceType: 'user',
            resourceId: result.rows[0].id,
            details: { email: data.email, role: data.role },
            status: 'success',
        });
        return this.mapDatabaseUserToUser(result.rows[0]);
    }
    /**
     * Update user
     */
    async updateUser(userId, data, updatedBy) {
        const updates = [];
        const params = [];
        let paramCount = 0;
        if (data.email) {
            paramCount++;
            updates.push(`email = $${paramCount}`);
            params.push(data.email);
        }
        if (data.username !== undefined) {
            paramCount++;
            updates.push(`username = $${paramCount}`);
            params.push(data.username);
        }
        if (data.firstName !== undefined) {
            paramCount++;
            updates.push(`first_name = $${paramCount}`);
            params.push(data.firstName);
        }
        if (data.lastName !== undefined) {
            paramCount++;
            updates.push(`last_name = $${paramCount}`);
            params.push(data.lastName);
        }
        if (data.role) {
            paramCount++;
            updates.push(`role = $${paramCount}`);
            params.push(data.role);
        }
        if (data.isActive !== undefined) {
            paramCount++;
            updates.push(`is_active = $${paramCount}`);
            params.push(data.isActive);
        }
        if (data.metadata) {
            paramCount++;
            updates.push(`metadata = $${paramCount}`);
            params.push(JSON.stringify(data.metadata));
        }
        updates.push('updated_at = NOW()');
        paramCount++;
        params.push(userId);
        const result = await this.pool.query(`UPDATE users SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`, params);
        if (result.rows.length === 0) {
            throw new Error(`User ${userId} not found`);
        }
        await this.logAudit({
            userId: updatedBy,
            action: 'admin.user.update',
            resourceType: 'user',
            resourceId: userId,
            details: data,
            status: 'success',
        });
        return this.mapDatabaseUserToUser(result.rows[0]);
    }
    /**
     * Suspend user
     */
    async suspendUser(userId, suspendedBy, reason, durationMinutes) {
        const result = await this.pool.query('SELECT suspend_user($1, $2, $3)', [userId, suspendedBy, reason]);
        await this.logAudit({
            userId: suspendedBy,
            action: 'admin.user.suspend',
            resourceType: 'user',
            resourceId: userId,
            details: { reason, durationMinutes },
            status: 'success',
        });
        const user = await this.getUserById(userId);
        if (!user) {
            throw new Error(`User ${userId} not found`);
        }
        return user;
    }
    /**
     * Unsuspend user
     */
    async unsuspendUser(userId, unsuspendedBy) {
        const result = await this.pool.query('SELECT unsuspend_user($1, $2)', [userId, unsuspendedBy]);
        await this.logAudit({
            userId: unsuspendedBy,
            action: 'admin.user.unsuspend',
            resourceType: 'user',
            resourceId: userId,
            status: 'success',
        });
        const user = await this.getUserById(userId);
        if (!user) {
            throw new Error(`User ${userId} not found`);
        }
        return user;
    }
    /**
     * Delete user
     */
    async deleteUser(userId, deletedBy, reason) {
        // Soft delete by deactivating
        await this.pool.query(`UPDATE users SET is_active = false, updated_at = NOW() WHERE id = $1`, [userId]);
        await this.logAudit({
            userId: deletedBy,
            action: 'admin.user.delete',
            resourceType: 'user',
            resourceId: userId,
            details: { reason },
            status: 'success',
        });
        return true;
    }
    /**
     * Reset user password
     */
    async resetUserPassword(userId, resetBy) {
        // Generate temporary password
        const tempPassword = (0, crypto_1.randomBytes)(16).toString('hex');
        const passwordHash = await argon2.hash(tempPassword);
        await this.pool.query(`UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2`, [passwordHash, userId]);
        await this.logAudit({
            userId: resetBy,
            action: 'admin.user.password_reset',
            resourceType: 'user',
            resourceId: userId,
            status: 'success',
        });
        return tempPassword;
    }
    // ==========================================================================
    // IMPERSONATION
    // ==========================================================================
    /**
     * Start user impersonation
     */
    async startImpersonation(adminUserId, targetUserId, reason, ipAddress, userAgent) {
        const result = await this.pool.query(`INSERT INTO user_impersonations (admin_user_id, target_user_id, reason, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`, [adminUserId, targetUserId, reason, ipAddress || null, userAgent || null]);
        await this.logAudit({
            userId: adminUserId,
            action: 'admin.impersonation.start',
            resourceType: 'user',
            resourceId: targetUserId,
            details: { reason },
            ipAddress,
            status: 'success',
        });
        return result.rows[0].id;
    }
    /**
     * End user impersonation
     */
    async endImpersonation(impersonationId, endedBy) {
        await this.pool.query(`UPDATE user_impersonations SET ended_at = NOW() WHERE id = $1`, [impersonationId]);
        await this.logAudit({
            userId: endedBy,
            action: 'admin.impersonation.end',
            resourceType: 'impersonation',
            resourceId: impersonationId,
            status: 'success',
        });
    }
    // ==========================================================================
    // AUDIT LOGS
    // ==========================================================================
    /**
     * Get audit logs with filters
     */
    async getAuditLogs(filters = {}, limit = 100, offset = 0) {
        const conditions = ['1=1'];
        const params = [];
        let paramCount = 0;
        if (filters.userId) {
            paramCount++;
            conditions.push(`user_id = $${paramCount}`);
            params.push(filters.userId);
        }
        if (filters.action) {
            paramCount++;
            conditions.push(`action = $${paramCount}`);
            params.push(filters.action);
        }
        if (filters.resourceType) {
            paramCount++;
            conditions.push(`resource_type = $${paramCount}`);
            params.push(filters.resourceType);
        }
        if (filters.resourceId) {
            paramCount++;
            conditions.push(`resource_id = $${paramCount}`);
            params.push(filters.resourceId);
        }
        if (filters.status) {
            paramCount++;
            conditions.push(`status = $${paramCount}`);
            params.push(filters.status);
        }
        if (filters.startDate) {
            paramCount++;
            conditions.push(`timestamp >= $${paramCount}`);
            params.push(filters.startDate);
        }
        if (filters.endDate) {
            paramCount++;
            conditions.push(`timestamp <= $${paramCount}`);
            params.push(filters.endDate);
        }
        if (filters.tenantId) {
            paramCount++;
            conditions.push(`tenant_id = $${paramCount}`);
            params.push(filters.tenantId);
        }
        const whereClause = conditions.join(' AND ');
        // Get total count
        const countResult = await this.pool.query(`SELECT COUNT(*) as total FROM audit_logs WHERE ${whereClause}`, params);
        const total = parseInt(countResult.rows[0].total, 10);
        // Get logs
        params.push(limit, offset);
        const result = await this.pool.query(`SELECT * FROM audit_logs WHERE ${whereClause} ORDER BY timestamp DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`, params);
        const logs = result.rows.map(row => ({
            id: row.id,
            timestamp: row.timestamp,
            userId: row.user_id,
            action: row.action,
            resourceType: row.resource_type,
            resourceId: row.resource_id,
            details: row.details,
            ipAddress: row.ip_address,
            userAgent: row.user_agent,
            status: row.status,
            errorMessage: row.error_message,
            tenantId: row.tenant_id,
            sessionId: row.session_id,
            requestId: row.request_id,
            metadata: row.metadata,
        }));
        return { logs, total };
    }
    /**
     * Log audit event
     */
    async logAudit(data) {
        const result = await this.pool.query(`INSERT INTO audit_logs (
        user_id, action, resource_type, resource_id, details,
        ip_address, user_agent, status, error_message, tenant_id, session_id, request_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING id`, [
            data.userId || null,
            data.action,
            data.resourceType,
            data.resourceId || null,
            JSON.stringify(data.details || {}),
            data.ipAddress || null,
            data.userAgent || null,
            data.status || 'success',
            data.errorMessage || null,
            data.tenantId || null,
            data.sessionId || null,
            data.requestId || null,
        ]);
        return result.rows[0].id;
    }
    // ==========================================================================
    // MODERATION
    // ==========================================================================
    /**
     * Get moderation queue
     */
    async getModerationQueue(filters = {}, limit = 50, offset = 0) {
        const conditions = ['1=1'];
        const params = [];
        let paramCount = 0;
        if (filters.status) {
            paramCount++;
            conditions.push(`status = $${paramCount}`);
            params.push(filters.status);
        }
        if (filters.priority) {
            paramCount++;
            conditions.push(`priority = $${paramCount}`);
            params.push(filters.priority);
        }
        if (filters.category) {
            paramCount++;
            conditions.push(`category = $${paramCount}`);
            params.push(filters.category);
        }
        if (filters.assignedTo) {
            paramCount++;
            conditions.push(`assigned_to = $${paramCount}`);
            params.push(filters.assignedTo);
        }
        if (filters.contentType) {
            paramCount++;
            conditions.push(`content_type = $${paramCount}`);
            params.push(filters.contentType);
        }
        const whereClause = conditions.join(' AND ');
        // Get total count
        const countResult = await this.pool.query(`SELECT COUNT(*) as total FROM moderation_queue WHERE ${whereClause}`, params);
        const total = parseInt(countResult.rows[0].total, 10);
        // Get items
        params.push(limit, offset);
        const result = await this.pool.query(`SELECT * FROM moderation_queue WHERE ${whereClause} ORDER BY priority DESC, created_at ASC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`, params);
        const items = result.rows.map(row => ({
            id: row.id,
            contentType: row.content_type,
            contentId: row.content_id,
            reporterUserId: row.reporter_user_id,
            reason: row.reason,
            category: row.category,
            status: row.status,
            priority: row.priority,
            assignedTo: row.assigned_to,
            reviewedBy: row.reviewed_by,
            reviewedAt: row.reviewed_at,
            resolution: row.resolution,
            actionTaken: row.action_taken,
            notes: row.notes,
            metadata: row.metadata,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        }));
        return { items, total };
    }
    /**
     * Review moderation item
     */
    async reviewModerationItem(itemId, reviewedBy, status, actionTaken, resolution, notes) {
        const result = await this.pool.query(`UPDATE moderation_queue
       SET status = $1, reviewed_by = $2, reviewed_at = NOW(),
           action_taken = $3, resolution = $4, notes = $5, updated_at = NOW()
       WHERE id = $6
       RETURNING *`, [status, reviewedBy, actionTaken || null, resolution || null, notes || null, itemId]);
        if (result.rows.length === 0) {
            throw new Error(`Moderation item ${itemId} not found`);
        }
        await this.logAudit({
            userId: reviewedBy,
            action: 'admin.moderation.review',
            resourceType: 'moderation_item',
            resourceId: itemId,
            details: { status, actionTaken, resolution },
            status: 'success',
        });
        return result.rows[0];
    }
    // ==========================================================================
    // FEATURE FLAGS
    // ==========================================================================
    /**
     * Get all feature flags
     */
    async getFeatureFlags() {
        const result = await this.pool.query('SELECT * FROM feature_flags ORDER BY name');
        return result.rows.map(row => ({
            id: row.id,
            key: row.key,
            name: row.name,
            description: row.description,
            flagType: row.flag_type,
            defaultValue: row.default_value,
            enabled: row.enabled,
            rolloutPercentage: row.rollout_percentage,
            targetUsers: row.target_users,
            targetRoles: row.target_roles,
            targetTenants: row.target_tenants,
            conditions: row.conditions,
            tags: row.tags,
            createdBy: row.created_by,
            updatedBy: row.updated_by,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        }));
    }
    /**
     * Update feature flag
     */
    async updateFeatureFlag(flagId, data, updatedBy, reason) {
        const updates = [];
        const params = [];
        let paramCount = 0;
        if (data.enabled !== undefined) {
            paramCount++;
            updates.push(`enabled = $${paramCount}`);
            params.push(data.enabled);
        }
        if (data.defaultValue !== undefined) {
            paramCount++;
            updates.push(`default_value = $${paramCount}`);
            params.push(JSON.stringify(data.defaultValue));
        }
        if (data.rolloutPercentage !== undefined) {
            paramCount++;
            updates.push(`rollout_percentage = $${paramCount}`);
            params.push(data.rolloutPercentage);
        }
        if (data.targetUsers !== undefined) {
            paramCount++;
            updates.push(`target_users = $${paramCount}`);
            params.push(data.targetUsers);
        }
        if (data.targetRoles !== undefined) {
            paramCount++;
            updates.push(`target_roles = $${paramCount}`);
            params.push(data.targetRoles);
        }
        if (data.targetTenants !== undefined) {
            paramCount++;
            updates.push(`target_tenants = $${paramCount}`);
            params.push(data.targetTenants);
        }
        if (data.conditions !== undefined) {
            paramCount++;
            updates.push(`conditions = $${paramCount}`);
            params.push(JSON.stringify(data.conditions));
        }
        if (data.tags !== undefined) {
            paramCount++;
            updates.push(`tags = $${paramCount}`);
            params.push(data.tags);
        }
        paramCount++;
        updates.push(`updated_by = $${paramCount}`);
        params.push(updatedBy);
        updates.push('updated_at = NOW()');
        paramCount++;
        params.push(flagId);
        const result = await this.pool.query(`UPDATE feature_flags SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`, params);
        if (result.rows.length === 0) {
            throw new Error(`Feature flag ${flagId} not found`);
        }
        await this.logAudit({
            userId: updatedBy,
            action: 'admin.feature_flag.update',
            resourceType: 'feature_flag',
            resourceId: flagId,
            details: { ...data, reason },
            status: 'success',
        });
        return result.rows[0];
    }
    // ==========================================================================
    // DASHBOARD STATS
    // ==========================================================================
    /**
     * Get dashboard statistics
     */
    async getDashboardStats() {
        // User stats
        const userStatsResult = await this.pool.query('SELECT * FROM admin_users_summary');
        const userStats = userStatsResult.rows[0];
        // Audit stats
        const auditStatsResult = await this.pool.query(`
      SELECT
        COUNT(*) as total_events,
        COUNT(*) FILTER (WHERE timestamp > NOW() - INTERVAL '24 hours') as events_today,
        COUNT(*) FILTER (WHERE timestamp > NOW() - INTERVAL '7 days') as events_this_week,
        COUNT(*) FILTER (WHERE status = 'success') as successful_events,
        COUNT(*) FILTER (WHERE status = 'failure') as failed_events,
        COUNT(DISTINCT user_id) as unique_users
      FROM audit_logs
      WHERE timestamp > NOW() - INTERVAL '30 days'
    `);
        const auditStats = auditStatsResult.rows[0];
        // Top actions
        const topActionsResult = await this.pool.query(`
      SELECT action, COUNT(*) as count
      FROM audit_logs
      WHERE timestamp > NOW() - INTERVAL '7 days'
      GROUP BY action
      ORDER BY count DESC
      LIMIT 10
    `);
        // Moderation stats
        const moderationStatsResult = await this.pool.query('SELECT * FROM admin_moderation_summary');
        const moderationStats = moderationStatsResult.rows[0];
        // Alert stats
        const alertStatsResult = await this.pool.query('SELECT * FROM admin_alerts_summary');
        const alertStats = alertStatsResult.rows[0];
        return {
            users: {
                totalUsers: parseInt(userStats.total_users, 10),
                activeUsers: parseInt(userStats.active_users, 10),
                suspendedUsers: parseInt(userStats.suspended_users, 10),
                adminUsers: parseInt(userStats.admin_users, 10),
                analystUsers: parseInt(userStats.analyst_users, 10),
                viewerUsers: parseInt(userStats.viewer_users, 10),
                activeToday: parseInt(userStats.active_today, 10),
                activeThisWeek: parseInt(userStats.active_this_week, 10),
                newThisMonth: parseInt(userStats.new_this_month, 10),
            },
            audit: {
                totalEvents: parseInt(auditStats.total_events, 10),
                eventsToday: parseInt(auditStats.events_today, 10),
                eventsThisWeek: parseInt(auditStats.events_this_week, 10),
                successfulEvents: parseInt(auditStats.successful_events, 10),
                failedEvents: parseInt(auditStats.failed_events, 10),
                uniqueUsers: parseInt(auditStats.unique_users, 10),
                topActions: topActionsResult.rows.map(row => ({
                    action: row.action,
                    count: parseInt(row.count, 10),
                })),
            },
            moderation: {
                totalItems: parseInt(moderationStats.total_items, 10),
                pendingItems: parseInt(moderationStats.pending_items, 10),
                approvedItems: parseInt(moderationStats.approved_items, 10),
                rejectedItems: parseInt(moderationStats.rejected_items, 10),
                criticalItems: parseInt(moderationStats.critical_items, 10),
                highPriorityItems: parseInt(moderationStats.high_priority_items, 10),
                avgResolutionTimeSeconds: parseFloat(moderationStats.avg_resolution_time_seconds || '0'),
            },
            alerts: {
                totalAlerts: parseInt(alertStats.total_alerts, 10),
                activeAlerts: parseInt(alertStats.active_alerts, 10),
                criticalAlerts: parseInt(alertStats.critical_alerts, 10),
                highSeverityAlerts: parseInt(alertStats.high_severity_alerts, 10),
                securityAlerts: parseInt(alertStats.security_alerts, 10),
                performanceAlerts: parseInt(alertStats.performance_alerts, 10),
            },
        };
    }
    // ==========================================================================
    // HELPERS
    // ==========================================================================
    mapDatabaseUserToUser(row) {
        return {
            id: row.id,
            email: row.email,
            username: row.username,
            firstName: row.first_name,
            lastName: row.last_name,
            role: row.role,
            isActive: row.is_active,
            isSuspended: row.is_suspended,
            suspendedAt: row.suspended_at,
            suspendedBy: row.suspended_by,
            suspensionReason: row.suspension_reason,
            lastLogin: row.last_login,
            lastLoginIp: row.last_login_ip,
            avatarUrl: row.avatar_url,
            metadata: row.metadata,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        };
    }
}
exports.AdminPanelService = AdminPanelService;
/**
 * Singleton instance
 */
let instance = null;
function getAdminPanelService(pool, logger) {
    if (!instance) {
        instance = new AdminPanelService(pool, logger);
    }
    return instance;
}
