import { createHash } from 'crypto';
import {
  KMSClient,
  SignCommand,
  VerifyCommand,
  type MessageType,
  type SignCommandInput,
  type SigningAlgorithmSpec,
  type VerifyCommandInput,
} from '@aws-sdk/client-kms';
import {
  type ProvenanceReceipt,
  type ReceiptSignature,
  type ReceiptSigningAlgorithm,
  type UnsignedReceipt,
} from '@intelgraph/provenance';

export interface ReceiptSignerOptions {
  kmsKeyId: string;
  kmsRegion?: string;
  signingAlgorithm?: SigningAlgorithmSpec;
  messageType?: MessageType;
  client?: KMSClient;
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortKeys);
  }
  if (value && typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a > b ? 1 : a < b ? -1 : 0))
      .reduce<Record<string, unknown>>((acc, [key, val]) => {
        acc[key] = sortKeys(val);
        return acc;
      }, {});
  }
  return value;
}

export function canonicaliseReceipt(
  receipt: UnsignedReceipt | ProvenanceReceipt,
): Buffer {
  const { signature: _signature, ...unsigned } = receipt as ProvenanceReceipt;
  const sorted = sortKeys(unsigned);
  return Buffer.from(JSON.stringify(sorted));
}

function sha256(data: Buffer): Buffer {
  return createHash('sha256').update(data).digest();
}

export class ReceiptSigner {
  private readonly client: KMSClient;
  private readonly signingAlgorithm: SigningAlgorithmSpec;
  private readonly keyId: string;
  private readonly messageType: MessageType;

  constructor(options: ReceiptSignerOptions) {
    this.client =
      options.client ??
      new KMSClient({
        region: options.kmsRegion ?? process.env.AWS_REGION ?? 'us-east-1',
      });
    this.signingAlgorithm = options.signingAlgorithm ?? 'RSASSA_PSS_SHA_256';
    this.keyId = options.kmsKeyId;
    this.messageType = options.messageType ?? 'DIGEST';
  }

  async sign(unsignedReceipt: UnsignedReceipt): Promise<ProvenanceReceipt> {
    const canonical = canonicaliseReceipt(unsignedReceipt);
    const digest = sha256(canonical);
    const input: SignCommandInput = {
      KeyId: this.keyId,
      Message: digest,
      MessageType: this.messageType,
      SigningAlgorithm: this.signingAlgorithm,
    };

    const result = await this.client.send(new SignCommand(input));
    if (!result.Signature) {
      throw new Error('KMS did not return a signature');
    }

    const signature: ReceiptSignature = {
      algorithm: this.signingAlgorithm as ReceiptSigningAlgorithm,
      keyId: this.keyId,
      value: Buffer.from(result.Signature).toString('base64'),
      messageDigest: digest.toString('hex'),
    };

    return {
      ...unsignedReceipt,
      signature,
    };
  }

  async verify(receipt: ProvenanceReceipt): Promise<boolean> {
    const canonical = canonicaliseReceipt(receipt);
    const digest = sha256(canonical);
    const signature = Buffer.from(receipt.signature.value, 'base64');
    const input: VerifyCommandInput = {
      KeyId: receipt.signature.keyId ?? this.keyId,
      Message: digest,
      MessageType: this.messageType,
      Signature: signature,
      SigningAlgorithm: receipt.signature.algorithm,
    };

    const result = await this.client.send(new VerifyCommand(input));
    return Boolean(result.SignatureValid);
  }
}
