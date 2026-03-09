import { AuditEvent, calculateAuditHash } from '../domain/audit.js';

export interface DecisionRequest {
  tenantId: string;
  actorId: string;
  kind: 'FlowStart' | 'ToolInvoke' | 'JobStart';
  resource: string;
  context?: Record<string, any>;
}

export interface DecisionResponse {
  decision: 'allow' | 'deny';
  reasons: string[];
  policyVersion: string;
  auditEventId: string;
}

export class PDPService {
  async decide(request: DecisionRequest): Promise<DecisionResponse> {
    const { tenantId, actorId, kind, resource } = request;
    const reasons: string[] = [];
    let decision: 'allow' | 'deny' = 'allow';
    const policyVersion = 'v1.0.0';
    const auditEventId = `audit-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;

    if (resource.includes('forbidden')) {
      decision = 'deny';
      reasons.push('Resource is explicitly forbidden by policy');
    }

    if (request.context?.cost && request.context.cost > 1000) {
      decision = 'deny';
      reasons.push('Budget exceeded for this operation');
    }

    const auditEvent: AuditEvent = {
      id: auditEventId,
      timestamp: new Date(),
      actorId,
      tenantId,
      action: kind,
      resource,
      decision,
      policyVersion,
      reason: reasons.join(', '),
      hash: '',
    };
    auditEvent.hash = calculateAuditHash(auditEvent);

    return {
      decision,
      reasons,
      policyVersion,
      auditEventId,
    };
  }
}
