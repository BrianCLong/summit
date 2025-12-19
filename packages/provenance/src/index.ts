import { createHash, createPrivateKey, createPublicKey, sign, verify } from 'crypto';

export type ReceiptStepStatus = 'pending' | 'completed' | 'failed';

export interface ReceiptHashEntry {
  name: string;
  hash: string;
  redactable?: boolean;
}

export interface ReceiptHashes {
  inputs: ReceiptHashEntry[];
  outputs: ReceiptHashEntry[];
  manifest: string;
}

export interface ReceiptStep {
  id: string;
  name: string;
  timestamp: string;
  status: ReceiptStepStatus;
  inputs?: string[];
  outputs?: string[];
  metadata?: Record<string, unknown>;
}

export interface PolicyDecision {
  id: string;
  effect: 'allow' | 'deny' | 'review';
  reason?: string;
  attributes?: Record<string, unknown>;
}

export interface ReceiptPolicy {
  decisions?: PolicyDecision[];
  opaBundle?: string;
}

export interface ReceiptSigner {
  keyId: string;
  algorithm: 'ed25519' | 'kms:aws:kms';
  certificateChain?: string[];
}

export interface DisclosureMetadata {
  redactions?: string[];
  reason?: string;
}

export interface ExecutionReceipt {
  id: string;
  createdAt: string;
  executionId: string;
  hashes: ReceiptHashes;
  steps?: ReceiptStep[];
  policy?: ReceiptPolicy;
  signer: ReceiptSigner;
  signature: string;
  disclosure?: DisclosureMetadata;
}

export function canonicalReceiptPayload(receipt: ExecutionReceipt): Buffer {
  const sortable = sortKeys({
    ...receipt,
    signature: undefined,
  });
  return Buffer.from(JSON.stringify(sortable));
}

export function hashReceipt(receipt: ExecutionReceipt): string {
  return createHash('sha256').update(canonicalReceiptPayload(receipt)).digest('hex');
}

export function signReceipt(
  receipt: ExecutionReceipt,
  privateKeyPem: string | Buffer,
): ExecutionReceipt {
  const key = createPrivateKey(privateKeyPem);
  const signature = sign(null, canonicalReceiptPayload(receipt), key).toString('base64');
  return { ...receipt, signature };
}

export function verifyReceipt(
  receipt: ExecutionReceipt,
  publicKeyPem: string | Buffer,
): boolean {
  const key = createPublicKey(publicKeyPem);
  return verify(null, canonicalReceiptPayload(receipt), key, Buffer.from(receipt.signature, 'base64'));
}

export function applyRedaction(
  receipt: ExecutionReceipt,
  redactedFields: string[],
  reason?: string,
): ExecutionReceipt {
  const redactSet = new Set(redactedFields);
  const scrubHashes = (entries: ReceiptHashEntry[]) =>
    entries.map((entry) =>
      redactSet.has(entry.name) || entry.redactable
        ? { ...entry, hash: 'REDACTED' }
        : entry,
    );

  return {
    ...receipt,
    hashes: {
      ...receipt.hashes,
      inputs: scrubHashes(receipt.hashes.inputs),
      outputs: scrubHashes(receipt.hashes.outputs),
    },
    disclosure: {
      redactions: redactedFields,
      reason,
    },
  };
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortKeys);
  }
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, val]) => val !== undefined)
      .sort(([a], [b]) => (a > b ? 1 : a < b ? -1 : 0));
    return entries.reduce<Record<string, unknown>>((acc, [key, val]) => {
      acc[key] = sortKeys(val);
      return acc;
    }, {});
  }
  return value;
}
