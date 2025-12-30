/**
 * CompanyOS Tenant Service
 *
 * Implements A1: Tenant Lifecycle Management (Activate/Suspend/Delete)
 * Implements A2: Tenant Onboarding Flow
 * FIXED: Now uses PostgreSQL for persistent tenant storage
 */

import { v4 as uuidv4 } from 'uuid';
import { Pool } from 'pg';
import {
  Tenant,
  TenantStatus,
  TenantTier,
  TenantAdmin,
  TenantAdminRole,
  TenantOnboarding,
  TenantStatusTransition,
  OnboardingBundle,
  CreateTenantInput,
  UpdateTenantInput,
  ActivateTenantInput,
  SuspendTenantInput,
  RequestTenantDeletionInput,
  AssignTenantAdminInput,
  TenantLifecycleResult,
  OnboardingResult,
  TenantFilter,
  PaginatedTenants,
  VALID_STATUS_TRANSITIONS,
  DEFAULT_QUOTAS,
  DEFAULT_FEATURES,
} from '../types/tenant.js';
import { AuditService } from './audit.service.js';
import { OPAService } from './opa.service.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('tenant-service');

export interface TenantServiceConfig {
  defaultRegion: string;
  defaultTier: TenantTier;
  requireApprovalForDeletion: boolean;
  softDeleteOnly: boolean;
}

// ============================================================================
// POSTGRESQL DATABASE INTERFACE
// ============================================================================

export interface TenantDatabase {
  query(text: string, params: any[]): Promise<{ rows: any[]; rowCount: number }>;
}

let tenantDb: TenantDatabase | null = null;

/**
 * Set the tenant database connection
 * MUST be called during application initialization
 */
export function setTenantDatabase(db: TenantDatabase): void {
  tenantDb = db;
  logger.info('Tenant database connection initialized');
}

function getTenantDatabase(): TenantDatabase {
  if (!tenantDb) {
    throw new Error(
      'FATAL: Tenant database not initialized. Call setTenantDatabase() with a ' +
      'PostgreSQL connection pool before using TenantService.'
    );
  }
  return tenantDb;
}

// ============================================================================
// TENANT SERVICE (PostgreSQL-backed)
// ============================================================================

export class TenantService {
  private config: TenantServiceConfig;
  private auditService: AuditService;
  private opaService: OPAService;

  constructor(
    config: Partial<TenantServiceConfig> = {},
    auditService: AuditService,
    opaService: OPAService
  ) {
    this.config = {
      defaultRegion: 'us-east-1',
      defaultTier: TenantTier.STARTER,
      requireApprovalForDeletion: true,
      softDeleteOnly: true,
      ...config,
    };
    this.auditService = auditService;
    this.opaService = opaService;

    logger.info('TenantService initialized', { config: this.config });
  }

  // ============================================================================
  // Tenant CRUD Operations
  // ============================================================================

