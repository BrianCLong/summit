import crypto from 'crypto';
import { config } from '../config.js';
import { logger } from '../utils/logger.js';
import { db } from '../db/database.js';
import type {
  Actor,
  ApprovalRequest,
  DecisionRecord,
  ProvenanceReceipt,
} from '../types.js';

const log = logger.child({ component: 'provenance-client' });

export interface CreateReceiptInput {
  approval_id: string;
  decision_id?: string;
  tenant_id: string;
  actor: Actor;
  action_type: 'created' | 'approve' | 'reject' | 'cancelled';
  policy_version: string;
  input_data: Record<string, unknown>;
  risk_tier?: 'low' | 'medium' | 'high' | 'critical';
  policy_decision_hash?: string;
  pre_state_hash?: string;
  post_state_hash?: string;
  cost_estimate?: {
    currency: string;
    amount: number;
    confidence: number;
  };
}

export class ProvenanceClient {
  private baseUrl: string;
  private enabled: boolean;
  private signingKeyId: string;

  constructor() {
    this.baseUrl = config.provenance.url;
    this.enabled = config.provenance.enabled;
    this.signingKeyId = config.provenance.signingKeyId;
  }

  /**
   * Create a signed receipt for an approval action and store it
   */
  async createReceipt(input: CreateReceiptInput): Promise<ProvenanceReceipt> {
    const receiptId = `receipt-${crypto.randomUUID()}`;
    const timestamp = new Date().toISOString();

    // Create deterministic hash of input data
    const inputHash = this.hashInput(input.input_data);

    // Create the receipt payload
    const payload = {
      schema_version: 'switchboard.receipt.v1' as const,
      id: receiptId,
      approval_id: input.approval_id,
      tenant_id: input.tenant_id,
      actor: {
        id: input.actor.id,
        roles: input.actor.roles,
      },
      action_type: input.action_type,
      timestamp,
      policy_version: input.policy_version,
      policy_decision_hash: input.policy_decision_hash,
      pre_state_hash: input.pre_state_hash,
      post_state_hash: input.post_state_hash,
      risk_tier: input.risk_tier,
      cost_estimate: input.cost_estimate,
      input_hash: inputHash,
    };

    // Sign the payload
    const signature = this.signPayload(payload);

    const receipt: ProvenanceReceipt = {
      ...payload,
      actor: input.actor,
      decision: input.action_type,
      signature,
      key_id: this.signingKeyId,
    };

    // Store locally
    await this.storeReceiptLocally(receipt, input.decision_id);

    // If provenance service is enabled, send to it asynchronously
    if (this.enabled) {
      this.sendToProvenanceService(receipt).catch((error) => {
        log.warn(
          { error, receiptId },
          'Failed to send receipt to provenance service',
        );
      });
    }

    log.info(
      {
        receiptId,
        approval_id: input.approval_id,
        action_type: input.action_type,
        actor_id: input.actor.id,
      },
      'Provenance receipt created',
    );

    return receipt;
  }

