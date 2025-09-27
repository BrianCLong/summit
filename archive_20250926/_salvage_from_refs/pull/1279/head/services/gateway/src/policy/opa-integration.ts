/**
 * OPA Integration for Policy Enforcement
 *
 * Provides integration with Open Policy Agent for evaluating
 * privacy, licensing, and governance policies with real-time
 * decision making and audit trails.
 */

import { logger } from '../utils/logger';
import { PrivacyPolicyReasoner } from './privacy-reasoner';
import { LicensingEnforcementEngine } from './licensing-enforcement';

interface OPAClient {
  url: string;
  timeout: number;
  retries: number;
}

interface PolicyInput {
  operation: {
    type: string;
    data: any;
    context: Record<string, any>;
  };
  classification: {
    level: string;
    categories: string[];
    personalData: boolean;
    sensitiveData: boolean;
  };
  license: {
    type: string;
    tier: string;
    restrictions: any[];
    permissions: any[];
  };
  usage: {
    current: Record<string, number>;
    limits: Record<string, number>;
  };
  gates?: {
    slo_burn?: {
      enabled: boolean;
      thresholds: Record<string, Record<string, number>>;
      burn_rates: Record<string, Record<string, number>>;
    };
    sbom_diff?: {
      enabled: boolean;
      new_high: number;
      new_critical: number;
    };
    webauthn?: {
      enabled: boolean;
      coverage_percent: number;
      min_percent: number;
    };
  };
}

interface PolicyDecision {
  allow: boolean;
  deny: boolean;
  violations: Array<{
    type: string;
    message: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    service?: string;
  }>;
  recommendations: Array<{
    priority: string;
    action: string;
    details: string;
  }>;
  metadata: {
    policy: string;
    version: string;
    evaluationTime: number;
    appliedRules: string[];
  };
}

export class OPAPolicyIntegration {
  private opaClient: OPAClient;
  private privacyReasoner: PrivacyPolicyReasoner;
  private licensingEngine: LicensingEnforcementEngine;
  private policyCache: Map<string, { decision: PolicyDecision; timestamp: number }>;

  constructor(
    opaUrl: string,
    privacyReasoner: PrivacyPolicyReasoner,
    licensingEngine: LicensingEnforcementEngine
  ) {
    this.opaClient = {
      url: opaUrl,
      timeout: 5000,
      retries: 3
    };
    this.privacyReasoner = privacyReasoner;
    this.licensingEngine = licensingEngine;
    this.policyCache = new Map();
  }

