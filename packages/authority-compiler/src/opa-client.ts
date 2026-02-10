/**
 * OPA (Open Policy Agent) Integration
 *
 * Integrates the authority compiler with OPA for complex policy evaluation.
 * Supports both embedded and remote OPA evaluation modes.
 */

import { PolicyBundle, PolicyDecision, Operation, ClassificationLevel } from './schema/policy.schema';
import type { EvaluationContext } from './evaluator';

// -----------------------------------------------------------------------------
// OPA Client Configuration
// -----------------------------------------------------------------------------

export interface OPAClientConfig {
  /** OPA server endpoint (for remote mode) */
  endpoint?: string;
  /** Policy bundle path (for embedded mode) */
  bundlePath?: string;
  /** Evaluation mode */
  mode: 'remote' | 'embedded';
  /** Timeout in milliseconds */
  timeoutMs?: number;
  /** Enable caching of policy decisions */
  enableCache?: boolean;
  /** Cache TTL in seconds */
  cacheTTL?: number;
  /** Retry configuration */
  retry?: {
    maxRetries: number;
    backoffMs: number;
  };
}

// -----------------------------------------------------------------------------
// OPA Input/Output Types
// -----------------------------------------------------------------------------

/**
 * Input format for OPA policy evaluation
 */
export interface OPAInput {
  /** Subject making the request */
  subject: {
    id: string;
    roles: string[];
    groups?: string[];
    tenantId?: string;
    clearance?: string;
    compartments?: string[];
    attributes?: Record<string, unknown>;
  };

  /** Action being requested */
  action: {
    operation: Operation;
    method?: string;
    path?: string;
  };

  /** Resource being accessed */
  resource: {
    type?: string;
    id?: string;
    classification?: string;
    compartments?: string[];
    licenses?: string[];
    investigationId?: string;
    attributes?: Record<string, unknown>;
  };

  /** Request context */
  context: {
    timestamp: string;
    ip?: string;
    userAgent?: string;
    justification?: string;
    mfaVerified?: boolean;
    correlationId?: string;
  };
}

/**
 * Output format from OPA policy evaluation
 */
export interface OPAOutput {
  allow: boolean;
  reason?: string;
  conditions?: string[];
  requiresTwoPersonControl?: boolean;
  twoPersonControlId?: string;
  redactedFields?: string[];
  maxResults?: number;
  authorityId?: string;
  audit?: {
    policyVersion: string;
    evaluationTime: number;
    matchedRules: string[];
  };
}

// -----------------------------------------------------------------------------
// OPA Client
// -----------------------------------------------------------------------------

/**
 * Client for OPA policy evaluation
 */
export class OPAClient {
  private config: OPAClientConfig;
  private cache: Map<string, { decision: OPAOutput; expiresAt: number }> = new Map();

  constructor(config: OPAClientConfig) {
    this.config = {
      timeoutMs: 5000,
      enableCache: true,
      cacheTTL: 60,
      retry: { maxRetries: 3, backoffMs: 100 },
      ...config,
    };
  }

  /**
   * Evaluate a policy decision
   */
  async evaluate(input: OPAInput): Promise<OPAOutput> {
    // Check cache
    if (this.config.enableCache) {
      const cached = this.getCached(input);
      if (cached) {
        return cached;
      }
    }

    // Evaluate policy
    const result = this.config.mode === 'remote'
      ? await this.evaluateRemote(input)
      : await this.evaluateEmbedded(input);

    // Cache result
    if (this.config.enableCache) {
      this.setCached(input, result);
    }

    return result;
  }

  /**
   * Evaluate policy against remote OPA server
   */
  private async evaluateRemote(input: OPAInput): Promise<OPAOutput> {
    if (!this.config.endpoint) {
      throw new Error('OPA endpoint not configured for remote mode');
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);

    try {
      const response = await this.fetchWithRetry(
        `${this.config.endpoint}/v1/data/summit/authz/allow`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ input }),
          signal: controller.signal,
        }
      );

      const data = await response.json();
      return this.parseOPAResponse(data);
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Evaluate policy using embedded OPA (WASM)
   */
  private async evaluateEmbedded(input: OPAInput): Promise<OPAOutput> {
    // In production, this would use @open-policy-agent/opa-wasm
    // For now, return a stub that delegates to the local evaluator
    throw new Error('Embedded OPA not yet implemented - use remote mode');
  }

  /**
   * Fetch with retry logic
   */
  private async fetchWithRetry(
    url: string,
    options: RequestInit,
    attempt = 0
  ): Promise<Response> {
    try {
      const response = await fetch(url, options);
      if (!response.ok && response.status >= 500 && attempt < this.config.retry!.maxRetries) {
        await this.sleep(this.config.retry!.backoffMs * Math.pow(2, attempt));
        return this.fetchWithRetry(url, options, attempt + 1);
      }
      return response;
    } catch (error) {
      if (attempt < this.config.retry!.maxRetries) {
        await this.sleep(this.config.retry!.backoffMs * Math.pow(2, attempt));
        return this.fetchWithRetry(url, options, attempt + 1);
      }
      throw error;
    }
  }

  /**
   * Parse OPA response into standard format
   */
  private parseOPAResponse(data: any): OPAOutput {
    const result = data.result;

    if (typeof result === 'boolean') {
      return { allow: result };
    }

    return {
      allow: result?.allow ?? false,
      reason: result?.reason,
      conditions: result?.conditions,
      requiresTwoPersonControl: result?.requires_two_person_control,
      twoPersonControlId: result?.two_person_control_id,
      redactedFields: result?.redacted_fields,
      maxResults: result?.max_results,
      authorityId: result?.authority_id,
      audit: result?.audit,
    };
  }

  /**
   * Get cached decision
   */
  private getCached(input: OPAInput): OPAOutput | null {
    const key = this.cacheKey(input);
    const cached = this.cache.get(key);

    if (cached && cached.expiresAt > Date.now()) {
      return cached.decision;
    }

    if (cached) {
      this.cache.delete(key);
    }

    return null;
  }

  /**
   * Cache a decision
   */
  private setCached(input: OPAInput, decision: OPAOutput): void {
    const key = this.cacheKey(input);
    this.cache.set(key, {
      decision,
      expiresAt: Date.now() + (this.config.cacheTTL! * 1000),
    });
  }

  /**
   * Generate cache key from input
   */
  private cacheKey(input: OPAInput): string {
    return JSON.stringify({
      subject: input.subject.id,
      roles: input.subject.roles.sort(),
      action: input.action.operation,
      resource: input.resource.type,
      resourceId: input.resource.id,
    });
  }

  /**
   * Sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Clear the cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; hitRate: number } {
    return {
      size: this.cache.size,
      hitRate: 0, // Would need to track hits/misses
    };
  }
}

// -----------------------------------------------------------------------------
// OPA Policy Builder
// -----------------------------------------------------------------------------

/**
 * Build OPA input from evaluation context
 */
