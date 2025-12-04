/**
 * Quantum-Resistant Cryptography Service
 * Provides post-quantum cryptographic operations for Summit platform
 * Implements NIST PQC standards: Kyber, Dilithium, FALCON, SPHINCS+
 */

import { EventEmitter } from 'events';
import {
  KyberKEM,
  createKyberKEM,
  DilithiumSignature,
  createDilithiumSignature,
  FalconSignature,
  createFalconSignature,
  SphincsSignature,
  createSphincsSignature,
  HybridKEM,
  createHybridKEM,
  PQCValidator,
  createValidator,
  PQCBenchmarker,
  createBenchmarker,
  PQCAlgorithm,
  SecurityLevel,
  KeyPair,
  Signature,
  EncapsulatedSecret,
} from '@summit/post-quantum-crypto';

export interface PQCKeyStore {
  keyId: string;
  algorithm: PQCAlgorithm;
  publicKey: Uint8Array;
  privateKey?: Uint8Array;
  createdAt: Date;
  expiresAt?: Date;
  metadata?: Record<string, unknown>;
}

export interface PQCOperationResult {
  success: boolean;
  operation: string;
  algorithm: PQCAlgorithm;
  timestamp: Date;
  durationMs: number;
  error?: string;
}

export interface KeyRotationPolicy {
  algorithmId: PQCAlgorithm;
  rotationIntervalDays: number;
  autoRotate: boolean;
  notifyBeforeDays: number;
}

export interface QuantumRiskReport {
  timestamp: Date;
  vulnerableAssets: number;
  migratedAssets: number;
  pendingMigrations: number;
  recommendations: string[];
  overallRiskLevel: 'low' | 'medium' | 'high' | 'critical';
}

export class QuantumResistantCryptoService extends EventEmitter {
  private keyStore: Map<string, PQCKeyStore> = new Map();
  private rotationPolicies: Map<PQCAlgorithm, KeyRotationPolicy> = new Map();
  private operationLog: PQCOperationResult[] = [];
  private maxOperationHistory = 10000;

  // Algorithm instances
  private kyber768: KyberKEM;
  private kyber1024: KyberKEM;
  private dilithium3: DilithiumSignature;
  private dilithium5: DilithiumSignature;
  private falcon512: FalconSignature;
  private sphincs128f: SphincsSignature;
  private hybridKEM: HybridKEM;
  private validator: PQCValidator;
  private benchmarker: PQCBenchmarker;

  constructor() {
    super();
    console.log('[PQC] Initializing Quantum-Resistant Cryptography Service');

    // Initialize algorithm instances
    this.kyber768 = createKyberKEM(SecurityLevel.LEVEL_3);
    this.kyber1024 = createKyberKEM(SecurityLevel.LEVEL_5);
    this.dilithium3 = createDilithiumSignature(SecurityLevel.LEVEL_3);
    this.dilithium5 = createDilithiumSignature(SecurityLevel.LEVEL_5);
    this.falcon512 = createFalconSignature(SecurityLevel.LEVEL_1);
    this.sphincs128f = createSphincsSignature(SecurityLevel.LEVEL_1, true);
    this.hybridKEM = createHybridKEM('x25519');
    this.validator = createValidator();
    this.benchmarker = createBenchmarker(10);

    // Initialize default rotation policies
    this.initializeRotationPolicies();

    // Start key rotation monitor
    setInterval(() => this.checkKeyRotations(), 3600000); // Every hour

    console.log('[PQC] Service initialized with NIST PQC algorithms');
  }

  private initializeRotationPolicies(): void {
    const defaultPolicies: KeyRotationPolicy[] = [
      {
        algorithmId: PQCAlgorithm.KYBER_768,
        rotationIntervalDays: 90,
        autoRotate: true,
        notifyBeforeDays: 7,
      },
      {
        algorithmId: PQCAlgorithm.KYBER_1024,
        rotationIntervalDays: 180,
        autoRotate: true,
        notifyBeforeDays: 14,
      },
      {
        algorithmId: PQCAlgorithm.DILITHIUM_3,
        rotationIntervalDays: 365,
        autoRotate: false,
        notifyBeforeDays: 30,
      },
      {
        algorithmId: PQCAlgorithm.DILITHIUM_5,
        rotationIntervalDays: 365,
        autoRotate: false,
        notifyBeforeDays: 30,
      },
    ];

    for (const policy of defaultPolicies) {
      this.rotationPolicies.set(policy.algorithmId, policy);
    }
  }

