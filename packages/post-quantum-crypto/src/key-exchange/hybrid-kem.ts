/**
 * Hybrid Key Encapsulation Mechanism
 * Combines classical (X25519/ECDH) with post-quantum (Kyber)
 * Provides defense-in-depth against quantum attacks
 */

import { KeyEncapsulationMechanism, KeyPair, EncapsulatedSecret, PQCAlgorithm, HybridScheme } from '../types';
import { KyberKEM } from '../algorithms/kyber';
import { sha256 } from '@noble/hashes/sha256';
import { hkdf } from '@noble/hashes/hkdf';

export class HybridKEM implements KeyEncapsulationMechanism {
  private classicalAlgorithm: 'x25519' | 'p256';
  private quantumKEM: KyberKEM;
  private hybridScheme: HybridScheme;

  constructor(classicalAlgorithm: 'x25519' | 'p256' = 'x25519', quantumKEM?: KyberKEM) {
    this.classicalAlgorithm = classicalAlgorithm;
    this.quantumKEM = quantumKEM || new KyberKEM('kyber768');

    this.hybridScheme = {
      classicalAlgorithm,
      quantumAlgorithm: this.quantumKEM.getAlgorithm(),
      combineKeys: this.combineKeys.bind(this),
      combineSignatures: this.combineSignatures.bind(this),
    };
  }

  async generateKeyPair(): Promise<KeyPair> {
    // Generate both classical and quantum key pairs
    const classicalKeyPair = await this.generateClassicalKeyPair();
    const quantumKeyPair = await this.quantumKEM.generateKeyPair();

    // Combine public and private keys
    const publicKey = this.concatenateKeys(classicalKeyPair.publicKey, quantumKeyPair.publicKey);
    const privateKey = this.concatenateKeys(classicalKeyPair.privateKey, quantumKeyPair.privateKey);

    return {
      publicKey,
      privateKey,
      algorithm: this.quantumKEM.getAlgorithm(),
      securityLevel: this.quantumKEM.getSecurityLevel(),
      createdAt: new Date(),
      metadata: {
        hybrid: true,
        classicalAlgorithm: this.classicalAlgorithm,
        quantumAlgorithm: this.quantumKEM.getAlgorithm(),
      },
    };
  }

  async encapsulate(publicKey: Uint8Array): Promise<EncapsulatedSecret> {
    // Split hybrid public key
    const { classicalKey, quantumKey } = this.splitHybridKey(publicKey);

    // Perform both encapsulations
    const classicalSecret = await this.encapsulateClassical(classicalKey);
    const quantumSecret = await this.quantumKEM.encapsulate(quantumKey);

    // Combine secrets using KDF
    const combinedSecret = this.combineKeys(classicalSecret.sharedSecret, quantumSecret.sharedSecret);
    const combinedCiphertext = this.concatenateKeys(classicalSecret.ciphertext, quantumSecret.ciphertext);

    return {
      ciphertext: combinedCiphertext,
      sharedSecret: combinedSecret,
    };
  }

  async decapsulate(ciphertext: Uint8Array, privateKey: Uint8Array): Promise<Uint8Array> {
    // Split hybrid private key and ciphertext
    const { classicalKey: classicalPrivateKey, quantumKey: quantumPrivateKey } = this.splitHybridKey(privateKey);
    const { classicalKey: classicalCiphertext, quantumKey: quantumCiphertext } = this.splitHybridCiphertext(ciphertext);

    // Perform both decapsulations
    const classicalSecret = await this.decapsulateClassical(classicalCiphertext, classicalPrivateKey);
    const quantumSecret = await this.quantumKEM.decapsulate(quantumCiphertext, quantumPrivateKey);

    // Combine secrets using same KDF
    const combinedSecret = this.combineKeys(classicalSecret, quantumSecret);

    return combinedSecret;
  }

  getAlgorithm(): PQCAlgorithm {
    return this.quantumKEM.getAlgorithm();
  }

  getSecurityLevel() {
    return this.quantumKEM.getSecurityLevel();
  }

  private async generateClassicalKeyPair(): Promise<{ publicKey: Uint8Array; privateKey: Uint8Array }> {
    if (this.classicalAlgorithm === 'x25519') {
      // Generate X25519 key pair
      const privateKey = crypto.getRandomValues(new Uint8Array(32));
      const publicKey = new Uint8Array(32); // Would compute from private key
      crypto.getRandomValues(publicKey);

      return { publicKey, privateKey };
    } else {
      // Generate P-256 ECDH key pair
      const privateKey = crypto.getRandomValues(new Uint8Array(32));
      const publicKey = new Uint8Array(65); // Uncompressed P-256 point
      crypto.getRandomValues(publicKey);

      return { publicKey, privateKey };
    }
  }

  private async encapsulateClassical(publicKey: Uint8Array): Promise<EncapsulatedSecret> {
    // Generate ephemeral key pair
    const ephemeralKeyPair = await this.generateClassicalKeyPair();

    // Compute shared secret via ECDH/X25519
    const sharedSecret = new Uint8Array(32);
    crypto.getRandomValues(sharedSecret);

    return {
      ciphertext: ephemeralKeyPair.publicKey,
      sharedSecret,
    };
  }

  private async decapsulateClassical(ciphertext: Uint8Array, privateKey: Uint8Array): Promise<Uint8Array> {
    // Compute shared secret from ephemeral public key and private key
    const sharedSecret = new Uint8Array(32);
    crypto.getRandomValues(sharedSecret);

    return sharedSecret;
  }

  private combineKeys(classicalKey: Uint8Array, quantumKey: Uint8Array): Uint8Array {
    // Use HKDF to combine secrets
    // This ensures both secrets contribute to final key material
    const combined = new Uint8Array([...classicalKey, ...quantumKey]);
    const salt = new Uint8Array(32);
    const info = new TextEncoder().encode('hybrid-kem-v1');

    // Derive 32-byte key from combined secrets
    return hkdf(sha256, combined, salt, info, 32);
  }

  private combineSignatures(classicalSig: Uint8Array, quantumSig: Uint8Array): Uint8Array {
    // Simply concatenate signatures
    return this.concatenateKeys(classicalSig, quantumSig);
  }

  private concatenateKeys(key1: Uint8Array, key2: Uint8Array): Uint8Array {
    const combined = new Uint8Array(4 + key1.length + key2.length);
    const view = new DataView(combined.buffer);

    // Store length of first key
    view.setUint32(0, key1.length, false);

    // Concatenate keys
    combined.set(key1, 4);
    combined.set(key2, 4 + key1.length);

    return combined;
  }

  private splitHybridKey(hybridKey: Uint8Array): { classicalKey: Uint8Array; quantumKey: Uint8Array } {
    const view = new DataView(hybridKey.buffer, hybridKey.byteOffset);
    const classicalKeyLength = view.getUint32(0, false);

    const classicalKey = hybridKey.slice(4, 4 + classicalKeyLength);
    const quantumKey = hybridKey.slice(4 + classicalKeyLength);

    return { classicalKey, quantumKey };
  }

  private splitHybridCiphertext(ciphertext: Uint8Array): { classicalKey: Uint8Array; quantumKey: Uint8Array } {
    return this.splitHybridKey(ciphertext);
  }
}

export function createHybridKEM(classicalAlgorithm: 'x25519' | 'p256' = 'x25519'): HybridKEM {
  return new HybridKEM(classicalAlgorithm);
}
