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
  async getReceipt(receiptId: string): Promise<ProvenanceReceipt | null> {
    const result = await db.query<{
      id: string;
      approval_id: string;
      tenant_id: string;
      actor_id: string;
      action_type: string;
      input_hash: string;
      policy_version: string;
      signature: string;
      key_id: string;
      created_at: Date;
    }>(
      `SELECT * FROM provenance_receipts WHERE id = $1`,
      [receiptId],
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      approval_id: row.approval_id,
      tenant_id: row.tenant_id,
      actor: { id: row.actor_id, roles: [] },
      decision: row.action_type as ProvenanceReceipt['decision'],
      timestamp: row.created_at.toISOString(),
      policy_version: row.policy_version,
      input_hash: row.input_hash,
      signature: row.signature,
      key_id: row.key_id,
    };
  }

  /**
   * Get all receipts for an approval request
   */
  async getReceiptsForApproval(approvalId: string): Promise<ProvenanceReceipt[]> {
    const result = await db.query<{
      id: string;
      approval_id: string;
      tenant_id: string;
      actor_id: string;
      action_type: string;
      input_hash: string;
      policy_version: string;
      signature: string;
      key_id: string;
      created_at: Date;
    }>(
      `SELECT * FROM provenance_receipts WHERE approval_id = $1 ORDER BY created_at ASC`,
      [approvalId],
    );

    return result.rows.map((row) => ({
      id: row.id,
      approval_id: row.approval_id,
      tenant_id: row.tenant_id,
      actor: { id: row.actor_id, roles: [] },
      decision: row.action_type as ProvenanceReceipt['decision'],
      timestamp: row.created_at.toISOString(),
      policy_version: row.policy_version,
      input_hash: row.input_hash,
      signature: row.signature,
      key_id: row.key_id,
    }));
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
        action_type, input_hash, policy_version, signature, key_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        receipt.id,
        receipt.approval_id,
        decisionId || null,
        receipt.tenant_id,
        receipt.actor.id,
        receipt.decision,
        receipt.input_hash,
        receipt.policy_version,
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
    const normalized = JSON.stringify(input, Object.keys(input).sort());
    return crypto.createHash('sha256').update(normalized).digest('hex');
  }

  private signPayload(payload: Record<string, unknown>): string {
    // In production, this would use a KMS-managed key
    // For now, we use HMAC-SHA256 with a service-level secret
    const secret =
      process.env.PROVENANCE_SIGNING_SECRET || 'dev-signing-secret';
    const normalized = JSON.stringify(payload, Object.keys(payload).sort());
    return crypto
      .createHmac('sha256', secret)
      .update(normalized)
      .digest('base64url');
  }
}

export const provenanceClient = new ProvenanceClient();
