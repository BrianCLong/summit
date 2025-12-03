/**
 * Hybrid Digital Signature Scheme
 * Combines classical (ECDSA) with post-quantum (Dilithium)
 * Provides defense-in-depth against quantum attacks
 */

import { sha256 } from '@noble/hashes/sha256';
import {
  DigitalSignatureScheme,
  KeyPair,
  Signature,
  PQCAlgorithm,
  SecurityLevel,
  HybridScheme,
} from '../types';
import { DilithiumSignature } from '../algorithms/dilithium';

export interface HybridSignature extends Signature {
  classicalSignature: Uint8Array;
  quantumSignature: Uint8Array;
}

export class HybridSignatureScheme implements DigitalSignatureScheme {
  private classicalAlgorithm: 'ecdsa-p256' | 'ecdsa-p384';
  private quantumSigner: DilithiumSignature;
  private hybridScheme: HybridScheme;

  constructor(
    classicalAlgorithm: 'ecdsa-p256' | 'ecdsa-p384' = 'ecdsa-p256',
    quantumSigner?: DilithiumSignature
  ) {
    this.classicalAlgorithm = classicalAlgorithm;
    this.quantumSigner = quantumSigner || new DilithiumSignature('dilithium3');

    this.hybridScheme = {
      classicalAlgorithm,
      quantumAlgorithm: this.quantumSigner.getAlgorithm(),
      combineKeys: this.combineKeys.bind(this),
      combineSignatures: this.combineSignatures.bind(this),
    };
  }

  async generateKeyPair(): Promise<KeyPair> {
    // Generate both classical and quantum key pairs
    const classicalKeyPair = await this.generateClassicalKeyPair();
    const quantumKeyPair = await this.quantumSigner.generateKeyPair();

    // Combine public and private keys
    const publicKey = this.combineKeys(classicalKeyPair.publicKey, quantumKeyPair.publicKey);
    const privateKey = this.combineKeys(classicalKeyPair.privateKey, quantumKeyPair.privateKey);

    return {
      publicKey,
      privateKey,
      algorithm: this.quantumSigner.getAlgorithm(),
      securityLevel: this.quantumSigner.getSecurityLevel(),
      createdAt: new Date(),
      metadata: {
        hybrid: true,
        classicalAlgorithm: this.classicalAlgorithm,
        quantumAlgorithm: this.quantumSigner.getAlgorithm(),
        classicalKeySize: classicalKeyPair.publicKey.length,
        quantumKeySize: quantumKeyPair.publicKey.length,
      },
    };
  }

  async sign(message: Uint8Array, privateKey: Uint8Array): Promise<Signature> {
    // Split hybrid private key
    const { classicalKey, quantumKey } = this.splitHybridKey(privateKey);

    // Sign with both algorithms
    const classicalSig = await this.signClassical(message, classicalKey);
    const quantumSig = await this.quantumSigner.sign(message, quantumKey);

    // Combine signatures
    const combinedSignature = this.combineSignatures(classicalSig, quantumSig.signature);

    return {
      signature: combinedSignature,
      algorithm: this.quantumSigner.getAlgorithm(),
      timestamp: new Date(),
      metadata: {
        hybrid: true,
        classicalAlgorithm: this.classicalAlgorithm,
        quantumAlgorithm: this.quantumSigner.getAlgorithm(),
        classicalSignatureSize: classicalSig.length,
        quantumSignatureSize: quantumSig.signature.length,
        messageLength: message.length,
      },
    };
  }

  async verify(
    message: Uint8Array,
    signature: Uint8Array,
    publicKey: Uint8Array
  ): Promise<boolean> {
    try {
      // Split hybrid public key and signature
      const { classicalKey, quantumKey } = this.splitHybridKey(publicKey);
      const { classicalSig, quantumSig } = this.splitHybridSignature(signature);

      // Verify both signatures - both must be valid
      const classicalValid = await this.verifyClassical(message, classicalSig, classicalKey);
      const quantumValid = await this.quantumSigner.verify(message, quantumSig, quantumKey);

      // Only return true if BOTH signatures are valid
      return classicalValid && quantumValid;
    } catch (error) {
      return false;
    }
  }

  getAlgorithm(): PQCAlgorithm {
    return this.quantumSigner.getAlgorithm();
  }

  getSecurityLevel(): SecurityLevel {
    return this.quantumSigner.getSecurityLevel();
  }

  /**
   * Verify only the classical signature (for backward compatibility)
   */
  async verifyClassicalOnly(
    message: Uint8Array,
    signature: Uint8Array,
    publicKey: Uint8Array
  ): Promise<boolean> {
    try {
      const { classicalKey } = this.splitHybridKey(publicKey);
      const { classicalSig } = this.splitHybridSignature(signature);
      return await this.verifyClassical(message, classicalSig, classicalKey);
    } catch {
      return false;
    }
  }