  /**
   * Evaluate comprehensive policy for an operation
   */
  async evaluatePolicy(
    operation: {
      type: 'read' | 'write' | 'export' | 'delete' | 'share';
      data: any;
      context: {
        userId: string;
        tenantId: string;
        purpose: string[];
        requestedBy?: string;
        externalRecipient?: string;
      };
    },
    gateOptions?: {
      enableSLOBurn?: boolean;
      enableSBOMDiff?: boolean;
      enableWebAuthnCoverage?: boolean;
      metrics?: Record<string, any>;
    }
  ): Promise<PolicyDecision> {
    const startTime = Date.now();

    try {
      // Generate cache key
      const cacheKey = this.generateCacheKey(operation, gateOptions);
      const cached = this.policyCache.get(cacheKey);

      // Return cached decision if less than 5 minutes old
      if (cached && Date.now() - cached.timestamp < 300000) {
        logger.debug('Using cached policy decision', { cacheKey });
        return cached.decision;
      }

      // Classify data using privacy reasoner
      const classification = await this.privacyReasoner.classifyData(operation.data);

      // Check license constraints
      const licenseCheck = await this.licensingEngine.checkLicense(
        operation.context.tenantId,
        {
          type: this.mapOperationToLicenseType(operation.type),
          volume: this.calculateDataVolume(operation.data),
          dataTypes: classification.categories,
          destination: operation.context.externalRecipient ? 'external' : 'internal',
          commercial: operation.context.purpose.includes('commercial')
        }
      );

      // Get current usage stats
      const usageStats = await this.licensingEngine.getUsageStats(operation.context.tenantId);

      // Build OPA input
      const policyInput = await this.buildPolicyInput(
        operation,
        classification,
        licenseCheck,
        usageStats,
        gateOptions
      );

      // Evaluate with OPA
      const opaDecision = await this.callOPA('data.intelgraph.ci.governance', policyInput);

      // Build final decision
      const decision: PolicyDecision = {
        allow: opaDecision.allow || false,
        deny: !opaDecision.allow || false,
        violations: opaDecision.violations || [],
        recommendations: opaDecision.recommendations || [],
        metadata: {
          policy: 'intelgraph.ci.governance',
          version: '1.0.0',
          evaluationTime: Date.now() - startTime,
          appliedRules: this.extractAppliedRules(opaDecision)
        }
      };

      // Apply additional privacy-specific logic
      if (classification.personalData || classification.sensitiveData) {
        const privacyDecision = await this.privacyReasoner.evaluatePolicy(operation);
        decision.allow = decision.allow && privacyDecision.allowed;

        if (!privacyDecision.allowed) {
          decision.violations.push({
            type: 'privacy_violation',
            message: privacyDecision.reason,
            severity: classification.sensitiveData ? 'critical' : 'high'
          });
        }
      }

      // Cache the decision
      this.policyCache.set(cacheKey, {
        decision,
        timestamp: Date.now()
      });

      // Clean up old cache entries
      this.cleanupCache();

      logger.info('Policy evaluation completed', {
        tenantId: operation.context.tenantId,
        operationType: operation.type,
        allowed: decision.allow,
        violations: decision.violations.length,
        evaluationTime: decision.metadata.evaluationTime
      });

      return decision;

    } catch (error) {
      logger.error('Policy evaluation failed:', error);

      // Fail secure - deny by default
      return {
        allow: false,
        deny: true,
        violations: [{
          type: 'policy_evaluation_error',
          message: 'Policy evaluation failed - defaulting to deny',
          severity: 'critical'
        }],
        recommendations: [{
          priority: 'high',
          action: 'Review policy configuration and OPA connectivity',
          details: error instanceof Error ? error.message : 'Unknown error'
        }],
        metadata: {
          policy: 'error',
          version: '1.0.0',
          evaluationTime: Date.now() - startTime,
          appliedRules: []
        }
      };
    }
  }

  /**
   * Evaluate CI/CD governance gates specifically
   */
  async evaluateCIGates(
    services: any[],
    workflows: any[],
    gates: {
      slo_burn?: {
        enabled: boolean;
        thresholds: Record<string, Record<string, number>>;
        burn_rates: Record<string, Record<string, number>>;
      };
      sbom_diff?: {
        enabled: boolean;
        new_high: number;
        new_critical: number;
      };
      webauthn?: {
        enabled: boolean;
        coverage_percent: number;
        min_percent: number;
      };
    }
  ): Promise<PolicyDecision> {
    try {
      const input = {
        services,
        workflows,
        workflow_files: workflows.map(w => w.path),
        gates
      };

      const opaDecision = await this.callOPA('data.intelgraph.ci.governance', input);

      return {
        allow: opaDecision.allow || false,
        deny: !opaDecision.allow || false,
        violations: opaDecision.violations || [],
        recommendations: opaDecision.recommendations || [],
        metadata: {
          policy: 'intelgraph.ci.governance',
          version: '1.0.0',
          evaluationTime: 0,
          appliedRules: this.extractAppliedRules(opaDecision)
        }
      };

    } catch (error) {
      logger.error('CI gates evaluation failed:', error);
      throw error;
    }
  }