  async createTenant(
    input: CreateTenantInput,
    actorId: string,
    context: RequestContext
  ): Promise<TenantLifecycleResult> {
    logger.info('Creating tenant', { externalId: input.externalId, actorId });
    const db = getTenantDatabase();

    // Check OPA authorization
    await this.opaService.checkPermission('tenant:create', actorId, context);

    // Validate external ID uniqueness
    const existingCheck = await db.query(
      'SELECT id FROM tenants WHERE external_id = $1',
      [input.externalId]
    );
    if (existingCheck.rows.length > 0) {
      throw new Error(`Tenant with external ID ${input.externalId} already exists`);
    }

    const tier = input.tier || this.config.defaultTier;
    const now = new Date();

    const tenant: Tenant = {
      id: uuidv4(),
      externalId: input.externalId,
      name: input.name,
      displayName: input.displayName || input.name,
      status: TenantStatus.PENDING,
      tier,
      region: input.region || this.config.defaultRegion,
      residencyClass: input.residencyClass || 'standard',
      allowedRegions: input.allowedRegions || [input.region || this.config.defaultRegion],
      features: { ...DEFAULT_FEATURES[tier], ...input.features },
      quotas: { ...DEFAULT_QUOTAS[tier], ...input.quotas },
      primaryContactEmail: input.primaryContactEmail,
      primaryContactName: input.primaryContactName,
      billingEmail: input.billingEmail,
      metadata: input.metadata || {},
      tags: input.tags || [],
      createdAt: now,
      updatedAt: now,
      createdBy: actorId,
    };

    // Insert tenant into PostgreSQL
    await db.query(
      `INSERT INTO tenants (
        id, external_id, name, display_name, status, tier, region, residency_class,
        allowed_regions, features, quotas, primary_contact_email, primary_contact_name,
        billing_email, metadata, tags, created_at, updated_at, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)`,
      [
        tenant.id,
        tenant.externalId,
        tenant.name,
        tenant.displayName,
        tenant.status,
        tenant.tier,
        tenant.region,
        tenant.residencyClass,
        tenant.allowedRegions,
        JSON.stringify(tenant.features),
        JSON.stringify(tenant.quotas),
        tenant.primaryContactEmail,
        tenant.primaryContactName,
        tenant.billingEmail,
        JSON.stringify(tenant.metadata),
        tenant.tags,
        tenant.createdAt,
        tenant.updatedAt,
        tenant.createdBy,
      ]
    );

    // Create initial onboarding record
    const onboarding: TenantOnboarding = {
      id: uuidv4(),
      tenantId: tenant.id,
      stepMetadataComplete: true,
      stepAdminAssigned: false,
      stepFeaturesConfigured: true,
      stepQuotasSet: true,
      stepWelcomeSent: false,
      stepVerified: false,
      metadataCompletedAt: now,
      featuresConfiguredAt: now,
      quotasSetAt: now,
      startedAt: now,
      onboardingBundle: this.generateOnboardingBundle(tenant, []),
    };

    await db.query(
      `INSERT INTO tenant_onboardings (
        id, tenant_id, step_metadata_complete, step_admin_assigned,
        step_features_configured, step_quotas_set, step_welcome_sent, step_verified,
        metadata_completed_at, features_configured_at, quotas_set_at, started_at, onboarding_bundle
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [
        onboarding.id,
        onboarding.tenantId,
        onboarding.stepMetadataComplete,
        onboarding.stepAdminAssigned,
        onboarding.stepFeaturesConfigured,
        onboarding.stepQuotasSet,
        onboarding.stepWelcomeSent,
        onboarding.stepVerified,
        onboarding.metadataCompletedAt,
        onboarding.featuresConfiguredAt,
        onboarding.quotasSetAt,
        onboarding.startedAt,
        JSON.stringify(onboarding.onboardingBundle),
      ]
    );

    // Record initial transition
    const transition = await this.recordTransition(
      tenant.id,
      undefined,
      TenantStatus.PENDING,
      'Tenant created',
      actorId,
      context
    );

    // Audit log
    await this.auditService.logTenantEvent({
      eventType: 'tenant.created',
      tenantId: tenant.id,
      actorId,
      details: { externalId: input.externalId, tier, region: tenant.region },
      context,
    });

    logger.info('Tenant created successfully', { tenantId: tenant.id, externalId: tenant.externalId });

    return {
      success: true,
      tenant,
      transition,
      message: `Tenant ${tenant.name} created successfully in PENDING status`,
    };
  }

  async getTenant(tenantId: string, actorId: string, context: RequestContext): Promise<Tenant | null> {
    const db = getTenantDatabase();

    await this.opaService.checkPermission('tenant:read', actorId, context, { tenantId });

    const result = await db.query(
      'SELECT * FROM tenants WHERE id = $1',
      [tenantId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const tenant = this.mapRowToTenant(result.rows[0]);

    // Block access to DELETED tenants except for admins
    if (tenant.status === TenantStatus.DELETED) {
      const hasAdminAccess = await this.opaService.hasRole(actorId, 'global-admin', context);
      if (!hasAdminAccess) {
        throw new Error('Tenant not found');
      }
    }

    return tenant;
  }

  async listTenants(
    filter: TenantFilter,
    actorId: string,
    context: RequestContext,
    limit = 25,
    offset = 0
  ): Promise<PaginatedTenants> {
    const db = getTenantDatabase();

    await this.opaService.checkPermission('tenant:list', actorId, context);

    let query = 'SELECT * FROM tenants WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    // Apply filters
    if (filter.status) {
      query += ` AND status = $${paramIndex}`;
      params.push(filter.status);
      paramIndex++;
    }
    if (filter.tier) {
      query += ` AND tier = $${paramIndex}`;
      params.push(filter.tier);
      paramIndex++;
    }
    if (filter.region) {
      query += ` AND region = $${paramIndex}`;
      params.push(filter.region);
      paramIndex++;
    }
    if (filter.searchQuery) {
      query += ` AND (
        name ILIKE $${paramIndex} OR
        external_id ILIKE $${paramIndex} OR
        display_name ILIKE $${paramIndex}
      )`;
      params.push(`%${filter.searchQuery}%`);
      paramIndex++;
    }

    // Exclude DELETED tenants by default unless specifically requested
    if (!filter.status) {
      query += ` AND status != '${TenantStatus.DELETED}'`;
    }

    // Get total count
    const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as total');
    const countResult = await db.query(countQuery, params);
    const totalCount = parseInt(countResult.rows[0].total, 10);

    // Add pagination
    query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await db.query(query, params);
    const tenants = result.rows.map(row => this.mapRowToTenant(row));

    return {
      tenants,
      totalCount,
      hasNextPage: offset + limit < totalCount,
      hasPreviousPage: offset > 0,
    };
  }

  async updateTenant(
    tenantId: string,
    input: UpdateTenantInput,
    actorId: string,
    context: RequestContext
  ): Promise<Tenant> {
    const db = getTenantDatabase();

    await this.opaService.checkPermission('tenant:update', actorId, context, { tenantId });

    const tenant = await this.getTenantOrThrow(tenantId);

    // Can't update DELETED tenants
    if (tenant.status === TenantStatus.DELETED) {
      throw new Error('Cannot update deleted tenant');
    }

    const updatedTenant: Tenant = {
      ...tenant,
      name: input.name ?? tenant.name,
      displayName: input.displayName ?? tenant.displayName,
      tier: input.tier ?? tenant.tier,
      features: input.features ? { ...tenant.features, ...input.features } : tenant.features,
      quotas: input.quotas ? { ...tenant.quotas, ...input.quotas } : tenant.quotas,
      primaryContactEmail: input.primaryContactEmail ?? tenant.primaryContactEmail,
      primaryContactName: input.primaryContactName ?? tenant.primaryContactName,
      billingEmail: input.billingEmail ?? tenant.billingEmail,
      metadata: input.metadata ? { ...tenant.metadata, ...input.metadata } : tenant.metadata,
      tags: input.tags ?? tenant.tags,
      updatedAt: new Date(),
    };

    await db.query(
      `UPDATE tenants SET
        name = $1, display_name = $2, tier = $3, features = $4, quotas = $5,
        primary_contact_email = $6, primary_contact_name = $7, billing_email = $8,
        metadata = $9, tags = $10, updated_at = $11
       WHERE id = $12`,
      [
        updatedTenant.name,
        updatedTenant.displayName,
        updatedTenant.tier,
        JSON.stringify(updatedTenant.features),
        JSON.stringify(updatedTenant.quotas),
        updatedTenant.primaryContactEmail,
        updatedTenant.primaryContactName,
        updatedTenant.billingEmail,
        JSON.stringify(updatedTenant.metadata),
        updatedTenant.tags,
        updatedTenant.updatedAt,
        tenantId,
      ]
    );

    await this.auditService.logTenantEvent({
      eventType: 'tenant.updated',
      tenantId,
      actorId,
      details: { changes: input },
      context,
    });

    logger.info('Tenant updated', { tenantId, changes: Object.keys(input) });

    return updatedTenant;
  }

  // ============================================================================
  // Tenant Lifecycle Operations
  // ============================================================================

  async activateTenant(
    tenantId: string,
    input: ActivateTenantInput,
    actorId: string,
    context: RequestContext
  ): Promise<TenantLifecycleResult> {
    const db = getTenantDatabase();

    await this.opaService.checkPermission('tenant:activate', actorId, context, { tenantId });

    const tenant = await this.getTenantOrThrow(tenantId);

    // Validate transition
    this.validateStatusTransition(tenant.status, TenantStatus.ACTIVE);

    const now = new Date();

    await db.query(
      `UPDATE tenants SET status = $1, activated_at = $2, updated_at = $3 WHERE id = $4`,
      [TenantStatus.ACTIVE, now, now, tenantId]
    );

    const updatedTenant = { ...tenant, status: TenantStatus.ACTIVE, activatedAt: now, updatedAt: now };

    const transition = await this.recordTransition(
      tenantId,
      tenant.status,
      TenantStatus.ACTIVE,
      input.reason || 'Tenant activated',
      actorId,
      context
    );

    await this.auditService.logTenantEvent({
      eventType: 'tenant.activated',
      tenantId,
      actorId,
      details: { previousStatus: tenant.status, reason: input.reason },
      context,
    });

    logger.info('Tenant activated', { tenantId, previousStatus: tenant.status });

    return {
      success: true,
      tenant: updatedTenant,
      transition,
      message: `Tenant ${tenant.name} activated successfully`,
    };
  }

  async suspendTenant(
    tenantId: string,
    input: SuspendTenantInput,
    actorId: string,
    context: RequestContext
  ): Promise<TenantLifecycleResult> {
    const db = getTenantDatabase();

    await this.opaService.checkPermission('tenant:suspend', actorId, context, { tenantId });

    const tenant = await this.getTenantOrThrow(tenantId);

    // Validate transition
    this.validateStatusTransition(tenant.status, TenantStatus.SUSPENDED);

    const now = new Date();

    await db.query(
      `UPDATE tenants SET status = $1, suspended_at = $2, updated_at = $3 WHERE id = $4`,
      [TenantStatus.SUSPENDED, now, now, tenantId]
    );

    const updatedTenant = { ...tenant, status: TenantStatus.SUSPENDED, suspendedAt: now, updatedAt: now };

    const transition = await this.recordTransition(
      tenantId,
      tenant.status,
      TenantStatus.SUSPENDED,
      input.reason,
      actorId,
      context
    );

    await this.auditService.logTenantEvent({
      eventType: 'tenant.suspended',
      tenantId,
      actorId,
      details: { previousStatus: tenant.status, reason: input.reason },
      context,
    });

    logger.warn('Tenant suspended', { tenantId, reason: input.reason });

    return {
      success: true,
      tenant: updatedTenant,
      transition,
      message: `Tenant ${tenant.name} suspended: ${input.reason}`,
    };
  }

  async requestTenantDeletion(
    tenantId: string,
    input: RequestTenantDeletionInput,
    actorId: string,
    context: RequestContext
  ): Promise<TenantLifecycleResult> {
    const db = getTenantDatabase();

    await this.opaService.checkPermission('tenant:delete', actorId, context, { tenantId });

    const tenant = await this.getTenantOrThrow(tenantId);

    // Validate transition
    this.validateStatusTransition(tenant.status, TenantStatus.DELETION_REQUESTED);

    const now = new Date();

    await db.query(
      `UPDATE tenants SET status = $1, deletion_requested_at = $2, updated_at = $3 WHERE id = $4`,
      [TenantStatus.DELETION_REQUESTED, now, now, tenantId]
    );

    const updatedTenant = {
      ...tenant,
      status: TenantStatus.DELETION_REQUESTED,
      deletionRequestedAt: now,
      updatedAt: now,
    };

    const transition = await this.recordTransition(
      tenantId,
      tenant.status,
      TenantStatus.DELETION_REQUESTED,
      input.reason,
      actorId,
      context
    );

    await this.auditService.logTenantEvent({
      eventType: 'tenant.deletion_requested',
      tenantId,
      actorId,
      details: { previousStatus: tenant.status, reason: input.reason },
      context,
    });

    logger.warn('Tenant deletion requested', { tenantId, reason: input.reason });

    return {
      success: true,
      tenant: updatedTenant,
      transition,
      message: `Deletion requested for tenant ${tenant.name}. Data will be retained for 30 days before permanent deletion.`,
    };
  }

  async completeTenantDeletion(
    tenantId: string,
    actorId: string,
    context: RequestContext
  ): Promise<TenantLifecycleResult> {
    const db = getTenantDatabase();

    await this.opaService.checkPermission('tenant:delete:confirm', actorId, context, { tenantId });

    const tenant = await this.getTenantOrThrow(tenantId);

    if (tenant.status !== TenantStatus.DELETION_REQUESTED) {
      throw new Error('Tenant must be in DELETION_REQUESTED status to complete deletion');
    }

    if (this.config.softDeleteOnly) {
      const now = new Date();

      await db.query(
        `UPDATE tenants SET status = $1, deleted_at = $2, updated_at = $3 WHERE id = $4`,
        [TenantStatus.DELETED, now, now, tenantId]
      );

      const updatedTenant = { ...tenant, status: TenantStatus.DELETED, deletedAt: now, updatedAt: now };

      const transition = await this.recordTransition(
        tenantId,
        tenant.status,
        TenantStatus.DELETED,
        'Deletion completed (soft delete)',
        actorId,
        context
      );

      await this.auditService.logTenantEvent({
        eventType: 'tenant.deleted',
        tenantId,
        actorId,
        details: { deletionType: 'soft', previousStatus: tenant.status },
        context,
      });

      logger.warn('Tenant soft deleted', { tenantId });

      return {
        success: true,
        tenant: updatedTenant,
        transition,
        message: `Tenant ${tenant.name} has been soft deleted. Data is retained but inaccessible.`,
      };
    } else {
      // Hard delete - remove all data (not implemented in this sprint)
      throw new Error('Hard delete not yet implemented. Only soft delete is available.');
    }
  }

  // ============================================================================
  // Tenant Onboarding (A2)
  // ============================================================================

  async startOnboarding(
    input: CreateTenantInput,
    admins: AssignTenantAdminInput[],
    actorId: string,
    context: RequestContext
  ): Promise<OnboardingResult> {
    logger.info('Starting tenant onboarding', { externalId: input.externalId });

    // Step 1: Create tenant
    const createResult = await this.createTenant(input, actorId, context);
    const tenant = createResult.tenant;

    // Step 2: Assign admins
    const assignedAdmins: TenantAdmin[] = [];
    for (const adminInput of admins) {
      const admin = await this.assignAdmin(tenant.id, adminInput, actorId, context);
      assignedAdmins.push(admin);
    }

    // Step 3: Update onboarding record
    const db = getTenantDatabase();
    const now = new Date();
    const onboardingBundle = this.generateOnboardingBundle(tenant, assignedAdmins);

    await db.query(
      `UPDATE tenant_onboardings SET
        step_admin_assigned = $1,
        admin_assigned_at = $2,
        onboarding_bundle = $3
       WHERE tenant_id = $4`,
      [assignedAdmins.length > 0, now, JSON.stringify(onboardingBundle), tenant.id]
    );

    const onboarding = await this.getOnboardingStatus(tenant.id, actorId, context);

    await this.auditService.logTenantEvent({
      eventType: 'tenant.onboarding_started',
      tenantId: tenant.id,
      actorId,
      details: { adminCount: assignedAdmins.length },
      context,
    });

    const nextSteps = this.getOnboardingNextSteps(onboarding!);

    return {
      success: true,
      tenant,
      onboarding: onboarding!,
      bundle: onboardingBundle,
      nextSteps,
    };
  }

  async completeOnboarding(
    tenantId: string,
    actorId: string,
    context: RequestContext
  ): Promise<OnboardingResult> {
    const db = getTenantDatabase();

    await this.opaService.checkPermission('tenant:onboarding:complete', actorId, context, { tenantId });

    const tenant = await this.getTenantOrThrow(tenantId);
    const onboarding = await this.getOnboardingStatus(tenantId, actorId, context);

    if (!onboarding) {
      throw new Error('Onboarding record not found');
    }

    // Mark all steps complete
    const now = new Date();
    await db.query(
      `UPDATE tenant_onboardings SET
        step_verified = $1,
        verified_at = $2,
        completed_at = $3,
        completed_by = $4
       WHERE tenant_id = $5`,
      [true, now, now, actorId, tenantId]
    );

    // Activate tenant if still pending
    let activatedTenant = tenant;
    if (tenant.status === TenantStatus.PENDING) {
      const activateResult = await this.activateTenant(
        tenantId,
        { reason: 'Onboarding completed' },
        actorId,
        context
      );
      activatedTenant = activateResult.tenant;
    }

    await this.auditService.logTenantEvent({
      eventType: 'tenant.onboarding_completed',
      tenantId,
      actorId,
      details: { completedBy: actorId },
      context,
    });

    logger.info('Tenant onboarding completed', { tenantId });

    const updatedOnboarding = await this.getOnboardingStatus(tenantId, actorId, context);

    return {
      success: true,
      tenant: activatedTenant,
      onboarding: updatedOnboarding!,
      bundle: updatedOnboarding!.onboardingBundle,
      nextSteps: [],
    };
  }

  async getOnboardingStatus(
    tenantId: string,
    actorId: string,
    context: RequestContext
  ): Promise<TenantOnboarding | null> {
    const db = getTenantDatabase();

    await this.opaService.checkPermission('tenant:onboarding:read', actorId, context, { tenantId });

    const result = await db.query(
      'SELECT * FROM tenant_onboardings WHERE tenant_id = $1',
      [tenantId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToOnboarding(result.rows[0]);
  }

  // ============================================================================
  // Admin Management
  // ============================================================================

  async assignAdmin(
    tenantId: string,
    input: AssignTenantAdminInput,
    actorId: string,
    context: RequestContext
  ): Promise<TenantAdmin> {
    const db = getTenantDatabase();

    await this.opaService.checkPermission('tenant:admin:assign', actorId, context, { tenantId });

    const tenant = await this.getTenantOrThrow(tenantId);

    const admin: TenantAdmin = {
      id: uuidv4(),
      tenantId,
      userId: uuidv4(), // Will be linked when user accepts invite
      email: input.email,
      displayName: input.displayName,
      role: input.role || TenantAdminRole.ADMIN,
      status: 'INVITED',
      invitedAt: new Date(),
      invitedBy: actorId,
      metadata: {},
    };

    await db.query(
      `INSERT INTO tenant_admins (
        id, tenant_id, user_id, email, display_name, role, status, invited_at, invited_by, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        admin.id,
        admin.tenantId,
        admin.userId,
        admin.email,
        admin.displayName,
        admin.role,
        admin.status,
        admin.invitedAt,
        admin.invitedBy,
        JSON.stringify(admin.metadata),
      ]
    );

    await this.auditService.logTenantEvent({
      eventType: 'tenant.admin_assigned',
      tenantId,
      actorId,
      details: { adminEmail: input.email, role: admin.role },
      context,
    });

    logger.info('Tenant admin assigned', { tenantId, adminEmail: input.email });

    return admin;
  }

