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

import { Pool, PoolClient } from 'pg';
import { getPostgresPool } from '../config/database.js';
import { Logger } from '../utils/logger.js';
import argon2 from 'argon2';
import { randomBytes } from 'crypto';

// ============================================================================
// TYPES
// ============================================================================

export interface User {
  id: string;
  email: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  role: UserRole;
  isActive: boolean;
  isSuspended: boolean;
  suspendedAt?: Date;
  suspendedBy?: string;
  suspensionReason?: string;
  lastLogin?: Date;
  lastLoginIp?: string;
  avatarUrl?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt?: Date;
}

export enum UserRole {
  ADMIN = 'ADMIN',
  ANALYST = 'ANALYST',
  VIEWER = 'VIEWER',
  MODERATOR = 'MODERATOR',
  PLATFORM_ADMIN = 'PLATFORM_ADMIN',
}

export interface UserSearchFilters {
  query?: string;
  role?: UserRole;
  isActive?: boolean;
  isSuspended?: boolean;
  createdAfter?: Date;
  createdBefore?: Date;
  lastLoginAfter?: Date;
  lastLoginBefore?: Date;
}

export interface AuditLog {
  id: string;
  timestamp: Date;
  userId?: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  status: 'success' | 'failure' | 'error';
  errorMessage?: string;
  tenantId?: string;
  sessionId?: string;
  requestId?: string;
  metadata?: Record<string, any>;
}

export interface AuditLogFilters {
  userId?: string;
  action?: string;
  resourceType?: string;
  resourceId?: string;
  status?: 'success' | 'failure' | 'error';
  startDate?: Date;
  endDate?: Date;
  tenantId?: string;
}

export interface ModerationItem {
  id: string;
  contentType: string;
  contentId: string;
  reporterUserId?: string;
  reason: string;
  category: ModerationCategory;
  status: ModerationStatus;
  priority: ModerationPriority;
  assignedTo?: string;
  reviewedBy?: string;
  reviewedAt?: Date;
  resolution?: string;
  actionTaken?: string;
  notes?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export enum ModerationCategory {
  ABUSE = 'ABUSE',
  SPAM = 'SPAM',
  INAPPROPRIATE = 'INAPPROPRIATE',
  VIOLATION = 'VIOLATION',
  OTHER = 'OTHER',
}

export enum ModerationStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  ESCALATED = 'escalated',
}

