import { ProvenanceLedgerV2 } from '../provenance/ledger.js';
import type { ReceiptEvidence } from '../provenance/types.js';
import { SigningService } from './SigningService.js';
import { createHash } from 'crypto';

export interface Receipt {
  id: string; // usually the ledger entry ID
  timestamp: string;
  action: string;
  actor: string;
  resource: string;
  inputHash: string;
  policyDecisionId?: string;
  signature: string;
  signerKeyId: string; // Key ID or public key fingerprint
}

export class ReceiptService {
  private ledger: ProvenanceLedgerV2;
  private signer: SigningService;
  private static instance: ReceiptService;

  private constructor() {
    this.ledger = ProvenanceLedgerV2.getInstance();
    // Critical: Fail if signing service cannot be initialized (missing keys)
    this.signer = new SigningService();
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
    const entry = await this.ledger.appendEntry({
      action,
      actorId: actor.id,
      tenantId: actor.tenantId,
      resource,
      details: { inputHash, policyDecisionId }, // stored in 'details' which maps to metadata or payload
      timestamp: new Date().toISOString()
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

    await this.ledger.recordReceiptEvidence(receiptEvidence);

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
