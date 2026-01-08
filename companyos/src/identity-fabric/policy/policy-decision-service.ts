/**
 * CompanyOS Identity Fabric - Policy Decision Service
 *
 * Centralized policy decision point (PDP) that integrates with OPA
 * for authorization decisions across all CompanyOS components.
 *
 * Architecture options:
 * - Sidecar: OPA runs alongside each service (recommended for latency-sensitive)
 * - Centralized: Single OPA cluster for all services (recommended for consistency)
 * - Embedded: OPA library embedded in Node.js (recommended for edge)
 *
 * @module identity-fabric/policy
 */

import { EventEmitter } from "events";
import type {
  Identity,
  UserIdentity,
  Tenant,
  SessionContext,
  ClassificationLevel,
  ResidencyClass,
} from "../identity/types.js";

// ============================================================================
// POLICY DECISION TYPES
// ============================================================================

/**
 * Input structure for policy evaluation.
 * Follows OPA's expected input format.
 */
export interface PolicyInput {
  subject: SubjectContext;
  resource: ResourceContext;
  action: string;
  environment: EnvironmentContext;
  tenant: TenantContext;
}

export interface SubjectContext {
  id: string;
  type: string;
  tenantId: string;
  roles: string[];
  groups: string[];
  permissions: string[];
  clearance: ClassificationLevel;
  attributes: Record<string, unknown>;
  mfaVerified: boolean;
  stepUpVerified: boolean;
  stepUpScopes: string[];
  deviceTrust: string;
  riskScore: number;
}

export interface ResourceContext {
  type: string;
  id: string;
  tenantId: string;
  classification: ClassificationLevel;
  owner?: string;
  tags: string[];
  region: string;
  attributes: Record<string, unknown>;
}

export interface EnvironmentContext {
  timestamp: string;
  region: string;
  environment: string;
  ipAddress?: string;
  userAgent?: string;
  requestId: string;
  correlationId?: string;
}

export interface TenantContext {
  id: string;
  classification: ClassificationLevel;
  residency: {
    class: ResidencyClass;
    primaryRegion: string;
    allowedRegions: string[];
  };
  features: string[];
  quotas: Record<string, number>;
}

/**
 * Policy decision output structure.
 */
export interface PolicyDecision {
  allow: boolean;
  deny: boolean;
  reason: string;
  obligations: PolicyObligation[];
  stepUpRequired: boolean;
  stepUpPurpose?: string;
  redactions: RedactionSpec[];
  auditRequired: boolean;
  auditLevel: string;
  decisionId: string;
  evaluatedAt: string;
  latencyMs: number;
  policyVersion: string;
  matchedPolicies: string[];
}

export interface PolicyObligation {
  type: "audit" | "notify" | "encrypt" | "redact" | "approve" | "rate_limit";
  parameters: Record<string, unknown>;
}

export interface RedactionSpec {
  path: string;
  strategy: "mask" | "remove" | "hash" | "encrypt" | "tokenize";
  pattern?: string;
}

// ============================================================================
// POLICY DECISION SERVICE CONFIGURATION
// ============================================================================

export interface PolicyDecisionServiceConfig {
  mode: "sidecar" | "centralized" | "embedded";
  opaUrl?: string;
  opaPolicy: string;
  timeout: number;
  cacheEnabled: boolean;
  cacheTtlSeconds: number;
  defaultDecision: "allow" | "deny";
  fallbackOnError: boolean;
  metricsEnabled: boolean;
  tracingEnabled: boolean;
  bundleRefreshInterval: number;
  healthCheckInterval: number;
}

const DEFAULT_CONFIG: PolicyDecisionServiceConfig = {
  mode: "sidecar",
  opaUrl: "http://localhost:8181",
  opaPolicy: "companyos/authz",
  timeout: 100,
  cacheEnabled: true,
  cacheTtlSeconds: 60,
  defaultDecision: "deny",
  fallbackOnError: false,
  metricsEnabled: true,
  tracingEnabled: true,
  bundleRefreshInterval: 60000,
  healthCheckInterval: 10000,
};

