import pino from 'pino';

const log = pino({ name: 'PolicySimulator' });

export interface Policy {
  id: string;
  rules: string[]; // Mock rule: "ALLOW <resource>"
}

export class PolicySimulator {

  public simulateDiff(oldPolicy: Policy, newPolicy: Policy, historicalLogs: Array<Record<string, unknown>>): string {
    let allowedByOld = 0;
    let allowedByNew = 0;
    let newDenials = 0;
    let newAllowances = 0;

    // Simulate evaluation
    // Rule format assumption: "ALLOW <action>"

    for (const logEntry of historicalLogs) {
      const action = logEntry.action || 'unknown';

      const oldDecision = this.evaluate(oldPolicy, action);
      const newDecision = this.evaluate(newPolicy, action);

      if (oldDecision) allowedByOld++;
      if (newDecision) allowedByNew++;

      if (oldDecision && !newDecision) newDenials++;
      if (!oldDecision && newDecision) newAllowances++;
    }

    return `Policy Simulation Diff:
-----------------------
Old Policy Allowed: ${allowedByOld}
New Policy Allowed: ${allowedByNew}
Net Change: ${allowedByNew - allowedByOld}

Impact Analysis:
- New Denials (Regressions): ${newDenials}
- New Allowances (Opened Access): ${newAllowances}
`;
  }

  private evaluate(policy: Policy, action: string): boolean {
    // Simple mock logic: if policy has "ALLOW ALL" or specifically "ALLOW <action>"
    if (policy.rules.includes('ALLOW ALL')) return true;
    return policy.rules.includes(`ALLOW ${action}`);
  }
}