  /**
   * Generate a new post-quantum key pair
   */
  async generateKeyPair(
    algorithm: PQCAlgorithm,
    options: {
      keyId?: string;
      expiresInDays?: number;
      metadata?: Record<string, unknown>;
    } = {}
  ): Promise<PQCKeyStore> {
    const startTime = Date.now();

    try {
      let keyPair: KeyPair;

      switch (algorithm) {
        case PQCAlgorithm.KYBER_512:
          keyPair = await createKyberKEM(SecurityLevel.LEVEL_1).generateKeyPair();
          break;
        case PQCAlgorithm.KYBER_768:
          keyPair = await this.kyber768.generateKeyPair();
          break;
        case PQCAlgorithm.KYBER_1024:
          keyPair = await this.kyber1024.generateKeyPair();
          break;
        case PQCAlgorithm.DILITHIUM_2:
          keyPair = await createDilithiumSignature(SecurityLevel.LEVEL_2).generateKeyPair();
          break;
        case PQCAlgorithm.DILITHIUM_3:
          keyPair = await this.dilithium3.generateKeyPair();
          break;
        case PQCAlgorithm.DILITHIUM_5:
          keyPair = await this.dilithium5.generateKeyPair();
          break;
        case PQCAlgorithm.FALCON_512:
          keyPair = await this.falcon512.generateKeyPair();
          break;
        case PQCAlgorithm.FALCON_1024:
          keyPair = await createFalconSignature(SecurityLevel.LEVEL_5).generateKeyPair();
          break;
        case PQCAlgorithm.SPHINCS_PLUS_128F:
          keyPair = await this.sphincs128f.generateKeyPair();
          break;
        default:
          throw new Error(`Unsupported algorithm: ${algorithm}`);
      }

      const keyId = options.keyId || this.generateKeyId();
      const now = new Date();
      const expiresAt = options.expiresInDays
        ? new Date(now.getTime() + options.expiresInDays * 24 * 60 * 60 * 1000)
        : undefined;

      const keyStore: PQCKeyStore = {
        keyId,
        algorithm,
        publicKey: keyPair.publicKey,
        privateKey: keyPair.privateKey,
        createdAt: now,
        expiresAt,
        metadata: {
          ...options.metadata,
          securityLevel: keyPair.securityLevel,
          ...keyPair.metadata,
        },
      };

      this.keyStore.set(keyId, keyStore);
      this.logOperation({
        success: true,
        operation: 'generateKeyPair',
        algorithm,
        timestamp: now,
        durationMs: Date.now() - startTime,
      });

      this.emit('keyGenerated', { keyId, algorithm });
      console.log(`[PQC] Generated ${algorithm} key pair: ${keyId}`);

      return keyStore;
    } catch (error) {
      const err = error as Error;
      this.logOperation({
        success: false,
        operation: 'generateKeyPair',
        algorithm,
        timestamp: new Date(),
        durationMs: Date.now() - startTime,
        error: err.message,
      });
      throw error;
    }
  }

  /**
   * Encapsulate a shared secret using Kyber KEM
   */
  async encapsulate(
    keyId: string
  ): Promise<{ ciphertext: Uint8Array; sharedSecret: Uint8Array }> {
    const startTime = Date.now();
    const keyStore = this.keyStore.get(keyId);

    if (!keyStore) {
      throw new Error(`Key not found: ${keyId}`);
    }

    if (!this.isKEMAlgorithm(keyStore.algorithm)) {
      throw new Error(`Algorithm ${keyStore.algorithm} does not support encapsulation`);
    }

    try {
      let result: EncapsulatedSecret;

      if (keyStore.algorithm.startsWith('kyber')) {
        const kem = this.getKyberInstance(keyStore.algorithm);
        result = await kem.encapsulate(keyStore.publicKey);
      } else {
        // Hybrid KEM
        result = await this.hybridKEM.encapsulate(keyStore.publicKey);
      }

      this.logOperation({
        success: true,
        operation: 'encapsulate',
        algorithm: keyStore.algorithm,
        timestamp: new Date(),
        durationMs: Date.now() - startTime,
      });

      return result;
    } catch (error) {
      const err = error as Error;
      this.logOperation({
        success: false,
        operation: 'encapsulate',
        algorithm: keyStore.algorithm,
        timestamp: new Date(),
        durationMs: Date.now() - startTime,
        error: err.message,
      });
      throw error;
    }
  }