// ============================================================================
// POLICY DECISION SERVICE
// ============================================================================

export class PolicyDecisionService extends EventEmitter {
  private config: PolicyDecisionServiceConfig;
  private decisionCache: Map<string, { decision: PolicyDecision; expiresAt: number }>;
  private opaHealthy: boolean = false;
  private policyVersion: string = "unknown";
  private metrics: PolicyMetrics;

  constructor(config: Partial<PolicyDecisionServiceConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.decisionCache = new Map();
    this.metrics = new PolicyMetrics();

    if (this.config.mode !== "embedded") {
      this.startHealthCheck();
    }
  }

  // ==========================================================================
  // CORE DECISION METHODS
  // ==========================================================================

  /**
   * Evaluate a policy decision.
   * This is the primary entry point for all authorization decisions.
   */
  async evaluate(input: PolicyInput): Promise<PolicyDecision> {
    const startTime = Date.now();
    const decisionId = this.generateDecisionId();

    try {
      // Check cache
      if (this.config.cacheEnabled) {
        const cached = this.checkCache(input);
        if (cached) {
          this.metrics.recordCacheHit();
          return { ...cached, decisionId, latencyMs: Date.now() - startTime };
        }
      }

      // Evaluate against OPA
      const decision = await this.evaluateOPA(input, decisionId, startTime);

      // Cache the decision
      if (this.config.cacheEnabled && decision.allow) {
        this.cacheDecision(input, decision);
      }

      // Record metrics
      this.metrics.recordDecision(decision, Date.now() - startTime);

      // Emit for audit
      if (decision.auditRequired) {
        this.emit("decision", { input, decision });
      }

      return decision;
    } catch (error) {
      this.metrics.recordError();

      if (this.config.fallbackOnError) {
        return this.createFallbackDecision(decisionId, startTime, error);
      }

      throw error;
    }
  }

  /**
   * Batch evaluate multiple policy decisions.
   * More efficient than multiple individual calls.
   */
  async evaluateBatch(inputs: PolicyInput[]): Promise<PolicyDecision[]> {
    // For now, evaluate sequentially. Could be optimized to batch OPA calls.
    return Promise.all(inputs.map((input) => this.evaluate(input)));
  }

  /**
   * Quick check if an action is allowed (returns boolean only).
   */
  async isAllowed(input: PolicyInput): Promise<boolean> {
    const decision = await this.evaluate(input);
    return decision.allow && !decision.deny;
  }

  /**
   * Check if step-up authentication is required.
   */
  async requiresStepUp(input: PolicyInput): Promise<{ required: boolean; purpose?: string }> {
    const decision = await this.evaluate(input);
    return {
      required: decision.stepUpRequired,
      purpose: decision.stepUpPurpose,
    };
  }

  /**
   * Get redaction requirements for a resource.
   */
  async getRedactions(input: PolicyInput): Promise<RedactionSpec[]> {
    const decision = await this.evaluate(input);
    return decision.redactions;
  }

  // ==========================================================================
  // OPA INTEGRATION
  // ==========================================================================

  private async evaluateOPA(
    input: PolicyInput,
    decisionId: string,
    startTime: number
  ): Promise<PolicyDecision> {
    const opaInput = this.buildOPAInput(input);

    switch (this.config.mode) {
      case "sidecar":
      case "centralized":
        return this.evaluateRemoteOPA(opaInput, decisionId, startTime);
      case "embedded":
        return this.evaluateEmbeddedOPA(opaInput, decisionId, startTime);
      default:
        throw new Error(`Unknown policy mode: ${this.config.mode}`);
    }
  }

