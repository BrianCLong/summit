import { Ledger, Receipt } from '@summit/receipts';
import { createHash } from 'node:crypto';

export interface EvidenceBundle {
  report: {
    evidence_id: string;
    items: Receipt[];
  };
  metrics: {
    count: number;
    hash: string;
  };
  stamp: {
    timestamp: string;
    version: string;
  };
}

export function exportBundle(ledger: Ledger, evidenceId: string): EvidenceBundle {
  const receipts = ledger.getAll();

  // Calculate metrics hash over all receipt hashes to ensure integrity
  const allHashes = receipts.map(r => r.hash).sort().join(''); // Sort to ensure order independence if needed, but ledger is ordered.
  // Actually ledger order matters for hash chain. So we should NOT sort if we want to preserve chain verification.
  // But if we just want set integrity, sort is safer.
  // However, Ledger structure implies order (previous_hash). So we keep order.
  const orderedHashes = receipts.map(r => r.hash).join('');
  const bundleHash = createHash('sha256').update(orderedHashes).digest('hex');

  const report = {
    evidence_id: evidenceId,
    items: receipts
  };

  const metrics = {
    count: receipts.length,
    hash: bundleHash
  };

  const stamp = {
    timestamp: new Date().toISOString(),
    version: '0.1.0'
  };

  return {
    report,
    metrics,
    stamp
  };
}