  /**
   * Build OPA policy input
   */
  private async buildPolicyInput(
    operation: any,
    classification: any,
    licenseCheck: any,
    usageStats: any,
    gateOptions?: any
  ): Promise<PolicyInput> {
    const input: PolicyInput = {
      operation: {
        type: operation.type,
        data: this.sanitizeDataForPolicy(operation.data),
        context: operation.context
      },
      classification,
      license: {
        type: licenseCheck.licenseInfo.type,
        tier: licenseCheck.licenseInfo.tier,
        restrictions: [],
        permissions: []
      },
      usage: {
        current: {
          api_calls: usageStats.apiCalls,
          exports: usageStats.exports,
          bulk_operations: usageStats.bulkOperations,
          data_volume: usageStats.dataVolume
        },
        limits: usageStats.limits
      }
    };

    // Add gate configurations if provided
    if (gateOptions) {
      input.gates = {};

      if (gateOptions.enableSLOBurn && gateOptions.metrics?.slo) {
        input.gates.slo_burn = {
          enabled: true,
          thresholds: gateOptions.metrics.slo.thresholds || {
            p95: { '1h': 0.02, '6h': 0.05 },
            p99: { '1h': 0.01, '6h': 0.03 }
          },
          burn_rates: gateOptions.metrics.slo.burn_rates || {
            p95: { '1h': 0.0, '6h': 0.0 },
            p99: { '1h': 0.0, '6h': 0.0 }
          }
        };
      }

      if (gateOptions.enableSBOMDiff && gateOptions.metrics?.sbom) {
        input.gates.sbom_diff = {
          enabled: true,
          new_high: gateOptions.metrics.sbom.new_high || 0,
          new_critical: gateOptions.metrics.sbom.new_critical || 0
        };
      }

      if (gateOptions.enableWebAuthnCoverage && gateOptions.metrics?.webauthn) {
        input.gates.webauthn = {
          enabled: true,
          coverage_percent: gateOptions.metrics.webauthn.coverage_percent || 0,
          min_percent: gateOptions.metrics.webauthn.min_percent || 80
        };
      }
    }

    return input;
  }