  /**
   * Decapsulate a shared secret using Kyber KEM
   */
  async decapsulate(keyId: string, ciphertext: Uint8Array): Promise<Uint8Array> {
    const startTime = Date.now();
    const keyStore = this.keyStore.get(keyId);

    if (!keyStore) {
      throw new Error(`Key not found: ${keyId}`);
    }

    if (!keyStore.privateKey) {
      throw new Error(`Private key not available for: ${keyId}`);
    }

    if (!this.isKEMAlgorithm(keyStore.algorithm)) {
      throw new Error(`Algorithm ${keyStore.algorithm} does not support decapsulation`);
    }

    try {
      let sharedSecret: Uint8Array;

      if (keyStore.algorithm.startsWith('kyber')) {
        const kem = this.getKyberInstance(keyStore.algorithm);
        sharedSecret = await kem.decapsulate(ciphertext, keyStore.privateKey);
      } else {
        sharedSecret = await this.hybridKEM.decapsulate(ciphertext, keyStore.privateKey);
      }

      this.logOperation({
        success: true,
        operation: 'decapsulate',
        algorithm: keyStore.algorithm,
        timestamp: new Date(),
        durationMs: Date.now() - startTime,
      });

      return sharedSecret;
    } catch (error) {
      const err = error as Error;
      this.logOperation({
        success: false,
        operation: 'decapsulate',
        algorithm: keyStore.algorithm,
        timestamp: new Date(),
        durationMs: Date.now() - startTime,
        error: err.message,
      });
      throw error;
    }
  }

  /**
   * Sign a message using a post-quantum signature scheme
   */
  async sign(keyId: string, message: Uint8Array): Promise<Signature> {
    const startTime = Date.now();
    const keyStore = this.keyStore.get(keyId);

    if (!keyStore) {
      throw new Error(`Key not found: ${keyId}`);
    }

    if (!keyStore.privateKey) {
      throw new Error(`Private key not available for: ${keyId}`);
    }

    if (!this.isSignatureAlgorithm(keyStore.algorithm)) {
      throw new Error(`Algorithm ${keyStore.algorithm} does not support signing`);
    }

    try {
      const signer = this.getSignatureInstance(keyStore.algorithm);
      const signature = await signer.sign(message, keyStore.privateKey);

      this.logOperation({
        success: true,
        operation: 'sign',
        algorithm: keyStore.algorithm,
        timestamp: new Date(),
        durationMs: Date.now() - startTime,
      });

      return signature;
    } catch (error) {
      const err = error as Error;
      this.logOperation({
        success: false,
        operation: 'sign',
        algorithm: keyStore.algorithm,
        timestamp: new Date(),
        durationMs: Date.now() - startTime,
        error: err.message,
      });
      throw error;
    }
  }

  /**
   * Verify a signature using a post-quantum signature scheme
   */
  async verify(
    keyId: string,
    message: Uint8Array,
    signature: Uint8Array
  ): Promise<boolean> {
    const startTime = Date.now();
    const keyStore = this.keyStore.get(keyId);

    if (!keyStore) {
      throw new Error(`Key not found: ${keyId}`);
    }

    if (!this.isSignatureAlgorithm(keyStore.algorithm)) {
      throw new Error(`Algorithm ${keyStore.algorithm} does not support verification`);
    }

    try {
      const signer = this.getSignatureInstance(keyStore.algorithm);
      const isValid = await signer.verify(message, signature, keyStore.publicKey);

      this.logOperation({
        success: true,
        operation: 'verify',
        algorithm: keyStore.algorithm,
        timestamp: new Date(),
        durationMs: Date.now() - startTime,
      });

      return isValid;
    } catch (error) {
      const err = error as Error;
      this.logOperation({
        success: false,
        operation: 'verify',
        algorithm: keyStore.algorithm,
        timestamp: new Date(),
        durationMs: Date.now() - startTime,
        error: err.message,
      });
      throw error;
    }
  }

