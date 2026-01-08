/**
 * CompanyOS Identity Fabric - Identity Service
 *
 * Core service for managing identities across all principal types.
 * Provides CRUD operations, validation, and identity resolution.
 *
 * @module identity-fabric/identity
 */

import { EventEmitter } from "events";
import type {
  Identity,
  UserIdentity,
  ServiceIdentity,
  AgentIdentity,
  WorkloadIdentity,
  PrincipalType,
  Tenant,
  Organization,
  RoleBinding,
  Role,
  SessionContext,
  ClassificationLevel,
  TrustLevel,
} from "./types.js";

// ============================================================================
// IDENTITY SERVICE CONFIGURATION
// ============================================================================

export interface IdentityServiceConfig {
  cacheEnabled: boolean;
  cacheTtlSeconds: number;
  auditEnabled: boolean;
  validationStrict: boolean;
  maxIdentitiesPerTenant: number;
  defaultClearance: ClassificationLevel;
  requireEmailVerification: boolean;
  spiffeEnabled: boolean;
  spiffeTrustDomain: string;
}

const DEFAULT_CONFIG: IdentityServiceConfig = {
  cacheEnabled: true,
  cacheTtlSeconds: 300,
  auditEnabled: true,
  validationStrict: true,
  maxIdentitiesPerTenant: 10000,
  defaultClearance: "unclassified",
  requireEmailVerification: true,
  spiffeEnabled: true,
  spiffeTrustDomain: "companyos.local",
};

// ============================================================================
// IDENTITY RESOLUTION RESULT
// ============================================================================

export interface IdentityResolutionResult {
  identity: Identity;
  tenant: Tenant;
  organizations: Organization[];
  roles: Role[];
  effectivePermissions: string[];
  effectiveClearance: ClassificationLevel;
  sessionContext?: SessionContext;
  resolvedAt: Date;
  cacheHit: boolean;
}

export interface IdentityValidationResult {
  valid: boolean;
  errors: IdentityValidationError[];
  warnings: string[];
}

export interface IdentityValidationError {
  field: string;
  code: string;
  message: string;
}

// ============================================================================
// IDENTITY SERVICE
// ============================================================================

export class IdentityService extends EventEmitter {
  private config: IdentityServiceConfig;
  private identityCache: Map<string, { identity: Identity; expiresAt: number }>;
  private permissionCache: Map<string, { permissions: string[]; expiresAt: number }>;

  // Pluggable storage backends
  private userStore: IdentityStore<UserIdentity>;
  private serviceStore: IdentityStore<ServiceIdentity>;
  private agentStore: IdentityStore<AgentIdentity>;
  private workloadStore: IdentityStore<WorkloadIdentity>;
  private tenantStore: TenantStore;
  private roleStore: RoleStore;

  constructor(config: Partial<IdentityServiceConfig> = {}, stores?: IdentityStores) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.identityCache = new Map();
    this.permissionCache = new Map();

