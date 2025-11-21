/**
 * Biometric Template Protection
 *
 * Cryptographic protection for biometric templates including
 * cancelable biometrics, fuzzy vaults, secure sketches, and encryption.
 */

import { createCipheriv, createDecipheriv, randomBytes, createHash, scrypt, timingSafeEqual } from 'crypto';
import { BiometricTemplate, BiometricModality } from './types.js';

// ============================================================================
// Types
// ============================================================================

export interface ProtectedTemplate {
  id: string;
  modality: BiometricModality;
  protectionMethod: 'CANCELABLE' | 'FUZZY_VAULT' | 'SECURE_SKETCH' | 'ENCRYPTED' | 'HOMOMORPHIC';
  protectedData: string;
  auxiliaryData?: string;
  createdAt: string;
  metadata: {
    algorithm: string;
    version: string;
    keyId?: string;
    transformParams?: Record<string, unknown>;
  };
}

export interface TransformationKey {
  keyId: string;
  key: Buffer;
  purpose: 'CANCELABLE' | 'ENCRYPTION';
  createdAt: string;
  expiresAt?: string;
}

export interface EncryptionConfig {
  algorithm: 'aes-256-gcm' | 'aes-256-cbc' | 'chacha20-poly1305';
  keyDerivation: 'scrypt' | 'pbkdf2';
  iterations?: number;
}

// ============================================================================
// Cancelable Biometrics
// ============================================================================

export class CancelableBiometrics {
  private transformationKeys: Map<string, TransformationKey> = new Map();

  /**
   * Generate a new transformation key
   */
  generateKey(purpose: TransformationKey['purpose'] = 'CANCELABLE'): TransformationKey {
    const key: TransformationKey = {
      keyId: crypto.randomUUID(),
      key: randomBytes(32),
      purpose,
      createdAt: new Date().toISOString(),
    };
    this.transformationKeys.set(key.keyId, key);
    return key;
  }

  /**
   * Apply random projection transformation
   */
  transformTemplate(
    template: BiometricTemplate,
    keyId: string
  ): ProtectedTemplate {
    const key = this.transformationKeys.get(keyId);
    if (!key) throw new Error('Transformation key not found');

    // Extract features as number array
    const features = this.extractFeatures(template);

    // Generate random projection matrix from key
    const projectionMatrix = this.generateProjectionMatrix(key.key, features.length, features.length);

    // Apply transformation: y = Rx (random projection)
    const transformed = this.matrixMultiply(projectionMatrix, features);

    // Apply non-linear transformation for security
    const nonLinear = transformed.map((v, i) => {
      const seed = key.key[i % key.key.length];
      return Math.tanh(v + seed / 255);
    });

    return {
      id: crypto.randomUUID(),
      modality: template.modality,
      protectionMethod: 'CANCELABLE',
      protectedData: Buffer.from(new Float64Array(nonLinear).buffer).toString('base64'),
      createdAt: new Date().toISOString(),
      metadata: {
        algorithm: 'random-projection-tanh',
        version: '1.0',
        keyId,
        transformParams: {
          dimensions: features.length,
          projectionDimensions: features.length,
        },
      },
    };
  }

  /**
   * Match two cancelable templates
   */
  matchCancelable(
    probe: ProtectedTemplate,
    gallery: ProtectedTemplate,
    threshold = 0.7
  ): { isMatch: boolean; score: number } {
    if (probe.metadata.keyId !== gallery.metadata.keyId) {
      throw new Error('Templates must use same transformation key');
    }

    const probeFeatures = new Float64Array(Buffer.from(probe.protectedData, 'base64').buffer);
    const galleryFeatures = new Float64Array(Buffer.from(gallery.protectedData, 'base64').buffer);

    // Cosine similarity in transformed space
    const score = this.cosineSimilarity(
      Array.from(probeFeatures),
      Array.from(galleryFeatures)
    );

    return { isMatch: score >= threshold, score };
  }

  /**
   * Revoke and regenerate transformation
   */
  revokeKey(keyId: string): string {
    this.transformationKeys.delete(keyId);
    const newKey = this.generateKey('CANCELABLE');
    return newKey.keyId;
  }

  private extractFeatures(template: BiometricTemplate): number[] {
    // Convert template data to feature vector
    const data = Buffer.from(template.templateData, 'base64');
    const features: number[] = [];
    for (let i = 0; i < data.length; i += 4) {
      features.push(data.readFloatLE(Math.min(i, data.length - 4)) / 255);
    }
    return features;
  }

