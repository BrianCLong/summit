import axios, { AxiosInstance } from 'axios';
import pino from 'pino';
import { setTimeout } from 'timers/promises';

const logger = pino({ name: 'opa-client' });

export interface OPAInput {
  action: string;
  dataset: {
    sources: Array<{
      id: string;
      license: string;
      owner: string;
      classification?: string;
      fields?: Array<{ type: string; name: string }>;
      pii_detected?: boolean;
    }>;
  };
  context: {
    user_id: string;
    user_role: string;
    user_scopes: string[];
    tenant_id: string;
    purpose: string;
    export_type: 'analysis' | 'report' | 'dataset' | 'api';
    destination?: string;
    approvals?: string[];
    step_up_verified?: boolean;
    pii_export_approved?: boolean;
  };
}

export interface OPAViolation {
  code: string;
  message: string;
  source: any;
  appeal_code: string;
  appeal_url: string;
  severity: 'blocking' | 'warning';
}

export interface OPARiskAssessment {
  level: 'low' | 'medium' | 'high';
  factors: string[];
  requires_approval: boolean;
  requires_dual_control: boolean;
  requires_step_up: boolean;
}

export interface OPADecision {
  action: 'allow' | 'deny' | 'review';
  allow: boolean;
  violations: OPAViolation[];
  risk_assessment: OPARiskAssessment;
  required_approvals: string[];
  appeal_available: boolean;
  next_steps: string[];
}

export interface OPAResponse {
  result: {
    decision: OPADecision;
    deny: OPAViolation[];
    allow: boolean;
    requires_approval: boolean;
    requires_dual_control: boolean;
    requires_step_up: boolean;
    risk_assessment: OPARiskAssessment;
  };
}

export class OPAClient {
  private client: AxiosInstance;
  private decisionCache = new Map<
    string,
    { decision: OPADecision; timestamp: number }
  >();
  private readonly cacheTimeout = 5000; // 5 seconds

