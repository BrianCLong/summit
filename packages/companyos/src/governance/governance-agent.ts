import { OpaClient } from './opa-client.js';

export interface EnforcementResult {
  allowed: boolean;
  reason?: string;
  auditId: string;
}

export interface AuditLogger {
  log(event: Record<string, unknown>): string;
}

export class GovernanceAgent {
  constructor(
    private opaClient: OpaClient,
    private auditLogger: AuditLogger
  ) {}

  async enforce(
    actorId: string,
    action: string,
    resource: string,
    context: unknown
  ): Promise<EnforcementResult> {
    const policy = 'governance.allow';
    const input = { actorId, action, resource, context };

    const result = await this.opaClient.evaluate(policy, input);

    const auditId = this.auditLogger.log({
      actorId,
      action,
      resource,
      outcome: result.allow ? 'success' : 'failure',
      policyDecision: result,
      timestamp: new Date().toISOString()
    });

    return {
      allowed: result.allow,
      reason: result.reason,
      auditId
    };
  }
}
