export type SigningAlgorithm =
  | 'RSA_SHA256'
  | 'ECDSA_P256_SHA256'
  | 'ECDSA_P384_SHA384'
  | 'EdDSA_ED25519';

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonObject | JsonValue[];
export interface JsonObject {
  [key: string]: JsonValue;
}

export interface KeyVersion {
  id: string;
  version: number;
  algorithm: SigningAlgorithm;
  publicKeyPem: string;
  privateKeyPem?: string;
  certificateChain?: string[];
  validFrom: Date;
  validTo?: Date;
  hsm?: {
    provider: 'software' | 'pkcs11' | 'kms';
    keyLabel?: string;
    slot?: number;
  };
  metadata?: JsonObject;
  isActive?: boolean;
  createdAt: Date;
  rotatedAt?: Date;
}

export interface SignatureBundle {
  keyId: string;
  keyVersion: number;
  algorithm: SigningAlgorithm;
  signature: string;
  timestampToken?: string;
  certificateChain?: string[];
  metadata?: JsonObject;
}

export interface VerificationContext {
  expectedKeyId?: string;
  expectedAlgorithm?: SigningAlgorithm;
  payloadDescription?: string;
  allowExpiredKeys?: boolean;
}

export interface VerificationResult {
  valid: boolean;
  keyId?: string;
  keyVersion?: number;
  algorithm?: SigningAlgorithm;
  chainValidated?: boolean;
  timestampVerified?: boolean;
  errors?: string[];
}

export interface ChainValidationResult {
  valid: boolean;
  errors: string[];
  depth: number;
  leafSubject?: string;
  rootSubject?: string;
}

export interface CryptoAuditEvent {
  action: 'sign' | 'verify' | 'rotate';
  keyId: string;
  keyVersion?: number;
  algorithm?: SigningAlgorithm;
  success: boolean;
  reason?: string;
  metadata?: JsonObject;
}
