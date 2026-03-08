"use strict";
// @ts-nocheck
/**
 * User Management Service
 *
 * Provides comprehensive user management capabilities for admin operations:
 * - User CRUD operations with multi-tenant support
 * - Role assignment and revocation
 * - User status management (activate, deactivate, lock)
 * - Bulk operations with governance audit trail
 *
 * All outputs are wrapped in DataEnvelope with mandatory GovernanceVerdict
 * for SOC 2 compliance (CC6.1, CC7.2, PI1.1).
 *
 * @module services/UserManagementService
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
exports.userManagementService = exports.UserManagementService = exports.listUsersSchema = exports.updateUserSchema = exports.createUserSchema = void 0;
const crypto_1 = require("crypto");
const argon2 = __importStar(require("argon2"));
const zod_1 = require("zod");
const database_js_1 = require("../config/database.js");
const logger_js_1 = __importDefault(require("../utils/logger.js"));
const ledger_js_1 = require("../provenance/ledger.js");
const data_envelope_js_1 = require("../types/data-envelope.js");
// ============================================================================
// Input Validation Schemas
// ============================================================================
exports.createUserSchema = zod_1.z.object({
    email: zod_1.z.string().email('Invalid email format'),
    username: zod_1.z.string().min(3).max(50).optional(),
    password: zod_1.z.string().min(8, 'Password must be at least 8 characters'),
    firstName: zod_1.z.string().min(1).max(100),
    lastName: zod_1.z.string().min(1).max(100),
    role: zod_1.z.enum(['ADMIN', 'ANALYST', 'VIEWER', 'DEVELOPER', 'COMPLIANCE_OFFICER']).default('ANALYST'),
    tenantId: zod_1.z.string().uuid().optional(),
});
exports.updateUserSchema = zod_1.z.object({
    email: zod_1.z.string().email().optional(),
    firstName: zod_1.z.string().min(1).max(100).optional(),
    lastName: zod_1.z.string().min(1).max(100).optional(),
    role: zod_1.z.enum(['ADMIN', 'ANALYST', 'VIEWER', 'DEVELOPER', 'COMPLIANCE_OFFICER']).optional(),
    isActive: zod_1.z.boolean().optional(),
});
exports.listUsersSchema = zod_1.z.object({
    page: zod_1.z.number().int().min(1).default(1),
    pageSize: zod_1.z.number().int().min(1).max(100).default(20),
    search: zod_1.z.string().optional(),
    role: zod_1.z.string().optional(),
    isActive: zod_1.z.boolean().optional(),
    sortBy: zod_1.z.enum(['email', 'firstName', 'lastName', 'createdAt', 'lastLogin']).default('createdAt'),
    sortOrder: zod_1.z.enum(['asc', 'desc']).default('desc'),
});
// ============================================================================
// Service Implementation
// ============================================================================
class UserManagementService {
    pool;
    constructor() {
        this.pool = (0, database_js_1.getPostgresPool)();
    }
    /**
     * Create a governance verdict for user management operations
     */
    createVerdict(action, result, actorId, reason) {
        return {
            verdictId: `verdict-${(0, crypto_1.randomUUID)()}`,
            policyId: 'policy:user-management:v1',
            result,
            decidedAt: new Date(),
            reason: reason || `User management action: ${action}`,
            evaluator: 'UserManagementService',
        };
    }
    /**
     * List users with pagination and filtering
     * Returns DataEnvelope with GovernanceVerdict
     */
    async listUsers(tenantId, input, actorId) {
        const validated = exports.listUsersSchema.parse(input);
        const { page, pageSize, search, role, isActive, sortBy, sortOrder } = validated;
        const offset = (page - 1) * pageSize;
        try {
            // Build WHERE clause
            const conditions = ['tenant_id = $1'];
            const params = [tenantId];
            let paramIndex = 2;
            if (search) {
                conditions.push(`(email ILIKE $${paramIndex} OR first_name ILIKE $${paramIndex} OR last_name ILIKE $${paramIndex})`);
                params.push(`%${search}%`);
                paramIndex++;
            }
            if (role) {
                conditions.push(`role = $${paramIndex}`);
                params.push(role);
                paramIndex++;
            }
            if (isActive !== undefined) {
                conditions.push(`is_active = $${paramIndex}`);
                params.push(isActive);
                paramIndex++;
            }
            const whereClause = conditions.join(' AND ');
            // Column mapping for sort
            const sortColumnMap = {
                email: 'email',
                firstName: 'first_name',
                lastName: 'last_name',
                createdAt: 'created_at',
                lastLogin: 'last_login',
            };
            const sortColumn = sortColumnMap[sortBy] || 'created_at';
            // Count query
            const countResult = await this.pool.query(`SELECT COUNT(*) FROM users WHERE ${whereClause}`, params);
            const total = parseInt(countResult.rows[0].count, 10);
            // Data query
            const dataResult = await this.pool.query(`SELECT * FROM users WHERE ${whereClause}
         ORDER BY ${sortColumn} ${sortOrder.toUpperCase()}
         LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`, [...params, pageSize, offset]);
            const users = dataResult.rows.map((row) => this.mapToManagedUser(row));
            // Get tenant memberships for each user
            const userIds = users.map(u => u.id);
            if (userIds.length > 0) {
                const memberships = await this.pool.query(`SELECT user_id, array_agg(tenant_id) as tenant_ids
           FROM user_tenants
           WHERE user_id = ANY($1)
           GROUP BY user_id`, [userIds]);
                const membershipMap = new Map(memberships.rows.map((r) => [r.user_id, r.tenant_ids]));
                users.forEach(u => {
                    u.tenantIds = membershipMap.get(u.id) || [u.tenantId];
                });
            }
            const result = {
                users,
                total,
                page,
                pageSize,
                totalPages: Math.ceil(total / pageSize),
            };
            // Create governance verdict
            const verdict = this.createVerdict('list_users', data_envelope_js_1.GovernanceResult.ALLOW, actorId, `Listed ${users.length} users from tenant ${tenantId}`);
            // Log to provenance
            await ledger_js_1.provenanceLedger.appendEntry({
                action: 'USER_LIST_ACCESSED',
                actor: { id: actorId, role: 'admin' },
                metadata: {
                    tenantId,
                    resultCount: users.length,
                    filters: { search, role, isActive },
                    verdictId: verdict.verdictId,
                },
                artifacts: [],
            });
            return (0, data_envelope_js_1.createDataEnvelope)(result, {
                source: 'UserManagementService',
                actor: actorId,
                version: '1.0.0',
                classification: data_envelope_js_1.DataClassification.RESTRICTED,
                governanceVerdict: verdict,
                warnings: [],
            });
        }
        catch (error) {
            logger_js_1.default.error('Error listing users:', error);
            throw error;
        }
    }
    /**
     * Get a single user by ID
     * Returns DataEnvelope with GovernanceVerdict
     */
    async getUser(tenantId, userId, actorId) {
        try {
            const result = await this.pool.query('SELECT * FROM users WHERE id = $1 AND tenant_id = $2', [userId, tenantId]);
            if (result.rows.length === 0) {
                const verdict = this.createVerdict('get_user', data_envelope_js_1.GovernanceResult.FLAG, actorId, `User ${userId} not found in tenant ${tenantId}`);
                return (0, data_envelope_js_1.createDataEnvelope)(null, {
                    source: 'UserManagementService',
                    actor: actorId,
                    version: '1.0.0',
                    classification: data_envelope_js_1.DataClassification.RESTRICTED,
                    governanceVerdict: verdict,
                    warnings: ['User not found'],
                });
            }
            const user = this.mapToManagedUser(result.rows[0]);
            // Get tenant memberships
            const memberships = await this.pool.query('SELECT tenant_id FROM user_tenants WHERE user_id = $1', [userId]);
            user.tenantIds = memberships.rows.map((r) => r.tenant_id);
            const verdict = this.createVerdict('get_user', data_envelope_js_1.GovernanceResult.ALLOW, actorId, `Retrieved user ${userId}`);
            await ledger_js_1.provenanceLedger.appendEntry({
                action: 'USER_ACCESSED',
                actor: { id: actorId, role: 'admin' },
                metadata: {
                    tenantId,
                    targetUserId: userId,
                    verdictId: verdict.verdictId,
                },
                artifacts: [],
            });
            return (0, data_envelope_js_1.createDataEnvelope)(user, {
                source: 'UserManagementService',
                actor: actorId,
                version: '1.0.0',
                classification: data_envelope_js_1.DataClassification.RESTRICTED,
                governanceVerdict: verdict,
                warnings: [],
            });
        }
        catch (error) {
            logger_js_1.default.error('Error getting user:', error);
            throw error;
        }
    }
    /**
     * Create a new user
     * Returns DataEnvelope with GovernanceVerdict
     */
    async createUser(tenantId, input, actorId) {
        const validated = exports.createUserSchema.parse(input);
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            // Check for existing user
            const existing = await client.query('SELECT id FROM users WHERE email = $1', [validated.email]);
            if (existing.rows.length > 0) {
                const verdict = this.createVerdict('create_user', data_envelope_js_1.GovernanceResult.DENY, actorId, `User with email ${validated.email} already exists`);
                await client.query('ROLLBACK');
                return (0, data_envelope_js_1.createDataEnvelope)({
                    success: false,
                    message: 'User with this email already exists',
                }, {
                    source: 'UserManagementService',
                    actor: actorId,
                    version: '1.0.0',
                    classification: data_envelope_js_1.DataClassification.RESTRICTED,
                    governanceVerdict: verdict,
                    warnings: ['Duplicate email'],
                });
            }
            // Hash password
            const passwordHash = await argon2.hash(validated.password);
            const userId = (0, crypto_1.randomUUID)();
            // Create user
            const result = await client.query(`INSERT INTO users (
          id, email, username, password_hash, first_name, last_name,
          role, tenant_id, is_active, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, $9)
        RETURNING *`, [
                userId,
                validated.email,
                validated.username,
                passwordHash,
                validated.firstName,
                validated.lastName,
                validated.role,
                validated.tenantId || tenantId,
                actorId,
            ]);
            // Add tenant membership
            await client.query(`INSERT INTO user_tenants (user_id, tenant_id, roles)
         VALUES ($1, $2, $3)
         ON CONFLICT DO NOTHING`, [userId, validated.tenantId || tenantId, [validated.role]]);
            await client.query('COMMIT');
            const user = this.mapToManagedUser(result.rows[0]);
            user.tenantIds = [validated.tenantId || tenantId];
            const verdict = this.createVerdict('create_user', data_envelope_js_1.GovernanceResult.ALLOW, actorId, `Created user ${userId} with role ${validated.role}`);
            await ledger_js_1.provenanceLedger.appendEntry({
                action: 'USER_CREATED',
                actor: { id: actorId, role: 'admin' },
                metadata: {
                    tenantId,
                    newUserId: userId,
                    role: validated.role,
                    verdictId: verdict.verdictId,
                },
                artifacts: [],
            });
            logger_js_1.default.info('User created successfully', { userId, tenantId, role: validated.role });
            return (0, data_envelope_js_1.createDataEnvelope)({
                success: true,
                user,
                message: 'User created successfully',
            }, {
                source: 'UserManagementService',
                actor: actorId,
                version: '1.0.0',
                classification: data_envelope_js_1.DataClassification.RESTRICTED,
                governanceVerdict: verdict,
                warnings: [],
            });
        }
        catch (error) {
            await client.query('ROLLBACK');
            logger_js_1.default.error('Error creating user:', error);
            throw error;
        }
        finally {
            client.release();
        }
    }
    /**
     * Update an existing user
     * Returns DataEnvelope with GovernanceVerdict
     */
    async updateUser(tenantId, userId, input, actorId) {
        const validated = exports.updateUserSchema.parse(input);
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            // Check user exists in tenant
            const existing = await client.query('SELECT * FROM users WHERE id = $1 AND tenant_id = $2', [userId, tenantId]);
            if (existing.rows.length === 0) {
                const verdict = this.createVerdict('update_user', data_envelope_js_1.GovernanceResult.DENY, actorId, `User ${userId} not found in tenant ${tenantId}`);
                await client.query('ROLLBACK');
                return (0, data_envelope_js_1.createDataEnvelope)({
                    success: false,
                    message: 'User not found',
                }, {
                    source: 'UserManagementService',
                    actor: actorId,
                    version: '1.0.0',
                    classification: data_envelope_js_1.DataClassification.RESTRICTED,
                    governanceVerdict: verdict,
                    warnings: ['User not found'],
                });
            }
            // Build update query dynamically
            const updates = [];
            const params = [];
            let paramIndex = 1;
            if (validated.email !== undefined) {
                updates.push(`email = $${paramIndex++}`);
                params.push(validated.email);
            }
            if (validated.firstName !== undefined) {
                updates.push(`first_name = $${paramIndex++}`);
                params.push(validated.firstName);
            }
            if (validated.lastName !== undefined) {
                updates.push(`last_name = $${paramIndex++}`);
                params.push(validated.lastName);
            }
            if (validated.role !== undefined) {
                updates.push(`role = $${paramIndex++}`);
                params.push(validated.role);
            }
            if (validated.isActive !== undefined) {
                updates.push(`is_active = $${paramIndex++}`);
                params.push(validated.isActive);
            }
            updates.push(`updated_at = NOW()`);
            params.push(userId, tenantId);
            const result = await client.query(`UPDATE users SET ${updates.join(', ')}
         WHERE id = $${paramIndex++} AND tenant_id = $${paramIndex}
         RETURNING *`, params);
            await client.query('COMMIT');
            const user = this.mapToManagedUser(result.rows[0]);
            const verdict = this.createVerdict('update_user', data_envelope_js_1.GovernanceResult.ALLOW, actorId, `Updated user ${userId}`);
            await ledger_js_1.provenanceLedger.appendEntry({
                action: 'USER_UPDATED',
                actor: { id: actorId, role: 'admin' },
                metadata: {
                    tenantId,
                    targetUserId: userId,
                    updatedFields: Object.keys(validated),
                    verdictId: verdict.verdictId,
                },
                artifacts: [],
            });
            logger_js_1.default.info('User updated successfully', { userId, tenantId });
            return (0, data_envelope_js_1.createDataEnvelope)({
                success: true,
                user,
                message: 'User updated successfully',
            }, {
                source: 'UserManagementService',
                actor: actorId,
                version: '1.0.0',
                classification: data_envelope_js_1.DataClassification.RESTRICTED,
                governanceVerdict: verdict,
                warnings: [],
            });
        }
        catch (error) {
            await client.query('ROLLBACK');
            logger_js_1.default.error('Error updating user:', error);
            throw error;
        }
        finally {
            client.release();
        }
    }
    /**
     * Delete (deactivate) a user
     * Returns DataEnvelope with GovernanceVerdict
     */
    async deleteUser(tenantId, userId, actorId, hardDelete = false) {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            // Check user exists
            const existing = await client.query('SELECT * FROM users WHERE id = $1 AND tenant_id = $2', [userId, tenantId]);
            if (existing.rows.length === 0) {
                const verdict = this.createVerdict('delete_user', data_envelope_js_1.GovernanceResult.DENY, actorId, `User ${userId} not found`);
                await client.query('ROLLBACK');
                return (0, data_envelope_js_1.createDataEnvelope)({
                    success: false,
                    message: 'User not found',
                }, {
                    source: 'UserManagementService',
                    actor: actorId,
                    version: '1.0.0',
                    classification: data_envelope_js_1.DataClassification.RESTRICTED,
                    governanceVerdict: verdict,
                    warnings: [],
                });
            }
            // Prevent self-deletion
            if (userId === actorId) {
                const verdict = this.createVerdict('delete_user', data_envelope_js_1.GovernanceResult.DENY, actorId, 'Cannot delete own account');
                await client.query('ROLLBACK');
                return (0, data_envelope_js_1.createDataEnvelope)({
                    success: false,
                    message: 'Cannot delete your own account',
                }, {
                    source: 'UserManagementService',
                    actor: actorId,
                    version: '1.0.0',
                    classification: data_envelope_js_1.DataClassification.RESTRICTED,
                    governanceVerdict: verdict,
                    warnings: ['Self-deletion prevented'],
                });
            }
            if (hardDelete) {
                // Hard delete - remove from database
                await client.query('DELETE FROM user_tenants WHERE user_id = $1', [userId]);
                await client.query('DELETE FROM user_sessions WHERE user_id = $1', [userId]);
                await client.query('DELETE FROM users WHERE id = $1', [userId]);
            }
            else {
                // Soft delete - deactivate
                await client.query('UPDATE users SET is_active = false, updated_at = NOW() WHERE id = $1', [userId]);
            }
            await client.query('COMMIT');
            const verdict = this.createVerdict('delete_user', data_envelope_js_1.GovernanceResult.ALLOW, actorId, `${hardDelete ? 'Hard' : 'Soft'} deleted user ${userId}`);
            await ledger_js_1.provenanceLedger.appendEntry({
                action: hardDelete ? 'USER_DELETED' : 'USER_DEACTIVATED',
                actor: { id: actorId, role: 'admin' },
                metadata: {
                    tenantId,
                    targetUserId: userId,
                    hardDelete,
                    verdictId: verdict.verdictId,
                },
                artifacts: [],
            });
            logger_js_1.default.info('User deleted successfully', { userId, tenantId, hardDelete });
            return (0, data_envelope_js_1.createDataEnvelope)({
                success: true,
                message: hardDelete ? 'User deleted permanently' : 'User deactivated',
            }, {
                source: 'UserManagementService',
                actor: actorId,
                version: '1.0.0',
                classification: data_envelope_js_1.DataClassification.RESTRICTED,
                governanceVerdict: verdict,
                warnings: hardDelete ? ['User data permanently removed'] : [],
            });
        }
        catch (error) {
            await client.query('ROLLBACK');
            logger_js_1.default.error('Error deleting user:', error);
            throw error;
        }
        finally {
            client.release();
        }
    }
    /**
     * Lock a user account
     */
    async lockUser(tenantId, userId, actorId, reason) {
        try {
            const result = await this.pool.query(`UPDATE users SET is_locked = true, lock_reason = $1, updated_at = NOW()
         WHERE id = $2 AND tenant_id = $3
         RETURNING *`, [reason, userId, tenantId]);
            if (result.rows.length === 0) {
                const verdict = this.createVerdict('lock_user', data_envelope_js_1.GovernanceResult.DENY, actorId, `User ${userId} not found`);
                return (0, data_envelope_js_1.createDataEnvelope)({
                    success: false,
                    message: 'User not found',
                }, {
                    source: 'UserManagementService',
                    actor: actorId,
                    version: '1.0.0',
                    classification: data_envelope_js_1.DataClassification.RESTRICTED,
                    governanceVerdict: verdict,
                    warnings: [],
                });
            }
            const user = this.mapToManagedUser(result.rows[0]);
            const verdict = this.createVerdict('lock_user', data_envelope_js_1.GovernanceResult.ALLOW, actorId, `Locked user ${userId}: ${reason}`);
            await ledger_js_1.provenanceLedger.appendEntry({
                action: 'USER_LOCKED',
                actor: { id: actorId, role: 'admin' },
                metadata: {
                    tenantId,
                    targetUserId: userId,
                    reason,
                    verdictId: verdict.verdictId,
                },
                artifacts: [],
            });
            logger_js_1.default.info('User locked', { userId, tenantId, reason });
            return (0, data_envelope_js_1.createDataEnvelope)({
                success: true,
                user,
                message: 'User account locked',
            }, {
                source: 'UserManagementService',
                actor: actorId,
                version: '1.0.0',
                classification: data_envelope_js_1.DataClassification.RESTRICTED,
                governanceVerdict: verdict,
                warnings: [],
            });
        }
        catch (error) {
            logger_js_1.default.error('Error locking user:', error);
            throw error;
        }
    }
    /**
     * Unlock a user account
     */
    async unlockUser(tenantId, userId, actorId) {
        try {
            const result = await this.pool.query(`UPDATE users SET is_locked = false, lock_reason = NULL, updated_at = NOW()
         WHERE id = $1 AND tenant_id = $2
         RETURNING *`, [userId, tenantId]);
            if (result.rows.length === 0) {
                const verdict = this.createVerdict('unlock_user', data_envelope_js_1.GovernanceResult.DENY, actorId, `User ${userId} not found`);
                return (0, data_envelope_js_1.createDataEnvelope)({
                    success: false,
                    message: 'User not found',
                }, {
                    source: 'UserManagementService',
                    actor: actorId,
                    version: '1.0.0',
                    classification: data_envelope_js_1.DataClassification.RESTRICTED,
                    governanceVerdict: verdict,
                    warnings: [],
                });
            }
            const user = this.mapToManagedUser(result.rows[0]);
            const verdict = this.createVerdict('unlock_user', data_envelope_js_1.GovernanceResult.ALLOW, actorId, `Unlocked user ${userId}`);
            await ledger_js_1.provenanceLedger.appendEntry({
                action: 'USER_UNLOCKED',
                actor: { id: actorId, role: 'admin' },
                metadata: {
                    tenantId,
                    targetUserId: userId,
                    verdictId: verdict.verdictId,
                },
                artifacts: [],
            });
            logger_js_1.default.info('User unlocked', { userId, tenantId });
            return (0, data_envelope_js_1.createDataEnvelope)({
                success: true,
                user,
                message: 'User account unlocked',
            }, {
                source: 'UserManagementService',
                actor: actorId,
                version: '1.0.0',
                classification: data_envelope_js_1.DataClassification.RESTRICTED,
                governanceVerdict: verdict,
                warnings: [],
            });
        }
        catch (error) {
            logger_js_1.default.error('Error unlocking user:', error);
            throw error;
        }
    }
    /**
     * Add user to additional tenant
     */
    async addUserToTenant(userId, targetTenantId, roles, actorId) {
        try {
            await this.pool.query(`INSERT INTO user_tenants (user_id, tenant_id, roles)
         VALUES ($1, $2, $3)
         ON CONFLICT (user_id, tenant_id)
         DO UPDATE SET roles = EXCLUDED.roles`, [userId, targetTenantId, roles]);
            const verdict = this.createVerdict('add_user_to_tenant', data_envelope_js_1.GovernanceResult.ALLOW, actorId, `Added user ${userId} to tenant ${targetTenantId}`);
            await ledger_js_1.provenanceLedger.appendEntry({
                action: 'USER_TENANT_ADDED',
                actor: { id: actorId, role: 'admin' },
                metadata: {
                    targetUserId: userId,
                    targetTenantId,
                    roles,
                    verdictId: verdict.verdictId,
                },
                artifacts: [],
            });
            return (0, data_envelope_js_1.createDataEnvelope)({
                success: true,
                message: 'User added to tenant',
            }, {
                source: 'UserManagementService',
                actor: actorId,
                version: '1.0.0',
                classification: data_envelope_js_1.DataClassification.RESTRICTED,
                governanceVerdict: verdict,
                warnings: [],
            });
        }
        catch (error) {
            logger_js_1.default.error('Error adding user to tenant:', error);
            throw error;
        }
    }
    /**
     * Remove user from tenant
     */
    async removeUserFromTenant(userId, targetTenantId, actorId) {
        try {
            await this.pool.query('DELETE FROM user_tenants WHERE user_id = $1 AND tenant_id = $2', [userId, targetTenantId]);
            const verdict = this.createVerdict('remove_user_from_tenant', data_envelope_js_1.GovernanceResult.ALLOW, actorId, `Removed user ${userId} from tenant ${targetTenantId}`);
            await ledger_js_1.provenanceLedger.appendEntry({
                action: 'USER_TENANT_REMOVED',
                actor: { id: actorId, role: 'admin' },
                metadata: {
                    targetUserId: userId,
                    targetTenantId,
                    verdictId: verdict.verdictId,
                },
                artifacts: [],
            });
            return (0, data_envelope_js_1.createDataEnvelope)({
                success: true,
                message: 'User removed from tenant',
            }, {
                source: 'UserManagementService',
                actor: actorId,
                version: '1.0.0',
                classification: data_envelope_js_1.DataClassification.RESTRICTED,
                governanceVerdict: verdict,
                warnings: [],
            });
        }
        catch (error) {
            logger_js_1.default.error('Error removing user from tenant:', error);
            throw error;
        }
    }
    /**
     * Map database row to ManagedUser
     */
    mapToManagedUser(row) {
        return {
            id: row.id,
            email: row.email,
            username: row.username,
            firstName: row.first_name,
            lastName: row.last_name,
            fullName: `${row.first_name} ${row.last_name}`.trim(),
            role: row.role,
            tenantId: row.tenant_id,
            tenantIds: [row.tenant_id], // Will be populated separately
            isActive: row.is_active,
            isLocked: row.is_locked || false,
            lockReason: row.lock_reason,
            lastLogin: row.last_login,
            mfaEnabled: row.mfa_enabled || false,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            createdBy: row.created_by,
        };
    }
}
exports.UserManagementService = UserManagementService;
exports.userManagementService = new UserManagementService();
exports.default = UserManagementService;