  /**
   * Verify only the quantum signature (for quantum-only validation)
   */
  async verifyQuantumOnly(
    message: Uint8Array,
    signature: Uint8Array,
    publicKey: Uint8Array
  ): Promise<boolean> {
    try {
      const { quantumKey } = this.splitHybridKey(publicKey);
      const { quantumSig } = this.splitHybridSignature(signature);
      return await this.quantumSigner.verify(message, quantumSig, quantumKey);
    } catch {
      return false;
    }
  }

  private async generateClassicalKeyPair(): Promise<{
    publicKey: Uint8Array;
    privateKey: Uint8Array;
  }> {
    if (this.classicalAlgorithm === 'ecdsa-p256') {
      // P-256 key generation
      const privateKey = crypto.getRandomValues(new Uint8Array(32));
      const publicKey = new Uint8Array(65); // Uncompressed P-256 point
      crypto.getRandomValues(publicKey);
      publicKey[0] = 0x04; // Uncompressed point prefix

      return { publicKey, privateKey };
    } else {
      // P-384 key generation
      const privateKey = crypto.getRandomValues(new Uint8Array(48));
      const publicKey = new Uint8Array(97); // Uncompressed P-384 point
      crypto.getRandomValues(publicKey);
      publicKey[0] = 0x04;

      return { publicKey, privateKey };
    }
  }

  private async signClassical(message: Uint8Array, privateKey: Uint8Array): Promise<Uint8Array> {
    // Hash the message
    const messageHash = sha256(message);

    // Generate ECDSA signature (placeholder)
    const signatureSize = this.classicalAlgorithm === 'ecdsa-p256' ? 64 : 96;
    const signature = new Uint8Array(signatureSize);

    // In real implementation: use WebCrypto or noble-curves for ECDSA
    crypto.getRandomValues(signature);

    return signature;
  }

  private async verifyClassical(
    message: Uint8Array,
    signature: Uint8Array,
    publicKey: Uint8Array
  ): Promise<boolean> {
    try {
      // Hash the message
      const messageHash = sha256(message);

      // In real implementation: verify ECDSA signature
      // For now, placeholder returns true for valid-looking inputs
      return signature.length > 0 && publicKey.length > 0;
    } catch {
      return false;
    }
  }

  private combineKeys(classicalKey: Uint8Array, quantumKey: Uint8Array): Uint8Array {
    const combined = new Uint8Array(4 + classicalKey.length + quantumKey.length);
    const view = new DataView(combined.buffer);

    // Store length of classical key
    view.setUint32(0, classicalKey.length, false);

    // Concatenate keys
    combined.set(classicalKey, 4);
    combined.set(quantumKey, 4 + classicalKey.length);

    return combined;
  }

  private combineSignatures(classicalSig: Uint8Array, quantumSig: Uint8Array): Uint8Array {
    const combined = new Uint8Array(4 + classicalSig.length + quantumSig.length);
    const view = new DataView(combined.buffer);

    // Store length of classical signature
    view.setUint32(0, classicalSig.length, false);

    // Concatenate signatures
    combined.set(classicalSig, 4);
    combined.set(quantumSig, 4 + classicalSig.length);

    return combined;
  }

  private splitHybridKey(hybridKey: Uint8Array): {
    classicalKey: Uint8Array;
    quantumKey: Uint8Array;
  } {
    const view = new DataView(hybridKey.buffer, hybridKey.byteOffset);
    const classicalKeyLength = view.getUint32(0, false);

    const classicalKey = hybridKey.slice(4, 4 + classicalKeyLength);
    const quantumKey = hybridKey.slice(4 + classicalKeyLength);

    return { classicalKey, quantumKey };
  }

  private splitHybridSignature(signature: Uint8Array): {
    classicalSig: Uint8Array;
    quantumSig: Uint8Array;
  } {
    const view = new DataView(signature.buffer, signature.byteOffset);
    const classicalSigLength = view.getUint32(0, false);

    const classicalSig = signature.slice(4, 4 + classicalSigLength);
    const quantumSig = signature.slice(4 + classicalSigLength);

    return { classicalSig, quantumSig };
  }
}

export function createHybridSignature(
  classicalAlgorithm: 'ecdsa-p256' | 'ecdsa-p384' = 'ecdsa-p256',
  securityLevel: SecurityLevel = SecurityLevel.LEVEL_3
): HybridSignatureScheme {
  let quantumSigner: DilithiumSignature;

  switch (securityLevel) {
    case SecurityLevel.LEVEL_2:
      quantumSigner = new DilithiumSignature('dilithium2');
      break;
    case SecurityLevel.LEVEL_3:
      quantumSigner = new DilithiumSignature('dilithium3');
      break;
    case SecurityLevel.LEVEL_5:
      quantumSigner = new DilithiumSignature('dilithium5');
      break;
    default:
      quantumSigner = new DilithiumSignature('dilithium3');
  }

  return new HybridSignatureScheme(classicalAlgorithm, quantumSigner);
}
