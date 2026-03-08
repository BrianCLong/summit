"use strict";
/**
 * CompanyOS Identity Fabric - Identity Service
 *
 * Core service for managing identities across all principal types.
 * Provides CRUD operations, validation, and identity resolution.
 *
 * @module identity-fabric/identity
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.IdentityValidationError = exports.TenantAccessDeniedError = exports.TenantNotFoundError = exports.IdentityNotFoundError = exports.InMemoryRoleStore = exports.InMemoryTenantStore = exports.InMemoryIdentityStore = exports.IdentityService = void 0;
const events_1 = require("events");
const DEFAULT_CONFIG = {
    cacheEnabled: true,
    cacheTtlSeconds: 300,
    auditEnabled: true,
    validationStrict: true,
    maxIdentitiesPerTenant: 10000,
    defaultClearance: 'unclassified',
    requireEmailVerification: true,
    spiffeEnabled: true,
    spiffeTrustDomain: 'companyos.local',
};
// ============================================================================
// IDENTITY SERVICE
// ============================================================================
class IdentityService extends events_1.EventEmitter {
    config;
    identityCache;
    permissionCache;
    // Pluggable storage backends
    userStore;
    serviceStore;
    agentStore;
    workloadStore;
    tenantStore;
    roleStore;
    constructor(config = {}, stores) {
        super();
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.identityCache = new Map();
        this.permissionCache = new Map();
        // Initialize stores (in-memory by default, can be replaced with DB-backed stores)
        this.userStore = stores?.userStore ?? new InMemoryIdentityStore();
        this.serviceStore = stores?.serviceStore ?? new InMemoryIdentityStore();
        this.agentStore = stores?.agentStore ?? new InMemoryIdentityStore();
        this.workloadStore = stores?.workloadStore ?? new InMemoryIdentityStore();
        this.tenantStore = stores?.tenantStore ?? new InMemoryTenantStore();
        this.roleStore = stores?.roleStore ?? new InMemoryRoleStore();
    }
    // ==========================================================================
    // IDENTITY RESOLUTION
    // ==========================================================================
    /**
     * Resolve a principal to its full identity context.
     * This is the primary method for authorization decisions.
     */
    async resolveIdentity(principalId, tenantId, sessionContext) {
        const cacheKey = `${principalId}:${tenantId}`;
        const now = Date.now();
        // Check cache
        if (this.config.cacheEnabled) {
            const cached = this.identityCache.get(cacheKey);
            if (cached && cached.expiresAt > now) {
                return this.buildResolutionResult(cached.identity, tenantId, sessionContext, true);
            }
        }
        // Determine principal type and fetch identity
        const identity = await this.getIdentityById(principalId);
        if (!identity) {
            throw new IdentityNotFoundError(principalId);
        }
        // Validate tenant access
        if (identity.tenantId !== tenantId) {
            throw new TenantAccessDeniedError(principalId, tenantId);
        }
        // Cache the identity
        if (this.config.cacheEnabled) {
            this.identityCache.set(cacheKey, {
                identity,
                expiresAt: now + this.config.cacheTtlSeconds * 1000,
            });
        }
        return this.buildResolutionResult(identity, tenantId, sessionContext, false);
    }
    /**
     * Resolve identity by SPIFFE ID for workload authentication.
     */
    async resolveBySpiffeId(spiffeId) {
        const workload = await this.workloadStore.findBySpiffeId(spiffeId);
        if (!workload) {
            throw new IdentityNotFoundError(`spiffe:${spiffeId}`);
        }
        return this.buildResolutionResult(workload, workload.tenantId, undefined, false);
    }
    /**
     * Resolve identity by email for human users.
     */
    async resolveByEmail(email, tenantId) {
        const user = await this.userStore.findByEmail(email, tenantId);
        if (!user) {
            throw new IdentityNotFoundError(`email:${email}`);
        }
        return this.buildResolutionResult(user, tenantId, undefined, false);
    }
    async buildResolutionResult(identity, tenantId, sessionContext, cacheHit) {
        const tenant = await this.tenantStore.get(tenantId);
        if (!tenant) {
            throw new TenantNotFoundError(tenantId);
        }
        const organizations = await this.getOrganizations(identity);
        const roles = await this.getRoles(identity.id, tenantId);
        const effectivePermissions = await this.computeEffectivePermissions(identity, roles);
        const effectiveClearance = this.computeEffectiveClearance(identity, tenant);
        return {
            identity,
            tenant,
            organizations,
            roles,
            effectivePermissions,
            effectiveClearance,
            sessionContext,
            resolvedAt: new Date(),
            cacheHit,
        };
    }
    // ==========================================================================
    // IDENTITY CRUD OPERATIONS
    // ==========================================================================
    /**
     * Create a new user identity.
     */
    async createUser(user) {
        const validation = await this.validateUserIdentity(user);
        if (!validation.valid) {
            throw new IdentityValidationError(validation.errors);
        }
        const newUser = {
            ...user,
            id: this.generateId('user'),
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        await this.userStore.create(newUser);
        this.emit('identity:created', { type: 'human', identity: newUser });
        if (this.config.auditEnabled) {
            this.emitAuditEvent('identity.user.created', newUser);
        }
        return newUser;
    }
    /**
     * Create a new service identity.
     */
    async createService(service) {
        const validation = await this.validateServiceIdentity(service);
        if (!validation.valid) {
            throw new IdentityValidationError(validation.errors);
        }
        const newService = {
            ...service,
            id: this.generateId('svc'),
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        // Generate SPIFFE ID if enabled
        if (this.config.spiffeEnabled && !newService.spiffeId) {
            newService.spiffeId = this.generateSpiffeId(newService);
        }
        await this.serviceStore.create(newService);
        this.emit('identity:created', { type: 'service', identity: newService });
        if (this.config.auditEnabled) {
            this.emitAuditEvent('identity.service.created', newService);
        }
        return newService;
    }
    /**
     * Create a new agent identity.
     */
    async createAgent(agent) {
        const validation = await this.validateAgentIdentity(agent);
        if (!validation.valid) {
            throw new IdentityValidationError(validation.errors);
        }
        const newAgent = {
            ...agent,
            id: this.generateId('agent'),
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        await this.agentStore.create(newAgent);
        this.emit('identity:created', { type: 'agent', identity: newAgent });
        if (this.config.auditEnabled) {
            this.emitAuditEvent('identity.agent.created', newAgent);
        }
        return newAgent;
    }
    /**
     * Create a new workload identity.
     */
    async createWorkload(workload) {
        const validation = await this.validateWorkloadIdentity(workload);
        if (!validation.valid) {
            throw new IdentityValidationError(validation.errors);
        }
        const newWorkload = {
            ...workload,
            id: this.generateId('wkld'),
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        await this.workloadStore.create(newWorkload);
        this.emit('identity:created', { type: 'workload', identity: newWorkload });
        if (this.config.auditEnabled) {
            this.emitAuditEvent('identity.workload.created', newWorkload);
        }
        return newWorkload;
    }
    /**
     * Get any identity by ID.
     */
    async getIdentityById(id) {
        const prefix = id.split('_')[0];
        switch (prefix) {
            case 'user':
                return this.userStore.get(id);
            case 'svc':
                return this.serviceStore.get(id);
            case 'agent':
                return this.agentStore.get(id);
            case 'wkld':
                return this.workloadStore.get(id);
            default:
                // Try all stores
                return (await this.userStore.get(id) ||
                    await this.serviceStore.get(id) ||
                    await this.agentStore.get(id) ||
                    await this.workloadStore.get(id));
        }
    }
    /**
     * Update user identity.
     */
    async updateUser(id, updates) {
        const existing = await this.userStore.get(id);
        if (!existing) {
            throw new IdentityNotFoundError(id);
        }
        const updated = {
            ...existing,
            ...updates,
            id: existing.id,
            type: 'human',
            tenantId: existing.tenantId,
            createdAt: existing.createdAt,
            updatedAt: new Date(),
        };
        await this.userStore.update(updated);
        this.invalidateCache(id);
        this.emit('identity:updated', { type: 'human', identity: updated });
        if (this.config.auditEnabled) {
            this.emitAuditEvent('identity.user.updated', updated, { changes: updates });
        }
        return updated;
    }
    /**
     * Deactivate an identity (soft delete).
     */
    async deactivateIdentity(id, reason) {
        const identity = await this.getIdentityById(id);
        if (!identity) {
            throw new IdentityNotFoundError(id);
        }
        identity.active = false;
        identity.updatedAt = new Date();
        identity.deactivatedAt = new Date();
        identity.deactivationReason = reason;
        await this.updateIdentityByType(identity);
        this.invalidateCache(id);
        this.emit('identity:deactivated', { identity, reason });
        if (this.config.auditEnabled) {
            this.emitAuditEvent('identity.deactivated', identity, { reason });
        }
    }
    // ==========================================================================
    // PERMISSION COMPUTATION
    // ==========================================================================
    /**
     * Compute effective permissions for an identity.
     */
    async computeEffectivePermissions(identity, roles) {
        const cacheKey = `perms:${identity.id}`;
        const now = Date.now();
        if (this.config.cacheEnabled) {
            const cached = this.permissionCache.get(cacheKey);
            if (cached && cached.expiresAt > now) {
                return cached.permissions;
            }
        }
        const permissions = new Set();
        // Collect permissions from all roles
        for (const role of roles) {
            for (const permission of role.permissions) {
                permissions.add(permission);
            }
            // Resolve inherited permissions
            await this.resolveInheritedPermissions(role, permissions);
        }
        // Apply identity-type specific permissions
        await this.applyTypeSpecificPermissions(identity, permissions);
        const permissionArray = Array.from(permissions);
        if (this.config.cacheEnabled) {
            this.permissionCache.set(cacheKey, {
                permissions: permissionArray,
                expiresAt: now + this.config.cacheTtlSeconds * 1000,
            });
        }
        return permissionArray;
    }
    async resolveInheritedPermissions(role, permissions) {
        for (const parentRoleId of role.inheritsFrom) {
            const parentRole = await this.roleStore.get(parentRoleId);
            if (parentRole) {
                for (const permission of parentRole.permissions) {
                    permissions.add(permission);
                }
                await this.resolveInheritedPermissions(parentRole, permissions);
            }
        }
    }
    async applyTypeSpecificPermissions(identity, permissions) {
        switch (identity.type) {
            case 'service': {
                const service = identity;
                for (const scope of service.scopes) {
                    permissions.add(`scope:${scope}`);
                }
                for (const op of service.allowedOperations) {
                    permissions.add(`operation:${op}`);
                }
                break;
            }
            case 'agent': {
                const agent = identity;
                for (const cap of agent.capabilities) {
                    permissions.add(`agent:${cap}`);
                }
                // Add restrictions as negative permissions
                for (const restriction of agent.restrictions) {
                    permissions.add(`restriction:${restriction}`);
                }
                break;
            }
            case 'workload': {
                const workload = identity;
                for (const audience of workload.allowedAudiences) {
                    permissions.add(`audience:${audience}`);
                }
                break;
            }
        }
    }
    /**
     * Compute effective clearance level.
     */
    computeEffectiveClearance(identity, tenant) {
        const CLEARANCE_LEVELS = {
            'unclassified': 0,
            'cui': 1,
            'confidential': 2,
            'secret': 3,
            'top-secret': 4,
            'top-secret-sci': 5,
        };
        let identityClearance = this.config.defaultClearance;
        if (identity.type === 'human') {
            identityClearance = identity.clearance;
        }
        const tenantClearance = tenant.classification;
        // Effective clearance is the minimum of identity and tenant clearance
        const identityLevel = CLEARANCE_LEVELS[identityClearance];
        const tenantLevel = CLEARANCE_LEVELS[tenantClearance];
        return identityLevel <= tenantLevel ? identityClearance : tenantClearance;
    }
    // ==========================================================================
    // VALIDATION
    // ==========================================================================
    async validateUserIdentity(user) {
        const errors = [];
        const warnings = [];
        if (!user.email) {
            errors.push({ field: 'email', code: 'required', message: 'Email is required' });
        }
        else if (!this.isValidEmail(user.email)) {
            errors.push({ field: 'email', code: 'invalid', message: 'Invalid email format' });
        }
        if (!user.tenantId) {
            errors.push({ field: 'tenantId', code: 'required', message: 'Tenant ID is required' });
        }
        if (!user.displayName) {
            errors.push({ field: 'displayName', code: 'required', message: 'Display name is required' });
        }
        if (user.clearance && !this.isValidClearance(user.clearance)) {
            errors.push({ field: 'clearance', code: 'invalid', message: 'Invalid clearance level' });
        }
        // Check tenant limits
        if (user.tenantId) {
            const count = await this.userStore.countByTenant(user.tenantId);
            if (count >= this.config.maxIdentitiesPerTenant) {
                errors.push({
                    field: 'tenantId',
                    code: 'limit_exceeded',
                    message: `Tenant has reached maximum identity limit (${this.config.maxIdentitiesPerTenant})`,
                });
            }
        }
        return { valid: errors.length === 0, errors, warnings };
    }
    async validateServiceIdentity(service) {
        const errors = [];
        const warnings = [];
        if (!service.name) {
            errors.push({ field: 'name', code: 'required', message: 'Service name is required' });
        }
        if (!service.owner) {
            errors.push({ field: 'owner', code: 'required', message: 'Service owner is required' });
        }
        if (!service.tenantId) {
            errors.push({ field: 'tenantId', code: 'required', message: 'Tenant ID is required' });
        }
        if (!service.scopes || service.scopes.length === 0) {
            warnings.push('Service has no scopes defined');
        }
        return { valid: errors.length === 0, errors, warnings };
    }
    async validateAgentIdentity(agent) {
        const errors = [];
        const warnings = [];
        if (!agent.name) {
            errors.push({ field: 'name', code: 'required', message: 'Agent name is required' });
        }
        if (!agent.modelId) {
            errors.push({ field: 'modelId', code: 'required', message: 'Model ID is required' });
        }
        if (!agent.owner) {
            errors.push({ field: 'owner', code: 'required', message: 'Agent owner is required' });
        }
        if (!agent.tenantId) {
            errors.push({ field: 'tenantId', code: 'required', message: 'Tenant ID is required' });
        }
        if (agent.maxTokenBudget && agent.maxTokenBudget <= 0) {
            errors.push({ field: 'maxTokenBudget', code: 'invalid', message: 'Token budget must be positive' });
        }
        return { valid: errors.length === 0, errors, warnings };
    }
    async validateWorkloadIdentity(workload) {
        const errors = [];
        const warnings = [];
        if (!workload.spiffeId) {
            errors.push({ field: 'spiffeId', code: 'required', message: 'SPIFFE ID is required' });
        }
        else if (!this.isValidSpiffeId(workload.spiffeId)) {
            errors.push({ field: 'spiffeId', code: 'invalid', message: 'Invalid SPIFFE ID format' });
        }
        if (!workload.trustDomain) {
            errors.push({ field: 'trustDomain', code: 'required', message: 'Trust domain is required' });
        }
        if (!workload.tenantId) {
            errors.push({ field: 'tenantId', code: 'required', message: 'Tenant ID is required' });
        }
        return { valid: errors.length === 0, errors, warnings };
    }
    // ==========================================================================
    // HELPER METHODS
    // ==========================================================================
    generateId(prefix) {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substring(2, 10);
        return `${prefix}_${timestamp}${random}`;
    }
    generateSpiffeId(service) {
        return `spiffe://${this.config.spiffeTrustDomain}/service/${service.tenantId}/${service.name}`;
    }
    isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }
    isValidClearance(clearance) {
        return ['unclassified', 'cui', 'confidential', 'secret', 'top-secret', 'top-secret-sci'].includes(clearance);
    }
    isValidSpiffeId(spiffeId) {
        return /^spiffe:\/\/[^/]+\/.*$/.test(spiffeId);
    }
    invalidateCache(identityId) {
        for (const key of this.identityCache.keys()) {
            if (key.startsWith(`${identityId}:`)) {
                this.identityCache.delete(key);
            }
        }
        this.permissionCache.delete(`perms:${identityId}`);
    }
    async getOrganizations(identity) {
        if (identity.type !== 'human') {
            return [];
        }
        const user = identity;
        const orgs = [];
        for (const orgId of user.organizationIds) {
            const org = await this.tenantStore.getOrganization(orgId);
            if (org) {
                orgs.push(org);
            }
        }
        return orgs;
    }
    async getRoles(identityId, tenantId) {
        const bindings = await this.roleStore.getBindings(identityId, tenantId);
        const roles = [];
        for (const binding of bindings) {
            const role = await this.roleStore.get(binding.roleId);
            if (role && (!binding.expiresAt || binding.expiresAt > new Date())) {
                roles.push(role);
            }
        }
        return roles;
    }
    async updateIdentityByType(identity) {
        switch (identity.type) {
            case 'human':
                await this.userStore.update(identity);
                break;
            case 'service':
                await this.serviceStore.update(identity);
                break;
            case 'agent':
                await this.agentStore.update(identity);
                break;
            case 'workload':
                await this.workloadStore.update(identity);
                break;
        }
    }
    emitAuditEvent(eventType, identity, additionalData) {
        this.emit('audit', {
            eventType,
            timestamp: new Date().toISOString(),
            identityId: identity.id,
            identityType: identity.type,
            tenantId: identity.tenantId,
            ...additionalData,
        });
    }
}
exports.IdentityService = IdentityService;
// ============================================================================
// IN-MEMORY IMPLEMENTATIONS (for testing and development)
// ============================================================================
class InMemoryIdentityStore {
    store = new Map();
    async create(identity) {
        this.store.set(identity.id, identity);
    }
    async get(id) {
        return this.store.get(id) ?? null;
    }
    async update(identity) {
        this.store.set(identity.id, identity);
    }
    async delete(id) {
        this.store.delete(id);
    }
    async findByEmail(email, tenantId) {
        for (const identity of this.store.values()) {
            if (identity.email === email && identity.tenantId === tenantId) {
                return identity;
            }
        }
        return null;
    }
    async findBySpiffeId(spiffeId) {
        for (const identity of this.store.values()) {
            if (identity.spiffeId === spiffeId) {
                return identity;
            }
        }
        return null;
    }
    async listByTenant(tenantId) {
        return Array.from(this.store.values()).filter(i => i.tenantId === tenantId);
    }
    async countByTenant(tenantId) {
        return (await this.listByTenant(tenantId)).length;
    }
}
exports.InMemoryIdentityStore = InMemoryIdentityStore;
class InMemoryTenantStore {
    tenants = new Map();
    organizations = new Map();
    async get(id) {
        return this.tenants.get(id) ?? null;
    }
    async getOrganization(id) {
        return this.organizations.get(id) ?? null;
    }
    setTenant(tenant) {
        this.tenants.set(tenant.id, tenant);
    }
    setOrganization(org) {
        this.organizations.set(org.id, org);
    }
}
exports.InMemoryTenantStore = InMemoryTenantStore;
class InMemoryRoleStore {
    roles = new Map();
    bindings = [];
    async get(id) {
        return this.roles.get(id) ?? null;
    }
    async getBindings(identityId, tenantId) {
        return this.bindings.filter(b => b.principalId === identityId && b.tenantId === tenantId);
    }
    setRole(role) {
        this.roles.set(role.id, role);
    }
    addBinding(binding) {
        this.bindings.push(binding);
    }
}
exports.InMemoryRoleStore = InMemoryRoleStore;
// ============================================================================
// ERRORS
// ============================================================================
class IdentityNotFoundError extends Error {
    identityId;
    constructor(identityId) {
        super(`Identity not found: ${identityId}`);
        this.identityId = identityId;
        this.name = 'IdentityNotFoundError';
    }
}
exports.IdentityNotFoundError = IdentityNotFoundError;
class TenantNotFoundError extends Error {
    tenantId;
    constructor(tenantId) {
        super(`Tenant not found: ${tenantId}`);
        this.tenantId = tenantId;
        this.name = 'TenantNotFoundError';
    }
}
exports.TenantNotFoundError = TenantNotFoundError;
class TenantAccessDeniedError extends Error {
    identityId;
    tenantId;
    constructor(identityId, tenantId) {
        super(`Identity ${identityId} does not have access to tenant ${tenantId}`);
        this.identityId = identityId;
        this.tenantId = tenantId;
        this.name = 'TenantAccessDeniedError';
    }
}
exports.TenantAccessDeniedError = TenantAccessDeniedError;
class IdentityValidationError extends Error {
    errors;
    constructor(errors) {
        super(`Identity validation failed: ${errors.map(e => e.message).join(', ')}`);
        this.errors = errors;
        this.name = 'IdentityValidationError';
    }
}
exports.IdentityValidationError = IdentityValidationError;
