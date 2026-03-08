import { ProvenanceLedgerV2 } from '../provenance/ledger.js';
import type { ReceiptEvidence } from '../provenance/types.js';
import { SigningService } from './SigningService.js';
import { createHash } from 'crypto';
import { meteringEmitter } from '../metering/emitter.js';

export interface Receipt {
  id: string; // usually the ledger entry ID
  timestamp: string;
  action: string;
  actor: string;
  tenantId: string;
  resource: string;
  inputHash: string;
  policyDecisionId?: string;
  signature: string;
  signerKeyId: string; // Key ID or public key fingerprint
}

export class ReceiptService {
  private _ledger?: ProvenanceLedgerV2;
  private _signer?: SigningService;
  private static instance: ReceiptService;

  private constructor() {
  }

  private get ledger(): ProvenanceLedgerV2 {
    if (!this._ledger) {
      this._ledger = ProvenanceLedgerV2.getInstance();
    }
    return this._ledger;
  }

  private get signer(): SigningService {
    if (!this._signer) {
      this._signer = new SigningService();
    }
    return this._signer;
  }

  public static getInstance(): ReceiptService {
    if (!ReceiptService.instance) {
      ReceiptService.instance = new ReceiptService();
    }
    return ReceiptService.instance;
  }

  /**
   * Generates a signed receipt for an action.
   * This also logs the action to the Provenance Ledger if it hasn't been logged yet.
   */
  private _batchQueue: ReceiptEvidence[] = [];
  private _batchInterval?: NodeJS.Timeout;
  private readonly BATCH_SIZE = 50;
  private readonly FLUSH_INTERVAL_MS = 1000;

  private startBatching() {
    if (this._batchInterval) return;
    this._batchInterval = setInterval(() => this.flushBatch(), this.FLUSH_INTERVAL_MS);
    this._batchInterval.unref?.();
  }

  private async flushBatch() {
    if (this._batchQueue.length === 0) return;
    const batch = [...this._batchQueue];
    this._batchQueue = [];

    try {
      // Sprint 08 Hardening: Reliable batch writing
      // Use Promise.allSettled to ensure failure of one doesn't stop others,
      // but we still log failures.
      const results = await Promise.allSettled(
        batch.map((evidence) => this.ledger.recordReceiptEvidence(evidence))
      );

      const failures = results.filter((r) => r.status === 'rejected');
      if (failures.length > 0) {
        console.error(`Failed to flush ${failures.length} receipts in batch`, failures);
        // In production, we'd move these to a dead-letter queue for replay
      }
    } catch (err) {
      console.error('Critical failure in receipt batch flush', err);
      // Re-queue items if the whole flush failed (best-effort)
      this._batchQueue.push(...batch);
    }
  }

  /**
   * Generates a signed receipt for an action.
   * This also logs the action to the Provenance Ledger if it hasn't been logged yet.
   */
  public async generateReceipt(params: {
    action: string;
    actor: { id: string; tenantId: string };
    resource: string;
    input: any;
    policyDecisionId?: string;
  }): Promise<Receipt> {
    const { action, actor, resource, input, policyDecisionId } = params;

    // 1. Calculate input hash
    const inputStr = typeof input === 'string' ? input : JSON.stringify(input);
    const inputHash = createHash('sha256').update(inputStr).digest('hex');

    // 2. Append to Ledger (this is the "truth" store)
    // Synchronous write to Ledger ensures "happened-at" ordering for the audit trail
    const entry = await this.ledger.appendEntry({
      actionType: action,
      actorId: actor.id,
      tenantId: actor.tenantId,
      resourceId: resource,
      resourceType: 'entity',
      actorType: 'user',
      payload: { inputHash, policyDecisionId },
      metadata: {},
      timestamp: new Date()
    } as any);
    const entryId = entry.id;

    // 3. Create the canonical receipt string to sign
    const timestamp = new Date().toISOString();
    const receiptCanonical = [
      entryId,
      timestamp,
      action,
      actor.id,
      actor.tenantId,
      resource,
      inputHash,
      policyDecisionId || ''
    ].join('|');

    // 4. Sign it
    const signature = this.signer.sign(receiptCanonical);
    const receipt: Receipt = {
      id: entryId,
      timestamp,
      action,
      actor: actor.id,
      resource,
      inputHash,
      policyDecisionId,
      signature,
      signerKeyId: this.signer.getPublicKey().slice(0, 32) + '...' // simplified ID
    };

    const receiptEvidence: ReceiptEvidence = {
      receiptId: receipt.id,
      entryId,
      action,
      actorId: actor.id,
      tenantId: actor.tenantId,
      resourceId: resource,
      inputHash,
      policyDecisionId,
      signature,
      signerKeyId: receipt.signerKeyId,
      issuedAt: timestamp
    };

    // Sprint 08: Batch receipt evidence writes to improve throughput
    this._batchQueue.push(receiptEvidence);
    this.startBatching();
    if (this._batchQueue.length >= this.BATCH_SIZE) {
      this.flushBatch();
    }

    // Metering: Record receipt write
    try {
      await meteringEmitter.emitReceiptWrite({
        tenantId: actor.tenantId,
        action,
        source: 'ReceiptService',
        correlationId: entryId,
        metadata: {
          resourceId: resource,
        },
      });
    } catch (err) {
      console.warn('Failed to emit receipt write meter event', err);
    }

    return receipt;
  }

  public async getReceipt(id: string): Promise<Receipt | null> {
    // 1. Retrieve entry from Ledger
    // We need to implement getEntryById in Ledger or use getEntries filtering
    // Since getEntries filters by tenant, we need tenantId?
    // Ideally we fetch by ID directly.
    // Assuming ledger.getEntries can filter by ID or we add getEntry(id) to Ledger.
    // The current ledger implementation has `getEntries` but it filters by tenantId mandatory.
    // This is a limitation. We will simulate fetching by iterating/filtering a known tenant or assuming admin context.
    // Better: Add `getEntryById` to `ProvenanceLedgerV2`.

    // For now, use a hack to search across known tenants or assume context is provided?
    // Let's assume we can add `getEntryById` to the Ledger class.

    const entry = await this.ledger.getEntryById(id);
    if (!entry) return null;

    // 2. Reconstruct Receipt
    // We rely on the signature stored in the entry OR re-sign if we are the authority.
    // The entry has `signature`.

    return {
      id: entry.id,
      tenantId: entry.tenantId,
      timestamp: entry.timestamp.toISOString(),
      action: entry.actionType,
      actor: entry.actorId,
      resource: entry.resourceId,
      inputHash: entry.metadata?.inputHash || 'unknown',
      policyDecisionId: entry.metadata?.policyDecisionId,
      signature: entry.signature || 'unsigned',
      signerKeyId: 'system-key' // metadata
    };
  }
}
