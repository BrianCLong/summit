import fs from 'fs';
import path from 'path';

// Load schema from local package or fallback gracefully
let schema: Record<string, unknown> = {};
try {
  const schemaPath = path.resolve(__dirname, '../schema/receipt.schema.json');
  schema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));
} catch {
  // Schema loading is optional for runtime type definitions
  schema = { type: 'object' };
}

export const RECEIPT_SCHEMA_VERSION = '0.1';

export type ReceiptSigningAlgorithm =
  | 'RSASSA_PSS_SHA_256'
  | 'ECDSA_SHA_256';

export interface ReceiptChainStep {
  stepId: string;
  inputHash?: string;
  outputHash: string;
  timestamp?: string;
}

export interface ReceiptPayload {
  artifactHash: string;
  manifestUri: string;
  nonce: string;
  metadata?: Record<string, unknown>;
  chain?: ReceiptChainStep[];
}

export interface ReceiptSignature {
  algorithm: ReceiptSigningAlgorithm;
  keyId: string;
  value: string;
  messageDigest: string;
  certificateArn?: string;
}

export interface UnsignedReceipt {
  id: string;
  schemaVersion: typeof RECEIPT_SCHEMA_VERSION;
  issuer: string;
  subject: string;
  issuedAt: string;
  expiresAt?: string;
  payload: ReceiptPayload;
}

export type ProvenanceReceipt = UnsignedReceipt & {
  signature: ReceiptSignature;
};

export const receiptSchema = schema;
