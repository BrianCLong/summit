/**
 * CompanyOS Tenant Service
 *
 * Implements A1: Tenant Lifecycle Management (Activate/Suspend/Delete)
 * Implements A2: Tenant Onboarding Flow
 */

import { v4 as uuidv4 } from 'uuid';
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

export class TenantService {
  private config: TenantServiceConfig;
  private auditService: AuditService;
  private opaService: OPAService;

  // In-memory store for demo (replace with actual DB in production)
  private tenants: Map<string, Tenant> = new Map();
  private transitions: Map<string, TenantStatusTransition[]> = new Map();
  private admins: Map<string, TenantAdmin[]> = new Map();
  private onboardings: Map<string, TenantOnboarding> = new Map();

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

    // Check OPA authorization
    await this.opaService.checkPermission('tenant:create', actorId, context);

    // Validate external ID uniqueness
    const existing = Array.from(this.tenants.values()).find(
      (t) => t.externalId === input.externalId
    );
    if (existing) {
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

    this.tenants.set(tenant.id, tenant);
    this.transitions.set(tenant.id, []);
    this.admins.set(tenant.id, []);

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
    this.onboardings.set(tenant.id, onboarding);

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
    await this.opaService.checkPermission('tenant:read', actorId, context, { tenantId });

    const tenant = this.tenants.get(tenantId);
    if (!tenant) {
      return null;
    }

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
    await this.opaService.checkPermission('tenant:list', actorId, context);

    let tenants = Array.from(this.tenants.values());

    // Apply filters
    if (filter.status) {
      tenants = tenants.filter((t) => t.status === filter.status);
    }
    if (filter.tier) {
      tenants = tenants.filter((t) => t.tier === filter.tier);
    }
    if (filter.region) {
      tenants = tenants.filter((t) => t.region === filter.region);
    }
    if (filter.searchQuery) {
      const query = filter.searchQuery.toLowerCase();
      tenants = tenants.filter(
        (t) =>
          t.name.toLowerCase().includes(query) ||
          t.externalId.toLowerCase().includes(query) ||
          t.displayName?.toLowerCase().includes(query)
      );
    }

    // Exclude DELETED tenants by default unless specifically requested
    if (!filter.status) {
      tenants = tenants.filter((t) => t.status !== TenantStatus.DELETED);
    }

    const totalCount = tenants.length;
    const paginatedTenants = tenants.slice(offset, offset + limit);

    return {
      tenants: paginatedTenants,
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

    this.tenants.set(tenantId, updatedTenant);

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
    await this.opaService.checkPermission('tenant:activate', actorId, context, { tenantId });

    const tenant = await this.getTenantOrThrow(tenantId);

    // Validate transition
    this.validateStatusTransition(tenant.status, TenantStatus.ACTIVE);

    const updatedTenant: Tenant = {
      ...tenant,
      status: TenantStatus.ACTIVE,
      activatedAt: new Date(),
      updatedAt: new Date(),
    };

    this.tenants.set(tenantId, updatedTenant);

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
    await this.opaService.checkPermission('tenant:suspend', actorId, context, { tenantId });

    const tenant = await this.getTenantOrThrow(tenantId);

    // Validate transition
    this.validateStatusTransition(tenant.status, TenantStatus.SUSPENDED);

    const updatedTenant: Tenant = {
      ...tenant,
      status: TenantStatus.SUSPENDED,
      suspendedAt: new Date(),
      updatedAt: new Date(),
    };

    this.tenants.set(tenantId, updatedTenant);

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
    await this.opaService.checkPermission('tenant:delete', actorId, context, { tenantId });

    const tenant = await this.getTenantOrThrow(tenantId);

    // Validate transition
    this.validateStatusTransition(tenant.status, TenantStatus.DELETION_REQUESTED);

    const updatedTenant: Tenant = {
      ...tenant,
      status: TenantStatus.DELETION_REQUESTED,
      deletionRequestedAt: new Date(),
      updatedAt: new Date(),
    };

    this.tenants.set(tenantId, updatedTenant);

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
    await this.opaService.checkPermission('tenant:delete:confirm', actorId, context, { tenantId });

    const tenant = await this.getTenantOrThrow(tenantId);

    if (tenant.status !== TenantStatus.DELETION_REQUESTED) {
      throw new Error('Tenant must be in DELETION_REQUESTED status to complete deletion');
    }

    if (this.config.softDeleteOnly) {
      // Soft delete - mark as deleted but keep data
      const updatedTenant: Tenant = {
        ...tenant,
        status: TenantStatus.DELETED,
        deletedAt: new Date(),
        updatedAt: new Date(),
      };

      this.tenants.set(tenantId, updatedTenant);

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
    const onboarding = this.onboardings.get(tenant.id)!;
    onboarding.stepAdminAssigned = assignedAdmins.length > 0;
    onboarding.adminAssignedAt = assignedAdmins.length > 0 ? new Date() : undefined;
    onboarding.onboardingBundle = this.generateOnboardingBundle(tenant, assignedAdmins);

    this.onboardings.set(tenant.id, onboarding);

    await this.auditService.logTenantEvent({
      eventType: 'tenant.onboarding_started',
      tenantId: tenant.id,
      actorId,
      details: { adminCount: assignedAdmins.length },
      context,
    });

    const nextSteps = this.getOnboardingNextSteps(onboarding);

    return {
      success: true,
      tenant,
      onboarding,
      bundle: onboarding.onboardingBundle,
      nextSteps,
    };
  }

  async completeOnboarding(
    tenantId: string,
    actorId: string,
    context: RequestContext
  ): Promise<OnboardingResult> {
    await this.opaService.checkPermission('tenant:onboarding:complete', actorId, context, { tenantId });

    const tenant = await this.getTenantOrThrow(tenantId);
    const onboarding = this.onboardings.get(tenantId);

    if (!onboarding) {
      throw new Error('Onboarding record not found');
    }

    // Mark all steps complete
    onboarding.stepVerified = true;
    onboarding.verifiedAt = new Date();
    onboarding.completedAt = new Date();
    onboarding.completedBy = actorId;

    this.onboardings.set(tenantId, onboarding);

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

    return {
      success: true,
      tenant: activatedTenant,
      onboarding,
      bundle: onboarding.onboardingBundle,
      nextSteps: [],
    };
  }

  async getOnboardingStatus(
    tenantId: string,
    actorId: string,
    context: RequestContext
  ): Promise<TenantOnboarding | null> {
    await this.opaService.checkPermission('tenant:onboarding:read', actorId, context, { tenantId });

    return this.onboardings.get(tenantId) || null;
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

    const existingAdmins = this.admins.get(tenantId) || [];
    existingAdmins.push(admin);
    this.admins.set(tenantId, existingAdmins);

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
    await this.opaService.checkPermission('tenant:admin:list', actorId, context, { tenantId });

    return this.admins.get(tenantId) || [];
  }

  // ============================================================================
  // Status Transition History
  // ============================================================================

  async getStatusTransitions(
    tenantId: string,
    actorId: string,
    context: RequestContext
  ): Promise<TenantStatusTransition[]> {
    await this.opaService.checkPermission('tenant:transitions:read', actorId, context, { tenantId });

    return this.transitions.get(tenantId) || [];
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private async getTenantOrThrow(tenantId: string): Promise<Tenant> {
    const tenant = this.tenants.get(tenantId);
    if (!tenant) {
      throw new Error(`Tenant not found: ${tenantId}`);
    }
    return tenant;
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

    const transitions = this.transitions.get(tenantId) || [];
    transitions.push(transition);
    this.transitions.set(tenantId, transitions);

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
