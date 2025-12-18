/**
 * CompanyOS User and Role Sync Types
 * Defines interfaces for bi-directional synchronization between CompanyOS and Summit RBAC
 */

import { z } from 'zod';

// CompanyOS Role Definitions
export const CompanyOSRole = z.enum([
  'Exec',
  'AM', // Account Manager
  'Presenter',
  'IncidentCommander',
  'OnCallEngineer',
  'OperationsManager',
  'ReadOnly',
]);

export type CompanyOSRole = z.infer<typeof CompanyOSRole>;

// Summit RBAC Role Definitions
export const SummitRole = z.enum([
  'admin',
  'operator',
  'analyst',
  'viewer',
  'emergency',
]);

export type SummitRole = z.infer<typeof SummitRole>;

// Role mapping between CompanyOS and Summit
export const RoleMappingSchema = z.object({
  companyOSRole: CompanyOSRole,
  summitRoles: z.array(SummitRole),
  permissions: z.array(z.string()),
  priority: z.number().int().min(0).max(100),
});

export type RoleMapping = z.infer<typeof RoleMappingSchema>;

// User sync payload
export const CompanyOSUserSchema = z.object({
  id: z.string().uuid(),
  externalId: z.string().optional(),
  email: z.string().email(),
  firstName: z.string(),
  lastName: z.string(),
  displayName: z.string(),
  department: z.string().optional(),
  title: z.string().optional(),
  companyOSRoles: z.array(CompanyOSRole),
  teams: z.array(z.string()),
  tenantId: z.string(),
  source: z.enum(['companyos', 'summit', 'scim', 'sso']),
  isActive: z.boolean(),
  onCallEligible: z.boolean().default(false),
  metadata: z.record(z.unknown()).optional(),
  lastSyncedAt: z.date().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type CompanyOSUser = z.infer<typeof CompanyOSUserSchema>;

// Summit User (target)
export const SummitUserSchema = z.object({
  id: z.string().uuid(),
  externalId: z.string().optional(),
  email: z.string().email(),
  name: z.string(),
  role: SummitRole,
  permissions: z.array(z.string()),
  tenantId: z.string(),
  clearanceLevel: z.number().int().min(0).max(5).default(0),
  budgetLimit: z.number().optional(),
  rateLimit: z.number().optional(),
  isActive: z.boolean(),
  metadata: z.record(z.unknown()).optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type SummitUser = z.infer<typeof SummitUserSchema>;

// Sync event types
export const SyncEventType = z.enum([
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

export type SyncEventType = z.infer<typeof SyncEventType>;

// Sync event payload
export const SyncEventSchema = z.object({
  id: z.string().uuid(),
  type: SyncEventType,
  source: z.enum(['companyos', 'summit']),
  target: z.enum(['companyos', 'summit']),
  userId: z.string().uuid().optional(),
  tenantId: z.string(),
  changes: z.record(z.unknown()),
  previousState: z.record(z.unknown()).optional(),
  newState: z.record(z.unknown()).optional(),
  status: z.enum(['pending', 'processing', 'completed', 'failed', 'conflict']),
  error: z.string().optional(),
  correlationId: z.string().uuid(),
  timestamp: z.date(),
  processedAt: z.date().optional(),
});

export type SyncEvent = z.infer<typeof SyncEventSchema>;

// Sync configuration
export const SyncConfigSchema = z.object({
  tenantId: z.string(),
  enabled: z.boolean(),
  direction: z.enum(['bidirectional', 'companyos_to_summit', 'summit_to_companyos']),
  syncInterval: z.number().int().min(60).default(300), // seconds
  conflictResolution: z.enum(['companyos_wins', 'summit_wins', 'latest_wins', 'manual']),
  roleMappings: z.array(RoleMappingSchema),
  fieldMappings: z.record(z.string()),
  excludePatterns: z.array(z.string()).optional(),
  webhookUrl: z.string().url().optional(),
  retryPolicy: z.object({
    maxRetries: z.number().int().min(0).max(10).default(3),
    backoffMs: z.number().int().min(100).default(1000),
    maxBackoffMs: z.number().int().min(1000).default(30000),
  }).optional(),
});

export type SyncConfig = z.infer<typeof SyncConfigSchema>;

// Sync statistics
export interface SyncStats {
  lastSyncAt: Date | null;
  totalSynced: number;
  usersCreated: number;
  usersUpdated: number;
  usersDeleted: number;
  rolesAssigned: number;
  rolesRevoked: number;
  conflictsDetected: number;
  conflictsResolved: number;
  errors: number;
  averageSyncDurationMs: number;
}

// Conflict resolution result
export interface ConflictResolution {
  userId: string;
  field: string;
  companyOSValue: unknown;
  summitValue: unknown;
  resolvedValue: unknown;
  strategy: SyncConfig['conflictResolution'];
  resolvedAt: Date;
  resolvedBy?: string;
}

// Default role mappings
export const DEFAULT_ROLE_MAPPINGS: RoleMapping[] = [
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
