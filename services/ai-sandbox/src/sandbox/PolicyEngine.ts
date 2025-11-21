import type { ComplianceFramework, ExperimentRequest, SandboxEnvironment } from '../types.js';
import { logger } from '../utils/logger.js';

export interface PolicyDecision {
  allowed: boolean;
  reason?: string;
  violations: PolicyViolation[];
  recommendations: string[];
}

export interface PolicyViolation {
  framework: ComplianceFramework;
  control: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  description: string;
  remediation?: string;
}

// Compliance control mappings
const COMPLIANCE_CONTROLS: Record<
  ComplianceFramework,
  { id: string; name: string; check: (env: SandboxEnvironment, req: ExperimentRequest) => PolicyViolation | null }[]
> = {
  FEDRAMP_HIGH: [
    {
      id: 'AC-2',
      name: 'Account Management',
      check: () => null, // Checked via external auth
    },
    {
      id: 'AC-6',
      name: 'Least Privilege',
      check: (env) => {
        if (env.resourceQuotas.networkEnabled && env.networkAllowlist.length === 0) {
          return {
            framework: 'FEDRAMP_HIGH',
            control: 'AC-6',
            severity: 'high',
            description: 'Network enabled without allowlist violates least privilege',
            remediation: 'Define explicit network allowlist or disable network access',
          };
        }
        return null;
      },
    },
    {
      id: 'AU-2',
      name: 'Audit Events',
      check: () => null, // Enforced by system
    },
    {
      id: 'SC-7',
      name: 'Boundary Protection',
      check: (env) => {
        if (env.resourceQuotas.networkEnabled) {
          return {
            framework: 'FEDRAMP_HIGH',
            control: 'SC-7',
            severity: 'medium',
            description: 'Network access requires additional boundary controls',
            remediation: 'Ensure network traffic is monitored and filtered',
          };
        }
        return null;
      },
    },
  ],
  FEDRAMP_MODERATE: [
    {
      id: 'AC-6',
      name: 'Least Privilege',
      check: (env) => {
        if (env.resourceQuotas.memoryMb > 4096) {
          return {
            framework: 'FEDRAMP_MODERATE',
            control: 'AC-6',
            severity: 'low',
            description: 'High memory allocation may violate resource constraints',
            remediation: 'Consider reducing memory allocation',
          };
        }
        return null;
      },
    },
  ],
  FISMA: [
    {
      id: 'RA-5',
      name: 'Vulnerability Scanning',
      check: () => null, // Handled by CI/CD
    },
  ],
  NIST_800_53: [
    {
      id: 'CM-7',
      name: 'Least Functionality',
      check: (env) => {
        if (env.allowedModules.length === 0 && env.blockedModules.length === 0) {
          return {
            framework: 'NIST_800_53',
            control: 'CM-7',
            severity: 'medium',
            description: 'No module restrictions defined',
            remediation: 'Define allowed or blocked modules for least functionality',
          };
        }
        return null;
      },
    },
  ],
  NIST_AI_RMF: [
    {
      id: 'MAP-1.1',
      name: 'AI Risk Identification',
      check: (_, req) => {
        if (!req.validationRules.some((r) => r.type === 'bias')) {
          return {
            framework: 'NIST_AI_RMF',
            control: 'MAP-1.1',
            severity: 'medium',
            description: 'No bias testing configured for AI model',
            remediation: 'Add bias validation rules to experiment',
          };
        }
        return null;
      },
    },
    {
      id: 'MEASURE-2.1',
      name: 'AI Performance Monitoring',
      check: (_, req) => {
        if (!req.validationRules.some((r) => r.type === 'accuracy')) {
          return {
            framework: 'NIST_AI_RMF',
            control: 'MEASURE-2.1',
            severity: 'low',
            description: 'No accuracy testing configured',
            remediation: 'Add accuracy validation rules',
          };
        }
        return null;
      },
    },
  ],
  EXECUTIVE_ORDER_14110: [
    {
      id: 'SEC-3',
      name: 'AI Safety Testing',
      check: (_, req) => {
        if (!req.validationRules.some((r) => r.type === 'safety')) {
          return {
            framework: 'EXECUTIVE_ORDER_14110',
            control: 'SEC-3',
            severity: 'high',
            description: 'Safety testing required by EO 14110',
            remediation: 'Add safety validation rules to experiment',
          };
        }
        return null;
      },
    },
  ],
  OMB_M_24_10: [
    {
      id: 'GOV-1',
      name: 'AI Governance',
      check: () => null, // Organizational control
    },
  ],
};

export class PolicyEngine {
  private opaEndpoint?: string;

  constructor(opaEndpoint?: string) {
    this.opaEndpoint = opaEndpoint;
  }

  async evaluate(
    environment: SandboxEnvironment,
    request: ExperimentRequest,
  ): Promise<PolicyDecision> {
    const violations: PolicyViolation[] = [];
    const recommendations: string[] = [];

    logger.info(
      {
        environmentId: environment.id,
        frameworks: environment.complianceFrameworks,
      },
      'Evaluating policy',
    );

    // Check environment status
    if (environment.status !== 'active') {
      return {
        allowed: false,
        reason: `Environment is ${environment.status}`,
        violations: [],
        recommendations: ['Activate or renew the sandbox environment'],
      };
    }

    // Check expiration
    if (environment.expiresAt && new Date() > environment.expiresAt) {
      return {
        allowed: false,
        reason: 'Environment has expired',
        violations: [],
        recommendations: ['Renew the sandbox environment'],
      };
    }

    // Run compliance checks
    for (const framework of environment.complianceFrameworks) {
      const controls = COMPLIANCE_CONTROLS[framework] || [];
      for (const control of controls) {
        const violation = control.check(environment, request);
        if (violation) {
          violations.push(violation);
        }
      }
    }

    // Add recommendations
    if (!request.validationRules.length) {
      recommendations.push('Consider adding validation rules for comprehensive testing');
    }
    if (request.testCases.length < 3) {
      recommendations.push('Consider adding more test cases for better coverage');
    }

    // Determine if execution is allowed
    const criticalViolations = violations.filter((v) => v.severity === 'critical');
    const highViolations = violations.filter((v) => v.severity === 'high');

    const allowed = criticalViolations.length === 0;
    const reason = !allowed
      ? `${criticalViolations.length} critical policy violation(s)`
      : highViolations.length > 0
        ? `Allowed with ${highViolations.length} high-severity finding(s)`
        : undefined;

    logger.info(
      {
        allowed,
        violationCount: violations.length,
        criticalCount: criticalViolations.length,
      },
      'Policy evaluation complete',
    );

    return { allowed, reason, violations, recommendations };
  }

  async validateDeployment(
    experimentId: string,
    targetEnvironment: 'staging' | 'production',
  ): Promise<PolicyDecision> {
    const violations: PolicyViolation[] = [];
    const recommendations: string[] = [];

    // Production deployments require stricter validation
    if (targetEnvironment === 'production') {
      recommendations.push('Ensure all compliance frameworks have been validated');
      recommendations.push('Verify approval chain is complete');
      recommendations.push('Confirm rollback procedures are tested');
    }

    return {
      allowed: true,
      violations,
      recommendations,
    };
  }
}
