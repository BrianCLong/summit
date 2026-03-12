import { createHash } from 'node:crypto';

export interface DisclosurePack {
  metadata: {
    pack_id: string;
    timestamp: string;
    actor: string;
    case_id?: string;
  };
  request: {
    query_definition: string;
    reason: string;
  };
  artifacts: {
    dataset_snapshot_hash: string;
    sbom_refs: string[];
    provenance_refs: string[];
  };
  policy: {
    decision: 'allow' | 'deny';
    rules_evaluated: string[];
    decision_id: string;
  };
  content: any[];
}

export class DisclosurePackager {
  private actor: string;
  private auditLog: any[] = [];

  constructor(actor: string) {
    this.actor = actor;
  }

  private logAudit(action: string, status: string, reason: string, packId?: string) {
    const entry = {
      timestamp: new Date().toISOString(),
      actor: this.actor,
      action,
      status,
      reason,
      pack_id: packId,
    };
    this.auditLog.push(entry);
    console.log(`[AUDIT] ${JSON.stringify(entry)}`);
  }

  public applyRedaction(data: any[], policyTags: Record<string, string>): any[] {
    return data.map(item => {
      const redactedItem = { ...item };
      if (redactedItem.properties) {
        for (const [field, value] of Object.entries(redactedItem.properties)) {
          const tag = policyTags[field];
          if (tag === 'PII' || tag === 'SENSITIVE') {
            redactedItem.properties[field] = '[REDACTED]';
          }
        }
      }
      return redactedItem;
    });
  }

  public generatePack(
    query: string,
    data: any[],
    policyDecision: any,
    caseId?: string,
    policyTags: Record<string, string> = {}
  ): DisclosurePack | null {
    if (!policyDecision.allow) {
      this.logAudit('export_pack', 'deny', policyDecision.reason || 'Policy evaluation failed');
      return null;
    }

    const redactedData = this.applyRedaction(data, policyTags);
    const timestamp = new Date().toISOString();
    const packId = `DP-${createHash('md5').update(timestamp + this.actor).digest('hex').substring(0, 8).toUpperCase()}`;

    // Calculate hash of the data snapshot
    const dataHash = createHash('sha256').update(JSON.stringify(data)).digest('hex');

    const pack = {
      metadata: {
        pack_id: packId,
        timestamp,
        actor: this.actor,
        case_id: caseId,
      },
      request: {
        query_definition: query,
        reason: 'Authorized disclosure request',
      },
      artifacts: {
        dataset_snapshot_hash: dataHash,
        sbom_refs: ['sbom-latest.json'],
        provenance_refs: data.map(item => item.lineage?.tx_id).filter(Boolean),
      },
      policy: {
        decision: (policyDecision.allow ? 'allow' : 'deny') as 'allow' | 'deny',
        rules_evaluated: policyDecision.rules || [],
        decision_id: policyDecision.id || 'unknown',
      },
      content: redactedData,
    };

    this.logAudit('export_pack', 'allow', 'Policy evaluation succeeded', packId);
    return pack as DisclosurePack;
  }

  public getAuditLog(): any[] {
    return this.auditLog;
  }
}
