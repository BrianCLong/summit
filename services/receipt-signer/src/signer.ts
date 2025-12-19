import crypto from 'crypto';

import {
  KMSClient,
  SignCommand,
  VerifyCommand,
  SigningAlgorithmSpec,
} from '@aws-sdk/client-kms';
import {
  ProvenanceReceipt,
  ReceiptMetadata,
  ReceiptPayload,
  ReceiptSigningAlgorithm,
} from '@intelgraph/provenance';

import { ReceiptStore } from './store';

export interface ReceiptInput {
  id: string;
  payload: ReceiptPayload;
  metadata?: ReceiptMetadata;
  issuedAt?: string;
}

export interface ReceiptSignerConfig {
  keyId?: string;
  algorithm?: ReceiptSigningAlgorithm;
  kmsClient?: KMSClient;
  store?: ReceiptStore;
}

export interface ReceiptVerifier {
  verify(receipt: ProvenanceReceipt): Promise<boolean>;
}

export class ReceiptSigner implements ReceiptVerifier {
  private kms: KMSClient;
  private keyId: string;
  private algorithm: ReceiptSigningAlgorithm;
  private store?: ReceiptStore;

  constructor(config: ReceiptSignerConfig = {}) {
    this.keyId = config.keyId ?? process.env.KMS_KEY_ID ?? '';
    if (!this.keyId) {
      throw new Error('KMS key identifier is required to sign receipts');
    }

    this.algorithm =
      config.algorithm ??
      (SigningAlgorithmSpec.RSASSA_PSS_SHA_256 as ReceiptSigningAlgorithm);
    this.kms =
      config.kmsClient ??
      new KMSClient({ region: process.env.AWS_REGION ?? 'us-east-1' });
    this.store = config.store;
  }

  async sign(input: ReceiptInput): Promise<ProvenanceReceipt> {
    const issuedAt = input.issuedAt ?? new Date().toISOString();
    const metadata: ReceiptMetadata = input.metadata ?? {};
    const payloadHash = hashReceiptPayload(input.payload);
    const digest = buildReceiptDigest({
      id: input.id,
      payloadHash,
      issuedAt,
      metadata,
    });

    const signResponse = await this.kms.send(
      new SignCommand({
        KeyId: this.keyId,
        Message: digest,
        MessageType: 'DIGEST',
        SigningAlgorithm: this.algorithm,
      }),
    );

    const signature = Buffer.from(signResponse.Signature ?? []).toString(
      'base64',
    );

    const receipt: ProvenanceReceipt = {
      id: input.id,
      payload: input.payload,
      payloadHash,
      issuedAt,
      metadata,
      signer: {
        keyId: signResponse.KeyId ?? this.keyId,
        algorithm: this.algorithm,
      },
      signature,
    };

    if (this.store) {
      await this.store.save(receipt);
    }

    return receipt;
  }

  async verify(receipt: ProvenanceReceipt): Promise<boolean> {
    const expectedHash = hashReceiptPayload(receipt.payload);
    if (expectedHash !== receipt.payloadHash) {
      return false;
    }

    const digest = buildReceiptDigest({
      id: receipt.id,
      payloadHash: receipt.payloadHash,
      issuedAt: receipt.issuedAt,
      metadata: receipt.metadata ?? {},
    });

    const verifyResponse = await this.kms.send(
      new VerifyCommand({
        KeyId: receipt.signer.keyId ?? this.keyId,
        Message: digest,
        Signature: Buffer.from(receipt.signature, 'base64'),
        MessageType: 'DIGEST',
        SigningAlgorithm: receipt.signer
          .algorithm as SigningAlgorithmSpec,
      }),
    );

    return Boolean(verifyResponse.SignatureValid);
  }
}

export function hashReceiptPayload(payload: ReceiptPayload): string {
  const canonical = canonicalize(payload);
  return crypto.createHash('sha256').update(canonical).digest('hex');
}

function buildReceiptDigest(input: {
  id: string;
  payloadHash: string;
  issuedAt: string;
  metadata: ReceiptMetadata;
}): Buffer {
  const canonical = canonicalize({
    id: input.id,
    payloadHash: input.payloadHash,
    issuedAt: input.issuedAt,
    metadata: input.metadata ?? {},
  });

  return crypto.createHash('sha256').update(canonical).digest();
}

export function canonicalize(value: unknown): string {
  if (value === undefined) {
    return 'null';
  }

  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((entry) => canonicalize(entry)).join(',')}]`;
  }

  const entries = Object.entries(value as Record<string, unknown>).sort(
    ([leftKey], [rightKey]) => leftKey.localeCompare(rightKey),
  );

  return `{${entries
    .map(([key, val]) => `${JSON.stringify(key)}:${canonicalize(val)}`)
    .join(',')}}`;
}
