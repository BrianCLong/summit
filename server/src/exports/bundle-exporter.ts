import { createHash } from 'crypto';
import { redactPII } from '../middleware/pii-redaction.js';
import { provenanceLedger } from '../provenance/ledger.js';
import { ReceiptService } from '../services/ReceiptService.js';
import logger from '../utils/logger.js';

export interface EvidenceBundle {
  manifest: BundleManifest;
  receipts: any[];
  artifacts: any[];
}

export interface BundleManifest {
  bundleId: string;
  tenantId: string;
  generatedAt: string;
  hashes: Record<string, string>;
  redactionApplied: boolean;
}

export class BundleExporter {
  private static instance: BundleExporter;

  private constructor() {}

  static getInstance(): BundleExporter {
    if (!BundleExporter.instance) {
      BundleExporter.instance = new BundleExporter();
    }
    return BundleExporter.instance;
  }

  async exportReceipt(receiptId: string, tenantId: string): Promise<EvidenceBundle> {
    logger.info({ receiptId, tenantId }, 'Exporting evidence bundle');

    // 1. Fetch the primary receipt from Ledger
    const receiptService = ReceiptService.getInstance();
    const mainReceipt = await receiptService.getReceipt(receiptId);

    // Sprint 08 Hardening: Explicit tenant isolation check for the main receipt
    if (!mainReceipt) {
      throw new Error(`Receipt ${receiptId} not found`);
    }

    // Sprint 08 Hardening: Explicit tenant isolation check for the main receipt
    if (mainReceipt.tenantId !== tenantId) {
       logger.warn({ receiptId, requestTenant: tenantId, receiptTenant: mainReceipt.tenantId }, 'Tenant isolation breach attempt in export');
       throw new Error(`Receipt ${receiptId} does not belong to your tenant`);
    }

    // 2. Fetch associated entries from the Ledger (e.g. the original action entry)
    const entries = await provenanceLedger.getEntries(tenantId, {
       resourceId: mainReceipt.resource,
       limit: 50
    });

    // 3. Redact PII from entries
    const redactedEntries = entries.map(entry => ({
      ...entry,
      payload: redactPII(entry.payload),
      metadata: redactPII(entry.metadata)
    }));

    // 4. Build artifact collection
    const artifacts = redactedEntries.map(e => ({
       id: e.id,
       type: 'provenance_entry',
       content: e
    }));

    // 5. Generate manifest with hashes
    const hashes: Record<string, string> = {};

    // Hash main receipt
    hashes[`receipt-${receiptId}.json`] = this.computeHash(mainReceipt);

    // Hash artifacts
    artifacts.forEach(art => {
      hashes[`artifact-${art.id}.json`] = this.computeHash(art.content);
    });

    const bundle: EvidenceBundle = {
      manifest: {
        bundleId: `bundle-${receiptId}-${Date.now()}`,
        tenantId,
        generatedAt: new Date().toISOString(),
        hashes,
        redactionApplied: true
      },
      receipts: [mainReceipt],
      artifacts
    };

    return bundle;
  }

  private computeHash(obj: any): string {
    const str = JSON.stringify(obj, Object.keys(obj).sort());
    return createHash('sha256').update(str).digest('hex');
  }
}

export const bundleExporter = BundleExporter.getInstance();
