/**
 * Homomorphic Encryption Types and Interfaces
 */

export interface HEKeyPair {
  publicKey: HEPublicKey;
  privateKey: HEPrivateKey;
  relinKey?: HERelinearizationKey;
  galoisKey?: HEGaloisKey;
}

export interface HEPublicKey {
  keyId: string;
  scheme: 'paillier' | 'elgamal' | 'bfv' | 'ckks';
  parameters: Record<string, any>;
  keyData: string;
}

export interface HEPrivateKey {
  keyId: string;
  scheme: 'paillier' | 'elgamal' | 'bfv' | 'ckks';
  keyData: string;
}

export interface HERelinearizationKey {
  keyId: string;
  keyData: string;
}

export interface HEGaloisKey {
  keyId: string;
  keyData: string;
}

export interface HECiphertext {
  scheme: 'paillier' | 'elgamal' | 'bfv' | 'ckks';
  ciphertextData: string;
  parameters?: Record<string, any>;
}

export interface HEParameters {
  polyModulusDegree?: number; // For BFV/CKKS
  coeffModulus?: number[]; // For BFV/CKKS
  plainModulus?: number; // For BFV
  scale?: number; // For CKKS
  bitLength?: number; // For Paillier
}

export interface SecretShare {
  shareId: string;
  partyId: string;
  shareData: string;
  threshold: number;
  totalShares: number;
}

export interface MPCProtocolConfig {
  protocol: 'shamir' | 'additive' | 'multiplication' | 'beaver';
  threshold: number;
  numParties: number;
  prime?: bigint;
}

export interface EncryptedOperation {
  operationId: string;
  type: 'add' | 'multiply' | 'aggregate' | 'compare';
  inputs: HECiphertext[];
  result?: HECiphertext;
  timestamp: Date;
}
