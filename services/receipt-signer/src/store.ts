import { ProvenanceReceipt } from '@intelgraph/provenance';

export interface ReceiptStore {
  get(id: string): Promise<ProvenanceReceipt | undefined>;
  save(receipt: ProvenanceReceipt): Promise<void>;
}

export class InMemoryReceiptStore implements ReceiptStore {
  private receipts = new Map<string, ProvenanceReceipt>();

  constructor(initial: ProvenanceReceipt[] = []) {
    initial.forEach((receipt) => this.receipts.set(receipt.id, receipt));
  }

  async get(id: string): Promise<ProvenanceReceipt | undefined> {
    return this.receipts.get(id);
  }

  async save(receipt: ProvenanceReceipt): Promise<void> {
    this.receipts.set(receipt.id, receipt);
  }
}
