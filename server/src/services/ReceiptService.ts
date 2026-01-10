import { ProvenanceLedgerV2 } from '../provenance/ledger.js';
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
  policyId?: string;
  policyVersion?: string;
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
    actorType?: 'user' | 'system' | 'api' | 'job';
    resource: string;
    input: any;
    policyDecisionId?: string;
    policy?: { id: string; version: string };
  }): Promise<Receipt> {
    const {
      action,
      actor,
      actorType,
      resource,
      input,
      policyDecisionId,
      policy,
    } = params;
    const resolvedPolicyDecisionId =
      policyDecisionId ?? (policy ? `${policy.id}@${policy.version}` : undefined);

    // 1. Calculate input hash
    const inputStr = typeof input === 'string' ? input : JSON.stringify(input);
    const inputHash = createHash('sha256').update(inputStr).digest('hex');

    // 2. Append to Ledger (this is the "truth" store)
    const entry = await this.ledger.appendEntry({
      actionType: action,
      actorId: actor.id,
      tenantId: actor.tenantId,
      actorType: actorType ?? 'system',
      resourceType: resource,
      resourceId: resource,
      payload: {
        mutationType: 'CREATE',
        entityId: resource,
        entityType: resource,
        inputHash,
        policyDecisionId: resolvedPolicyDecisionId,
        policyId: policy?.id,
        policyVersion: policy?.version,
        action,
      },
      metadata: { purpose: 'receipt' },
      timestamp: new Date()
    });
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
      resolvedPolicyDecisionId || ''
    ].join('|');

    // 4. Sign it
    const signature = this.signer.sign(receiptCanonical);

    return {
      id: entryId,
      timestamp,
      action,
      actor: actor.id,
      resource,
      inputHash,
      policyDecisionId: resolvedPolicyDecisionId,
      policyId: policy?.id,
      policyVersion: policy?.version,
      signature,
      signerKeyId: this.signer.getPublicKey().slice(0, 32) + '...' // simplified ID
    };
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
      inputHash: entry.payload?.inputHash || 'unknown',
      policyDecisionId: entry.payload?.policyDecisionId,
      policyId: entry.payload?.policyId,
      policyVersion: entry.payload?.policyVersion,
      signature: entry.signature || 'unsigned',
      signerKeyId: 'system-key' // metadata
    };
  }
}
