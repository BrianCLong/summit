import crypto from 'node:crypto';
import { Pool } from 'pg';
import { type DocumentTag, type ExportContext, type ExportDecision } from './config.js';

export interface AuditReceipt {
  id: string;
  documentId: string;
  actor: string;
  action: 'tag.applied' | 'tag.downgraded' | 'export.allowed' | 'export.blocked';
  payload: Record<string, unknown>;
  createdAt: Date;
}

export class AuditReceiptService {
  constructor(private readonly pool: Pool) {}

  async record(receipt: AuditReceipt): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query(
        `INSERT INTO chm.audit_receipts (id, document_id, actor, action, payload, created_at)
         VALUES ($1, $2, $3, $4, $5, $6)`
          , [
            receipt.id,
            receipt.documentId,
            receipt.actor,
            receipt.action,
            JSON.stringify(receipt.payload),
            receipt.createdAt.toISOString()
          ]
      );
    } finally {
      client.release();
    }
  }

  async recordExport(documentId: string, context: ExportContext, decision: ExportDecision) {
    const receipt: AuditReceipt = {
      id: crypto.randomUUID(),
      documentId,
      actor: context.actorId,
      action: decision.allowed ? 'export.allowed' : 'export.blocked',
      payload: { context, decision },
      createdAt: new Date()
    };
    await this.record(receipt);
    return receipt;
  }

  async recordTag(tag: DocumentTag, action: 'tag.applied' | 'tag.downgraded', actor: string) {
    const receipt: AuditReceipt = {
      id: crypto.randomUUID(),
      documentId: tag.documentId,
      actor,
      action,
      payload: tag as Record<string, unknown>,
      createdAt: new Date()
    };
    await this.record(receipt);
    return receipt;
  }
}
