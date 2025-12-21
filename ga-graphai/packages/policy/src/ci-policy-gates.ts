export type GateName =
  | 'sbom'
  | 'license'
  | 'secrets'
  | 'piiLogging'
  | 'sast'
  | 'dast'
  | 'dependencyHealth';

export type GateSeverity = 'info' | 'low' | 'medium' | 'high' | 'critical';

export interface GateCheck {
  name: GateName;
  status: 'pass' | 'fail';
  severity: GateSeverity;
  details?: string;
}

export interface GateEvaluationResult {
  passed: boolean;
  failures: GateCheck[];
  warnings: GateCheck[];
}

const severityOrder: Record<GateSeverity, number> = {
  info: 0,
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

export interface GatePolicyConfig {
  failAt: GateSeverity;
  requiredGates: GateName[];
}

export class CiPolicyGateEngine {
  private readonly config: GatePolicyConfig;

  constructor(config?: Partial<GatePolicyConfig>) {
    this.config = {
      failAt: config?.failAt ?? 'high',
      requiredGates: config?.requiredGates ?? [
        'sbom',
        'license',
        'secrets',
        'piiLogging',
        'sast',
        'dast',
        'dependencyHealth',
      ],
    };
  }

  evaluate(checks: GateCheck[]): GateEvaluationResult {
    const grouped = new Map<GateName, GateCheck>();
    checks.forEach((check) => grouped.set(check.name, check));

    const failures: GateCheck[] = [];
    const warnings: GateCheck[] = [];

    this.config.requiredGates.forEach((gate) => {
      const check = grouped.get(gate);
      if (!check) {
        failures.push({
          name: gate,
          status: 'fail',
          severity: 'critical',
          details: 'missing gate result',
        });
        return;
      }

      if (check.status === 'fail') {
        failures.push(check);
      } else if (severityOrder[check.severity] >= severityOrder[this.config.failAt]) {
        failures.push(check);
      } else if (check.severity !== 'info') {
        warnings.push(check);
      }
    });

    return {
      passed: failures.length === 0,
      failures,
      warnings,
    };
  }
}