  private async evaluateRemoteOPA(
    opaInput: Record<string, unknown>,
    decisionId: string,
    startTime: number
  ): Promise<PolicyDecision> {
    const url = `${this.config.opaUrl}/v1/data/${this.config.opaPolicy.replace(/\./g, "/")}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Request-ID": decisionId,
        },
        body: JSON.stringify({ input: opaInput }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new PolicyEvaluationError(`OPA returned status ${response.status}`, decisionId);
      }

      const result = await response.json();
      return this.parseOPAResult(result, decisionId, startTime);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private async evaluateEmbeddedOPA(
    opaInput: Record<string, unknown>,
    decisionId: string,
    startTime: number
  ): Promise<PolicyDecision> {
    // Embedded OPA evaluation using @open-policy-agent/opa-wasm
    // This is a placeholder - actual implementation would load and evaluate WASM
    throw new Error("Embedded OPA not yet implemented");
  }

  private buildOPAInput(input: PolicyInput): Record<string, unknown> {
    return {
      subject: {
        id: input.subject.id,
        type: input.subject.type,
        tenant_id: input.subject.tenantId,
        roles: input.subject.roles,
        groups: input.subject.groups,
        permissions: input.subject.permissions,
        clearance: input.subject.clearance,
        attributes: input.subject.attributes,
        mfa_verified: input.subject.mfaVerified,
        stepup_verified: input.subject.stepUpVerified,
        stepup_scopes: input.subject.stepUpScopes,
        device_trust: input.subject.deviceTrust,
        risk_score: input.subject.riskScore,
      },
      resource: {
        type: input.resource.type,
        id: input.resource.id,
        tenant_id: input.resource.tenantId,
        classification: input.resource.classification,
        owner: input.resource.owner,
        tags: input.resource.tags,
        region: input.resource.region,
        attributes: input.resource.attributes,
      },
      action: input.action,
      environment: {
        timestamp: input.environment.timestamp,
        region: input.environment.region,
        environment: input.environment.environment,
        ip_address: input.environment.ipAddress,
        user_agent: input.environment.userAgent,
        request_id: input.environment.requestId,
        correlation_id: input.environment.correlationId,
      },
      tenant: {
        id: input.tenant.id,
        classification: input.tenant.classification,
        residency: {
          class: input.tenant.residency.class,
          primary_region: input.tenant.residency.primaryRegion,
          allowed_regions: input.tenant.residency.allowedRegions,
        },
        features: input.tenant.features,
        quotas: input.tenant.quotas,
      },
    };
  }

  private parseOPAResult(result: any, decisionId: string, startTime: number): PolicyDecision {
    const data = result.result || result;

    return {
      allow: data.allow ?? false,
      deny: data.deny ?? !data.allow,
      reason: data.reason ?? (data.allow ? "Access granted" : "Access denied"),
      obligations: data.obligations ?? [],
      stepUpRequired: data.stepup_required ?? false,
      stepUpPurpose: data.stepup_purpose,
      redactions: data.redactions ?? [],
      auditRequired: data.audit_required ?? true,
      auditLevel: data.audit_level ?? "basic",
      decisionId,
      evaluatedAt: new Date().toISOString(),
      latencyMs: Date.now() - startTime,
      policyVersion: this.policyVersion,
      matchedPolicies: data.matched_policies ?? [],
    };
  }

  // ==========================================================================
  // CACHING
  // ==========================================================================

  private checkCache(input: PolicyInput): PolicyDecision | null {
    const cacheKey = this.buildCacheKey(input);
    const cached = this.decisionCache.get(cacheKey);

    if (cached && cached.expiresAt > Date.now()) {
      return cached.decision;
    }

    if (cached) {
      this.decisionCache.delete(cacheKey);
    }

    return null;
  }

  private cacheDecision(input: PolicyInput, decision: PolicyDecision): void {
    const cacheKey = this.buildCacheKey(input);
    this.decisionCache.set(cacheKey, {
      decision,
      expiresAt: Date.now() + this.config.cacheTtlSeconds * 1000,
    });
  }

  private buildCacheKey(input: PolicyInput): string {
    // Cache key is based on subject, resource type/id, action, and tenant
    return `${input.subject.id}:${input.resource.type}:${input.resource.id}:${input.action}:${input.tenant.id}`;
  }

  /**
   * Invalidate cache entries for a specific subject.
   */
  invalidateSubject(subjectId: string): void {
    for (const key of this.decisionCache.keys()) {
      if (key.startsWith(`${subjectId}:`)) {
        this.decisionCache.delete(key);
      }
    }
  }

  /**
   * Invalidate cache entries for a specific resource.
   */
  invalidateResource(resourceType: string, resourceId: string): void {
    const pattern = `:${resourceType}:${resourceId}:`;
    for (const key of this.decisionCache.keys()) {
      if (key.includes(pattern)) {
        this.decisionCache.delete(key);
      }
    }
  }

  /**
   * Clear all cached decisions.
   */
  clearCache(): void {
    this.decisionCache.clear();
  }

  // ==========================================================================
  // HEALTH CHECK & MONITORING
  // ==========================================================================

  private startHealthCheck(): void {
    this.checkHealth();
    setInterval(() => this.checkHealth(), this.config.healthCheckInterval);
  }

  private async checkHealth(): Promise<void> {
    try {
      const url = `${this.config.opaUrl}/health`;
      const response = await fetch(url, { method: "GET" });
      this.opaHealthy = response.ok;

      if (response.ok) {
        // Also fetch policy version
        const versionUrl = `${this.config.opaUrl}/v1/policies`;
        const versionResponse = await fetch(versionUrl);
        if (versionResponse.ok) {
          const policies = await versionResponse.json();
          this.policyVersion = policies.result?.[0]?.id ?? "unknown";
        }
      }
    } catch {
      this.opaHealthy = false;
    }

    this.emit("health", { healthy: this.opaHealthy, policyVersion: this.policyVersion });
  }

  /**
   * Get current health status.
   */
  getHealth(): { healthy: boolean; policyVersion: string } {
    return {
      healthy: this.opaHealthy,
      policyVersion: this.policyVersion,
    };
  }

  /**
   * Get metrics.
   */
  getMetrics(): PolicyMetricsSnapshot {
    return this.metrics.getSnapshot();
  }

  // ==========================================================================
  // HELPER METHODS
  // ==========================================================================

  private generateDecisionId(): string {
    return `dec_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
  }