export function buildOPAInput(context: EvaluationContext): OPAInput {
  return {
    subject: {
      id: context.user.id,
      roles: context.user.roles,
      groups: context.user.groups,
      tenantId: context.user.tenantId,
      clearance: context.user.clearance,
      compartments: context.user.compartments,
    },
    action: {
      operation: context.operation,
    },
    resource: {
      type: context.resource.entityType,
      id: context.resource.entityId,
      classification: context.resource.classification,
      compartments: context.resource.compartments,
      licenses: context.resource.licenses,
      investigationId: context.resource.investigationId,
    },
    context: {
      timestamp: context.request.timestamp.toISOString(),
      ip: context.request.ip,
      userAgent: context.request.userAgent,
      justification: context.request.justification,
      mfaVerified: context.request.mfaVerified,
    },
  };
}

/**
 * Convert OPA output to policy decision
 */
export function opaOutputToDecision(output: OPAOutput, auditId: string): PolicyDecision {
  return {
    allowed: output.allow,
    authorityId: output.authorityId,
    reason: output.reason || (output.allow ? 'Access granted' : 'Access denied'),
    conditions: output.conditions,
    requiresTwoPersonControl: output.requiresTwoPersonControl || false,
    twoPersonControlId: output.twoPersonControlId,
    redactedFields: output.redactedFields,
    maxResults: output.maxResults,
    auditId,
  };
}

// -----------------------------------------------------------------------------
// Rego Policy Templates
// -----------------------------------------------------------------------------

/**
 * Generate Rego policy from policy bundle
 */
export function generateRegoPolicy(bundle: PolicyBundle): string {
  const lines: string[] = [
    '# Auto-generated from Summit Policy Bundle',
    `# Bundle: ${bundle.name} v${bundle.version}`,
    `# Generated: ${new Date().toISOString()}`,
    '',
    'package summit.authz',
    '',
    'import future.keywords.if',
    'import future.keywords.in',
    '',
    'default allow := false',
    '',
  ];

  // Generate rules for each authority
  for (const authority of bundle.authorities) {
    lines.push(`# Authority: ${authority.name}`);
    lines.push(`allow if {`);
    lines.push(`  authority_${authority.id.replace(/-/g, '_')}`);
    lines.push(`}`);
    lines.push('');

    lines.push(`authority_${authority.id.replace(/-/g, '_')} if {`);

    // Subject matching
    if (authority.subjects.roles?.length) {
      lines.push(`  # Role check`);
      lines.push(`  some role in input.subject.roles`);
      lines.push(`  role in ${JSON.stringify(authority.subjects.roles)}`);
    }

    // Permission matching
    lines.push(`  # Permission check`);
    lines.push(`  input.action.operation in ${JSON.stringify(authority.permissions)}`);

    // Resource matching
    if (authority.resources.entityTypes?.length) {
      lines.push(`  # Entity type check`);
      lines.push(`  input.resource.type in ${JSON.stringify(authority.resources.entityTypes)}`);
    }

    if (authority.resources.classifications?.length) {
      lines.push(`  # Classification check`);
      lines.push(`  input.resource.classification in ${JSON.stringify(authority.resources.classifications)}`);
    }

    lines.push(`}`);
    lines.push('');
  }

  // Add helper rules
  lines.push('# Helper: Get matched authority ID');
  lines.push('authority_id := id if {');
  lines.push('  some authority in data.authorities');
  lines.push('  allow');
  lines.push('  id := authority.id');
  lines.push('}');
  lines.push('');

  // Add reason generation
  lines.push('# Helper: Generate denial reason');
  lines.push('reason := msg if {');
  lines.push('  not allow');
  lines.push('  msg := "No matching authority found"');
  lines.push('}');

  return lines.join('\n');
}

export default OPAClient;
