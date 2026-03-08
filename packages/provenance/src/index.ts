import { createHash, generateKeyPairSync, sign, verify } from 'crypto';

export const RECEIPT_VERSION = '0.1.0';

export interface ActorRef {
  id: string;
  role: string;
  tenantId?: string;
  displayName?: string;
}

export interface PipelineRef {
  stage?: string;
  runId?: string;
  taskId?: string;
  step?: string;
}

export interface RedactionRule {
  path: string;
  reason: string;
  appliedAt?: string;
  appliedBy?: string;
}

export interface ReceiptSignature {
  algorithm: 'ed25519';
  keyId: string;
  publicKey: string;
  value: string;
  signedAt: string;
}

export interface ReceiptProofs {
  receiptHash: string;
  manifestMerkleRoot?: string;
  claimHashes?: string[];
}

export interface ReceiptMetadata {
  [key: string]: unknown;
}

export interface Receipt {
  id: string;
  version: string;
  caseId: string;
  claimIds: string[];
  createdAt: string;
  actor: ActorRef;
  pipeline?: PipelineRef;
  payloadHash: string;
  signature: ReceiptSignature;
  proofs: ReceiptProofs;
  metadata?: ReceiptMetadata;
  redactions?: RedactionRule[];
}

export interface ReceiptExportRequest {
  receiptIds: string[];
  includeProvenance?: boolean;
  redactions?: RedactionRule[];
}

export interface ReceiptExportBundle {
  receipts: Receipt[];
  provenance?: Record<string, unknown>;
  redactions?: RedactionRule[];
}

// Lightweight canonicalization helper without strict typing to accommodate
// strongly-typed receipt structures.
function sortJson(value: any): any {
  if (Array.isArray(value)) {
    return value.map((item) => sortJson(item));
  }

  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, any>).sort(
      ([a], [b]) => a.localeCompare(b),
    );
    return entries.reduce<Record<string, any>>((acc, [k, v]) => {
      acc[k] = sortJson(v);
      return acc;
    }, {});
  }

  return value;
}

export function canonicalizeReceiptPayload(receipt: Receipt): string {
  const { signature, proofs: _proofs, payloadHash: _payloadHash, ...rest } = receipt;
  const sanitizedSignature = {
    ...signature,
    value: null,
  };

  const payload = {
    ...rest,
    signature: sanitizedSignature,
  };

  return JSON.stringify(sortJson(payload));
}

export function computeReceiptPayloadHash(receipt: Receipt): string {
  const canonical = canonicalizeReceiptPayload(receipt);
  return createHash('sha256').update(canonical).digest('hex');
}

export function computeReceiptHash(receipt: Receipt): string {
  const { proofs: _proofs, ...rest } = receipt;
  const canonical = JSON.stringify(sortJson(rest as unknown as Record<string, unknown>));
  return createHash('sha256').update(canonical).digest('hex');
}

export function verifyReceiptSignature(receipt: Receipt): boolean {
  if (receipt.signature.algorithm !== 'ed25519') return false;

  const payloadHash = computeReceiptPayloadHash(receipt);
  if (payloadHash !== receipt.payloadHash) {
    return false;
  }

  return verify(
    null,
    Buffer.from(payloadHash, 'hex'),
    {
      key: Buffer.from(receipt.signature.publicKey, 'base64'),
      format: 'der',
      type: 'spki',
    },
    Buffer.from(receipt.signature.value, 'base64'),
  );
}

export interface SigningResult extends ReceiptSignature {
  receiptHash: string;
  payloadHash: string;
}

export function signReceipt(
  receipt: Omit<Receipt, 'signature' | 'proofs' | 'payloadHash' | 'version'> & {
    signature?: Partial<ReceiptSignature>;
  },
  keyId?: string,
): Receipt {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');
  const baseReceipt: Receipt = {
    ...receipt,
    version: RECEIPT_VERSION,
    payloadHash: '',
    signature: {
      algorithm: 'ed25519',
      keyId: keyId ?? 'default',
      publicKey: publicKey.export({ type: 'spki', format: 'der' }).toString('base64'),
      value: '',
      signedAt: new Date().toISOString(),
      ...receipt.signature,
    },
    proofs: {
      receiptHash: '',
    },
  };

  const payloadHash = computeReceiptPayloadHash(baseReceipt);
  const signature = sign(null, Buffer.from(payloadHash, 'hex'), privateKey).toString('base64');
  const signed: Receipt = {
    ...baseReceipt,
    payloadHash,
    signature: {
      ...baseReceipt.signature,
      value: signature,
    },
  };

  const receiptHash = computeReceiptHash(signed);
  signed.proofs.receiptHash = receiptHash;
  return signed;
}

export function applyRedactions<T extends object>(source: T, redactions: RedactionRule[] = []): T {
  const clone: Record<string, unknown> = JSON.parse(JSON.stringify(source));

  for (const rule of redactions) {
    const segments = rule.path.split('.').filter(Boolean);
    let cursor: any = clone;

    for (let i = 0; i < segments.length; i += 1) {
      const key = segments[i]!;

      if (i === segments.length - 1) {
        if (cursor && typeof cursor === 'object' && key in cursor) {
          delete cursor[key];
        }
      } else if (cursor && typeof cursor === 'object' && key in cursor) {
        cursor = cursor[key];
      } else {
        break;
      }
    }
  }

  return clone as T;
}

// Type aliases for backward compatibility
export type ProvenanceReceipt = Receipt;
export type ExecutionReceipt = Receipt;

// Function aliases for backward compatibility
export const canonicalReceiptPayload = canonicalizeReceiptPayload;
export const hashReceiptPayload = computeReceiptPayloadHash;
export const hashReceipt = computeReceiptHash;
export const verifyReceipt = verifyReceiptSignature;

/**
 * Apply redaction to specific fields in a receipt, marking hashes as REDACTED
 * and tracking disclosure metadata.
 */
export function applyRedaction<T extends { hashes?: { inputs?: Array<{ name: string; hash: string; redactable?: boolean }> }; disclosure?: { redactions?: string[]; reason?: string } }>(
  receipt: T,
  fieldsToRedact: string[],
  reason: string,
): T {
  const clone = JSON.parse(JSON.stringify(receipt)) as T;

  if (clone.hashes?.inputs) {
    for (const input of clone.hashes.inputs) {
      if (fieldsToRedact.includes(input.name) && input.redactable !== false) {
        input.hash = 'REDACTED';
      }
    }
  }

  clone.disclosure = {
    redactions: fieldsToRedact,
    reason,
  };

  return clone;
}

export * from './trace-model';
export * from './replay-runner';
export * from './mapping';