  private createFallbackDecision(
    decisionId: string,
    startTime: number,
    error: unknown
  ): PolicyDecision {
    const allow = this.config.defaultDecision === "allow";
    return {
      allow,
      deny: !allow,
      reason: `Fallback decision due to error: ${error instanceof Error ? error.message : String(error)}`,
      obligations: [{ type: "audit", parameters: { fallback: true, error: String(error) } }],
      stepUpRequired: false,
      redactions: [],
      auditRequired: true,
      auditLevel: "full",
      decisionId,
      evaluatedAt: new Date().toISOString(),
      latencyMs: Date.now() - startTime,
      policyVersion: "fallback",
      matchedPolicies: [],
    };
  }
}

// ============================================================================
// METRICS
// ============================================================================

interface PolicyMetricsSnapshot {
  totalDecisions: number;
  allowedDecisions: number;
  deniedDecisions: number;
  cacheHits: number;
  cacheMisses: number;
  errors: number;
  averageLatencyMs: number;
  p99LatencyMs: number;
}

class PolicyMetrics {
  private totalDecisions = 0;
  private allowedDecisions = 0;
  private deniedDecisions = 0;
  private cacheHits = 0;
  private errors = 0;
  private latencies: number[] = [];

  recordDecision(decision: PolicyDecision, latencyMs: number): void {
    this.totalDecisions++;
    if (decision.allow) {
      this.allowedDecisions++;
    } else {
      this.deniedDecisions++;
    }
    this.latencies.push(latencyMs);
    if (this.latencies.length > 10000) {
      this.latencies = this.latencies.slice(-5000);
    }
  }

  recordCacheHit(): void {
    this.cacheHits++;
  }

  recordError(): void {
    this.errors++;
  }