  /**
   * Generate a hybrid key pair (classical + post-quantum)
   */
  async generateHybridKeyPair(options: {
    keyId?: string;
    classicalAlgorithm?: 'x25519' | 'p256';
    quantumSecurityLevel?: SecurityLevel;
    expiresInDays?: number;
  } = {}): Promise<PQCKeyStore> {
    const startTime = Date.now();

    try {
      const hybridKem = options.classicalAlgorithm
        ? createHybridKEM(options.classicalAlgorithm)
        : this.hybridKEM;

      const keyPair = await hybridKem.generateKeyPair();

      const keyId = options.keyId || this.generateKeyId();
      const now = new Date();
      const expiresAt = options.expiresInDays
        ? new Date(now.getTime() + options.expiresInDays * 24 * 60 * 60 * 1000)
        : undefined;

      const keyStore: PQCKeyStore = {
        keyId,
        algorithm: keyPair.algorithm,
        publicKey: keyPair.publicKey,
        privateKey: keyPair.privateKey,
        createdAt: now,
        expiresAt,
        metadata: {
          hybrid: true,
          classicalAlgorithm: options.classicalAlgorithm || 'x25519',
          ...keyPair.metadata,
        },
      };

      this.keyStore.set(keyId, keyStore);

      this.logOperation({
        success: true,
        operation: 'generateHybridKeyPair',
        algorithm: keyPair.algorithm,
        timestamp: now,
        durationMs: Date.now() - startTime,
      });

      this.emit('keyGenerated', { keyId, algorithm: keyPair.algorithm, hybrid: true });
      console.log(`[PQC] Generated hybrid key pair: ${keyId}`);

      return keyStore;
    } catch (error) {
      const err = error as Error;
      this.logOperation({
        success: false,
        operation: 'generateHybridKeyPair',
        algorithm: PQCAlgorithm.KYBER_768,
        timestamp: new Date(),
        durationMs: Date.now() - startTime,
        error: err.message,
      });
      throw error;
    }
  }

  /**
   * Validate algorithm implementation
   */
  async validateAlgorithm(algorithm: PQCAlgorithm): Promise<boolean> {
    if (this.isKEMAlgorithm(algorithm)) {
      const kem = this.getKyberInstance(algorithm);
      return this.validator.validateKEM(kem, 5);
    } else if (this.isSignatureAlgorithm(algorithm)) {
      const signer = this.getSignatureInstance(algorithm);
      return this.validator.validateSignature(signer, 5);
    }
    return false;
  }

  /**
   * Run performance benchmark for an algorithm
   */
  async benchmarkAlgorithm(algorithm: PQCAlgorithm): Promise<string> {
    if (this.isKEMAlgorithm(algorithm)) {
      const kem = this.getKyberInstance(algorithm);
      const results = await this.benchmarker.benchmarkKEM(kem);
      return this.benchmarker.formatResults(results);
    } else if (this.isSignatureAlgorithm(algorithm)) {
      const signer = this.getSignatureInstance(algorithm);
      const results = await this.benchmarker.benchmarkSignature(signer);
      return this.benchmarker.formatResults(results);
    }
    throw new Error(`Unknown algorithm: ${algorithm}`);
  }

  /**
   * Get quantum risk assessment report
   */
  async getQuantumRiskReport(): Promise<QuantumRiskReport> {
    const keys = Array.from(this.keyStore.values());
    const now = new Date();

    const vulnerableAssets = keys.filter((k) => !this.isQuantumResistant(k.algorithm)).length;
    const migratedAssets = keys.filter((k) => this.isQuantumResistant(k.algorithm)).length;
    const pendingMigrations = vulnerableAssets;

    const recommendations: string[] = [];

    if (vulnerableAssets > 0) {
      recommendations.push('Migrate RSA/ECDSA keys to CRYSTALS-Dilithium or FALCON');
      recommendations.push('Replace classical key exchanges with Kyber KEM');
    }

    const expiringSoon = keys.filter(
      (k) => k.expiresAt && k.expiresAt.getTime() - now.getTime() < 30 * 24 * 60 * 60 * 1000
    );
    if (expiringSoon.length > 0) {
      recommendations.push(`${expiringSoon.length} keys expire within 30 days - schedule rotation`);
    }

    recommendations.push('Implement hybrid schemes for defense-in-depth');
    recommendations.push('Enable automatic key rotation for KEMs');
    recommendations.push('Conduct regular algorithm validation tests');

    let overallRiskLevel: 'low' | 'medium' | 'high' | 'critical';
    if (vulnerableAssets === 0) {
      overallRiskLevel = 'low';
    } else if (vulnerableAssets < migratedAssets) {
      overallRiskLevel = 'medium';
    } else if (vulnerableAssets < migratedAssets * 2) {
      overallRiskLevel = 'high';
    } else {
      overallRiskLevel = 'critical';
    }

    return {
      timestamp: now,
      vulnerableAssets,
      migratedAssets,
      pendingMigrations,
      recommendations,
      overallRiskLevel,
    };
  }

