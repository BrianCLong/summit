import { ExecutionReceipt, applyRedaction } from "@intelgraph/provenance";

export interface ExportRequest {
  id: string;
  redactions?: string[];
  reason?: string;
}

export interface ExportBundle {
  receipt: ExecutionReceipt;
  artifacts: Record<string, Buffer | string>;
}

export class ReceiptStore {
  private receipts = new Map<string, ExecutionReceipt>();
  private artifacts = new Map<string, Record<string, Buffer | string>>();

  seed(receipt: ExecutionReceipt, artifactBlobs: Record<string, Buffer | string> = {}): void {
    this.receipts.set(receipt.id, receipt);
    this.artifacts.set(receipt.id, artifactBlobs);
  }

  get(id: string): ExecutionReceipt | undefined {
    return this.receipts.get(id);
  }

  export(request: ExportRequest): ExportBundle | null {
    const receipt = this.receipts.get(request.id);
    if (!receipt) return null;
    const redactions = request.redactions ?? [];
    const redactedReceipt = redactions.length
      ? applyRedaction(receipt, redactions, request.reason)
      : receipt;
    const artifacts = { ...(this.artifacts.get(request.id) ?? {}) };
    for (const field of redactions) {
      delete artifacts[field];
    }
    return { receipt: redactedReceipt, artifacts };
  }
}