  getSnapshot(): PolicyMetricsSnapshot {
    const sorted = [...this.latencies].sort((a, b) => a - b);
    const sum = this.latencies.reduce((a, b) => a + b, 0);

    return {
      totalDecisions: this.totalDecisions,
      allowedDecisions: this.allowedDecisions,
      deniedDecisions: this.deniedDecisions,
      cacheHits: this.cacheHits,
      cacheMisses: this.totalDecisions - this.cacheHits,
      errors: this.errors,
      averageLatencyMs: this.latencies.length > 0 ? sum / this.latencies.length : 0,
      p99LatencyMs: sorted[Math.floor(sorted.length * 0.99)] ?? 0,
    };
  }
}

// ============================================================================
// ERRORS
// ============================================================================

export class PolicyEvaluationError extends Error {
  constructor(
    message: string,
    public readonly decisionId: string
  ) {
    super(message);
    this.name = "PolicyEvaluationError";
  }
}

// ============================================================================
// CONVENIENCE BUILDERS
// ============================================================================

/**
 * Builder for constructing PolicyInput from identity context.
 */
export class PolicyInputBuilder {
  private input: Partial<PolicyInput> = {};

  withSubject(identity: Identity, session?: SessionContext): this {
    const user = identity.type === "human" ? (identity as UserIdentity) : null;

    this.input.subject = {
      id: identity.id,
      type: identity.type,
      tenantId: identity.tenantId,
      roles: session?.sessionId ? [] : [], // Roles come from session
      groups: user?.groups ?? [],
      permissions: [],
      clearance: user?.clearance ?? "unclassified",
      attributes: identity.metadata,
      mfaVerified: session?.mfaCompleted ?? false,
      stepUpVerified: session?.stepUpCompleted ?? false,
      stepUpScopes: session?.stepUpScopes ?? [],
      deviceTrust: session?.deviceTrust ?? "untrusted",
      riskScore: session?.riskScore ?? 0,
    };

    return this;
  }

  withResource(
    type: string,
    id: string,
    tenantId: string,
    options: Partial<ResourceContext> = {}
  ): this {
    this.input.resource = {
      type,
      id,
      tenantId,
      classification: options.classification ?? "unclassified",
      owner: options.owner,
      tags: options.tags ?? [],
      region: options.region ?? "us-east-1",
      attributes: options.attributes ?? {},
    };
    return this;
  }

  withAction(action: string): this {
    this.input.action = action;
    return this;
  }

  withTenant(tenant: Tenant): this {
    this.input.tenant = {
      id: tenant.id,
      classification: tenant.classification,
      residency: {
        class: tenant.residency.class,
        primaryRegion: tenant.residency.primaryRegion,
        allowedRegions: tenant.residency.allowedRegions,
      },
      features: tenant.features,
      quotas: {
        apiCallsPerHour: tenant.quotas.apiCallsPerHour,
        storageBytes: tenant.quotas.storageBytes,
        exportCallsPerDay: tenant.quotas.exportCallsPerDay,
      },
    };
    return this;
  }

  withEnvironment(options: Partial<EnvironmentContext> = {}): this {
    this.input.environment = {
      timestamp: options.timestamp ?? new Date().toISOString(),
      region: options.region ?? process.env.AWS_REGION ?? "us-east-1",
      environment: options.environment ?? process.env.NODE_ENV ?? "development",
      ipAddress: options.ipAddress,
      userAgent: options.userAgent,
      requestId: options.requestId ?? this.generateRequestId(),
      correlationId: options.correlationId,
    };
    return this;
  }

  build(): PolicyInput {
    if (!this.input.subject) throw new Error("Subject is required");
    if (!this.input.resource) throw new Error("Resource is required");
    if (!this.input.action) throw new Error("Action is required");
    if (!this.input.tenant) throw new Error("Tenant is required");
    if (!this.input.environment) {
      this.withEnvironment();
    }

    return this.input as PolicyInput;
  }

  private generateRequestId(): string {
    return `req_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
  }
}