  /**
   * Get a receipt by ID
   */
  async getReceipt(
    receiptId: string,
    tenantId?: string,
  ): Promise<ProvenanceReceipt | null> {
    const result = await db.query<{
      schema_version: string | null;
      id: string;
      approval_id: string;
      tenant_id: string;
      actor_id: string;
      action_type: string;
      input_hash: string;
      policy_version: string;
      receipt_data: Record<string, unknown> | null;
      signature: string;
      key_id: string;
      created_at: Date;
    }>(
      `SELECT * FROM provenance_receipts WHERE id = $1${tenantId ? ' AND tenant_id = $2' : ''}`,
      tenantId ? [receiptId, tenantId] : [receiptId],
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    const receiptData = row.receipt_data || {};
    return {
      schema_version: (row.schema_version as 'switchboard.receipt.v1') || 'switchboard.receipt.v1',
      id: row.id,
      approval_id: row.approval_id,
      tenant_id: row.tenant_id,
      actor: { id: row.actor_id, roles: [] },
      decision: row.action_type as ProvenanceReceipt['decision'],
      timestamp: row.created_at.toISOString(),
      policy_version: row.policy_version,
      policy_decision_hash: receiptData.policy_decision_hash as string | undefined,
      pre_state_hash: receiptData.pre_state_hash as string | undefined,
      post_state_hash: receiptData.post_state_hash as string | undefined,
      risk_tier: receiptData.risk_tier as ProvenanceReceipt['risk_tier'],
      cost_estimate: receiptData.cost_estimate as ProvenanceReceipt['cost_estimate'],
      input_hash: row.input_hash,
      signature: row.signature,
      key_id: row.key_id,
    };
  }

  /**
   * Get all receipts for an approval request
   */
  async getReceiptsForApproval(
    approvalId: string,
    tenantId?: string,
  ): Promise<ProvenanceReceipt[]> {
    const result = await db.query<{
      schema_version: string | null;
      id: string;
      approval_id: string;
      tenant_id: string;
      actor_id: string;
      action_type: string;
      input_hash: string;
      policy_version: string;
      receipt_data: Record<string, unknown> | null;
      signature: string;
      key_id: string;
      created_at: Date;
    }>(
      `SELECT * FROM provenance_receipts WHERE approval_id = $1${tenantId ? ' AND tenant_id = $2' : ''} ORDER BY created_at ASC`,
      tenantId ? [approvalId, tenantId] : [approvalId],
    );

    return result.rows.map((row) => {
      const receiptData = row.receipt_data || {};
      return {
        schema_version:
          (row.schema_version as 'switchboard.receipt.v1') ||
          'switchboard.receipt.v1',
        id: row.id,
        approval_id: row.approval_id,
        tenant_id: row.tenant_id,
        actor: { id: row.actor_id, roles: [] },
        decision: row.action_type as ProvenanceReceipt['decision'],
        timestamp: row.created_at.toISOString(),
        policy_version: row.policy_version,
        policy_decision_hash: receiptData.policy_decision_hash as
          | string
          | undefined,
        pre_state_hash: receiptData.pre_state_hash as string | undefined,
        post_state_hash: receiptData.post_state_hash as string | undefined,
        risk_tier: receiptData.risk_tier as ProvenanceReceipt['risk_tier'],
        cost_estimate: receiptData.cost_estimate as ProvenanceReceipt['cost_estimate'],
        input_hash: row.input_hash,
        signature: row.signature,
        key_id: row.key_id,
      };
    });
  }

  /**
   * Verify a receipt's signature
   */
  verifyReceipt(receipt: ProvenanceReceipt): boolean {
    const payload = {
      id: receipt.id,
      approval_id: receipt.approval_id,
      tenant_id: receipt.tenant_id,
      actor: {
        id: receipt.actor.id,
        roles: receipt.actor.roles,
      },
      action_type: receipt.decision,
      timestamp: receipt.timestamp,
      policy_version: receipt.policy_version,
      policy_decision_hash: receipt.policy_decision_hash,
      pre_state_hash: receipt.pre_state_hash,
      post_state_hash: receipt.post_state_hash,
      risk_tier: receipt.risk_tier,
      cost_estimate: receipt.cost_estimate,
      input_hash: receipt.input_hash,
    };

    const expectedSignature = this.signPayload(payload);
    return receipt.signature === expectedSignature;
  }

  /**
   * Check if provenance service is healthy
   */
  async isHealthy(): Promise<boolean> {
    if (!this.enabled) {
      return true; // If disabled, consider it healthy
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      const response = await fetch(`${this.baseUrl}/health`, {
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response.ok;
    } catch {
      return false;
    }
  }

  private async storeReceiptLocally(
    receipt: ProvenanceReceipt,
    decisionId?: string,
  ): Promise<void> {
    await db.query(
      `INSERT INTO provenance_receipts (
        id, approval_id, decision_id, tenant_id, actor_id,
        action_type, input_hash, policy_version, schema_version, receipt_data, signature, key_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        receipt.id,
        receipt.approval_id,
        decisionId || null,
        receipt.tenant_id,
        receipt.actor.id,
        receipt.decision,
        receipt.input_hash,
        receipt.policy_version,
        receipt.schema_version || 'switchboard.receipt.v1',
        JSON.stringify({
          policy_decision_hash: receipt.policy_decision_hash,
          pre_state_hash: receipt.pre_state_hash,
          post_state_hash: receipt.post_state_hash,
          risk_tier: receipt.risk_tier,
          cost_estimate: receipt.cost_estimate,
        }),
        receipt.signature,
        receipt.key_id,
      ],
    );
  }

  private async sendToProvenanceService(
    receipt: ProvenanceReceipt,
  ): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/v1/receipts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-ID': receipt.tenant_id,
      },
      body: JSON.stringify({
        type: 'approval_receipt',
        data: receipt,
      }),
    });

    if (!response.ok) {
      throw new Error(`Provenance service error: ${response.status}`);
    }
  }

  private hashInput(input: Record<string, unknown>): string {
    const normalized = this.stableStringify(input);
    return crypto.createHash('sha256').update(normalized).digest('hex');
  }

  private signPayload(payload: Record<string, unknown>): string {
    // In production, this would use a KMS-managed key
    // For now, we use HMAC-SHA256 with a service-level secret
    const secret =
      process.env.PROVENANCE_SIGNING_SECRET || 'dev-signing-secret';
    const normalized = this.stableStringify(payload);
    return crypto
      .createHmac('sha256', secret)
      .update(normalized)
      .digest('base64url');
  }

  private stableStringify(value: unknown): string {
    if (Array.isArray(value)) {
      return `[${value.map((item) => this.stableStringify(item)).join(',')}]`;
    }
    if (value && typeof value === 'object') {
      const entries = Object.entries(value as Record<string, unknown>).sort(
        ([a], [b]) => a.localeCompare(b),
      );
      return `{${entries
        .map(([key, val]) => `${JSON.stringify(key)}:${this.stableStringify(val)}`)
        .join(',')}}`;
    }
    const encoded = JSON.stringify(value);
    return encoded === undefined ? 'null' : encoded;
  }
}

export const provenanceClient = new ProvenanceClient();
