import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import type { KmsEnvelopeRef, SecretRef } from "common-types";
import { rotationStatusForRef } from "../rotation.js";
import type {
  RotationStatus,
  SecretResolution,
  SecretRotationResult,
  SecretsProvider,
} from "../types.js";

export interface KmsLikeClient {
  decrypt(args: {
    CiphertextBlob: Uint8Array;
    EncryptionContext?: Record<string, string>;
  }): Promise<{ Plaintext?: Uint8Array }>;
  generateDataKey?(args: {
    KeyId: string;
    KeySpec: "AES_256";
    EncryptionContext?: Record<string, string>;
  }): Promise<{ CiphertextBlob?: Uint8Array; Plaintext?: Uint8Array }>;
}

interface EnvelopeComponents {
  dataKeyCiphertext: string;
  iv: string;
  authTag: string;
  payload: string;
}

function decodeEnvelope(ciphertext: string): EnvelopeComponents {
  const decoded = Buffer.from(ciphertext, "base64").toString("utf-8");
  const parsed = JSON.parse(decoded) as EnvelopeComponents;
  if (!parsed.dataKeyCiphertext || !parsed.iv || !parsed.authTag || !parsed.payload) {
    throw new Error("Malformed KMS envelope");
  }
  return parsed;
}

function decryptPayload(envelope: EnvelopeComponents, dataKey: Uint8Array): string {
  const iv = Buffer.from(envelope.iv, "base64");
  const decipher = createDecipheriv("aes-256-gcm", dataKey, iv);
  decipher.setAuthTag(Buffer.from(envelope.authTag, "base64"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(envelope.payload, "base64")),
    decipher.final(),
  ]);
  return decrypted.toString("utf-8");
}

function encryptPayload(dataKey: Uint8Array, plaintext: string): EnvelopeComponents {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", dataKey, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return {
    dataKeyCiphertext: "",
    iv: iv.toString("base64"),
    authTag: authTag.toString("base64"),
    payload: encrypted.toString("base64"),
  };
}

function encodeEnvelope(envelope: EnvelopeComponents): string {
  return Buffer.from(JSON.stringify(envelope), "utf-8").toString("base64");
}

function assertKmsRef(ref: SecretRef): KmsEnvelopeRef {
  if ((ref as KmsEnvelopeRef).provider !== "kms") {
    throw new Error("AWS KMS provider only supports KMS secret references");
  }
  return ref as KmsEnvelopeRef;
}

async function decryptDataKey(
  kms: KmsLikeClient,
  envelope: EnvelopeComponents,
  context: Record<string, string> | undefined
): Promise<Uint8Array> {
  const response = await kms.decrypt({
    CiphertextBlob: Buffer.from(envelope.dataKeyCiphertext, "base64"),
    EncryptionContext: context,
  });
  if (!response.Plaintext) {
    throw new Error("KMS decrypt did not return a plaintext key");
  }
  return response.Plaintext instanceof Uint8Array
    ? response.Plaintext
    : new Uint8Array(response.Plaintext);
}

export function buildEnvelopeCiphertext(
  dataKeyCiphertext: Uint8Array,
  dataKeyPlaintext: Uint8Array,
  plaintext: string
): string {
  const envelope = encryptPayload(dataKeyPlaintext, plaintext);
  envelope.dataKeyCiphertext = Buffer.from(dataKeyCiphertext).toString("base64");
  return encodeEnvelope(envelope);
}

export class AwsKmsEnvelopeProvider implements SecretsProvider {
  readonly name = "aws-kms-envelope";
  private readonly kms: KmsLikeClient;

  constructor(kms: KmsLikeClient) {
    this.kms = kms;
  }

  supports(ref: SecretRef): boolean {
    return (ref as KmsEnvelopeRef).provider === "kms";
  }

  describeRotation(ref: SecretRef): RotationStatus {
    return rotationStatusForRef(assertKmsRef(ref));
  }

  async getSecret(ref: SecretRef): Promise<SecretResolution> {
    const kmsRef = assertKmsRef(ref);
    const envelope = decodeEnvelope(kmsRef.ciphertext);
    const dataKey = await decryptDataKey(this.kms, envelope, kmsRef.encryptionContext);
    const plaintext = decryptPayload(envelope, dataKey);
    return {
      provider: this.name,
      value: plaintext,
      version: kmsRef.version,
      rotation: rotationStatusForRef(kmsRef),
    };
  }

  async rotateSecret(ref: SecretRef): Promise<SecretRotationResult> {
    const kmsRef = assertKmsRef(ref);
    const envelope = decodeEnvelope(kmsRef.ciphertext);
    const dataKey = await decryptDataKey(this.kms, envelope, kmsRef.encryptionContext);
    const plaintext = decryptPayload(envelope, dataKey);

    if (!this.kms.generateDataKey) {
      throw new Error("KMS client does not support data key generation");
    }

    const rotated = await this.kms.generateDataKey({
      KeyId: kmsRef.keyId,
      KeySpec: "AES_256",
      EncryptionContext: kmsRef.encryptionContext,
    });

    if (!rotated.CiphertextBlob || !rotated.Plaintext) {
      throw new Error("KMS generateDataKey response is missing required fields");
    }

    const updatedCiphertext = buildEnvelopeCiphertext(
      rotated.CiphertextBlob,
      rotated.Plaintext,
      plaintext
    );

    const updatedRef: KmsEnvelopeRef = {
      ...kmsRef,
      ciphertext: updatedCiphertext,
      rotation: {
        ...(kmsRef.rotation ?? { intervalDays: 90 }),
        lastRotated: new Date().toISOString(),
      },
    };

    return {
      provider: this.name,
      value: plaintext,
      version: updatedRef.version,
      updatedRef,
      rotation: rotationStatusForRef(updatedRef),
    };
  }
}