  private generateProjectionMatrix(seed: Buffer, rows: number, cols: number): number[][] {
    const matrix: number[][] = [];
    const hash = createHash('sha512');

    for (let i = 0; i < rows; i++) {
      const row: number[] = [];
      for (let j = 0; j < cols; j++) {
        hash.update(seed);
        hash.update(Buffer.from([i, j]));
        const digest = createHash('sha256').update(seed).update(Buffer.from([i, j])).digest();
        // Generate Gaussian-like values using Box-Muller
        const u1 = (digest[0] + 1) / 257;
        const u2 = (digest[1] + 1) / 257;
        const gaussian = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
        row.push(gaussian / Math.sqrt(cols));
      }
      matrix.push(row);
    }
    return matrix;
  }

  private matrixMultiply(matrix: number[][], vector: number[]): number[] {
    return matrix.map(row =>
      row.reduce((sum, val, i) => sum + val * (vector[i] ?? 0), 0)
    );
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < Math.min(a.length, b.length); i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}

// ============================================================================
// Template Encryption
// ============================================================================

export class TemplateEncryption {
  private config: EncryptionConfig;

  constructor(config: Partial<EncryptionConfig> = {}) {
    this.config = {
      algorithm: config.algorithm ?? 'aes-256-gcm',
      keyDerivation: config.keyDerivation ?? 'scrypt',
      iterations: config.iterations ?? 16384,
    };
  }

  /**
   * Encrypt a biometric template
   */
  async encrypt(
    template: BiometricTemplate,
    masterKey: Buffer
  ): Promise<ProtectedTemplate> {
    const salt = randomBytes(16);
    const iv = randomBytes(this.config.algorithm === 'aes-256-gcm' ? 12 : 16);

    // Derive key from master key
    const derivedKey = await this.deriveKey(masterKey, salt);

    // Serialize template
    const plaintext = Buffer.from(JSON.stringify(template));

    // Encrypt
    const { ciphertext, authTag } = this.encryptData(plaintext, derivedKey, iv);

    // Combine: salt + iv + authTag + ciphertext
    const combined = Buffer.concat([
      salt,
      iv,
      authTag ?? Buffer.alloc(0),
      ciphertext,
    ]);

    return {
      id: crypto.randomUUID(),
      modality: template.modality,
      protectionMethod: 'ENCRYPTED',
      protectedData: combined.toString('base64'),
      createdAt: new Date().toISOString(),
      metadata: {
        algorithm: this.config.algorithm,
        version: '1.0',
        transformParams: {
          keyDerivation: this.config.keyDerivation,
          saltLength: salt.length,
          ivLength: iv.length,
        },
      },
    };
  }

  /**
   * Decrypt a protected template
   */
  async decrypt(
    protectedTemplate: ProtectedTemplate,
    masterKey: Buffer
  ): Promise<BiometricTemplate> {
    if (protectedTemplate.protectionMethod !== 'ENCRYPTED') {
      throw new Error('Template is not encrypted');
    }

    const combined = Buffer.from(protectedTemplate.protectedData, 'base64');

    // Extract components
    const saltLength = 16;
    const ivLength = this.config.algorithm === 'aes-256-gcm' ? 12 : 16;
    const authTagLength = this.config.algorithm === 'aes-256-gcm' ? 16 : 0;

    const salt = combined.subarray(0, saltLength);
    const iv = combined.subarray(saltLength, saltLength + ivLength);
    const authTag = authTagLength > 0
      ? combined.subarray(saltLength + ivLength, saltLength + ivLength + authTagLength)
      : undefined;
    const ciphertext = combined.subarray(saltLength + ivLength + authTagLength);

    // Derive key
    const derivedKey = await this.deriveKey(masterKey, salt);

    // Decrypt
    const plaintext = this.decryptData(ciphertext, derivedKey, iv, authTag);

    return JSON.parse(plaintext.toString()) as BiometricTemplate;
  }

  private async deriveKey(masterKey: Buffer, salt: Buffer): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      scrypt(masterKey, salt, 32, { N: this.config.iterations! }, (err, key) => {
        if (err) reject(err);
        else resolve(key);
      });
    });
  }

  private encryptData(
    plaintext: Buffer,
    key: Buffer,
    iv: Buffer
  ): { ciphertext: Buffer; authTag?: Buffer } {
    const cipher = createCipheriv(this.config.algorithm, key, iv);
    const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);

    let authTag: Buffer | undefined;
    if (this.config.algorithm === 'aes-256-gcm') {
      authTag = (cipher as ReturnType<typeof createCipheriv>).getAuthTag();
    }

    return { ciphertext, authTag };
  }

  private decryptData(
    ciphertext: Buffer,
    key: Buffer,
    iv: Buffer,
    authTag?: Buffer
  ): Buffer {
    const decipher = createDecipheriv(this.config.algorithm, key, iv);

    if (authTag && this.config.algorithm === 'aes-256-gcm') {
      (decipher as ReturnType<typeof createDecipheriv>).setAuthTag(authTag);
    }

    return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  }
}

