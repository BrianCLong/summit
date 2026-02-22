import { createHash } from 'node:crypto';
// @ts-ignore
import cbor from 'cbor';

export interface Receipt {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  payload?: any;
  previous_hash?: string | null;
  hash: string;
}

export class Ledger {
  private receipts: Receipt[] = [];

  constructor() {}

  public append(receiptData: Omit<Receipt, 'hash' | 'previous_hash'>): Receipt {
    const previousHash = this.getLastHash();

    // Canonical structure for hashing
    const payloadToHash = {
      id: receiptData.id,
      timestamp: receiptData.timestamp,
      actor: receiptData.actor,
      action: receiptData.action,
      payload: receiptData.payload,
      previous_hash: previousHash
    };

    // Calculate hash using SHA-256 over CBOR encoded data
    // Use encodeCanonical to ensure key order independence
    const buffer = cbor.encodeCanonical(payloadToHash);
    const hash = createHash('sha256').update(buffer).digest('hex');

    const receipt: Receipt = {
      ...payloadToHash,
      hash
    };

    this.receipts.push(receipt);
    return receipt;
  }

  public get(hash: string): Receipt | undefined {
    return this.receipts.find(r => r.hash === hash);
  }

  public getAll(): Receipt[] {
    return [...this.receipts];
  }

  public getLastHash(): string | null {
    if (this.receipts.length === 0) return null;
    return this.receipts[this.receipts.length - 1].hash;
  }

  public verify(hash: string): boolean {
      const receipt = this.get(hash);
      if (!receipt) return false;

       const payloadToHash = {
        id: receipt.id,
        timestamp: receipt.timestamp,
        actor: receipt.actor,
        action: receipt.action,
        payload: receipt.payload,
        previous_hash: receipt.previous_hash
      };

      const buffer = cbor.encodeCanonical(payloadToHash);
      const calculatedHash = createHash('sha256').update(buffer).digest('hex');
      return calculatedHash === receipt.hash;
  }
}
