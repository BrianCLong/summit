import { Pool } from 'pg';
import * as crypto from 'crypto';

export interface Receipt {
  id?: string;
  tenantId: string;
  actionType: string;
  actionId: string;
  actorId: string;
  requestHash: string;
  policyBundleHash: string;
  policyDecision: any;
  approvals: any[];
  artifacts: any[];
  result: 'SUCCESS' | 'FAILURE' | 'DENIED';
  errorCode?: string;
  costTags: any;
  signature: string;
  signingKeyId: string;
  occurredAt?: Date;
}

export class ReceiptService {
  private privateKey: string;
  private keyId: string = 'summit-master-v1';

  constructor(private db: Pool) {
    this.privateKey = process.env.SIGNING_PRIVATE_KEY || this.generateDummyKey();
  }

  private generateDummyKey(): string {
     return crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
    }).privateKey;
  }

  async createReceipt(input: Omit<Receipt, 'id' | 'signature' | 'signingKeyId' | 'occurredAt'>): Promise<Receipt> {
    const payload = JSON.stringify({
      tenantId: input.tenantId,
      actionType: input.actionType,
      actionId: input.actionId,
      actorId: input.actorId,
      requestHash: input.requestHash,
      policyDecision: input.policyDecision,
      result: input.result,
      timestamp: new Date().toISOString()
    });

    const signature = crypto.sign('sha256', Buffer.from(payload), {
      key: this.privateKey,
      padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
    }).toString('hex');

    const query = \`
      INSERT INTO companyos.receipts (
        tenant_id, action_type, action_id, actor_id, request_hash,
        policy_bundle_hash, policy_decision, approvals, artifacts,
        result, error_code, cost_tags, signature, signing_key_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *
    \`;

    const values = [
      input.tenantId, input.actionType, input.actionId, input.actorId,
      input.requestHash, input.policyBundleHash, JSON.stringify(input.policyDecision),
      JSON.stringify(input.approvals), JSON.stringify(input.artifacts),
      input.result, input.errorCode || null, JSON.stringify(input.costTags),
      signature, this.keyId
    ];

    const res = await this.db.query(query, values);
    return this.mapRowToReceipt(res.rows[0]);
  }

  async getReceipt(id: string): Promise<Receipt | null> {
    const res = await this.db.query('SELECT * FROM companyos.receipts WHERE id = $1', [id]);
    return res.rows[0] ? this.mapRowToReceipt(res.rows[0]) : null;
  }

  async listReceipts(filters: { tenantId?: string, actorId?: string, actionType?: string }): Promise<Receipt[]> {
    let query = 'SELECT * FROM companyos.receipts WHERE 1=1';
    const values: any[] = [];
    let idx = 1;
    if (filters.tenantId) {
       query += \` AND tenant_id = $\${idx++}\`;
       values.push(filters.tenantId);
    }
    if (filters.actorId) {
       query += \` AND actor_id = $\${idx++}\`;
       values.push(filters.actorId);
    }
    if (filters.actionType) {
       query += \` AND action_type = $\${idx++}\`;
       values.push(filters.actionType);
    }
    query += ' ORDER BY occurred_at DESC LIMIT 100';
    const res = await this.db.query(query, values);
    return res.rows.map((row: any) => this.mapRowToReceipt(row));
  }

  private mapRowToReceipt(row: any): Receipt {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      actionType: row.action_type,
      actionId: row.action_id,
      actorId: row.actor_id,
      requestHash: row.request_hash,
      policyBundleHash: row.policy_bundle_hash,
      policyDecision: row.policy_decision,
      approvals: row.approvals,
      artifacts: row.artifacts,
      result: row.result,
      errorCode: row.error_code,
      costTags: row.cost_tags,
      signature: row.signature,
      signingKeyId: row.signing_key_id,
      occurredAt: row.occurred_at
    };
  }
}