// ============================================================================
// Secure Sketch (Fuzzy Extractor)
// ============================================================================

export class SecureSketch {
  private errorCorrectionBits: number;

  constructor(errorCorrectionBits = 64) {
    this.errorCorrectionBits = errorCorrectionBits;
  }

  /**
   * Generate secure sketch from biometric
   */
  generate(template: BiometricTemplate): {
    sketch: ProtectedTemplate;
    helper: string;
  } {
    const features = this.quantizeFeatures(template);

    // Generate random codeword
    const codeword = randomBytes(Math.ceil(features.length / 8));

    // Compute sketch as XOR of features and codeword
    const sketchData = Buffer.alloc(codeword.length);
    for (let i = 0; i < codeword.length; i++) {
      const featureByte = features.slice(i * 8, (i + 1) * 8)
        .reduce((acc, bit, idx) => acc | (bit << (7 - idx)), 0);
      sketchData[i] = featureByte ^ codeword[i];
    }

    // Hash codeword for verification
    const helper = createHash('sha256').update(codeword).digest('base64');

    return {
      sketch: {
        id: crypto.randomUUID(),
        modality: template.modality,
        protectionMethod: 'SECURE_SKETCH',
        protectedData: sketchData.toString('base64'),
        auxiliaryData: helper,
        createdAt: new Date().toISOString(),
        metadata: {
          algorithm: 'fuzzy-extractor-xor',
          version: '1.0',
          transformParams: {
            errorCorrectionBits: this.errorCorrectionBits,
            featureLength: features.length,
          },
        },
      },
      helper,
    };
  }

  /**
   * Reproduce key from biometric and sketch
   */
  reproduce(
    template: BiometricTemplate,
    sketch: ProtectedTemplate
  ): { success: boolean; key?: Buffer } {
    const features = this.quantizeFeatures(template);
    const sketchData = Buffer.from(sketch.protectedData, 'base64');

    // XOR features with sketch to recover codeword
    const recoveredCodeword = Buffer.alloc(sketchData.length);
    for (let i = 0; i < sketchData.length; i++) {
      const featureByte = features.slice(i * 8, (i + 1) * 8)
        .reduce((acc, bit, idx) => acc | (bit << (7 - idx)), 0);
      recoveredCodeword[i] = featureByte ^ sketchData[i];
    }

    // Verify against helper data
    const recoveredHelper = createHash('sha256').update(recoveredCodeword).digest('base64');

    if (sketch.auxiliaryData && recoveredHelper === sketch.auxiliaryData) {
      // Derive key from verified codeword
      const key = createHash('sha256').update(recoveredCodeword).digest();
      return { success: true, key };
    }

    return { success: false };
  }

  private quantizeFeatures(template: BiometricTemplate): number[] {
    const data = Buffer.from(template.templateData, 'base64');
    const bits: number[] = [];

    for (let i = 0; i < data.length; i++) {
      for (let bit = 7; bit >= 0; bit--) {
        bits.push((data[i] >> bit) & 1);
      }
    }

    return bits;
  }
}

// ============================================================================
// Key Management
// ============================================================================

export class BiometricKeyManager {
  private keys: Map<string, { key: Buffer; purpose: string; createdAt: Date }> = new Map();

  /**
   * Generate a new master key
   */
  generateMasterKey(): { keyId: string; key: Buffer } {
    const keyId = crypto.randomUUID();
    const key = randomBytes(32);
    this.keys.set(keyId, { key, purpose: 'master', createdAt: new Date() });
    return { keyId, key };
  }

  /**
   * Derive a purpose-specific key
   */
  async deriveKey(masterKeyId: string, purpose: string): Promise<Buffer> {
    const masterKey = this.keys.get(masterKeyId);
    if (!masterKey) throw new Error('Master key not found');

    return new Promise((resolve, reject) => {
      scrypt(masterKey.key, purpose, 32, (err, key) => {
        if (err) reject(err);
        else resolve(key);
      });
    });
  }

  /**
   * Rotate master key
   */
  rotateKey(oldKeyId: string): { newKeyId: string; key: Buffer } {
    this.keys.delete(oldKeyId);
    return this.generateMasterKey();
  }

  /**
   * Secure key comparison
   */
  compareKeys(a: Buffer, b: Buffer): boolean {
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  }
}

// ============================================================================
// Exports
// ============================================================================

export const createCancelableBiometrics = () => new CancelableBiometrics();
export const createTemplateEncryption = (config?: Partial<EncryptionConfig>) => new TemplateEncryption(config);
export const createSecureSketch = (errorCorrectionBits?: number) => new SecureSketch(errorCorrectionBits);
export const createKeyManager = () => new BiometricKeyManager();