  /**
   * Get key by ID
   */
  getKey(keyId: string): PQCKeyStore | undefined {
    return this.keyStore.get(keyId);
  }

  /**
   * Get public key only (safe to share)
   */
  getPublicKey(keyId: string): Uint8Array | undefined {
    return this.keyStore.get(keyId)?.publicKey;
  }

  /**
   * List all keys
   */
  listKeys(options: { algorithm?: PQCAlgorithm; includeExpired?: boolean } = {}): PQCKeyStore[] {
    const now = new Date();
    return Array.from(this.keyStore.values())
      .filter((k) => {
        if (options.algorithm && k.algorithm !== options.algorithm) return false;
        if (!options.includeExpired && k.expiresAt && k.expiresAt < now) return false;
        return true;
      })
      .map((k) => ({
        ...k,
        privateKey: undefined, // Don't expose private keys in listings
      }));
  }

  /**
   * Delete a key from the store
   */
  deleteKey(keyId: string): boolean {
    const deleted = this.keyStore.delete(keyId);
    if (deleted) {
      this.emit('keyDeleted', { keyId });
      console.log(`[PQC] Deleted key: ${keyId}`);
    }
    return deleted;
  }

  /**
   * Rotate a key
   */
  async rotateKey(keyId: string): Promise<PQCKeyStore> {
    const oldKey = this.keyStore.get(keyId);
    if (!oldKey) {
      throw new Error(`Key not found: ${keyId}`);
    }

    const policy = this.rotationPolicies.get(oldKey.algorithm);
    const expiresInDays = policy?.rotationIntervalDays || 90;

    const newKey = await this.generateKeyPair(oldKey.algorithm, {
      expiresInDays,
      metadata: {
        ...oldKey.metadata,
        rotatedFrom: keyId,
        rotationDate: new Date().toISOString(),
      },
    });

    // Mark old key as rotated
    oldKey.metadata = {
      ...oldKey.metadata,
      rotatedTo: newKey.keyId,
      rotationDate: new Date().toISOString(),
    };
    this.keyStore.set(keyId, oldKey);

    this.emit('keyRotated', { oldKeyId: keyId, newKeyId: newKey.keyId });
    console.log(`[PQC] Rotated key ${keyId} -> ${newKey.keyId}`);

    return newKey;
  }