  constructor(
    private readonly baseURL: string = process.env.OPA_URL ||
      'http://localhost:8181',
    private readonly timeout: number = 3000,
  ) {
    this.client = axios.create({
      baseURL,
      timeout,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request/response interceptors for logging
    this.client.interceptors.request.use(
      (config) => {
        logger.debug({ url: config.url, method: config.method }, 'OPA request');
        return config;
      },
      (error) => {
        logger.error({ error }, 'OPA request error');
        return Promise.reject(error);
      },
    );

    this.client.interceptors.response.use(
      (response) => {
        logger.debug(
          {
            url: response.config.url,
            status: response.status,
            duration: response.headers['x-response-time'],
          },
          'OPA response',
        );
        return response;
      },
      (error) => {
        logger.error(
          {
            url: error.config?.url,
            status: error.response?.status,
            message: error.message,
          },
          'OPA response error',
        );
        return Promise.reject(error);
      },
    );
  }

  async evaluateExportPolicy(input: OPAInput): Promise<OPADecision> {
    const startTime = Date.now();
    const cacheKey = this.generateCacheKey(input);

    // Check cache first
    const cached = this.decisionCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      logger.debug(
        { cacheKey, age: Date.now() - cached.timestamp },
        'OPA cache hit',
      );
      return cached.decision;
    }

    try {
      const response = await this.client.post<OPAResponse>(
        '/v1/data/intelgraph/policy/export/enhanced/decision',
        { input },
      );

      const decision = response.data.result.decision;

      // Cache the decision
      this.decisionCache.set(cacheKey, {
        decision,
        timestamp: Date.now(),
      });

      const duration = Date.now() - startTime;
      logger.info(
        {
          action: decision.action,
          allow: decision.allow,
          violationsCount: decision.violations.length,
          riskLevel: decision.risk_assessment.level,
          durationMs: duration,
          cached: false,
        },
        'OPA export policy evaluation completed',
      );

      return decision;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(
        {
          error: error instanceof Error ? error.message : 'Unknown error',
          durationMs: duration,
          input: this.sanitizeInputForLogging(input),
        },
        'OPA export policy evaluation failed',
      );

      // Return fail-safe decision on error
      return this.failSafeDecision(error);
    }
  }

  async evaluateQuery(query: string, input: any): Promise<any> {
    try {
      const response = await this.client.post(`/v1/data/${query}`, { input });
      return response.data.result;
    } catch (error) {
      logger.error({ query, error }, 'OPA query evaluation failed');
      throw error;
    }
  }

  async checkDataAccess(
    userId: string,
    tenantId: string,
    resource: string,
    action: string,
  ): Promise<boolean> {
    const input = {
      user: { id: userId, tenant: tenantId },
      resource,
      action,
    };

    try {
      const result = await this.evaluateQuery(
        'intelgraph/policy/authz/allow',
        input,
      );
      return result === true;
    } catch (error) {
      logger.error(
        { userId, tenantId, resource, action, error },
        'Data access check failed',
      );
      return false; // Fail closed
    }
  }

  async simulatePolicy(
    input: OPAInput,
    policyChanges: Record<string, any>,
  ): Promise<{
    current: OPADecision;
    simulated: OPADecision;
    impact: {
      decision_changed: boolean;
      violations_added: OPAViolation[];
      violations_removed: OPAViolation[];
    };
  }> {
    // Get current decision
    const current = await this.evaluateExportPolicy(input);

    // Apply policy changes (this would typically involve updating policy in a separate OPA instance)
    // For now, we'll simulate by modifying the input
    const simulatedInput = this.applyPolicySimulation(input, policyChanges);
    const simulated = await this.evaluateExportPolicy(simulatedInput);

    const impact = {
      decision_changed: current.action !== simulated.action,
      violations_added: simulated.violations.filter(
        (v) => !current.violations.some((cv) => cv.code === v.code),
      ),
      violations_removed: current.violations.filter(
        (v) => !simulated.violations.some((sv) => sv.code === v.code),
      ),
    };

    logger.info(
      {
        decisionChanged: impact.decision_changed,
        violationsAdded: impact.violations_added.length,
        violationsRemoved: impact.violations_removed.length,
      },
      'Policy simulation completed',
    );

    return { current, simulated, impact };
  }

  private applyPolicySimulation(
    input: OPAInput,
    changes: Record<string, any>,
  ): OPAInput {
    // Deep clone input and apply simulated changes
    const simulated = JSON.parse(JSON.stringify(input));

    // Example policy simulation changes
    if (changes.stricterLicenseCheck) {
      // Simulate stricter license interpretation
      simulated.context.purpose = 'commercial'; // Force commercial purpose check
    }

    if (changes.requireStepUpForAllExports) {
      simulated.context.step_up_verified = false;
    }

    return simulated;
  }

  private generateCacheKey(input: OPAInput): string {
    // Generate a stable cache key from input
    const key = {
      action: input.action,
      licenses: input.dataset.sources.map((s) => s.license).sort(),
      userId: input.context.user_id,
      purpose: input.context.purpose,
      exportType: input.context.export_type,
      stepUpVerified: input.context.step_up_verified,
    };

    return Buffer.from(JSON.stringify(key)).toString('base64');
  }

  private sanitizeInputForLogging(input: OPAInput): any {
    // Remove sensitive information for logging
    return {
      action: input.action,
      sourceCount: input.dataset.sources.length,
      licenses: [...new Set(input.dataset.sources.map((s) => s.license))],
      userRole: input.context.user_role,
      purpose: input.context.purpose,
      exportType: input.context.export_type,
    };
  }

  private failSafeDecision(error: any): OPADecision {
    // Return a safe fail-closed decision when OPA is unavailable
    logger.warn('Returning fail-safe decision due to OPA error');

    return {
      action: 'deny',
      allow: false,
      violations: [
        {
          code: 'OPA_UNAVAILABLE',
          message:
            'Policy evaluation service unavailable - export denied for safety',
          source: null,
          appeal_code: 'SYS001',
          appeal_url: 'https://compliance.intelgraph.io/appeal/SYS001',
          severity: 'blocking',
        },
      ],
      risk_assessment: {
        level: 'high',
        factors: ['Policy evaluation service unavailable'],
        requires_approval: true,
        requires_dual_control: true,
        requires_step_up: true,
      },
      required_approvals: ['system-admin', 'compliance-officer'],
      appeal_available: true,
      next_steps: [
        'Contact system administrator about policy service availability',
        'Submit appeal for manual review',
      ],
    };
  }

  // Clear cache (useful for testing or manual cache invalidation)
  clearCache(): void {
    this.decisionCache.clear();
    logger.info('OPA decision cache cleared');
  }

  // Health check
  async healthCheck(): Promise<{ healthy: boolean; response_time_ms: number }> {
    const startTime = Date.now();

    try {
      await this.client.get('/health');
      return {
        healthy: true,
        response_time_ms: Date.now() - startTime,
      };
    } catch (error) {
      return {
        healthy: false,
        response_time_ms: Date.now() - startTime,
      };
    }
  }
}

// Singleton instance
export const opaClient = new OPAClient();

/**
 * Tenant Graph Slice v0 - Helper Functions
 * ABAC enforcement for multi-tenant graph queries
 */

export interface User {
  id: string;
  tenantId?: string;
  purposes?: string[];
  scopes?: string[];
}

/**
 * Verify user has access to tenant and specific action
 * Throws error if denied
 */
export async function verifyTenantAccess(
  user: User | undefined,
  tenantId: string,
  action: string,
): Promise<void> {
  if (!user) {
    throw new Error('Unauthorized: No user context');
  }

  // Check tenant isolation
  if (user.tenantId && user.tenantId !== tenantId) {
    logger.warn(
      { userId: user.id, userTenant: user.tenantId, requestedTenant: tenantId },
      'Tenant isolation violation attempt',
    );
    throw new Error(
      `Forbidden: User tenant ${user.tenantId} cannot access tenant ${tenantId}`,
    );
  }

  // Check action permission via OPA
  const allowed = await opaClient.checkDataAccess(
    user.id,
    tenantId,
    'entity',
    action,
  );

  if (!allowed) {
    logger.warn(
      { userId: user.id, tenantId, action },
      'OPA denied tenant action',
    );
    throw new Error(`Forbidden: Action ${action} denied by policy`);
  }
}

/**
 * Check if user has one of the required purposes
 * Returns true if user has proper purpose tag
 */
export async function checkPurpose(
  user: User | undefined,
  requiredPurposes: string[],
): Promise<boolean> {
  if (!user || !user.purposes) {
    return false;
  }

  return user.purposes.some((p) => requiredPurposes.includes(p));
}

/**
 * Check if user can access PII fields
 * Requires proper purpose AND scope
 */
export async function canAccessPII(user: User | undefined): Promise<boolean> {
  if (!user) {
    return false;
  }

  // Must have investigation or threat-intel purpose
  const hasValidPurpose = await checkPurpose(user, [
    'investigation',
    'threat-intel',
  ]);

  // Must have pii:read scope
  const hasScope = user.scopes?.includes('pii:read') || false;

  return hasValidPurpose && hasScope;
}
