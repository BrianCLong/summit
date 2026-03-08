"use strict";
// @ts-nocheck
/**
 * Role Management Service
 *
 * Provides comprehensive role and permission management:
 * - Custom role creation and management
 * - Permission assignment and inheritance
 * - Role-to-user assignment with tenant context
 * - Permission auditing and compliance tracking
 *
 * All outputs are wrapped in DataEnvelope with mandatory GovernanceVerdict
 * for SOC 2 compliance (CC6.1, CC7.2, PI1.1).
 *
 * @module services/RoleManagementService
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.roleManagementService = exports.RoleManagementService = exports.assignRoleSchema = exports.updateRoleSchema = exports.createRoleSchema = void 0;
const crypto_1 = require("crypto");
const zod_1 = require("zod");
const database_js_1 = require("../config/database.js");
const logger_js_1 = __importDefault(require("../utils/logger.js"));
const ledger_js_1 = require("../provenance/ledger.js");
const data_envelope_js_1 = require("../types/data-envelope.js");
// ============================================================================
// Input Validation Schemas
// ============================================================================
exports.createRoleSchema = zod_1.z.object({
    name: zod_1.z.string().min(2).max(50).regex(/^[a-z][a-z0-9-_]*$/, 'Role name must be lowercase with hyphens/underscores'),
    displayName: zod_1.z.string().min(2).max(100),
    description: zod_1.z.string().max(500).optional(),
    permissions: zod_1.z.array(zod_1.z.string()).min(1),
    inherits: zod_1.z.array(zod_1.z.string()).optional(),
    isSystem: zod_1.z.boolean().default(false),
    scope: zod_1.z.enum(['full', 'restricted', 'readonly']).default('restricted'),
});
exports.updateRoleSchema = zod_1.z.object({
    displayName: zod_1.z.string().min(2).max(100).optional(),
    description: zod_1.z.string().max(500).optional(),
    permissions: zod_1.z.array(zod_1.z.string()).optional(),
    inherits: zod_1.z.array(zod_1.z.string()).optional(),
    scope: zod_1.z.enum(['full', 'restricted', 'readonly']).optional(),
});
exports.assignRoleSchema = zod_1.z.object({
    userId: zod_1.z.string().uuid(),
    roleId: zod_1.z.string().uuid(),
    expiresAt: zod_1.z.date().optional(),
});
// ============================================================================
// Built-in Roles Definition
// ============================================================================
const BUILT_IN_ROLES = [
    {
        name: 'global-admin',
        displayName: 'Global Administrator',
        description: 'Full system access across all tenants',
        permissions: ['*'],
        inherits: [],
        isSystem: true,
        isBuiltIn: true,
        scope: 'full',
    },
    {
        name: 'tenant-admin',
        displayName: 'Tenant Administrator',
        description: 'Full access within tenant',
        permissions: [
            'tenant:manage', 'tenant:read', 'tenant:settings',
            'user:*', 'role:*', 'audit:*', 'config:*',
            'api_key:*', 'billing:read',
        ],
        inherits: ['supervisor'],
        isSystem: true,
        isBuiltIn: true,
        scope: 'full',
    },
    {
        name: 'security-admin',
        displayName: 'Security Administrator',
        description: 'Security and compliance management',
        permissions: [
            'user:read', 'user:lock', 'user:unlock',
            'audit:*', 'policy:*', 'compliance:*',
            'api_key:view', 'api_key:revoke',
        ],
        inherits: ['viewer'],
        isSystem: true,
        isBuiltIn: true,
        scope: 'restricted',
    },
    {
        name: 'supervisor',
        displayName: 'Supervisor',
        description: 'Team lead with full investigation access',
        permissions: [
            'investigation:*', 'entity:*', 'relationship:*',
            'analytics:*', 'report:*', 'team:manage',
        ],
        inherits: ['analyst'],
        isSystem: true,
        isBuiltIn: true,
        scope: 'full',
    },
    {
        name: 'analyst',
        displayName: 'Analyst',
        description: 'Standard analyst with investigation capabilities',
        permissions: [
            'investigation:read', 'investigation:create', 'investigation:update',
            'entity:read', 'entity:create', 'entity:update',
            'relationship:read', 'relationship:create', 'relationship:update',
            'analytics:run', 'report:read', 'report:create',
            'copilot:query', 'copilot:analyze',
        ],
        inherits: ['viewer'],
        isSystem: true,
        isBuiltIn: true,
        scope: 'restricted',
    },
    {
        name: 'viewer',
        displayName: 'Viewer',
        description: 'Read-only access',
        permissions: [
            'investigation:read', 'entity:read', 'relationship:read',
            'analytics:view', 'report:read', 'dashboard:view',
        ],
        inherits: [],
        isSystem: true,
        isBuiltIn: true,
        scope: 'readonly',
    },
    {
        name: 'developer',
        displayName: 'Developer',
        description: 'Developer with API and pipeline access',
        permissions: [
            'maestro:*', 'ingestion:*', 'graph:read', 'graph:analyze',
            'api_key:create',
        ],
        inherits: ['analyst'],
        isSystem: true,
        isBuiltIn: true,
        scope: 'restricted',
    },
    {
        name: 'compliance-officer',
        displayName: 'Compliance Officer',
        description: 'Compliance and audit access',
        permissions: [
            'audit:read', 'audit:export', 'report:*',
            'policy:read', 'sensitive:read', 'dlp:override',
        ],
        inherits: ['viewer'],
        isSystem: true,
        isBuiltIn: true,
        scope: 'restricted',
    },
];
// ============================================================================
// Permission Definitions
// ============================================================================
const PERMISSION_CATEGORIES = {
    'User Management': [
        { id: 'user:read', name: 'user:read', displayName: 'View Users', description: 'View user profiles', resource: 'user', action: 'read', category: 'User Management', isSystem: true },
        { id: 'user:create', name: 'user:create', displayName: 'Create Users', description: 'Create new users', resource: 'user', action: 'create', category: 'User Management', isSystem: true },
        { id: 'user:update', name: 'user:update', displayName: 'Update Users', description: 'Update user profiles', resource: 'user', action: 'update', category: 'User Management', isSystem: true },
        { id: 'user:delete', name: 'user:delete', displayName: 'Delete Users', description: 'Delete users', resource: 'user', action: 'delete', category: 'User Management', isSystem: true },
        { id: 'user:lock', name: 'user:lock', displayName: 'Lock Users', description: 'Lock user accounts', resource: 'user', action: 'lock', category: 'User Management', isSystem: true },
        { id: 'user:unlock', name: 'user:unlock', displayName: 'Unlock Users', description: 'Unlock user accounts', resource: 'user', action: 'unlock', category: 'User Management', isSystem: true },
    ],
    'Role Management': [
        { id: 'role:read', name: 'role:read', displayName: 'View Roles', description: 'View roles and permissions', resource: 'role', action: 'read', category: 'Role Management', isSystem: true },
        { id: 'role:create', name: 'role:create', displayName: 'Create Roles', description: 'Create custom roles', resource: 'role', action: 'create', category: 'Role Management', isSystem: true },
        { id: 'role:update', name: 'role:update', displayName: 'Update Roles', description: 'Update role permissions', resource: 'role', action: 'update', category: 'Role Management', isSystem: true },
        { id: 'role:delete', name: 'role:delete', displayName: 'Delete Roles', description: 'Delete custom roles', resource: 'role', action: 'delete', category: 'Role Management', isSystem: true },
        { id: 'role:assign', name: 'role:assign', displayName: 'Assign Roles', description: 'Assign roles to users', resource: 'role', action: 'assign', category: 'Role Management', isSystem: true },
        { id: 'role:revoke', name: 'role:revoke', displayName: 'Revoke Roles', description: 'Revoke roles from users', resource: 'role', action: 'revoke', category: 'Role Management', isSystem: true },
    ],
    'Investigation': [
        { id: 'investigation:read', name: 'investigation:read', displayName: 'View Investigations', description: 'View investigation cases', resource: 'investigation', action: 'read', category: 'Investigation', isSystem: true },
        { id: 'investigation:create', name: 'investigation:create', displayName: 'Create Investigations', description: 'Create new investigations', resource: 'investigation', action: 'create', category: 'Investigation', isSystem: true },
        { id: 'investigation:update', name: 'investigation:update', displayName: 'Update Investigations', description: 'Update investigations', resource: 'investigation', action: 'update', category: 'Investigation', isSystem: true },
        { id: 'investigation:delete', name: 'investigation:delete', displayName: 'Delete Investigations', description: 'Delete investigations', resource: 'investigation', action: 'delete', category: 'Investigation', isSystem: true },
    ],
    'Entities': [
        { id: 'entity:read', name: 'entity:read', displayName: 'View Entities', description: 'View entities in graph', resource: 'entity', action: 'read', category: 'Entities', isSystem: true },
        { id: 'entity:create', name: 'entity:create', displayName: 'Create Entities', description: 'Create new entities', resource: 'entity', action: 'create', category: 'Entities', isSystem: true },
        { id: 'entity:update', name: 'entity:update', displayName: 'Update Entities', description: 'Update entities', resource: 'entity', action: 'update', category: 'Entities', isSystem: true },
        { id: 'entity:delete', name: 'entity:delete', displayName: 'Delete Entities', description: 'Delete entities', resource: 'entity', action: 'delete', category: 'Entities', isSystem: true },
    ],
    'Audit & Compliance': [
        { id: 'audit:read', name: 'audit:read', displayName: 'View Audit Logs', description: 'View audit trail', resource: 'audit', action: 'read', category: 'Audit & Compliance', isSystem: true },
        { id: 'audit:export', name: 'audit:export', displayName: 'Export Audit Logs', description: 'Export audit data', resource: 'audit', action: 'export', category: 'Audit & Compliance', isSystem: true },
        { id: 'compliance:read', name: 'compliance:read', displayName: 'View Compliance', description: 'View compliance status', resource: 'compliance', action: 'read', category: 'Audit & Compliance', isSystem: true },
        { id: 'compliance:report', name: 'compliance:report', displayName: 'Generate Compliance Reports', description: 'Generate compliance reports', resource: 'compliance', action: 'report', category: 'Audit & Compliance', isSystem: true },
    ],
    'Tenant Administration': [
        { id: 'tenant:manage', name: 'tenant:manage', displayName: 'Manage Tenant', description: 'Full tenant management', resource: 'tenant', action: 'manage', category: 'Tenant Administration', isSystem: true },
        { id: 'tenant:read', name: 'tenant:read', displayName: 'View Tenant', description: 'View tenant details', resource: 'tenant', action: 'read', category: 'Tenant Administration', isSystem: true },
        { id: 'tenant:settings', name: 'tenant:settings', displayName: 'Manage Tenant Settings', description: 'Update tenant settings', resource: 'tenant', action: 'settings', category: 'Tenant Administration', isSystem: true },
    ],
};
// ============================================================================
// Service Implementation
// ============================================================================
class RoleManagementService {
    pool;
    permissionCache = new Map();
    constructor() {
        this.pool = (0, database_js_1.getPostgresPool)();
        this.buildPermissionCache();
    }
    /**
     * Build permission cache from built-in roles
     */
    buildPermissionCache() {
        for (const role of BUILT_IN_ROLES) {
            const permissions = this.resolvePermissions(role.name, role.permissions, role.inherits);
            this.permissionCache.set(role.name, permissions);
        }
    }
    /**
     * Resolve all permissions including inherited
     */
    resolvePermissions(roleName, directPermissions, inherits, visited = new Set()) {
        if (visited.has(roleName))
            return new Set();
        visited.add(roleName);
        const permissions = new Set(directPermissions);
        for (const inheritedRole of inherits) {
            const inheritedRoleDef = BUILT_IN_ROLES.find(r => r.name === inheritedRole);
            if (inheritedRoleDef) {
                const inheritedPerms = this.resolvePermissions(inheritedRole, inheritedRoleDef.permissions, inheritedRoleDef.inherits, visited);
                inheritedPerms.forEach(p => permissions.add(p));
            }
        }
        return permissions;
    }
    /**
     * Create a governance verdict
     */
    createVerdict(action, result, actorId, reason) {
        return {
            verdictId: `verdict-${(0, crypto_1.randomUUID)()}`,
            policyId: 'policy:role-management:v1',
            result,
            decidedAt: new Date(),
            reason: reason || `Role management action: ${action}`,
            evaluator: 'RoleManagementService',
        };
    }
    /**
     * List all roles for a tenant
     */
    async listRoles(tenantId, actorId) {
        try {
            // Get custom roles from database
            const result = await this.pool.query('SELECT * FROM roles WHERE tenant_id = $1 OR is_system = true ORDER BY is_system DESC, name ASC', [tenantId]);
            // Combine with built-in roles
            const customRoles = result.rows.map(row => ({
                id: row.id,
                name: row.name,
                displayName: row.display_name,
                description: row.description,
                permissions: row.permissions || [],
                effectivePermissions: this.getEffectivePermissions(row.name, row.permissions, row.inherits || []),
                inherits: row.inherits || [],
                isSystem: row.is_system,
                isBuiltIn: false,
                scope: row.scope,
                tenantId: row.tenant_id,
                createdAt: row.created_at,
                updatedAt: row.updated_at,
                createdBy: row.created_by,
            }));
            // Add built-in roles not in DB
            const builtInRoles = BUILT_IN_ROLES.map(r => ({
                ...r,
                id: `builtin-${r.name}`,
                effectivePermissions: Array.from(this.permissionCache.get(r.name) || new Set()),
                tenantId: 'system',
                createdAt: new Date(),
                updatedAt: new Date(),
            }));
            const allRoles = [...builtInRoles, ...customRoles];
            const verdict = this.createVerdict('list_roles', data_envelope_js_1.GovernanceResult.ALLOW, actorId, `Listed ${allRoles.length} roles`);
            await ledger_js_1.provenanceLedger.appendEntry({
                action: 'ROLES_LISTED',
                actor: { id: actorId, role: 'admin' },
                metadata: {
                    tenantId,
                    roleCount: allRoles.length,
                    verdictId: verdict.verdictId,
                },
                artifacts: [],
            });
            return (0, data_envelope_js_1.createDataEnvelope)({ roles: allRoles, total: allRoles.length }, {
                source: 'RoleManagementService',
                actor: actorId,
                version: '1.0.0',
                classification: data_envelope_js_1.DataClassification.CONFIDENTIAL,
                governanceVerdict: verdict,
                warnings: [],
            });
        }
        catch (error) {
            logger_js_1.default.error('Error listing roles:', error);
            throw error;
        }
    }
    /**
     * Get effective permissions for a role
     */
    getEffectivePermissions(name, permissions, inherits) {
        const cached = this.permissionCache.get(name);
        if (cached)
            return Array.from(cached);
        const resolved = this.resolvePermissions(name, permissions, inherits);
        return Array.from(resolved);
    }
    /**
     * Get a single role by ID
     */
    async getRole(tenantId, roleId, actorId) {
        try {
            // Check built-in roles first
            if (roleId.startsWith('builtin-')) {
                const roleName = roleId.replace('builtin-', '');
                const builtIn = BUILT_IN_ROLES.find(r => r.name === roleName);
                if (builtIn) {
                    const role = {
                        ...builtIn,
                        id: roleId,
                        effectivePermissions: Array.from(this.permissionCache.get(roleName) || new Set()),
                        tenantId: 'system',
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    };
                    const verdict = this.createVerdict('get_role', data_envelope_js_1.GovernanceResult.ALLOW, actorId, `Retrieved built-in role ${roleName}`);
                    return (0, data_envelope_js_1.createDataEnvelope)(role, {
                        source: 'RoleManagementService',
                        actor: actorId,
                        version: '1.0.0',
                        classification: data_envelope_js_1.DataClassification.CONFIDENTIAL,
                        governanceVerdict: verdict,
                        warnings: [],
                    });
                }
            }
            // Check custom roles
            const result = await this.pool.query('SELECT * FROM roles WHERE id = $1 AND (tenant_id = $2 OR is_system = true)', [roleId, tenantId]);
            if (result.rows.length === 0) {
                const verdict = this.createVerdict('get_role', data_envelope_js_1.GovernanceResult.FLAG, actorId, `Role ${roleId} not found`);
                return (0, data_envelope_js_1.createDataEnvelope)(null, {
                    source: 'RoleManagementService',
                    actor: actorId,
                    version: '1.0.0',
                    classification: data_envelope_js_1.DataClassification.CONFIDENTIAL,
                    governanceVerdict: verdict,
                    warnings: ['Role not found'],
                });
            }
            const row = result.rows[0];
            const role = {
                id: row.id,
                name: row.name,
                displayName: row.display_name,
                description: row.description,
                permissions: row.permissions || [],
                effectivePermissions: this.getEffectivePermissions(row.name, row.permissions, row.inherits || []),
                inherits: row.inherits || [],
                isSystem: row.is_system,
                isBuiltIn: false,
                scope: row.scope,
                tenantId: row.tenant_id,
                createdAt: row.created_at,
                updatedAt: row.updated_at,
                createdBy: row.created_by,
            };
            const verdict = this.createVerdict('get_role', data_envelope_js_1.GovernanceResult.ALLOW, actorId, `Retrieved role ${role.name}`);
            return (0, data_envelope_js_1.createDataEnvelope)(role, {
                source: 'RoleManagementService',
                actor: actorId,
                version: '1.0.0',
                classification: data_envelope_js_1.DataClassification.CONFIDENTIAL,
                governanceVerdict: verdict,
                warnings: [],
            });
        }
        catch (error) {
            logger_js_1.default.error('Error getting role:', error);
            throw error;
        }
    }
    /**
     * Create a custom role
     */
    async createRole(tenantId, input, actorId) {
        const validated = exports.createRoleSchema.parse(input);
        try {
            // Check for duplicate name
            const existing = await this.pool.query('SELECT id FROM roles WHERE name = $1 AND tenant_id = $2', [validated.name, tenantId]);
            if (existing.rows.length > 0) {
                const verdict = this.createVerdict('create_role', data_envelope_js_1.GovernanceResult.DENY, actorId, `Role name ${validated.name} already exists`);
                return (0, data_envelope_js_1.createDataEnvelope)({ success: false, message: 'Role name already exists' }, {
                    source: 'RoleManagementService',
                    actor: actorId,
                    version: '1.0.0',
                    classification: data_envelope_js_1.DataClassification.CONFIDENTIAL,
                    governanceVerdict: verdict,
                    warnings: ['Duplicate role name'],
                });
            }
            // Check if trying to inherit non-existent role
            if (validated.inherits) {
                for (const inheritName of validated.inherits) {
                    const inheritExists = BUILT_IN_ROLES.some(r => r.name === inheritName) ||
                        (await this.pool.query('SELECT id FROM roles WHERE name = $1 AND (tenant_id = $2 OR is_system = true)', [inheritName, tenantId])).rows.length > 0;
                    if (!inheritExists) {
                        const verdict = this.createVerdict('create_role', data_envelope_js_1.GovernanceResult.DENY, actorId, `Inherited role ${inheritName} does not exist`);
                        return (0, data_envelope_js_1.createDataEnvelope)({ success: false, message: `Inherited role '${inheritName}' does not exist` }, {
                            source: 'RoleManagementService',
                            actor: actorId,
                            version: '1.0.0',
                            classification: data_envelope_js_1.DataClassification.CONFIDENTIAL,
                            governanceVerdict: verdict,
                            warnings: [],
                        });
                    }
                }
            }
            const roleId = (0, crypto_1.randomUUID)();
            const result = await this.pool.query(`INSERT INTO roles (
          id, name, display_name, description, permissions, inherits,
          is_system, scope, tenant_id, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *`, [
                roleId,
                validated.name,
                validated.displayName,
                validated.description,
                validated.permissions,
                validated.inherits || [],
                validated.isSystem,
                validated.scope,
                tenantId,
                actorId,
            ]);
            const row = result.rows[0];
            const role = {
                id: row.id,
                name: row.name,
                displayName: row.display_name,
                description: row.description,
                permissions: row.permissions,
                effectivePermissions: this.getEffectivePermissions(row.name, row.permissions, row.inherits || []),
                inherits: row.inherits || [],
                isSystem: row.is_system,
                isBuiltIn: false,
                scope: row.scope,
                tenantId: row.tenant_id,
                createdAt: row.created_at,
                updatedAt: row.updated_at,
                createdBy: row.created_by,
            };
            const verdict = this.createVerdict('create_role', data_envelope_js_1.GovernanceResult.ALLOW, actorId, `Created role ${role.name}`);
            await ledger_js_1.provenanceLedger.appendEntry({
                action: 'ROLE_CREATED',
                actor: { id: actorId, role: 'admin' },
                metadata: {
                    tenantId,
                    roleId: role.id,
                    roleName: role.name,
                    permissions: role.permissions,
                    verdictId: verdict.verdictId,
                },
                artifacts: [],
            });
            logger_js_1.default.info('Role created successfully', { roleId: role.id, tenantId });
            return (0, data_envelope_js_1.createDataEnvelope)({ success: true, role, message: 'Role created successfully' }, {
                source: 'RoleManagementService',
                actor: actorId,
                version: '1.0.0',
                classification: data_envelope_js_1.DataClassification.CONFIDENTIAL,
                governanceVerdict: verdict,
                warnings: [],
            });
        }
        catch (error) {
            logger_js_1.default.error('Error creating role:', error);
            throw error;
        }
    }
    /**
     * Update a custom role
     */
    async updateRole(tenantId, roleId, input, actorId) {
        const validated = exports.updateRoleSchema.parse(input);
        try {
            // Cannot update built-in roles
            if (roleId.startsWith('builtin-')) {
                const verdict = this.createVerdict('update_role', data_envelope_js_1.GovernanceResult.DENY, actorId, 'Cannot modify built-in roles');
                return (0, data_envelope_js_1.createDataEnvelope)({ success: false, message: 'Cannot modify built-in roles' }, {
                    source: 'RoleManagementService',
                    actor: actorId,
                    version: '1.0.0',
                    classification: data_envelope_js_1.DataClassification.CONFIDENTIAL,
                    governanceVerdict: verdict,
                    warnings: [],
                });
            }
            // Check role exists
            const existing = await this.pool.query('SELECT * FROM roles WHERE id = $1 AND tenant_id = $2', [roleId, tenantId]);
            if (existing.rows.length === 0) {
                const verdict = this.createVerdict('update_role', data_envelope_js_1.GovernanceResult.DENY, actorId, `Role ${roleId} not found`);
                return (0, data_envelope_js_1.createDataEnvelope)({ success: false, message: 'Role not found' }, {
                    source: 'RoleManagementService',
                    actor: actorId,
                    version: '1.0.0',
                    classification: data_envelope_js_1.DataClassification.CONFIDENTIAL,
                    governanceVerdict: verdict,
                    warnings: [],
                });
            }
            // Cannot update system roles
            if (existing.rows[0].is_system) {
                const verdict = this.createVerdict('update_role', data_envelope_js_1.GovernanceResult.DENY, actorId, 'Cannot modify system roles');
                return (0, data_envelope_js_1.createDataEnvelope)({ success: false, message: 'Cannot modify system roles' }, {
                    source: 'RoleManagementService',
                    actor: actorId,
                    version: '1.0.0',
                    classification: data_envelope_js_1.DataClassification.CONFIDENTIAL,
                    governanceVerdict: verdict,
                    warnings: [],
                });
            }
            // Build update query
            const updates = [];
            const params = [];
            let paramIndex = 1;
            if (validated.displayName !== undefined) {
                updates.push(`display_name = $${paramIndex++}`);
                params.push(validated.displayName);
            }
            if (validated.description !== undefined) {
                updates.push(`description = $${paramIndex++}`);
                params.push(validated.description);
            }
            if (validated.permissions !== undefined) {
                updates.push(`permissions = $${paramIndex++}`);
                params.push(validated.permissions);
            }
            if (validated.inherits !== undefined) {
                updates.push(`inherits = $${paramIndex++}`);
                params.push(validated.inherits);
            }
            if (validated.scope !== undefined) {
                updates.push(`scope = $${paramIndex++}`);
                params.push(validated.scope);
            }
            updates.push(`updated_at = NOW()`);
            params.push(roleId, tenantId);
            const result = await this.pool.query(`UPDATE roles SET ${updates.join(', ')}
         WHERE id = $${paramIndex++} AND tenant_id = $${paramIndex}
         RETURNING *`, params);
            const row = result.rows[0];
            const role = {
                id: row.id,
                name: row.name,
                displayName: row.display_name,
                description: row.description,
                permissions: row.permissions,
                effectivePermissions: this.getEffectivePermissions(row.name, row.permissions, row.inherits || []),
                inherits: row.inherits || [],
                isSystem: row.is_system,
                isBuiltIn: false,
                scope: row.scope,
                tenantId: row.tenant_id,
                createdAt: row.created_at,
                updatedAt: row.updated_at,
                createdBy: row.created_by,
            };
            const verdict = this.createVerdict('update_role', data_envelope_js_1.GovernanceResult.ALLOW, actorId, `Updated role ${role.name}`);
            await ledger_js_1.provenanceLedger.appendEntry({
                action: 'ROLE_UPDATED',
                actor: { id: actorId, role: 'admin' },
                metadata: {
                    tenantId,
                    roleId: role.id,
                    updatedFields: Object.keys(validated),
                    verdictId: verdict.verdictId,
                },
                artifacts: [],
            });
            return (0, data_envelope_js_1.createDataEnvelope)({ success: true, role, message: 'Role updated successfully' }, {
                source: 'RoleManagementService',
                actor: actorId,
                version: '1.0.0',
                classification: data_envelope_js_1.DataClassification.CONFIDENTIAL,
                governanceVerdict: verdict,
                warnings: [],
            });
        }
        catch (error) {
            logger_js_1.default.error('Error updating role:', error);
            throw error;
        }
    }
    /**
     * Delete a custom role
     */
    async deleteRole(tenantId, roleId, actorId) {
        try {
            // Cannot delete built-in roles
            if (roleId.startsWith('builtin-')) {
                const verdict = this.createVerdict('delete_role', data_envelope_js_1.GovernanceResult.DENY, actorId, 'Cannot delete built-in roles');
                return (0, data_envelope_js_1.createDataEnvelope)({ success: false, message: 'Cannot delete built-in roles' }, {
                    source: 'RoleManagementService',
                    actor: actorId,
                    version: '1.0.0',
                    classification: data_envelope_js_1.DataClassification.CONFIDENTIAL,
                    governanceVerdict: verdict,
                    warnings: [],
                });
            }
            // Check role exists and is not system
            const existing = await this.pool.query('SELECT * FROM roles WHERE id = $1 AND tenant_id = $2', [roleId, tenantId]);
            if (existing.rows.length === 0) {
                const verdict = this.createVerdict('delete_role', data_envelope_js_1.GovernanceResult.DENY, actorId, `Role ${roleId} not found`);
                return (0, data_envelope_js_1.createDataEnvelope)({ success: false, message: 'Role not found' }, {
                    source: 'RoleManagementService',
                    actor: actorId,
                    version: '1.0.0',
                    classification: data_envelope_js_1.DataClassification.CONFIDENTIAL,
                    governanceVerdict: verdict,
                    warnings: [],
                });
            }
            if (existing.rows[0].is_system) {
                const verdict = this.createVerdict('delete_role', data_envelope_js_1.GovernanceResult.DENY, actorId, 'Cannot delete system roles');
                return (0, data_envelope_js_1.createDataEnvelope)({ success: false, message: 'Cannot delete system roles' }, {
                    source: 'RoleManagementService',
                    actor: actorId,
                    version: '1.0.0',
                    classification: data_envelope_js_1.DataClassification.CONFIDENTIAL,
                    governanceVerdict: verdict,
                    warnings: [],
                });
            }
            // Check if role is in use
            const usageCheck = await this.pool.query('SELECT COUNT(*) FROM user_roles WHERE role_id = $1', [roleId]);
            if (parseInt(usageCheck.rows[0].count, 10) > 0) {
                const verdict = this.createVerdict('delete_role', data_envelope_js_1.GovernanceResult.DENY, actorId, 'Role is currently assigned to users');
                return (0, data_envelope_js_1.createDataEnvelope)({ success: false, message: 'Cannot delete role that is assigned to users' }, {
                    source: 'RoleManagementService',
                    actor: actorId,
                    version: '1.0.0',
                    classification: data_envelope_js_1.DataClassification.CONFIDENTIAL,
                    governanceVerdict: verdict,
                    warnings: ['Role is in use'],
                });
            }
            const roleName = existing.rows[0].name;
            await this.pool.query('DELETE FROM roles WHERE id = $1', [roleId]);
            const verdict = this.createVerdict('delete_role', data_envelope_js_1.GovernanceResult.ALLOW, actorId, `Deleted role ${roleName}`);
            await ledger_js_1.provenanceLedger.appendEntry({
                action: 'ROLE_DELETED',
                actor: { id: actorId, role: 'admin' },
                metadata: {
                    tenantId,
                    roleId,
                    roleName,
                    verdictId: verdict.verdictId,
                },
                artifacts: [],
            });
            return (0, data_envelope_js_1.createDataEnvelope)({ success: true, message: 'Role deleted successfully' }, {
                source: 'RoleManagementService',
                actor: actorId,
                version: '1.0.0',
                classification: data_envelope_js_1.DataClassification.CONFIDENTIAL,
                governanceVerdict: verdict,
                warnings: [],
            });
        }
        catch (error) {
            logger_js_1.default.error('Error deleting role:', error);
            throw error;
        }
    }
    /**
     * List all available permissions
     */
    async listPermissions(actorId) {
        const permissions = [];
        const categories = [];
        for (const [category, perms] of Object.entries(PERMISSION_CATEGORIES)) {
            categories.push(category);
            permissions.push(...perms);
        }
        const verdict = this.createVerdict('list_permissions', data_envelope_js_1.GovernanceResult.ALLOW, actorId, `Listed ${permissions.length} permissions`);
        return (0, data_envelope_js_1.createDataEnvelope)({ permissions, categories, total: permissions.length }, {
            source: 'RoleManagementService',
            actor: actorId,
            version: '1.0.0',
            classification: data_envelope_js_1.DataClassification.INTERNAL,
            governanceVerdict: verdict,
            warnings: [],
        });
    }
    /**
     * Assign role to user
     */
    async assignRoleToUser(tenantId, userId, roleId, actorId, expiresAt) {
        try {
            const assignmentId = (0, crypto_1.randomUUID)();
            // Get role name
            let roleName;
            if (roleId.startsWith('builtin-')) {
                roleName = roleId.replace('builtin-', '');
            }
            else {
                const role = await this.pool.query('SELECT name FROM roles WHERE id = $1', [roleId]);
                if (role.rows.length === 0) {
                    const verdict = this.createVerdict('assign_role', data_envelope_js_1.GovernanceResult.DENY, actorId, `Role ${roleId} not found`);
                    return (0, data_envelope_js_1.createDataEnvelope)({ success: false, message: 'Role not found' }, {
                        source: 'RoleManagementService',
                        actor: actorId,
                        version: '1.0.0',
                        classification: data_envelope_js_1.DataClassification.CONFIDENTIAL,
                        governanceVerdict: verdict,
                        warnings: [],
                    });
                }
                roleName = role.rows[0].name;
            }
            await this.pool.query(`INSERT INTO user_roles (id, user_id, role_id, role_name, tenant_id, granted_by, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (user_id, role_id, tenant_id)
         DO UPDATE SET granted_by = EXCLUDED.granted_by, granted_at = NOW(), expires_at = EXCLUDED.expires_at`, [assignmentId, userId, roleId, roleName, tenantId, actorId, expiresAt]);
            const verdict = this.createVerdict('assign_role', data_envelope_js_1.GovernanceResult.ALLOW, actorId, `Assigned role ${roleName} to user ${userId}`);
            await ledger_js_1.provenanceLedger.appendEntry({
                action: 'ROLE_ASSIGNED',
                actor: { id: actorId, role: 'admin' },
                metadata: {
                    tenantId,
                    targetUserId: userId,
                    roleId,
                    roleName,
                    expiresAt,
                    verdictId: verdict.verdictId,
                },
                artifacts: [],
            });
            logger_js_1.default.info('Role assigned', { userId, roleId, roleName, tenantId });
            return (0, data_envelope_js_1.createDataEnvelope)({ success: true, message: `Role ${roleName} assigned successfully` }, {
                source: 'RoleManagementService',
                actor: actorId,
                version: '1.0.0',
                classification: data_envelope_js_1.DataClassification.CONFIDENTIAL,
                governanceVerdict: verdict,
                warnings: expiresAt ? ['Role assignment has expiration date'] : [],
            });
        }
        catch (error) {
            logger_js_1.default.error('Error assigning role:', error);
            throw error;
        }
    }
    /**
     * Revoke role from user
     */
    async revokeRoleFromUser(tenantId, userId, roleId, actorId) {
        try {
            const result = await this.pool.query(`DELETE FROM user_roles
         WHERE user_id = $1 AND role_id = $2 AND tenant_id = $3
         RETURNING role_name`, [userId, roleId, tenantId]);
            if (result.rows.length === 0) {
                const verdict = this.createVerdict('revoke_role', data_envelope_js_1.GovernanceResult.FLAG, actorId, 'Role assignment not found');
                return (0, data_envelope_js_1.createDataEnvelope)({ success: false, message: 'Role assignment not found' }, {
                    source: 'RoleManagementService',
                    actor: actorId,
                    version: '1.0.0',
                    classification: data_envelope_js_1.DataClassification.CONFIDENTIAL,
                    governanceVerdict: verdict,
                    warnings: [],
                });
            }
            const roleName = result.rows[0].role_name;
            const verdict = this.createVerdict('revoke_role', data_envelope_js_1.GovernanceResult.ALLOW, actorId, `Revoked role ${roleName} from user ${userId}`);
            await ledger_js_1.provenanceLedger.appendEntry({
                action: 'ROLE_REVOKED',
                actor: { id: actorId, role: 'admin' },
                metadata: {
                    tenantId,
                    targetUserId: userId,
                    roleId,
                    roleName,
                    verdictId: verdict.verdictId,
                },
                artifacts: [],
            });
            logger_js_1.default.info('Role revoked', { userId, roleId, roleName, tenantId });
            return (0, data_envelope_js_1.createDataEnvelope)({ success: true, message: `Role ${roleName} revoked successfully` }, {
                source: 'RoleManagementService',
                actor: actorId,
                version: '1.0.0',
                classification: data_envelope_js_1.DataClassification.CONFIDENTIAL,
                governanceVerdict: verdict,
                warnings: [],
            });
        }
        catch (error) {
            logger_js_1.default.error('Error revoking role:', error);
            throw error;
        }
    }
    /**
     * Get user's role assignments
     */
    async getUserRoles(tenantId, userId, actorId) {
        try {
            const result = await this.pool.query(`SELECT * FROM user_roles
         WHERE user_id = $1 AND tenant_id = $2
         ORDER BY granted_at DESC`, [userId, tenantId]);
            const assignments = result.rows.map(row => ({
                id: row.id,
                userId: row.user_id,
                roleId: row.role_id,
                roleName: row.role_name,
                tenantId: row.tenant_id,
                grantedBy: row.granted_by,
                grantedAt: row.granted_at,
                expiresAt: row.expires_at,
                isActive: !row.expires_at || new Date(row.expires_at) > new Date(),
            }));
            const verdict = this.createVerdict('get_user_roles', data_envelope_js_1.GovernanceResult.ALLOW, actorId, `Retrieved ${assignments.length} role assignments for user ${userId}`);
            return (0, data_envelope_js_1.createDataEnvelope)(assignments, {
                source: 'RoleManagementService',
                actor: actorId,
                version: '1.0.0',
                classification: data_envelope_js_1.DataClassification.CONFIDENTIAL,
                governanceVerdict: verdict,
                warnings: [],
            });
        }
        catch (error) {
            logger_js_1.default.error('Error getting user roles:', error);
            throw error;
        }
    }
}
exports.RoleManagementService = RoleManagementService;
exports.roleManagementService = new RoleManagementService();
exports.default = RoleManagementService;
