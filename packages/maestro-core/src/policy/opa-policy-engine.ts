/**
 * OPA (Open Policy Agent) Policy Engine Implementation
 * Provides ABAC authorization with explainable decisions
 */

import axios, { AxiosInstance } from 'axios';
import { PolicyEngine } from '../engine';

export interface OPAPolicyEngineConfig {
  opaUrl: string;
  packageName: string;
  timeout?: number;
  apiKey?: string;
}

export interface PolicyDecision {
  allowed: boolean;
  reason?: string;
  explainability?: {
    trace: Array<{
      op: string;
      query: string;
      locals: Record<string, any>;
      result: any;
    }>;
    metrics: {
      timer_rego_external_resolve_ns: number;
      timer_rego_query_eval_ns: number;
      timer_server_handler_ns: number;
    };
  };
}

export class OPAPolicyEngine implements PolicyEngine {
  private client: AxiosInstance;
  private packageName: string;

  constructor(config: OPAPolicyEngineConfig) {
    this.packageName = config.packageName;

    this.client = axios.create({
      baseURL: config.opaUrl,
      timeout: config.timeout || 5000,
      headers: {
        'Content-Type': 'application/json',
        ...(config.apiKey && { Authorization: `Bearer ${config.apiKey}` }),
      },
    });
  }

  async check(
    action: string,
    subject: string,
    attributes: Record<string, any>,
  ): Promise<{ allowed: boolean; reason?: string }> {
    try {
      const input = {
        action,
        subject,
        attributes: {
          ...attributes,
          timestamp: new Date().toISOString(),
          source: 'maestro-orchestrator',
        },
      };

      // Query OPA with explainability enabled
      const response = await this.client.post(
        `/v1/data/${this.packageName}/allow`,
        {
          input,
        },
        {
          params: {
            explain: 'full',
            metrics: true,
          },
        },
      );

      const decision: PolicyDecision = response.data;

      // If decision is explicit boolean
      if (typeof decision.result === 'boolean') {
        return {
          allowed: decision.result,
          reason: decision.result
            ? undefined
            : this.extractDenialReason(decision),
        };
      }

      // If decision is object with allow field
      if (decision.result && typeof decision.result.allow === 'boolean') {
        return {
          allowed: decision.result.allow,
          reason: decision.result.allow
            ? undefined
            : decision.result.reason || this.extractDenialReason(decision),
        };
      }

      // Default to deny if unclear
      return {
        allowed: false,
        reason: 'Policy evaluation returned unclear result',
      };
    } catch (error) {
      console.error('Policy check failed:', error);

      // In case of policy engine failure, default behavior depends on configuration
      // For security-critical systems, fail closed (deny)
      return {
        allowed: false,
        reason: `Policy engine unavailable: ${(error as Error).message}`,
      };
    }
  }

  async checkBatch(
    checks: Array<{
      action: string;
      subject: string;
      attributes: Record<string, any>;
    }>,
  ): Promise<Array<{ allowed: boolean; reason?: string }>> {
    try {
      const inputs = checks.map((check) => ({
        action: check.action,
        subject: check.subject,
        attributes: {
          ...check.attributes,
          timestamp: new Date().toISOString(),
          source: 'maestro-orchestrator',
        },
      }));

      // Batch query to OPA
      const response = await this.client.post(
        `/v1/data/${this.packageName}/batch_allow`,
        {
          inputs,
        },
      );

      const results = response.data.result;

      if (!Array.isArray(results)) {
        throw new Error('Batch policy check returned non-array result');
      }

      return results.map((result: any, index: number) => {
        if (typeof result === 'boolean') {
          return {
            allowed: result,
            reason: result ? undefined : `Policy denied batch check ${index}`,
          };
        }

        if (result && typeof result.allow === 'boolean') {
          return {
            allowed: result.allow,
            reason: result.allow ? undefined : result.reason,
          };
        }

        return {
          allowed: false,
          reason: `Batch policy check ${index} returned unclear result`,
        };
      });
    } catch (error) {
      console.error('Batch policy check failed:', error);

      // Return denials for all checks
      return checks.map((_, index) => ({
        allowed: false,
        reason: `Batch policy check failed: ${(error as Error).message}`,
      }));
    }
  }

  async validatePolicy(
    policy: string,
  ): Promise<{ valid: boolean; errors?: string[] }> {
    try {
      const response = await this.client.put('/v1/policies/validation', {
        policy,
      });

      return {
        valid: response.status === 200,
        errors: response.data.errors,
      };
    } catch (error: any) {
      return {
        valid: false,
        errors: [error.response?.data?.message || error.message],
      };
    }
  }

  async getPolicyInfo(): Promise<{
    version: string;
    policies: string[];
    health: 'healthy' | 'unhealthy';
  }> {
    try {
      const [healthResponse, policiesResponse] = await Promise.all([
        this.client.get('/health'),
        this.client.get('/v1/policies'),
      ]);

      return {
        version: healthResponse.data.version || 'unknown',
        policies: Object.keys(policiesResponse.data.result || {}),
        health: healthResponse.status === 200 ? 'healthy' : 'unhealthy',
      };
    } catch (error) {
      return {
        version: 'unknown',
        policies: [],
        health: 'unhealthy',
      };
    }
  }

  private extractDenialReason(decision: PolicyDecision): string {
    // Try to extract meaningful denial reason from trace
    if (decision.explainability?.trace) {
      const failedRule = decision.explainability.trace
        .filter((step) => step.op === 'eval' && step.result === false)
        .pop();

      if (failedRule) {
        return `Rule failed: ${failedRule.query}`;
      }
    }

    return 'Access denied by policy';
  }
}

// Example policy templates for common Maestro use cases
export const MAESTRO_POLICY_TEMPLATES = {
  // Workflow execution policy
  workflow_execution: `
package maestro.workflow

default allow = false

# Allow workflow execution based on tenant permissions
allow {
    input.action == "workflow:execute"
    tenant_can_execute_workflow
}

tenant_can_execute_workflow {
    input.attributes.tenant_id
    input.attributes.workflow
    input.attributes.environment
    
    # Check tenant limits
    tenant_within_limits
    
    # Check environment permissions
    environment_allowed
    
    # Check workflow permissions
    workflow_allowed
}

tenant_within_limits {
    # Budget check
    input.attributes.budget.max_cost_usd <= data.tenants[input.subject].max_budget_usd
    
    # Concurrent run check  
    count(data.active_runs[input.subject]) < data.tenants[input.subject].max_concurrent_runs
}

environment_allowed {
    input.attributes.environment in data.tenants[input.subject].allowed_environments
}

workflow_allowed {
    input.attributes.workflow in data.tenants[input.subject].allowed_workflows
}
`,

  // Step execution policy
  step_execution: `
package maestro.step

default allow = false

allow {
    input.action == "step:execute"
    step_execution_allowed
}

step_execution_allowed {
    input.attributes.step.plugin in data.plugins.allowed
    
    # Plugin-specific policies
    plugin_policy_satisfied
    
    # Resource limits
    within_resource_limits
}

plugin_policy_satisfied {
    input.attributes.step.plugin == "litellm"
    input.attributes.step.config.model in data.plugins.litellm.allowed_models
}

plugin_policy_satisfied {
    input.attributes.step.plugin == "web_scraper"
    input.attributes.step.config.url
    not starts_with(input.attributes.step.config.url, "http://localhost")
    not contains(input.attributes.step.config.url, "internal")
}

within_resource_limits {
    input.attributes.step.timeout_ms <= data.limits.max_step_timeout_ms
    input.attributes.estimated_cost_usd <= data.limits.max_step_cost_usd
}
`,
};
