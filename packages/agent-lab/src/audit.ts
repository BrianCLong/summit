import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

import { ContentBoundary } from './contentBoundary';
import { PrincipalChain } from './identity';
import { PolicyDecision } from './policy';

export type AuditEventType = 'attempt' | 'decision' | 'result';

export interface AgentActionDescriptor {
  tool: string;
  action: string;
  target?: string;
}

export interface AgentActionAuditEvent {
  event_type: AuditEventType;
  timestamp: string;
  correlation_id: string;
  principal_chain: PrincipalChain;
  action: AgentActionDescriptor;
  policy_decision?: PolicyDecision & { attribution_missing?: string[]; kill_switch_triggered?: boolean };
  result?: {
    status: 'allowed' | 'denied' | 'error' | 'kill-switch';
    message?: string;
    failure_class?: string;
    output_hash?: string | null;
    redactions?: string[];
  };
  latency_ms?: number;
  inputs_fingerprint?: string;
  notes?: string;
}

export class AuditLogger {
  private readonly filePath: string;

  constructor(runPath: string, private readonly boundary: ContentBoundary) {
    const auditDir = path.join(runPath, 'audit');
    fs.mkdirSync(auditDir, { recursive: true });
    this.filePath = path.join(auditDir, 'events.ndjson');
  }

  record(event: AgentActionAuditEvent, inputs?: Record<string, unknown>, output?: unknown) {
    const copy: AgentActionAuditEvent = { ...event };
    const redactions: string[] = [];

    if (inputs) {
      const bounded = this.boundary.markUntrusted(inputs);
      copy.inputs_fingerprint = crypto.createHash('sha256').update(bounded.text).digest('hex');
      redactions.push(...bounded.redactions);
    }

    if (output !== undefined) {
      const bounded = this.boundary.markUntrusted(output);
      copy.result = {
        ...copy.result,
        output_hash: bounded.hash,
        redactions: [...(copy.result?.redactions ?? []), ...bounded.redactions],
      };
      redactions.push(...bounded.redactions);
    }

    if (redactions.length > 0) {
      copy.notes = copy.notes ? `${copy.notes}; redactions:${redactions.join(',')}` : `redactions:${redactions.join(',')}`;
    }

    fs.appendFileSync(this.filePath, `${JSON.stringify(copy)}\n`);
  }
}