  async listAdmins(
    tenantId: string,
    actorId: string,
    context: RequestContext
  ): Promise<TenantAdmin[]> {
    const db = getTenantDatabase();

    await this.opaService.checkPermission('tenant:admin:list', actorId, context, { tenantId });

    const result = await db.query(
      'SELECT * FROM tenant_admins WHERE tenant_id = $1 ORDER BY invited_at DESC',
      [tenantId]
    );

    return result.rows.map(row => this.mapRowToAdmin(row));
  }

  // ============================================================================
  // Status Transition History
  // ============================================================================

  async getStatusTransitions(
    tenantId: string,
    actorId: string,
    context: RequestContext
  ): Promise<TenantStatusTransition[]> {
    const db = getTenantDatabase();

    await this.opaService.checkPermission('tenant:transitions:read', actorId, context, { tenantId });

    const result = await db.query(
      'SELECT * FROM tenant_status_transitions WHERE tenant_id = $1 ORDER BY performed_at ASC',
      [tenantId]
    );

    return result.rows.map(row => this.mapRowToTransition(row));
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private async getTenantOrThrow(tenantId: string): Promise<Tenant> {
    const db = getTenantDatabase();

    const result = await db.query(
      'SELECT * FROM tenants WHERE id = $1',
      [tenantId]
    );

    if (result.rows.length === 0) {
      throw new Error(`Tenant not found: ${tenantId}`);
    }

    return this.mapRowToTenant(result.rows[0]);
  }

  private validateStatusTransition(fromStatus: TenantStatus, toStatus: TenantStatus): void {
    const validTransitions = VALID_STATUS_TRANSITIONS[fromStatus];
    if (!validTransitions.includes(toStatus)) {
      throw new Error(
        `Invalid status transition from ${fromStatus} to ${toStatus}. ` +
        `Valid transitions: ${validTransitions.join(', ') || 'none'}`
      );
    }
  }

  private async recordTransition(
    tenantId: string,
    fromStatus: TenantStatus | undefined,
    toStatus: TenantStatus,
    reason: string,
    performedBy: string,
    context: RequestContext
  ): Promise<TenantStatusTransition> {
    const db = getTenantDatabase();

    const transition: TenantStatusTransition = {
      id: uuidv4(),
      tenantId,
      fromStatus,
      toStatus,
      reason,
      performedBy,
      performedAt: new Date(),
      metadata: {},
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      correlationId: context.correlationId,
    };

    await db.query(
      `INSERT INTO tenant_status_transitions (
        id, tenant_id, from_status, to_status, reason, performed_by,
        performed_at, metadata, ip_address, user_agent, correlation_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        transition.id,
        transition.tenantId,
        transition.fromStatus,
        transition.toStatus,
        transition.reason,
        transition.performedBy,
        transition.performedAt,
        JSON.stringify(transition.metadata),
        transition.ipAddress,
        transition.userAgent,
        transition.correlationId,
      ]
    );

    return transition;
  }

  private generateOnboardingBundle(tenant: Tenant, admins: TenantAdmin[]): OnboardingBundle {
    return {
      tenant: {
        externalId: tenant.externalId,
        name: tenant.name,
        displayName: tenant.displayName,
        tier: tenant.tier,
        region: tenant.region,
        residencyClass: tenant.residencyClass,
        allowedRegions: tenant.allowedRegions,
      },
      admins: admins.map((a) => ({
        email: a.email,
        role: a.role,
        displayName: a.displayName,
      })),
      features: tenant.features,
      quotas: tenant.quotas,
      createdAt: new Date().toISOString(),
      version: '1.0.0',
    };
  }

  private getOnboardingNextSteps(onboarding: TenantOnboarding): string[] {
    const steps: string[] = [];

    if (!onboarding.stepMetadataComplete) {
      steps.push('Complete tenant metadata configuration');
    }
    if (!onboarding.stepAdminAssigned) {
      steps.push('Assign at least one admin user');
    }
    if (!onboarding.stepFeaturesConfigured) {
      steps.push('Configure feature flags');
    }
    if (!onboarding.stepQuotasSet) {
      steps.push('Set quota limits');
    }
    if (!onboarding.stepWelcomeSent) {
      steps.push('Send welcome email to admins');
    }
    if (!onboarding.stepVerified) {
      steps.push('Verify tenant configuration and complete onboarding');
    }

    return steps;
  }

  // Database row mapping helpers
  private mapRowToTenant(row: any): Tenant {
    return {
      id: row.id,
      externalId: row.external_id,
      name: row.name,
      displayName: row.display_name,
      status: row.status,
      tier: row.tier,
      region: row.region,
      residencyClass: row.residency_class,
      allowedRegions: row.allowed_regions,
      features: typeof row.features === 'string' ? JSON.parse(row.features) : row.features,
      quotas: typeof row.quotas === 'string' ? JSON.parse(row.quotas) : row.quotas,
      primaryContactEmail: row.primary_contact_email,
      primaryContactName: row.primary_contact_name,
      billingEmail: row.billing_email,
      metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata,
      tags: row.tags,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      createdBy: row.created_by,
      activatedAt: row.activated_at ? new Date(row.activated_at) : undefined,
      suspendedAt: row.suspended_at ? new Date(row.suspended_at) : undefined,
      deletionRequestedAt: row.deletion_requested_at ? new Date(row.deletion_requested_at) : undefined,
      deletedAt: row.deleted_at ? new Date(row.deleted_at) : undefined,
    };
  }

  private mapRowToOnboarding(row: any): TenantOnboarding {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      stepMetadataComplete: row.step_metadata_complete,
      stepAdminAssigned: row.step_admin_assigned,
      stepFeaturesConfigured: row.step_features_configured,
      stepQuotasSet: row.step_quotas_set,
      stepWelcomeSent: row.step_welcome_sent,
      stepVerified: row.step_verified,
      metadataCompletedAt: row.metadata_completed_at ? new Date(row.metadata_completed_at) : undefined,
      adminAssignedAt: row.admin_assigned_at ? new Date(row.admin_assigned_at) : undefined,
      featuresConfiguredAt: row.features_configured_at ? new Date(row.features_configured_at) : undefined,
      quotasSetAt: row.quotas_set_at ? new Date(row.quotas_set_at) : undefined,
      welcomeSentAt: row.welcome_sent_at ? new Date(row.welcome_sent_at) : undefined,
      verifiedAt: row.verified_at ? new Date(row.verified_at) : undefined,
      startedAt: new Date(row.started_at),
      completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
      completedBy: row.completed_by,
      onboardingBundle: typeof row.onboarding_bundle === 'string'
        ? JSON.parse(row.onboarding_bundle)
        : row.onboarding_bundle,
    };
  }

  private mapRowToAdmin(row: any): TenantAdmin {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      userId: row.user_id,
      email: row.email,
      displayName: row.display_name,
      role: row.role,
      status: row.status,
      invitedAt: new Date(row.invited_at),
      invitedBy: row.invited_by,
      acceptedAt: row.accepted_at ? new Date(row.accepted_at) : undefined,
      revokedAt: row.revoked_at ? new Date(row.revoked_at) : undefined,
      metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata,
    };
  }

  private mapRowToTransition(row: any): TenantStatusTransition {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      fromStatus: row.from_status,
      toStatus: row.to_status,
      reason: row.reason,
      performedBy: row.performed_by,
      performedAt: new Date(row.performed_at),
      metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata,
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      correlationId: row.correlation_id,
    };
  }
}

// Request context interface
export interface RequestContext {
  ipAddress?: string;
  userAgent?: string;
  correlationId?: string;
  requestId?: string;
}

// Export singleton factory
let tenantServiceInstance: TenantService | null = null;

export function getTenantService(
  config?: Partial<TenantServiceConfig>,
  auditService?: AuditService,
  opaService?: OPAService
): TenantService {
  if (!tenantServiceInstance && auditService && opaService) {
    tenantServiceInstance = new TenantService(config, auditService, opaService);
  }
  if (!tenantServiceInstance) {
    throw new Error('TenantService not initialized. Call with dependencies first.');
  }
  return tenantServiceInstance;
}

// Export database setter
export { setTenantDatabase };