export enum ModerationPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export interface FeatureFlag {
  id: string;
  key: string;
  name: string;
  description?: string;
  flagType: string;
  defaultValue: any;
  enabled: boolean;
  rolloutPercentage: number;
  targetUsers?: string[];
  targetRoles?: UserRole[];
  targetTenants?: string[];
  conditions?: Record<string, any>;
  tags?: string[];
  createdBy?: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdminAlert {
  id: string;
  alertType: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  source: string;
  resourceType?: string;
  resourceId?: string;
  status: AlertStatus;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  resolvedBy?: string;
  resolvedAt?: Date;
  resolutionNotes?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export enum AlertType {
  SECURITY = 'security',
  PERFORMANCE = 'performance',
  ERROR = 'error',
  WARNING = 'warning',
  INFO = 'info',
}

export enum AlertSeverity {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
  INFO = 'info',
}

export enum AlertStatus {
  ACTIVE = 'active',
  ACKNOWLEDGED = 'acknowledged',
  RESOLVED = 'resolved',
  DISMISSED = 'dismissed',
}

export interface DataExport {
  id: string;
  exportType: string;
  format: string;
  filters?: Record<string, any>;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  requestedBy: string;
  fileUrl?: string;
  fileSizeBytes?: number;
  recordCount?: number;
  startedAt?: Date;
  completedAt?: Date;
  errorMessage?: string;
  expiresAt?: Date;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface DashboardStats {
  users: {
    totalUsers: number;
    activeUsers: number;
    suspendedUsers: number;
    adminUsers: number;
    analystUsers: number;
    viewerUsers: number;
    activeToday: number;
    activeThisWeek: number;
    newThisMonth: number;
  };
  audit: {
    totalEvents: number;
    eventsToday: number;
    eventsThisWeek: number;
    successfulEvents: number;
    failedEvents: number;
    uniqueUsers: number;
    topActions: Array<{ action: string; count: number }>;
  };
  moderation: {
    totalItems: number;
    pendingItems: number;
    approvedItems: number;
    rejectedItems: number;
    criticalItems: number;
    highPriorityItems: number;
    avgResolutionTimeSeconds: number;
  };
  alerts: {
    totalAlerts: number;
    activeAlerts: number;
    criticalAlerts: number;
    highSeverityAlerts: number;
    securityAlerts: number;
    performanceAlerts: number;
  };
}

// ============================================================================
// SERVICE
// ============================================================================

export class AdminPanelService {
  private pool: Pool;
  private logger: Logger;

  constructor(pool?: Pool, logger?: Logger) {
    this.pool = pool || getPostgresPool();
    this.logger = logger || new Logger('AdminPanelService');
  }

  // ==========================================================================
  // USER MANAGEMENT
  // ==========================================================================

  /**
   * Search users with filters and pagination
   */
  async searchUsers(
    filters: UserSearchFilters = {},
    limit: number = 50,
    offset: number = 0
  ): Promise<{ users: User[]; total: number }> {
    const conditions: string[] = ['1=1'];
    const params: any[] = [];
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
    const countResult = await this.pool.query(
      `SELECT COUNT(*) as total FROM users WHERE ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].total, 10);

    // Get users
    params.push(limit, offset);
    const result = await this.pool.query(
      `SELECT * FROM users WHERE ${whereClause} ORDER BY created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`,
      params
    );

    const users = result.rows.map(this.mapDatabaseUserToUser);

    return { users, total };
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<User | null> {
    const result = await this.pool.query(
      'SELECT * FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapDatabaseUserToUser(result.rows[0]);
  }

  /**
   * Create new user
   */
  async createUser(data: {
    email: string;
    username?: string;
    firstName?: string;
    lastName?: string;
    password: string;
    role: UserRole;
    metadata?: Record<string, any>;
  }, createdBy: string): Promise<User> {
    const passwordHash = await argon2.hash(data.password);

    const result = await this.pool.query(
      `INSERT INTO users (
        email, username, first_name, last_name, password_hash, role, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [
        data.email,
        data.username || null,
        data.firstName || null,
        data.lastName || null,
        passwordHash,
        data.role,
        JSON.stringify(data.metadata || {}),
      ]
    );

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
  async updateUser(
    userId: string,
    data: Partial<{
      email: string;
      username: string;
      firstName: string;
      lastName: string;
      role: UserRole;
      isActive: boolean;
      metadata: Record<string, any>;
    }>,
    updatedBy: string
  ): Promise<User> {
    const updates: string[] = [];
    const params: any[] = [];
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

    const result = await this.pool.query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      params
    );

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
  async suspendUser(
    userId: string,
    suspendedBy: string,
    reason: string,
    durationMinutes?: number
  ): Promise<User> {
    const result = await this.pool.query(
      'SELECT suspend_user($1, $2, $3)',
      [userId, suspendedBy, reason]
    );

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
  async unsuspendUser(userId: string, unsuspendedBy: string): Promise<User> {
    const result = await this.pool.query(
      'SELECT unsuspend_user($1, $2)',
      [userId, unsuspendedBy]
    );

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
  async deleteUser(userId: string, deletedBy: string, reason: string): Promise<boolean> {
    // Soft delete by deactivating
    await this.pool.query(
      `UPDATE users SET is_active = false, updated_at = NOW() WHERE id = $1`,
      [userId]
    );

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
  async resetUserPassword(userId: string, resetBy: string): Promise<string> {
    // Generate temporary password
    const tempPassword = randomBytes(16).toString('hex');
    const passwordHash = await argon2.hash(tempPassword);

    await this.pool.query(
      `UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2`,
      [passwordHash, userId]
    );

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
  async startImpersonation(
    adminUserId: string,
    targetUserId: string,
    reason: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<string> {
    const result = await this.pool.query(
      `INSERT INTO user_impersonations (admin_user_id, target_user_id, reason, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [adminUserId, targetUserId, reason, ipAddress || null, userAgent || null]
    );

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
  async endImpersonation(impersonationId: string, endedBy: string): Promise<void> {
    await this.pool.query(
      `UPDATE user_impersonations SET ended_at = NOW() WHERE id = $1`,
      [impersonationId]
    );

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
  async getAuditLogs(
    filters: AuditLogFilters = {},
    limit: number = 100,
    offset: number = 0
  ): Promise<{ logs: AuditLog[]; total: number }> {
    const conditions: string[] = ['1=1'];
    const params: any[] = [];
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
    const countResult = await this.pool.query(
      `SELECT COUNT(*) as total FROM audit_logs WHERE ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].total, 10);

    // Get logs
    params.push(limit, offset);
    const result = await this.pool.query(
      `SELECT * FROM audit_logs WHERE ${whereClause} ORDER BY timestamp DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`,
      params
    );

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
  async logAudit(data: {
    userId?: string;
    action: string;
    resourceType: string;
    resourceId?: string;
    details?: Record<string, any>;
    ipAddress?: string;
    userAgent?: string;
    status?: 'success' | 'failure' | 'error';
    errorMessage?: string;
    tenantId?: string;
    sessionId?: string;
    requestId?: string;
  }): Promise<string> {
    const result = await this.pool.query(
      `INSERT INTO audit_logs (
        user_id, action, resource_type, resource_id, details,
        ip_address, user_agent, status, error_message, tenant_id, session_id, request_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING id`,
      [
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
      ]
    );

    return result.rows[0].id;
  }

  // ==========================================================================
  // MODERATION
  // ==========================================================================

  /**
   * Get moderation queue
   */
  async getModerationQueue(
    filters: {
      status?: ModerationStatus;
      priority?: ModerationPriority;
      category?: ModerationCategory;
      assignedTo?: string;
      contentType?: string;
    } = {},
    limit: number = 50,
    offset: number = 0
  ): Promise<{ items: ModerationItem[]; total: number }> {
    const conditions: string[] = ['1=1'];
    const params: any[] = [];
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
    const countResult = await this.pool.query(
      `SELECT COUNT(*) as total FROM moderation_queue WHERE ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].total, 10);

    // Get items
    params.push(limit, offset);
    const result = await this.pool.query(
      `SELECT * FROM moderation_queue WHERE ${whereClause} ORDER BY priority DESC, created_at ASC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`,
      params
    );

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
  async reviewModerationItem(
    itemId: string,
    reviewedBy: string,
    status: ModerationStatus,
    actionTaken?: string,
    resolution?: string,
    notes?: string
  ): Promise<ModerationItem> {
    const result = await this.pool.query(
      `UPDATE moderation_queue
       SET status = $1, reviewed_by = $2, reviewed_at = NOW(),
           action_taken = $3, resolution = $4, notes = $5, updated_at = NOW()
       WHERE id = $6
       RETURNING *`,
      [status, reviewedBy, actionTaken || null, resolution || null, notes || null, itemId]
    );

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
  async getFeatureFlags(): Promise<FeatureFlag[]> {
    const result = await this.pool.query(
      'SELECT * FROM feature_flags ORDER BY name'
    );

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
  async updateFeatureFlag(
    flagId: string,
    data: Partial<{
      enabled: boolean;
      defaultValue: any;
      rolloutPercentage: number;
      targetUsers: string[];
      targetRoles: UserRole[];
      targetTenants: string[];
      conditions: Record<string, any>;
      tags: string[];
    }>,
    updatedBy: string,
    reason?: string
  ): Promise<FeatureFlag> {
    const updates: string[] = [];
    const params: any[] = [];
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

    const result = await this.pool.query(
      `UPDATE feature_flags SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      params
    );

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
  async getDashboardStats(): Promise<DashboardStats> {
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

  private mapDatabaseUserToUser(row: any): User {
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

/**
 * Singleton instance
 */
let instance: AdminPanelService | null = null;

export function getAdminPanelService(pool?: Pool, logger?: Logger): AdminPanelService {
  if (!instance) {
    instance = new AdminPanelService(pool, logger);
  }
  return instance;
}
