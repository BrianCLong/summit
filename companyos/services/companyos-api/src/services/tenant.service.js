"use strict";
/**
 * CompanyOS Tenant Service
 *
 * Implements A1: Tenant Lifecycle Management (Activate/Suspend/Delete)
 * Implements A2: Tenant Onboarding Flow
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TenantService = void 0;
exports.getTenantService = getTenantService;
const uuid_1 = require("uuid");
const tenant_js_1 = require("../types/tenant.js");
const logger_js_1 = require("../utils/logger.js");
const logger = (0, logger_js_1.createLogger)('tenant-service');
class TenantService {
    config;
    auditService;
    opaService;
    // In-memory store for demo (replace with actual DB in production)
    tenants = new Map();
    transitions = new Map();
    admins = new Map();
    onboardings = new Map();
    constructor(config = {}, auditService, opaService) {
        this.config = {
            defaultRegion: 'us-east-1',
            defaultTier: tenant_js_1.TenantTier.STARTER,
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
    async createTenant(input, actorId, context) {
        logger.info('Creating tenant', { externalId: input.externalId, actorId });
        // Check OPA authorization
        await this.opaService.checkPermission('tenant:create', actorId, context);
        // Validate external ID uniqueness
        const existing = Array.from(this.tenants.values()).find((t) => t.externalId === input.externalId);
        if (existing) {
            throw new Error(`Tenant with external ID ${input.externalId} already exists`);
        }
        const tier = input.tier || this.config.defaultTier;
        const now = new Date();
        const tenant = {
            id: (0, uuid_1.v4)(),
            externalId: input.externalId,
            name: input.name,
            displayName: input.displayName || input.name,
            status: tenant_js_1.TenantStatus.PENDING,
            tier,
            region: input.region || this.config.defaultRegion,
            residencyClass: input.residencyClass || 'standard',
            allowedRegions: input.allowedRegions || [input.region || this.config.defaultRegion],
            features: { ...tenant_js_1.DEFAULT_FEATURES[tier], ...input.features },
            quotas: { ...tenant_js_1.DEFAULT_QUOTAS[tier], ...input.quotas },
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
        const onboarding = {
            id: (0, uuid_1.v4)(),
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
        const transition = await this.recordTransition(tenant.id, undefined, tenant_js_1.TenantStatus.PENDING, 'Tenant created', actorId, context);
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
    async getTenant(tenantId, actorId, context) {
        await this.opaService.checkPermission('tenant:read', actorId, context, { tenantId });
        const tenant = this.tenants.get(tenantId);
        if (!tenant) {
            return null;
        }
        // Block access to DELETED tenants except for admins
        if (tenant.status === tenant_js_1.TenantStatus.DELETED) {
            const hasAdminAccess = await this.opaService.hasRole(actorId, 'global-admin', context);
            if (!hasAdminAccess) {
                throw new Error('Tenant not found');
            }
        }
        return tenant;
    }
    async listTenants(filter, actorId, context, limit = 25, offset = 0) {
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
            tenants = tenants.filter((t) => t.name.toLowerCase().includes(query) ||
                t.externalId.toLowerCase().includes(query) ||
                t.displayName?.toLowerCase().includes(query));
        }
        // Exclude DELETED tenants by default unless specifically requested
        if (!filter.status) {
            tenants = tenants.filter((t) => t.status !== tenant_js_1.TenantStatus.DELETED);
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
    async updateTenant(tenantId, input, actorId, context) {
        await this.opaService.checkPermission('tenant:update', actorId, context, { tenantId });
        const tenant = await this.getTenantOrThrow(tenantId);
        // Can't update DELETED tenants
        if (tenant.status === tenant_js_1.TenantStatus.DELETED) {
            throw new Error('Cannot update deleted tenant');
        }
        const updatedTenant = {
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
    async activateTenant(tenantId, input, actorId, context) {
        await this.opaService.checkPermission('tenant:activate', actorId, context, { tenantId });
        const tenant = await this.getTenantOrThrow(tenantId);
        // Validate transition
        this.validateStatusTransition(tenant.status, tenant_js_1.TenantStatus.ACTIVE);
        const updatedTenant = {
            ...tenant,
            status: tenant_js_1.TenantStatus.ACTIVE,
            activatedAt: new Date(),
            updatedAt: new Date(),
        };
        this.tenants.set(tenantId, updatedTenant);
        const transition = await this.recordTransition(tenantId, tenant.status, tenant_js_1.TenantStatus.ACTIVE, input.reason || 'Tenant activated', actorId, context);
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
    async suspendTenant(tenantId, input, actorId, context) {
        await this.opaService.checkPermission('tenant:suspend', actorId, context, { tenantId });
        const tenant = await this.getTenantOrThrow(tenantId);
        // Validate transition
        this.validateStatusTransition(tenant.status, tenant_js_1.TenantStatus.SUSPENDED);
        const updatedTenant = {
            ...tenant,
            status: tenant_js_1.TenantStatus.SUSPENDED,
            suspendedAt: new Date(),
            updatedAt: new Date(),
        };
        this.tenants.set(tenantId, updatedTenant);
        const transition = await this.recordTransition(tenantId, tenant.status, tenant_js_1.TenantStatus.SUSPENDED, input.reason, actorId, context);
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
    async requestTenantDeletion(tenantId, input, actorId, context) {
        await this.opaService.checkPermission('tenant:delete', actorId, context, { tenantId });
        const tenant = await this.getTenantOrThrow(tenantId);
        // Validate transition
        this.validateStatusTransition(tenant.status, tenant_js_1.TenantStatus.DELETION_REQUESTED);
        const updatedTenant = {
            ...tenant,
            status: tenant_js_1.TenantStatus.DELETION_REQUESTED,
            deletionRequestedAt: new Date(),
            updatedAt: new Date(),
        };
        this.tenants.set(tenantId, updatedTenant);
        const transition = await this.recordTransition(tenantId, tenant.status, tenant_js_1.TenantStatus.DELETION_REQUESTED, input.reason, actorId, context);
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
    async completeTenantDeletion(tenantId, actorId, context) {
        await this.opaService.checkPermission('tenant:delete:confirm', actorId, context, { tenantId });
        const tenant = await this.getTenantOrThrow(tenantId);
        if (tenant.status !== tenant_js_1.TenantStatus.DELETION_REQUESTED) {
            throw new Error('Tenant must be in DELETION_REQUESTED status to complete deletion');
        }
        if (this.config.softDeleteOnly) {
            // Soft delete - mark as deleted but keep data
            const updatedTenant = {
                ...tenant,
                status: tenant_js_1.TenantStatus.DELETED,
                deletedAt: new Date(),
                updatedAt: new Date(),
            };
            this.tenants.set(tenantId, updatedTenant);
            const transition = await this.recordTransition(tenantId, tenant.status, tenant_js_1.TenantStatus.DELETED, 'Deletion completed (soft delete)', actorId, context);
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
        }
        else {
            // Hard delete - remove all data (not implemented in this sprint)
            throw new Error('Hard delete not yet implemented. Only soft delete is available.');
        }
    }
    // ============================================================================
    // Tenant Onboarding (A2)
    // ============================================================================
    async startOnboarding(input, admins, actorId, context) {
        logger.info('Starting tenant onboarding', { externalId: input.externalId });
        // Step 1: Create tenant
        const createResult = await this.createTenant(input, actorId, context);
        const tenant = createResult.tenant;
        // Step 2: Assign admins
        const assignedAdmins = [];
        for (const adminInput of admins) {
            const admin = await this.assignAdmin(tenant.id, adminInput, actorId, context);
            assignedAdmins.push(admin);
        }
        // Step 3: Update onboarding record
        const onboarding = this.onboardings.get(tenant.id);
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
    async completeOnboarding(tenantId, actorId, context) {
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
        if (tenant.status === tenant_js_1.TenantStatus.PENDING) {
            const activateResult = await this.activateTenant(tenantId, { reason: 'Onboarding completed' }, actorId, context);
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
    async getOnboardingStatus(tenantId, actorId, context) {
        await this.opaService.checkPermission('tenant:onboarding:read', actorId, context, { tenantId });
        return this.onboardings.get(tenantId) || null;
    }
    // ============================================================================
    // Admin Management
    // ============================================================================
    async assignAdmin(tenantId, input, actorId, context) {
        await this.opaService.checkPermission('tenant:admin:assign', actorId, context, { tenantId });
        const tenant = await this.getTenantOrThrow(tenantId);
        const admin = {
            id: (0, uuid_1.v4)(),
            tenantId,
            userId: (0, uuid_1.v4)(), // Will be linked when user accepts invite
            email: input.email,
            displayName: input.displayName,
            role: input.role || tenant_js_1.TenantAdminRole.ADMIN,
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
    async listAdmins(tenantId, actorId, context) {
        await this.opaService.checkPermission('tenant:admin:list', actorId, context, { tenantId });
        return this.admins.get(tenantId) || [];
    }
    // ============================================================================
    // Status Transition History
    // ============================================================================
    async getStatusTransitions(tenantId, actorId, context) {
        await this.opaService.checkPermission('tenant:transitions:read', actorId, context, { tenantId });
        return this.transitions.get(tenantId) || [];
    }
    // ============================================================================
    // Helper Methods
    // ============================================================================
    async getTenantOrThrow(tenantId) {
        const tenant = this.tenants.get(tenantId);
        if (!tenant) {
            throw new Error(`Tenant not found: ${tenantId}`);
        }
        return tenant;
    }
    validateStatusTransition(fromStatus, toStatus) {
        const validTransitions = tenant_js_1.VALID_STATUS_TRANSITIONS[fromStatus];
        if (!validTransitions.includes(toStatus)) {
            throw new Error(`Invalid status transition from ${fromStatus} to ${toStatus}. ` +
                `Valid transitions: ${validTransitions.join(', ') || 'none'}`);
        }
    }
    async recordTransition(tenantId, fromStatus, toStatus, reason, performedBy, context) {
        const transition = {
            id: (0, uuid_1.v4)(),
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
    generateOnboardingBundle(tenant, admins) {
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
    getOnboardingNextSteps(onboarding) {
        const steps = [];
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
exports.TenantService = TenantService;
// Export singleton factory
let tenantServiceInstance = null;
function getTenantService(config, auditService, opaService) {
    if (!tenantServiceInstance && auditService && opaService) {
        tenantServiceInstance = new TenantService(config, auditService, opaService);
    }
    if (!tenantServiceInstance) {
        throw new Error('TenantService not initialized. Call with dependencies first.');
    }
    return tenantServiceInstance;
}