  /**
   * Call OPA service with policy input
   */
  private async callOPA(policyPath: string, input: any): Promise<any> {
    const url = `${this.opaClient.url}/v1/data/${policyPath.replace(/\./g, '/')}`;

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.opaClient.retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.opaClient.timeout);

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ input }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`OPA request failed: ${response.status} ${response.statusText}`);
        }

        const result = await response.json();

        logger.debug('OPA evaluation completed', {
          policyPath,
          attempt,
          resultKeys: Object.keys(result.result || {})
        });

        return result.result || {};

      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown OPA error');
        logger.warn(`OPA attempt ${attempt} failed:`, lastError.message);

        if (attempt < this.opaClient.retries) {
          // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      }
    }

    throw new Error(`OPA evaluation failed after ${this.opaClient.retries} attempts: ${lastError?.message}`);
  }

  /**
   * Helper methods
   */
  private generateCacheKey(operation: any, gateOptions?: any): string {
    const keyData = {
      type: operation.type,
      tenantId: operation.context.tenantId,
      purpose: operation.context.purpose.sort(),
      dataHash: this.hashObject(operation.data),
      gates: gateOptions ? this.hashObject(gateOptions) : 'none'
    };

    return Buffer.from(JSON.stringify(keyData)).toString('base64').substring(0, 32);
  }

  private hashObject(obj: any): string {
    return Buffer.from(JSON.stringify(obj)).toString('base64').substring(0, 16);
  }

  private sanitizeDataForPolicy(data: any): any {
    // Remove sensitive data that doesn't need to be sent to OPA
    const sanitized = JSON.parse(JSON.stringify(data));

    // Remove large binary data
    this.removeLargeValues(sanitized, 1000); // Remove values > 1KB

    return sanitized;
  }

  private removeLargeValues(obj: any, maxSize: number): void {
    if (typeof obj !== 'object' || obj === null) return;

    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string' && value.length > maxSize) {
        obj[key] = `[LARGE_VALUE_${value.length}_BYTES]`;
      } else if (typeof value === 'object') {
        this.removeLargeValues(value, maxSize);
      }
    }
  }

  private mapOperationToLicenseType(operationType: string): 'api_call' | 'export' | 'bulk_operation' | 'analytics' {
    switch (operationType) {
      case 'export':
      case 'share':
        return 'export';
      case 'read':
        return 'api_call';
      case 'write':
      case 'delete':
        return 'bulk_operation';
      default:
        return 'api_call';
    }
  }

  private calculateDataVolume(data: any): number {
    try {
      return JSON.stringify(data).length;
    } catch {
      return 0;
    }
  }

  private extractAppliedRules(opaDecision: any): string[] {
    const rules: string[] = [];

    // Extract rule information from OPA decision
    if (opaDecision.violations) {
      rules.push(...opaDecision.violations.map((v: any) => v.type));
    }

    if (opaDecision.summary) {
      rules.push('summary_evaluation');
    }

    return rules;
  }

  private cleanupCache(): void {
    const now = Date.now();
    const maxAge = 600000; // 10 minutes

    for (const [key, entry] of this.policyCache.entries()) {
      if (now - entry.timestamp > maxAge) {
        this.policyCache.delete(key);
      }
    }

    // Keep cache size reasonable
    if (this.policyCache.size > 1000) {
      const entries = Array.from(this.policyCache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);

      // Remove oldest 100 entries
      for (let i = 0; i < 100; i++) {
        this.policyCache.delete(entries[i][0]);
      }
    }
  }

  /**
   * Get policy decision explanation
   */
  async explainDecision(
    operation: any,
    decision: PolicyDecision
  ): Promise<{
    summary: string;
    reasons: string[];
    recommendations: string[];
    details: Record<string, any>;
  }> {
    const summary = decision.allow
      ? 'Operation allowed by policy'
      : `Operation denied: ${decision.violations.map(v => v.message).join(', ')}`;

    const reasons: string[] = [];
    if (decision.violations.length > 0) {
      reasons.push(...decision.violations.map(v => `${v.type}: ${v.message}`));
    } else {
      reasons.push('No policy violations detected');
    }

    const recommendations = decision.recommendations.map(r =>
      `${r.priority.toUpperCase()}: ${r.action} - ${r.details}`
    );

    return {
      summary,
      reasons,
      recommendations,
      details: {
        evaluationTime: decision.metadata.evaluationTime,
        policy: decision.metadata.policy,
        appliedRules: decision.metadata.appliedRules,
        operationType: operation.type,
        tenantId: operation.context.tenantId
      }
    };
  }

  /**
   * Test OPA connectivity and policy loading
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    opaConnected: boolean;
    policiesLoaded: boolean;
    responseTime: number;
  }> {
    const startTime = Date.now();

    try {
      // Test basic OPA connectivity
      const healthResponse = await fetch(`${this.opaClient.url}/health`, {
        method: 'GET',
        timeout: 5000
      });

      const opaConnected = healthResponse.ok;

      // Test policy evaluation with minimal input
      let policiesLoaded = false;
      if (opaConnected) {
        try {
          const testInput = {
            services: [],
            workflows: [],
            workflow_files: []
          };

          await this.callOPA('data.intelgraph.ci.governance', testInput);
          policiesLoaded = true;
        } catch (error) {
          logger.warn('Policy test failed:', error);
        }
      }

      const responseTime = Date.now() - startTime;
      const healthy = opaConnected && policiesLoaded;

      return {
        healthy,
        opaConnected,
        policiesLoaded,
        responseTime
      };

    } catch (error) {
      logger.error('OPA health check failed:', error);

      return {
        healthy: false,
        opaConnected: false,
        policiesLoaded: false,
        responseTime: Date.now() - startTime
      };
    }
  }
}

export default OPAPolicyIntegration;