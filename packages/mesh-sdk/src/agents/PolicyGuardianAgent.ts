/**
 * Policy Guardian Agent
 *
 * Enforces organizational policies across the mesh.
 * Reviews actions and outputs for compliance before execution.
 */

import { BaseAgent, type AgentServices } from '../Agent.js';
import type {
  AgentDescriptor,
  TaskInput,
  TaskOutput,
  PolicyAction,
  PolicyDecision,
  RedactionSpec,
} from '../types.js';

interface PolicyGuardianInput {
  action: 'evaluate' | 'audit' | 'explain';
  content: unknown;
  contentType: string;
  policies?: string[];
  context?: Record<string, unknown>;
}

interface PolicyGuardianOutput {
  decision: PolicyAction;
  reason: string;
  violations: PolicyViolation[];
  redactions?: RedactionSpec[];
  suggestions: string[];
  policyIds: string[];
}

interface PolicyViolation {
  policyId: string;
  policyName: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  path?: string;
}

/**
 * PolicyGuardianAgent evaluates actions and content against organizational policies.
 */
export class PolicyGuardianAgent extends BaseAgent {
  // Built-in policy rules (would be loaded from config in production)
  private readonly policies: PolicyRule[] = [
    {
      id: 'SEC-001',
      name: 'No Secrets in Output',
      description: 'Outputs must not contain secrets, API keys, or credentials',
      severity: 'critical',
      check: (content: string) => {
        const patterns = [
          /api[_-]?key/i,
          /secret[_-]?key/i,
          /password\s*[:=]/i,
          /bearer\s+[a-z0-9]/i,
          /-----BEGIN\s+\w+\s+PRIVATE\s+KEY-----/,
        ];
        return !patterns.some((p) => p.test(content));
      },
    },
    {
      id: 'SEC-002',
      name: 'No PII Exposure',
      description: 'Outputs must not expose personally identifiable information',
      severity: 'high',
      check: (content: string) => {
        const patterns = [
          /\b\d{3}-\d{2}-\d{4}\b/, // SSN
          /\b\d{16}\b/, // Credit card
          /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i, // Email (flag for review)
        ];
        return !patterns.some((p) => p.test(content));
      },
    },
    {
      id: 'SAFE-001',
      name: 'No Harmful Instructions',
      description: 'Outputs must not contain instructions for harmful activities',
      severity: 'critical',
      check: (_content: string) => true, // Would use content classifier
    },
    {
      id: 'CODE-001',
      name: 'No Unsafe Code Patterns',
      description: 'Code outputs must not contain known vulnerable patterns',
      severity: 'high',
      check: (content: string) => {
        const patterns = [
          /eval\s*\(/,
          /exec\s*\(/,
          /innerHTML\s*=/,
          /dangerouslySetInnerHTML/,
          /SELECT\s+\*\s+FROM.*WHERE.*\$\{/i, // SQL injection
        ];
        return !patterns.some((p) => p.test(content));
      },
    },
  ];

  getDescriptor(): Omit<AgentDescriptor, 'id' | 'status' | 'registeredAt' | 'lastHeartbeat'> {
    return {
      name: 'policy-guardian-agent',
      version: '1.0.0',
      role: 'policy_guardian',
      riskTier: 'low',
      capabilities: ['policy_evaluation', 'compliance_audit', 'policy_explanation'],
      requiredTools: [],
      modelPreference: {
        provider: 'anthropic',
        model: 'claude-sonnet-4-5-20250929',
        temperature: 0.0, // Deterministic for policy decisions
        maxTokens: 2048,
      },
      expectedLatencyMs: 1000,
    };
  }

  async onTaskReceived(
    input: TaskInput<PolicyGuardianInput>,
    services: AgentServices
  ): Promise<TaskOutput<PolicyGuardianOutput>> {
    const { task, payload } = input;
    const startTime = Date.now();

    services.logger.info('Policy evaluation started', { taskId: task.id, action: payload.action });

    try {
      switch (payload.action) {
        case 'evaluate':
          return await this.evaluate(task.id, payload, services, startTime);
        case 'audit':
          return await this.audit(task.id, payload, services, startTime);
        case 'explain':
          return await this.explain(task.id, payload, services, startTime);
        default:
          throw new Error(`Unknown action: ${payload.action}`);
      }
    } catch (error) {
      return this.failure(task.id, {
        code: 'POLICY_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
        recoverable: false, // Policy errors should not be retried
      });
    }
  }

  private async evaluate(
    taskId: string,
    payload: PolicyGuardianInput,
    services: AgentServices,
    startTime: number
  ): Promise<TaskOutput<PolicyGuardianOutput>> {
    const contentStr = typeof payload.content === 'string'
      ? payload.content
      : JSON.stringify(payload.content);

    const violations: PolicyViolation[] = [];
    const applicablePolicies = payload.policies
      ? this.policies.filter((p) => payload.policies!.includes(p.id))
      : this.policies;

    // Run rule-based checks
    for (const policy of applicablePolicies) {
      if (!policy.check(contentStr)) {
        violations.push({
          policyId: policy.id,
          policyName: policy.name,
          severity: policy.severity,
          description: policy.description,
        });
      }
    }

    // Use model for nuanced evaluation
    const modelViolations = await this.modelBasedEvaluation(payload, services);
    violations.push(...modelViolations);

    // Determine decision
    const criticalViolations = violations.filter((v) => v.severity === 'critical');
    const highViolations = violations.filter((v) => v.severity === 'high');

    let decision: PolicyAction;
    let reason: string;
    let redactions: RedactionSpec[] | undefined;

    if (criticalViolations.length > 0) {
      decision = 'deny';
      reason = `Critical policy violation: ${criticalViolations[0].policyName}`;
    } else if (highViolations.length > 0) {
      decision = 'allow_with_redactions';
      reason = `High severity violations require redaction`;
      redactions = this.generateRedactions(violations, contentStr);
    } else if (violations.length > 0) {
      decision = 'allow';
      reason = `Minor violations noted but allowed`;
    } else {
      decision = 'allow';
      reason = 'No policy violations detected';
    }

    const suggestions = violations.length > 0
      ? violations.map((v) => `Address ${v.policyId}: ${v.description}`)
      : [];

    return this.success(taskId, {
      decision,
      reason,
      violations,
      redactions,
      suggestions,
      policyIds: applicablePolicies.map((p) => p.id),
    }, {
      latencyMs: Date.now() - startTime,
      modelCallCount: 1,
    });
  }

  private async modelBasedEvaluation(
    payload: PolicyGuardianInput,
    services: AgentServices
  ): Promise<PolicyViolation[]> {
    const prompt = `Evaluate this ${payload.contentType} for policy compliance.

Content:
${typeof payload.content === 'string' ? payload.content : JSON.stringify(payload.content, null, 2)}

Check for:
1. Security issues (secrets, credentials, injection vulnerabilities)
2. Privacy issues (PII, sensitive data)
3. Safety issues (harmful content, instructions for dangerous activities)
4. Quality issues (incomplete, misleading, or incorrect information)

If any violations found, respond with JSON:
{ "violations": [{ "severity": "critical|high|medium|low", "description": "..." }] }

If no violations: { "violations": [] }`;

    const response = await services.model.complete(prompt, { temperature: 0 });
    const jsonMatch = response.content.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      const result = JSON.parse(jsonMatch[0]);
      return (result.violations ?? []).map((v: { severity: string; description: string }, i: number) => ({
        policyId: `MODEL-${i + 1}`,
        policyName: 'Model-detected violation',
        severity: v.severity as PolicyViolation['severity'],
        description: v.description,
      }));
    }

    return [];
  }

  private generateRedactions(violations: PolicyViolation[], _content: string): RedactionSpec[] {
    // Simplified - would do actual path detection in production
    return violations
      .filter((v) => v.severity === 'high' || v.severity === 'critical')
      .map((v) => ({
        path: v.path ?? '$',
        strategy: 'mask' as const,
      }));
  }

  private async audit(
    taskId: string,
    payload: PolicyGuardianInput,
    services: AgentServices,
    startTime: number
  ): Promise<TaskOutput<PolicyGuardianOutput>> {
    // Audit mode: comprehensive review without blocking
    const evalResult = await this.evaluate(taskId, payload, services, startTime);
    if (evalResult.result) {
      evalResult.result.decision = 'allow'; // Audit doesn't block
    }
    return evalResult;
  }

  private async explain(
    taskId: string,
    payload: PolicyGuardianInput,
    services: AgentServices,
    startTime: number
  ): Promise<TaskOutput<PolicyGuardianOutput>> {
    const policyIds = payload.policies ?? this.policies.map((p) => p.id);
    const policies = this.policies.filter((p) => policyIds.includes(p.id));

    const prompt = `Explain these policies in plain language:

${policies.map((p) => `${p.id} - ${p.name}: ${p.description}`).join('\n')}

Provide a clear explanation suitable for developers.`;

    const response = await services.model.complete(prompt);

    return this.success(taskId, {
      decision: 'allow',
      reason: response.content,
      violations: [],
      suggestions: [],
      policyIds,
    }, {
      latencyMs: Date.now() - startTime,
      modelCallCount: 1,
    });
  }
}

interface PolicyRule {
  id: string;
  name: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  check: (content: string) => boolean;
}
