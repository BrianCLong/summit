export interface CogWarOperation {
  id: string;
  isAiGenerated: boolean;
  hasHumanReview: boolean;
  riskLevel: number;
  approvals: string[];
  attributionChain: string[];
}

export interface Warning {
  rule_id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  remediation: string;
}

export interface PolicyResult {
  allowed: boolean;
  warnings: Warning[];
}

export interface LogEntry {
  timestamp: string;
  operationId: string;
  result: PolicyResult;
}

export class CogWarPolicyEngine {
  private auditLog: LogEntry[] = [];

  public evaluate(operation: CogWarOperation): PolicyResult {
    let allowed = true;
    const warnings: Warning[] = [];

    // Rule 1: No AI-generated content may be published without human review flag.
    if (operation.isAiGenerated && !operation.hasHumanReview) {
      allowed = false;
      warnings.push({
        rule_id: 'CW_RULE_001',
        severity: 'critical',
        remediation: 'Flag the operation for human review before proceeding.',
      });
    } else if (operation.isAiGenerated && operation.hasHumanReview) {
       // Near miss: AI generated content was reviewed, note it in warnings for audit
       warnings.push({
        rule_id: 'CW_RULE_001_NEAR_MISS',
        severity: 'low',
        remediation: 'Monitor the quality of human reviews on AI-generated content.',
       });
    }

    // Rule 2: Operations above risk_level 7 require dual approval.
    if (operation.riskLevel > 7 && operation.approvals.length < 2) {
      allowed = false;
      warnings.push({
        rule_id: 'CW_RULE_002',
        severity: 'high',
        remediation: `Obtain at least 2 approvals for operations with risk level ${operation.riskLevel}. Currently have ${operation.approvals.length}.`,
      });
    } else if (operation.riskLevel === 7 && operation.approvals.length < 2) {
      // Near miss: risk level is exactly 7, approaching the threshold
      warnings.push({
        rule_id: 'CW_RULE_002_NEAR_MISS',
        severity: 'medium',
        remediation: `Consider obtaining a second approval. Risk level is at the threshold (7).`,
      });
    }

    // Rule 3: All outputs must include attribution chain.
    if (!operation.attributionChain || operation.attributionChain.length === 0) {
      allowed = false;
      warnings.push({
        rule_id: 'CW_RULE_003',
        severity: 'high',
        remediation: 'Provide a valid attribution chain.',
      });
    }

    const result: PolicyResult = { allowed, warnings };

    this.auditLog.push({
      timestamp: new Date().toISOString(),
      operationId: operation.id,
      result,
    });

    return result;
  }

  public getAuditLog(): LogEntry[] {
    return this.auditLog;
  }
}
