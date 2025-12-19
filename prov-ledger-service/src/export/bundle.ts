import { ExecutionReceipt, applyRedaction } from '@intelgraph/provenance';

export interface ExportBundleRequest {
  receipt: ExecutionReceipt;
  artifacts: Record<string, Buffer | string>;
  redactions?: string[];
  reason?: string;
}

export interface ExportBundle {
  receipt: ExecutionReceipt;
  manifest: {
    receiptId: string;
    artifacts: Array<{ name: string; hash: string; redacted?: boolean }>;
    disclosure?: ExecutionReceipt['disclosure'];
  };
  artifacts: Record<string, Buffer | string>;
}

export function generateExportBundle(input: ExportBundleRequest): ExportBundle {
  const redactions = input.redactions ?? [];
  const filteredArtifacts = Object.entries(input.artifacts).reduce<
    Record<string, Buffer | string>
  >((acc, [key, value]) => {
    if (redactions.includes(key)) {
      return acc;
    }
    acc[key] = value;
    return acc;
  }, {});

  const receipt = redactions.length
    ? applyRedaction(input.receipt, redactions, input.reason)
    : input.receipt;

  const manifest = {
    receiptId: receipt.id,
    artifacts: [
      ...receipt.hashes.inputs.map((entry) => ({
        name: entry.name,
        hash: entry.hash,
        redacted: entry.hash === 'REDACTED',
      })),
      ...receipt.hashes.outputs.map((entry) => ({
        name: entry.name,
        hash: entry.hash,
        redacted: entry.hash === 'REDACTED',
      })),
    ],
    disclosure: receipt.disclosure,
  };

  return {
    receipt,
    manifest,
    artifacts: filteredArtifacts,
  };
}
