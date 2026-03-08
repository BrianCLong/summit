"use strict";
/**
 * CompanyOS User and Role Sync Types
 * Defines interfaces for bi-directional synchronization between CompanyOS and Summit RBAC
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_ROLE_MAPPINGS = exports.SyncConfigSchema = exports.SyncEventSchema = exports.SyncEventType = exports.SummitUserSchema = exports.CompanyOSUserSchema = exports.RoleMappingSchema = exports.SummitRole = exports.CompanyOSRole = void 0;
const zod_1 = require("zod");
// CompanyOS Role Definitions
exports.CompanyOSRole = zod_1.z.enum([
    'Exec',
    'AM', // Account Manager
    'Presenter',
    'IncidentCommander',
    'OnCallEngineer',
    'OperationsManager',
    'ReadOnly',
]);
// Summit RBAC Role Definitions
exports.SummitRole = zod_1.z.enum([
    'admin',
    'operator',
    'analyst',
    'viewer',
    'emergency',
]);
// Role mapping between CompanyOS and Summit
exports.RoleMappingSchema = zod_1.z.object({
    companyOSRole: exports.CompanyOSRole,
    summitRoles: zod_1.z.array(exports.SummitRole),
    permissions: zod_1.z.array(zod_1.z.string()),
    priority: zod_1.z.number().int().min(0).max(100),
});
// User sync payload
exports.CompanyOSUserSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    externalId: zod_1.z.string().optional(),
    email: zod_1.z.string().email(),
    firstName: zod_1.z.string(),
    lastName: zod_1.z.string(),
    displayName: zod_1.z.string(),
    department: zod_1.z.string().optional(),
    title: zod_1.z.string().optional(),
    companyOSRoles: zod_1.z.array(exports.CompanyOSRole),
    teams: zod_1.z.array(zod_1.z.string()),
    tenantId: zod_1.z.string(),
    source: zod_1.z.enum(['companyos', 'summit', 'scim', 'sso']),
    isActive: zod_1.z.boolean(),
    onCallEligible: zod_1.z.boolean().default(false),
    metadata: zod_1.z.record(zod_1.z.unknown()).optional(),
    lastSyncedAt: zod_1.z.date().optional(),
    createdAt: zod_1.z.date(),
    updatedAt: zod_1.z.date(),
});
// Summit User (target)
exports.SummitUserSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    externalId: zod_1.z.string().optional(),
    email: zod_1.z.string().email(),
    name: zod_1.z.string(),
    role: exports.SummitRole,
    permissions: zod_1.z.array(zod_1.z.string()),
    tenantId: zod_1.z.string(),
    clearanceLevel: zod_1.z.number().int().min(0).max(5).default(0),
    budgetLimit: zod_1.z.number().optional(),
    rateLimit: zod_1.z.number().optional(),
    isActive: zod_1.z.boolean(),
    metadata: zod_1.z.record(zod_1.z.unknown()).optional(),
    createdAt: zod_1.z.date(),
    updatedAt: zod_1.z.date(),
});
// Sync event types
exports.SyncEventType = zod_1.z.enum([
    'user_created',
    'user_updated',
    'user_deleted',
    'user_activated',
    'user_deactivated',
    'role_assigned',
    'role_revoked',
    'team_assigned',
    'team_removed',
    'sync_started',
    'sync_completed',
    'sync_failed',
    'conflict_detected',
    'conflict_resolved',
]);
// Sync event payload
exports.SyncEventSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    type: exports.SyncEventType,
    source: zod_1.z.enum(['companyos', 'summit']),
    target: zod_1.z.enum(['companyos', 'summit']),
    userId: zod_1.z.string().uuid().optional(),
    tenantId: zod_1.z.string(),
    changes: zod_1.z.record(zod_1.z.unknown()),
    previousState: zod_1.z.record(zod_1.z.unknown()).optional(),
    newState: zod_1.z.record(zod_1.z.unknown()).optional(),
    status: zod_1.z.enum(['pending', 'processing', 'completed', 'failed', 'conflict']),
    error: zod_1.z.string().optional(),
    correlationId: zod_1.z.string().uuid(),
    timestamp: zod_1.z.date(),
    processedAt: zod_1.z.date().optional(),
});
// Sync configuration
exports.SyncConfigSchema = zod_1.z.object({
    tenantId: zod_1.z.string(),
    enabled: zod_1.z.boolean(),
    direction: zod_1.z.enum(['bidirectional', 'companyos_to_summit', 'summit_to_companyos']),
    syncInterval: zod_1.z.number().int().min(60).default(300), // seconds
    conflictResolution: zod_1.z.enum(['companyos_wins', 'summit_wins', 'latest_wins', 'manual']),
    roleMappings: zod_1.z.array(exports.RoleMappingSchema),
    fieldMappings: zod_1.z.record(zod_1.z.string()),
    excludePatterns: zod_1.z.array(zod_1.z.string()).optional(),
    webhookUrl: zod_1.z.string().url().optional(),
    retryPolicy: zod_1.z.object({
        maxRetries: zod_1.z.number().int().min(0).max(10).default(3),
        backoffMs: zod_1.z.number().int().min(100).default(1000),
        maxBackoffMs: zod_1.z.number().int().min(1000).default(30000),
    }).optional(),
});
// Default role mappings
exports.DEFAULT_ROLE_MAPPINGS = [
    {
        companyOSRole: 'Exec',
        summitRoles: ['admin'],
        permissions: ['*'],
        priority: 100,
    },
    {
        companyOSRole: 'IncidentCommander',
        summitRoles: ['operator', 'analyst'],
        permissions: ['incident:*', 'oncall:*', 'alert:*', 'entity:read', 'investigation:read'],
        priority: 90,
    },
    {
        companyOSRole: 'OperationsManager',
        summitRoles: ['operator'],
        permissions: ['workflow:*', 'task:*', 'metrics:read', 'evidence:read'],
        priority: 80,
    },
    {
        companyOSRole: 'AM',
        summitRoles: ['analyst'],
        permissions: ['entity:read', 'relationship:read', 'investigation:read', 'email:read'],
        priority: 70,
    },
    {
        companyOSRole: 'Presenter',
        summitRoles: ['analyst'],
        permissions: ['deck:present', 'deck:read', 'entity:read', 'rag_snippet:read'],
        priority: 60,
    },
    {
        companyOSRole: 'OnCallEngineer',
        summitRoles: ['operator'],
        permissions: ['incident:read', 'incident:update', 'alert:read', 'alert:acknowledge'],
        priority: 50,
    },
    {
        companyOSRole: 'ReadOnly',
        summitRoles: ['viewer'],
        permissions: ['*:read'],
        priority: 10,
    },
];