    // Initialize stores (in-memory by default, can be replaced with DB-backed stores)
    this.userStore = stores?.userStore ?? new InMemoryIdentityStore<UserIdentity>();
    this.serviceStore = stores?.serviceStore ?? new InMemoryIdentityStore<ServiceIdentity>();
    this.agentStore = stores?.agentStore ?? new InMemoryIdentityStore<AgentIdentity>();
    this.workloadStore = stores?.workloadStore ?? new InMemoryIdentityStore<WorkloadIdentity>();
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
  async resolveIdentity(
    principalId: string,
    tenantId: string,
    sessionContext?: SessionContext
  ): Promise<IdentityResolutionResult> {
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
  async resolveBySpiffeId(spiffeId: string): Promise<IdentityResolutionResult> {
    const workload = await this.workloadStore.findBySpiffeId(spiffeId);
    if (!workload) {
      throw new IdentityNotFoundError(`spiffe:${spiffeId}`);
    }
    return this.buildResolutionResult(workload, workload.tenantId, undefined, false);
  }

  /**
   * Resolve identity by email for human users.
   */
  async resolveByEmail(email: string, tenantId: string): Promise<IdentityResolutionResult> {
    const user = await this.userStore.findByEmail(email, tenantId);
    if (!user) {
      throw new IdentityNotFoundError(`email:${email}`);
    }
    return this.buildResolutionResult(user, tenantId, undefined, false);
  }

  private async buildResolutionResult(
    identity: Identity,
    tenantId: string,
    sessionContext: SessionContext | undefined,
    cacheHit: boolean
  ): Promise<IdentityResolutionResult> {
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
  async createUser(
    user: Omit<UserIdentity, "id" | "createdAt" | "updatedAt">
  ): Promise<UserIdentity> {
    const validation = await this.validateUserIdentity(user);
    if (!validation.valid) {
      throw new IdentityValidationError(validation.errors);
    }

    const newUser: UserIdentity = {
      ...user,
      id: this.generateId("user"),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await this.userStore.create(newUser);
    this.emit("identity:created", { type: "human", identity: newUser });

    if (this.config.auditEnabled) {
      this.emitAuditEvent("identity.user.created", newUser);
    }

    return newUser;
  }

  /**
   * Create a new service identity.
   */
  async createService(
    service: Omit<ServiceIdentity, "id" | "createdAt" | "updatedAt">
  ): Promise<ServiceIdentity> {
    const validation = await this.validateServiceIdentity(service);
    if (!validation.valid) {
      throw new IdentityValidationError(validation.errors);
    }

    const newService: ServiceIdentity = {
      ...service,
      id: this.generateId("svc"),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Generate SPIFFE ID if enabled
    if (this.config.spiffeEnabled && !newService.spiffeId) {
      newService.spiffeId = this.generateSpiffeId(newService);
    }

    await this.serviceStore.create(newService);
    this.emit("identity:created", { type: "service", identity: newService });

    if (this.config.auditEnabled) {
      this.emitAuditEvent("identity.service.created", newService);
    }

    return newService;
  }

  /**
   * Create a new agent identity.
   */
  async createAgent(
    agent: Omit<AgentIdentity, "id" | "createdAt" | "updatedAt">
  ): Promise<AgentIdentity> {
    const validation = await this.validateAgentIdentity(agent);
    if (!validation.valid) {
      throw new IdentityValidationError(validation.errors);
    }

    const newAgent: AgentIdentity = {
      ...agent,
      id: this.generateId("agent"),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await this.agentStore.create(newAgent);
    this.emit("identity:created", { type: "agent", identity: newAgent });

    if (this.config.auditEnabled) {
      this.emitAuditEvent("identity.agent.created", newAgent);
    }

    return newAgent;
  }

  /**
   * Create a new workload identity.
   */
  async createWorkload(
    workload: Omit<WorkloadIdentity, "id" | "createdAt" | "updatedAt">
  ): Promise<WorkloadIdentity> {
    const validation = await this.validateWorkloadIdentity(workload);
    if (!validation.valid) {
      throw new IdentityValidationError(validation.errors);
    }

    const newWorkload: WorkloadIdentity = {
      ...workload,
      id: this.generateId("wkld"),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await this.workloadStore.create(newWorkload);
    this.emit("identity:created", { type: "workload", identity: newWorkload });

    if (this.config.auditEnabled) {
      this.emitAuditEvent("identity.workload.created", newWorkload);
    }

    return newWorkload;
  }

  /**
   * Get any identity by ID.
   */
  async getIdentityById(id: string): Promise<Identity | null> {
    const prefix = id.split("_")[0];

    switch (prefix) {
      case "user":
        return this.userStore.get(id);
      case "svc":
        return this.serviceStore.get(id);
      case "agent":
        return this.agentStore.get(id);
      case "wkld":
        return this.workloadStore.get(id);
      default:
        // Try all stores
        return (
          (await this.userStore.get(id)) ||
          (await this.serviceStore.get(id)) ||
          (await this.agentStore.get(id)) ||
          (await this.workloadStore.get(id))
        );
    }
  }

  /**
   * Update user identity.
   */
  async updateUser(id: string, updates: Partial<UserIdentity>): Promise<UserIdentity> {
    const existing = await this.userStore.get(id);
    if (!existing) {
      throw new IdentityNotFoundError(id);
    }

    const updated: UserIdentity = {
      ...existing,
      ...updates,
      id: existing.id,
      type: "human",
      tenantId: existing.tenantId,
      createdAt: existing.createdAt,
      updatedAt: new Date(),
    };

    await this.userStore.update(updated);
    this.invalidateCache(id);
    this.emit("identity:updated", { type: "human", identity: updated });

    if (this.config.auditEnabled) {
      this.emitAuditEvent("identity.user.updated", updated, { changes: updates });
    }

    return updated;
  }

  /**
   * Deactivate an identity (soft delete).
   */
  async deactivateIdentity(id: string, reason: string): Promise<void> {
    const identity = await this.getIdentityById(id);
    if (!identity) {
      throw new IdentityNotFoundError(id);
    }

    identity.active = false;
    identity.updatedAt = new Date();
    (identity as any).deactivatedAt = new Date();
    (identity as any).deactivationReason = reason;

    await this.updateIdentityByType(identity);
    this.invalidateCache(id);
    this.emit("identity:deactivated", { identity, reason });

    if (this.config.auditEnabled) {
      this.emitAuditEvent("identity.deactivated", identity, { reason });
    }
  }

  // ==========================================================================
  // PERMISSION COMPUTATION
  // ==========================================================================

  /**
   * Compute effective permissions for an identity.
   */
  async computeEffectivePermissions(identity: Identity, roles: Role[]): Promise<string[]> {
    const cacheKey = `perms:${identity.id}`;
    const now = Date.now();

    if (this.config.cacheEnabled) {
      const cached = this.permissionCache.get(cacheKey);
      if (cached && cached.expiresAt > now) {
        return cached.permissions;
      }
    }

    const permissions = new Set<string>();

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

  private async resolveInheritedPermissions(role: Role, permissions: Set<string>): Promise<void> {
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

  private async applyTypeSpecificPermissions(
    identity: Identity,
    permissions: Set<string>
  ): Promise<void> {
    switch (identity.type) {
      case "service": {
        const service = identity as ServiceIdentity;
        for (const scope of service.scopes) {
          permissions.add(`scope:${scope}`);
        }
        for (const op of service.allowedOperations) {
          permissions.add(`operation:${op}`);
        }
        break;
      }
      case "agent": {
        const agent = identity as AgentIdentity;
        for (const cap of agent.capabilities) {
          permissions.add(`agent:${cap}`);
        }
        // Add restrictions as negative permissions
        for (const restriction of agent.restrictions) {
          permissions.add(`restriction:${restriction}`);
        }
        break;
      }
      case "workload": {
        const workload = identity as WorkloadIdentity;
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
  computeEffectiveClearance(identity: Identity, tenant: Tenant): ClassificationLevel {
    const CLEARANCE_LEVELS: Record<ClassificationLevel, number> = {
      unclassified: 0,
      cui: 1,
      confidential: 2,
      secret: 3,
      "top-secret": 4,
      "top-secret-sci": 5,
    };

    let identityClearance: ClassificationLevel = this.config.defaultClearance;
    if (identity.type === "human") {
      identityClearance = (identity as UserIdentity).clearance;
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

  async validateUserIdentity(user: Partial<UserIdentity>): Promise<IdentityValidationResult> {
    const errors: IdentityValidationError[] = [];
    const warnings: string[] = [];

    if (!user.email) {
      errors.push({ field: "email", code: "required", message: "Email is required" });
    } else if (!this.isValidEmail(user.email)) {
      errors.push({ field: "email", code: "invalid", message: "Invalid email format" });
    }

    if (!user.tenantId) {
      errors.push({ field: "tenantId", code: "required", message: "Tenant ID is required" });
    }

    if (!user.displayName) {
      errors.push({ field: "displayName", code: "required", message: "Display name is required" });
    }

    if (user.clearance && !this.isValidClearance(user.clearance)) {
      errors.push({ field: "clearance", code: "invalid", message: "Invalid clearance level" });
    }

    // Check tenant limits
    if (user.tenantId) {
      const count = await this.userStore.countByTenant(user.tenantId);
      if (count >= this.config.maxIdentitiesPerTenant) {
        errors.push({
          field: "tenantId",
          code: "limit_exceeded",
          message: `Tenant has reached maximum identity limit (${this.config.maxIdentitiesPerTenant})`,
        });
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  async validateServiceIdentity(
    service: Partial<ServiceIdentity>
  ): Promise<IdentityValidationResult> {
    const errors: IdentityValidationError[] = [];
    const warnings: string[] = [];

    if (!service.name) {
      errors.push({ field: "name", code: "required", message: "Service name is required" });
    }

    if (!service.owner) {
      errors.push({ field: "owner", code: "required", message: "Service owner is required" });
    }

    if (!service.tenantId) {
      errors.push({ field: "tenantId", code: "required", message: "Tenant ID is required" });
    }

    if (!service.scopes || service.scopes.length === 0) {
      warnings.push("Service has no scopes defined");
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  async validateAgentIdentity(agent: Partial<AgentIdentity>): Promise<IdentityValidationResult> {
    const errors: IdentityValidationError[] = [];
    const warnings: string[] = [];

    if (!agent.name) {
      errors.push({ field: "name", code: "required", message: "Agent name is required" });
    }

    if (!agent.modelId) {
      errors.push({ field: "modelId", code: "required", message: "Model ID is required" });
    }

    if (!agent.owner) {
      errors.push({ field: "owner", code: "required", message: "Agent owner is required" });
    }

    if (!agent.tenantId) {
      errors.push({ field: "tenantId", code: "required", message: "Tenant ID is required" });
    }

    if (agent.maxTokenBudget && agent.maxTokenBudget <= 0) {
      errors.push({
        field: "maxTokenBudget",
        code: "invalid",
        message: "Token budget must be positive",
      });
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  async validateWorkloadIdentity(
    workload: Partial<WorkloadIdentity>
  ): Promise<IdentityValidationResult> {
    const errors: IdentityValidationError[] = [];
    const warnings: string[] = [];

    if (!workload.spiffeId) {
      errors.push({ field: "spiffeId", code: "required", message: "SPIFFE ID is required" });
    } else if (!this.isValidSpiffeId(workload.spiffeId)) {
      errors.push({ field: "spiffeId", code: "invalid", message: "Invalid SPIFFE ID format" });
    }

    if (!workload.trustDomain) {
      errors.push({ field: "trustDomain", code: "required", message: "Trust domain is required" });
    }

    if (!workload.tenantId) {
      errors.push({ field: "tenantId", code: "required", message: "Tenant ID is required" });
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  // ==========================================================================
  // HELPER METHODS
  // ==========================================================================

  private generateId(prefix: string): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 10);
    return `${prefix}_${timestamp}${random}`;
  }

  private generateSpiffeId(service: ServiceIdentity): string {
    return `spiffe://${this.config.spiffeTrustDomain}/service/${service.tenantId}/${service.name}`;
  }

  private isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  private isValidClearance(clearance: string): boolean {
    return [
      "unclassified",
      "cui",
      "confidential",
      "secret",
      "top-secret",
      "top-secret-sci",
    ].includes(clearance);
  }

  private isValidSpiffeId(spiffeId: string): boolean {
    return /^spiffe:\/\/[^/]+\/.*$/.test(spiffeId);
  }

  private invalidateCache(identityId: string): void {
    for (const key of this.identityCache.keys()) {
      if (key.startsWith(`${identityId}:`)) {
        this.identityCache.delete(key);
      }
    }
    this.permissionCache.delete(`perms:${identityId}`);
  }

  private async getOrganizations(identity: Identity): Promise<Organization[]> {
    if (identity.type !== "human") {
      return [];
    }
    const user = identity as UserIdentity;
    const orgs: Organization[] = [];
    for (const orgId of user.organizationIds) {
      const org = await this.tenantStore.getOrganization(orgId);
      if (org) {
        orgs.push(org);
      }
    }
    return orgs;
  }

  private async getRoles(identityId: string, tenantId: string): Promise<Role[]> {
    const bindings = await this.roleStore.getBindings(identityId, tenantId);
    const roles: Role[] = [];
    for (const binding of bindings) {
      const role = await this.roleStore.get(binding.roleId);
      if (role && (!binding.expiresAt || binding.expiresAt > new Date())) {
        roles.push(role);
      }
    }
    return roles;
  }

  private async updateIdentityByType(identity: Identity): Promise<void> {
    switch (identity.type) {
      case "human":
        await this.userStore.update(identity as UserIdentity);
        break;
      case "service":
        await this.serviceStore.update(identity as ServiceIdentity);
        break;
      case "agent":
        await this.agentStore.update(identity as AgentIdentity);
        break;
      case "workload":
        await this.workloadStore.update(identity as WorkloadIdentity);
        break;
    }
  }

  private emitAuditEvent(
    eventType: string,
    identity: Identity,
    additionalData?: Record<string, unknown>
  ): void {
    this.emit("audit", {
      eventType,
      timestamp: new Date().toISOString(),
      identityId: identity.id,
      identityType: identity.type,
      tenantId: identity.tenantId,
      ...additionalData,
    });
  }
}

// ============================================================================
// STORAGE INTERFACES
// ============================================================================

export interface IdentityStore<T extends Identity> {
  create(identity: T): Promise<void>;
  get(id: string): Promise<T | null>;
  update(identity: T): Promise<void>;
  delete(id: string): Promise<void>;
  findByEmail?(email: string, tenantId: string): Promise<T | null>;
  findBySpiffeId?(spiffeId: string): Promise<T | null>;
  listByTenant(tenantId: string): Promise<T[]>;
  countByTenant(tenantId: string): Promise<number>;
}

export interface TenantStore {
  get(id: string): Promise<Tenant | null>;
  getOrganization(id: string): Promise<Organization | null>;
}

export interface RoleStore {
  get(id: string): Promise<Role | null>;
  getBindings(identityId: string, tenantId: string): Promise<RoleBinding[]>;
}

export interface IdentityStores {
  userStore?: IdentityStore<UserIdentity>;
  serviceStore?: IdentityStore<ServiceIdentity>;
  agentStore?: IdentityStore<AgentIdentity>;
  workloadStore?: IdentityStore<WorkloadIdentity>;
  tenantStore?: TenantStore;
  roleStore?: RoleStore;
}

// ============================================================================
// IN-MEMORY IMPLEMENTATIONS (for testing and development)
// ============================================================================

export class InMemoryIdentityStore<T extends Identity> implements IdentityStore<T> {
  private store = new Map<string, T>();

  async create(identity: T): Promise<void> {
    this.store.set(identity.id, identity);
  }

  async get(id: string): Promise<T | null> {
    return this.store.get(id) ?? null;
  }

  async update(identity: T): Promise<void> {
    this.store.set(identity.id, identity);
  }

  async delete(id: string): Promise<void> {
    this.store.delete(id);
  }

  async findByEmail(email: string, tenantId: string): Promise<T | null> {
    for (const identity of this.store.values()) {
      if ((identity as any).email === email && identity.tenantId === tenantId) {
        return identity;
      }
    }
    return null;
  }

  async findBySpiffeId(spiffeId: string): Promise<T | null> {
    for (const identity of this.store.values()) {
      if ((identity as any).spiffeId === spiffeId) {
        return identity;
      }
    }
    return null;
  }

  async listByTenant(tenantId: string): Promise<T[]> {
    return Array.from(this.store.values()).filter((i) => i.tenantId === tenantId);
  }

  async countByTenant(tenantId: string): Promise<number> {
    return (await this.listByTenant(tenantId)).length;
  }
}

export class InMemoryTenantStore implements TenantStore {
  private tenants = new Map<string, Tenant>();
  private organizations = new Map<string, Organization>();

  async get(id: string): Promise<Tenant | null> {
    return this.tenants.get(id) ?? null;
  }

  async getOrganization(id: string): Promise<Organization | null> {
    return this.organizations.get(id) ?? null;
  }

  setTenant(tenant: Tenant): void {
    this.tenants.set(tenant.id, tenant);
  }

  setOrganization(org: Organization): void {
    this.organizations.set(org.id, org);
  }
}

export class InMemoryRoleStore implements RoleStore {
  private roles = new Map<string, Role>();
  private bindings: RoleBinding[] = [];

  async get(id: string): Promise<Role | null> {
    return this.roles.get(id) ?? null;
  }

  async getBindings(identityId: string, tenantId: string): Promise<RoleBinding[]> {
    return this.bindings.filter((b) => b.principalId === identityId && b.tenantId === tenantId);
  }

  setRole(role: Role): void {
    this.roles.set(role.id, role);
  }

  addBinding(binding: RoleBinding): void {
    this.bindings.push(binding);
  }
}

// ============================================================================
// ERRORS
// ============================================================================

export class IdentityNotFoundError extends Error {
  constructor(public readonly identityId: string) {
    super(`Identity not found: ${identityId}`);
    this.name = "IdentityNotFoundError";
  }
}

export class TenantNotFoundError extends Error {
  constructor(public readonly tenantId: string) {
    super(`Tenant not found: ${tenantId}`);
    this.name = "TenantNotFoundError";
  }
}

export class TenantAccessDeniedError extends Error {
  constructor(
    public readonly identityId: string,
    public readonly tenantId: string
  ) {
    super(`Identity ${identityId} does not have access to tenant ${tenantId}`);
    this.name = "TenantAccessDeniedError";
  }
}

export class IdentityValidationError extends Error {
  constructor(public readonly errors: IdentityValidationError[]) {
    super(`Identity validation failed: ${errors.map((e) => e.message).join(", ")}`);
    this.name = "IdentityValidationError";
  }
}
