/**
 * Post-Quantum Cryptography Types
 * Defines interfaces for NIST PQC algorithms
 */

export enum PQCAlgorithm {
  KYBER_512 = 'kyber-512',
  KYBER_768 = 'kyber-768',
  KYBER_1024 = 'kyber-1024',
  DILITHIUM_2 = 'dilithium-2',
  DILITHIUM_3 = 'dilithium-3',
  DILITHIUM_5 = 'dilithium-5',
  FALCON_512 = 'falcon-512',
  FALCON_1024 = 'falcon-1024',
  SPHINCS_PLUS_128F = 'sphincs-plus-128f',
  SPHINCS_PLUS_128S = 'sphincs-plus-128s',
  SPHINCS_PLUS_192F = 'sphincs-plus-192f',
  SPHINCS_PLUS_192S = 'sphincs-plus-192s',
  SPHINCS_PLUS_256F = 'sphincs-plus-256f',
  SPHINCS_PLUS_256S = 'sphincs-plus-256s',
}

export enum SecurityLevel {
  LEVEL_1 = 1, // Equivalent to AES-128
  LEVEL_2 = 2, // Equivalent to SHA-256
  LEVEL_3 = 3, // Equivalent to AES-192
  LEVEL_4 = 4, // Equivalent to SHA-384
  LEVEL_5 = 5, // Equivalent to AES-256
}

export interface KeyPair {
  publicKey: Uint8Array;
  privateKey: Uint8Array;
  algorithm: PQCAlgorithm;
  securityLevel: SecurityLevel;
  createdAt: Date;
  metadata?: Record<string, unknown>;
}

export interface EncapsulatedSecret {
  ciphertext: Uint8Array;
  sharedSecret: Uint8Array;
}

export interface Signature {
  signature: Uint8Array;
  algorithm: PQCAlgorithm;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface KeyEncapsulationMechanism {
  generateKeyPair(): Promise<KeyPair>;
  encapsulate(publicKey: Uint8Array): Promise<EncapsulatedSecret>;
  decapsulate(ciphertext: Uint8Array, privateKey: Uint8Array): Promise<Uint8Array>;
  getAlgorithm(): PQCAlgorithm;
  getSecurityLevel(): SecurityLevel;
}

export interface DigitalSignatureScheme {
  generateKeyPair(): Promise<KeyPair>;
  sign(message: Uint8Array, privateKey: Uint8Array): Promise<Signature>;
  verify(message: Uint8Array, signature: Uint8Array, publicKey: Uint8Array): Promise<boolean>;
  getAlgorithm(): PQCAlgorithm;
  getSecurityLevel(): SecurityLevel;
}

export interface HybridScheme {
  classicalAlgorithm: string;
  quantumAlgorithm: PQCAlgorithm;
  combineKeys(classicalKey: Uint8Array, quantumKey: Uint8Array): Uint8Array;
  combineSignatures(classicalSig: Uint8Array, quantumSig: Uint8Array): Uint8Array;
}

export interface PQCBenchmark {
  algorithm: PQCAlgorithm;
  operation: 'keygen' | 'encapsulate' | 'decapsulate' | 'sign' | 'verify';
  iterations: number;
  averageTime: number;
  minTime: number;
  maxTime: number;
  throughput: number;
  memoryUsage: number;
}

export interface MigrationMetadata {
  sourceAlgorithm: string;
  targetAlgorithm: PQCAlgorithm;
  migrationDate: Date;
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
  rollbackPlan?: string;
  validationResults?: Record<string, unknown>;
}