  /**
   * Get operation statistics
   */
  getStatistics(): {
    totalKeys: number;
    keysByAlgorithm: Record<string, number>;
    operations: {
      total: number;
      successful: number;
      failed: number;
      byOperation: Record<string, number>;
    };
    recentOperations: PQCOperationResult[];
  } {
    const keys = Array.from(this.keyStore.values());
    const keysByAlgorithm = keys.reduce(
      (acc, key) => {
        acc[key.algorithm] = (acc[key.algorithm] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const operations = this.operationLog;
    const successful = operations.filter((o) => o.success).length;
    const failed = operations.filter((o) => !o.success).length;
    const byOperation = operations.reduce(
      (acc, op) => {
        acc[op.operation] = (acc[op.operation] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    return {
      totalKeys: keys.length,
      keysByAlgorithm,
      operations: {
        total: operations.length,
        successful,
        failed,
        byOperation,
      },
      recentOperations: operations.slice(0, 50),
    };
  }

  /**
   * Get supported algorithms
   */
  getSupportedAlgorithms(): {
    kem: PQCAlgorithm[];
    signature: PQCAlgorithm[];
  } {
    return {
      kem: [
        PQCAlgorithm.KYBER_512,
        PQCAlgorithm.KYBER_768,
        PQCAlgorithm.KYBER_1024,
      ],
      signature: [
        PQCAlgorithm.DILITHIUM_2,
        PQCAlgorithm.DILITHIUM_3,
        PQCAlgorithm.DILITHIUM_5,
        PQCAlgorithm.FALCON_512,
        PQCAlgorithm.FALCON_1024,
        PQCAlgorithm.SPHINCS_PLUS_128F,
        PQCAlgorithm.SPHINCS_PLUS_128S,
        PQCAlgorithm.SPHINCS_PLUS_192F,
        PQCAlgorithm.SPHINCS_PLUS_192S,
        PQCAlgorithm.SPHINCS_PLUS_256F,
        PQCAlgorithm.SPHINCS_PLUS_256S,
      ],
    };
  }

  // Private helper methods

  private generateKeyId(): string {
    return `pqc-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }

  private isKEMAlgorithm(algorithm: PQCAlgorithm): boolean {
    return algorithm.startsWith('kyber');
  }

  private isSignatureAlgorithm(algorithm: PQCAlgorithm): boolean {
    return (
      algorithm.startsWith('dilithium') ||
      algorithm.startsWith('falcon') ||
      algorithm.startsWith('sphincs')
    );
  }

  private isQuantumResistant(algorithm: PQCAlgorithm): boolean {
    return (
      algorithm.startsWith('kyber') ||
      algorithm.startsWith('dilithium') ||
      algorithm.startsWith('falcon') ||
      algorithm.startsWith('sphincs')
    );
  }

  private getKyberInstance(algorithm: PQCAlgorithm): KyberKEM {
    switch (algorithm) {
      case PQCAlgorithm.KYBER_512:
        return createKyberKEM(SecurityLevel.LEVEL_1);
      case PQCAlgorithm.KYBER_768:
        return this.kyber768;
      case PQCAlgorithm.KYBER_1024:
        return this.kyber1024;
      default:
        return this.kyber768;
    }
  }

  private getSignatureInstance(
    algorithm: PQCAlgorithm
  ): DilithiumSignature | FalconSignature | SphincsSignature {
    switch (algorithm) {
      case PQCAlgorithm.DILITHIUM_2:
        return createDilithiumSignature(SecurityLevel.LEVEL_2);
      case PQCAlgorithm.DILITHIUM_3:
        return this.dilithium3;
      case PQCAlgorithm.DILITHIUM_5:
        return this.dilithium5;
      case PQCAlgorithm.FALCON_512:
        return this.falcon512;
      case PQCAlgorithm.FALCON_1024:
        return createFalconSignature(SecurityLevel.LEVEL_5);
      case PQCAlgorithm.SPHINCS_PLUS_128F:
        return this.sphincs128f;
      case PQCAlgorithm.SPHINCS_PLUS_128S:
        return createSphincsSignature(SecurityLevel.LEVEL_1, false);
      case PQCAlgorithm.SPHINCS_PLUS_192F:
        return createSphincsSignature(SecurityLevel.LEVEL_3, true);
      case PQCAlgorithm.SPHINCS_PLUS_192S:
        return createSphincsSignature(SecurityLevel.LEVEL_3, false);
      case PQCAlgorithm.SPHINCS_PLUS_256F:
        return createSphincsSignature(SecurityLevel.LEVEL_5, true);
      case PQCAlgorithm.SPHINCS_PLUS_256S:
        return createSphincsSignature(SecurityLevel.LEVEL_5, false);
      default:
        return this.dilithium3;
    }
  }

  private logOperation(result: PQCOperationResult): void {
    this.operationLog.unshift(result);
    if (this.operationLog.length > this.maxOperationHistory) {
      this.operationLog = this.operationLog.slice(0, this.maxOperationHistory);
    }
    this.emit('operation', result);
  }

  private checkKeyRotations(): void {
    const now = new Date();

    for (const [keyId, keyStore] of this.keyStore.entries()) {
      const policy = this.rotationPolicies.get(keyStore.algorithm);
      if (!policy) continue;

      if (keyStore.expiresAt) {
        const daysUntilExpiry =
          (keyStore.expiresAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000);

        if (daysUntilExpiry <= policy.notifyBeforeDays) {
          this.emit('keyExpiringWarning', {
            keyId,
            algorithm: keyStore.algorithm,
            expiresAt: keyStore.expiresAt,
            daysRemaining: Math.floor(daysUntilExpiry),
          });

          if (policy.autoRotate && daysUntilExpiry <= 0) {
            this.rotateKey(keyId).catch((err) => {
              console.error(`[PQC] Auto-rotation failed for ${keyId}:`, err);
            });
          }
        }
      }
    }
  }
}

// Export singleton instance
export const quantumCryptoService = new QuantumResistantCryptoService();
