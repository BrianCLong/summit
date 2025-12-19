import schema from '../schema/receipt.schema.json';

export const receiptSchema = schema as const;

export interface ReceiptSignerInfo {
  keyId: string;
  algorithm: 'RSASSA_PSS_SHA_256' | 'RSASSA_PSS_SHA_384' | 'RSASSA_PSS_SHA_512';
  publicKey?: string;
}

export interface ProvenanceReceipt {
  id: string;
  payload: Record<string, unknown>;
  payloadHash: string;
  issuedAt: string;
  metadata?: Record<string, string | number | boolean | null>;
  signer: ReceiptSignerInfo;
  signature: string;
}

export type ReceiptPayload = ProvenanceReceipt['payload'];
export type ReceiptMetadata = ProvenanceReceipt['metadata'];
export type ReceiptSigningAlgorithm = ReceiptSignerInfo['algorithm'];
