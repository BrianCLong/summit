/**
 * Hardware Security Module (HSM) Service
 *
 * Provides hardware-rooted cryptographic operations with support for
 * multiple HSM providers (AWS CloudHSM, Azure Managed HSM, etc.)
 *
 * @module security/zero-trust/HSMService
 * @version 4.0.0-alpha
 */

import { randomUUID } from 'crypto';
import {
  HSMService,
  HSMProvider,
  HSMProviderType,
  HSMKeySpec,
  HSMKeyHandle,
  KeyAttestation,
  AttestationType,
} from './types.js';

// =============================================================================
// HSM Service Implementation
// =============================================================================

export class HSMServiceImpl implements HSMService {
  private providers: Map<string, HSMProvider> = new Map();
  private keys: Map<string, HSMKeyHandle> = new Map();
  private initialized = false;

  constructor(
    private config: HSMServiceConfig = {}
  ) {}

  /**
   * Initialize HSM service and connect to configured providers
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    // Register configured providers
    for (const providerConfig of this.config.providers || []) {
      const provider = await this.connectProvider(providerConfig);
      this.providers.set(provider.id, provider);
    }

    // Always add software HSM as fallback for development
    if (!this.providers.has('software-hsm')) {
      this.providers.set('software-hsm', {
        id: 'software-hsm',
        name: 'Software HSM (Development)',
        type: 'software_hsm',
        status: 'active',
      });
    }

    this.initialized = true;
  }

  /**
   * Get a specific HSM provider
   */
  async getProvider(providerId: string): Promise<HSMProvider | null> {
    this.ensureInitialized();
    return this.providers.get(providerId) || null;
  }

  /**
   * Generate a new cryptographic key in the HSM
   */
  async generateKey(spec: HSMKeySpec): Promise<HSMKeyHandle> {
    this.ensureInitialized();

    const providerId = this.selectProvider(spec);
    const keyId = `key-${randomUUID()}`;

    // Validate key specification
    this.validateKeySpec(spec);

    // In production, this would call the actual HSM API
    const keyHandle: HSMKeyHandle = {
      id: keyId,
      providerId,
      label: spec.labels?.name || `key-${Date.now()}`,
      spec,
      createdAt: new Date().toISOString(),
      expiresAt: this.calculateExpiry(spec),
      version: 1,
      status: 'active',
      attestation: await this.generateAttestation(keyId, providerId),
    };

    this.keys.set(keyId, keyHandle);

    return keyHandle;
  }

  /**
   * Get an existing key handle
   */
  async getKey(keyId: string): Promise<HSMKeyHandle | null> {
    this.ensureInitialized();
    return this.keys.get(keyId) || null;
  }

  /**
   * Sign data using an HSM-protected key
   */
  async sign(keyId: string, data: Buffer, algorithm?: string): Promise<Buffer> {
    this.ensureInitialized();

    const key = await this.getKey(keyId);
    if (!key) {
      throw new HSMError('KEY_NOT_FOUND', `Key ${keyId} not found`);
    }

    if (!key.spec.purpose.includes('sign')) {
      throw new HSMError('INVALID_OPERATION', 'Key cannot be used for signing');
    }

    if (key.status !== 'active') {
      throw new HSMError('KEY_INACTIVE', `Key ${keyId} is not active`);
    }

    // In production, this would use the actual HSM for signing
    // For prototype, simulate with crypto module
    const crypto = await import('crypto');
    const alg = algorithm || this.getDefaultSignAlgorithm(key.spec);

    // Simulate HSM signing (in production, this goes to actual HSM)
    const signature = crypto.createHash('sha256')
      .update(data)
      .update(keyId)
      .digest();

    return signature;
  }

  /**
   * Verify a signature using an HSM-protected key
   */
  async verify(keyId: string, data: Buffer, signature: Buffer): Promise<boolean> {
    this.ensureInitialized();

    const key = await this.getKey(keyId);
    if (!key) {
      throw new HSMError('KEY_NOT_FOUND', `Key ${keyId} not found`);
    }

    if (!key.spec.purpose.includes('verify')) {
      throw new HSMError('INVALID_OPERATION', 'Key cannot be used for verification');
    }

    // Simulate verification
    const expectedSignature = await this.sign(keyId, data);
    return signature.equals(expectedSignature);
  }

  /**
   * Encrypt data using an HSM-protected key
   */
  async encrypt(keyId: string, plaintext: Buffer): Promise<Buffer> {
    this.ensureInitialized();

    const key = await this.getKey(keyId);
    if (!key) {
      throw new HSMError('KEY_NOT_FOUND', `Key ${keyId} not found`);
    }

    if (!key.spec.purpose.includes('encrypt')) {
      throw new HSMError('INVALID_OPERATION', 'Key cannot be used for encryption');
    }

    // In production, this would use actual HSM encryption
    const crypto = await import('crypto');
    const iv = crypto.randomBytes(16);

    // Simulate AES encryption
    const cipher = crypto.createCipheriv(
      'aes-256-gcm',
      crypto.createHash('sha256').update(keyId).digest(),
      iv
    );

    const encrypted = Buffer.concat([
      iv,
      cipher.update(plaintext),
      cipher.final(),
      cipher.getAuthTag(),
    ]);

    return encrypted;
  }

  /**
   * Decrypt data using an HSM-protected key
   */
  async decrypt(keyId: string, ciphertext: Buffer): Promise<Buffer> {
    this.ensureInitialized();

    const key = await this.getKey(keyId);
    if (!key) {
      throw new HSMError('KEY_NOT_FOUND', `Key ${keyId} not found`);
    }

    if (!key.spec.purpose.includes('decrypt')) {
      throw new HSMError('INVALID_OPERATION', 'Key cannot be used for decryption');
    }

    const crypto = await import('crypto');

    // Extract IV, ciphertext, and auth tag
    const iv = ciphertext.subarray(0, 16);
    const authTag = ciphertext.subarray(ciphertext.length - 16);
    const encrypted = ciphertext.subarray(16, ciphertext.length - 16);

    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      crypto.createHash('sha256').update(keyId).digest(),
      iv
    );
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);

    return decrypted;
  }

  /**
   * Wrap (encrypt) another key for secure transport
   */
  async wrapKey(wrappingKeyId: string, keyToWrap: HSMKeyHandle): Promise<Buffer> {
    this.ensureInitialized();

    const wrappingKey = await this.getKey(wrappingKeyId);
    if (!wrappingKey) {
      throw new HSMError('KEY_NOT_FOUND', `Wrapping key ${wrappingKeyId} not found`);
    }

    if (!wrappingKey.spec.purpose.includes('wrap')) {
      throw new HSMError('INVALID_OPERATION', 'Key cannot be used for wrapping');
    }

    if (!keyToWrap.spec.extractable) {
      throw new HSMError('KEY_NOT_EXTRACTABLE', 'Target key is not extractable');
    }

    // Serialize and encrypt the key handle
    const keyData = Buffer.from(JSON.stringify({
      id: keyToWrap.id,
      spec: keyToWrap.spec,
      version: keyToWrap.version,
    }));

    return this.encrypt(wrappingKeyId, keyData);
  }

  /**
   * Unwrap (decrypt) a wrapped key
   */
  async unwrapKey(
    wrappingKeyId: string,
    wrappedKey: Buffer,
    spec: HSMKeySpec
  ): Promise<HSMKeyHandle> {
    this.ensureInitialized();

    const wrappingKey = await this.getKey(wrappingKeyId);
    if (!wrappingKey) {
      throw new HSMError('KEY_NOT_FOUND', `Wrapping key ${wrappingKeyId} not found`);
    }

    if (!wrappingKey.spec.purpose.includes('unwrap')) {
      throw new HSMError('INVALID_OPERATION', 'Key cannot be used for unwrapping');
    }

    const keyData = await this.decrypt(wrappingKeyId, wrappedKey);
    const unwrappedData = JSON.parse(keyData.toString());

    // Create new key handle with imported material
    const keyId = `key-${randomUUID()}`;
    const keyHandle: HSMKeyHandle = {
      id: keyId,
      providerId: wrappingKey.providerId,
      label: spec.labels?.name || `imported-${Date.now()}`,
      spec,
      createdAt: new Date().toISOString(),
      version: 1,
      status: 'active',
    };

    this.keys.set(keyId, keyHandle);
    return keyHandle;
  }

  /**
   * Rotate a key (create new version)
   */
  async rotateKey(keyId: string): Promise<HSMKeyHandle> {
    this.ensureInitialized();

    const existingKey = await this.getKey(keyId);
    if (!existingKey) {
      throw new HSMError('KEY_NOT_FOUND', `Key ${keyId} not found`);
    }

    // Mark old key as rotated
    existingKey.status = 'rotated';

    // Generate new key with same spec
    const newKey = await this.generateKey(existingKey.spec);
    newKey.version = existingKey.version + 1;

    return newKey;
  }

  /**
   * Destroy a key (secure deletion)
   */
  async destroyKey(keyId: string): Promise<void> {
    this.ensureInitialized();

    const key = await this.getKey(keyId);
    if (!key) {
      throw new HSMError('KEY_NOT_FOUND', `Key ${keyId} not found`);
    }

    // In production, this would securely zeroize key material in HSM
    key.status = 'destroyed';
    this.keys.delete(keyId);
  }

  /**
   * Generate attestation proof for a key
   */
  async attestKey(keyId: string): Promise<KeyAttestation> {
    this.ensureInitialized();

    const key = await this.getKey(keyId);
    if (!key) {
      throw new HSMError('KEY_NOT_FOUND', `Key ${keyId} not found`);
    }

    return this.generateAttestation(keyId, key.providerId);
  }

  // ===========================================================================
  // Private Helper Methods
  // ===========================================================================

  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new HSMError('NOT_INITIALIZED', 'HSM service not initialized');
    }
  }

  private async connectProvider(config: HSMProviderConfig): Promise<HSMProvider> {
    // In production, this would establish actual HSM connection
    return {
      id: config.id || randomUUID(),
      name: config.name,
      type: config.type,
      endpoint: config.endpoint,
      region: config.region,
      partition: config.partition,
      status: 'active',
    };
  }

  private selectProvider(spec: HSMKeySpec): string {
    // Select appropriate provider based on key requirements
    // For prototype, use software HSM
    return 'software-hsm';
  }

  private validateKeySpec(spec: HSMKeySpec): void {
    if (spec.keyType === 'RSA' && spec.keySize) {
      if (![2048, 3072, 4096].includes(spec.keySize)) {
        throw new HSMError('INVALID_KEY_SIZE', 'RSA key size must be 2048, 3072, or 4096');
      }
    }

    if (spec.keyType === 'EC' && spec.curve) {
      if (!['P-256', 'P-384', 'P-521', 'Ed25519'].includes(spec.curve)) {
        throw new HSMError('INVALID_CURVE', 'Invalid elliptic curve');
      }
    }

    if (spec.keyType === 'AES' && spec.keySize) {
      if (![128, 192, 256].includes(spec.keySize)) {
        throw new HSMError('INVALID_KEY_SIZE', 'AES key size must be 128, 192, or 256');
      }
    }
  }

  private calculateExpiry(spec: HSMKeySpec): string | undefined {
    // Default key expiry: 1 year for signing keys, 2 years for encryption
    const hasSigningPurpose = spec.purpose.some(p => ['sign', 'verify'].includes(p));
    const yearsValid = hasSigningPurpose ? 1 : 2;

    const expiry = new Date();
    expiry.setFullYear(expiry.getFullYear() + yearsValid);
    return expiry.toISOString();
  }

  private getDefaultSignAlgorithm(spec: HSMKeySpec): string {
    switch (spec.keyType) {
      case 'RSA':
        return 'RSA-SHA256';
      case 'EC':
        return spec.curve === 'Ed25519' ? 'Ed25519' : 'ECDSA-SHA256';
      default:
        return 'HMAC-SHA256';
    }
  }

  private async generateAttestation(
    keyId: string,
    providerId: string
  ): Promise<KeyAttestation> {
    const provider = this.providers.get(providerId);
    const attestationType = this.getAttestationType(provider?.type);

    return {
      timestamp: new Date().toISOString(),
      attestationType,
      providerCertChain: [
        // In production, this would be actual certificate chain
        'MIIC...provider-root-cert',
        'MIIC...provider-intermediate-cert',
      ],
      keyProperties: {
        generatedInHSM: provider?.type !== 'software_hsm',
        neverExported: true,
        fipsCompliant: this.isFIPSCompliant(provider?.type),
        tamperResistant: provider?.type !== 'software_hsm',
      },
      signature: `attestation-sig-${keyId}-${Date.now()}`,
    };
  }

  private getAttestationType(providerType?: HSMProviderType): AttestationType {
    switch (providerType) {
      case 'aws_cloudhsm':
      case 'azure_managed_hsm':
      case 'gcp_cloud_hsm':
      case 'thales_luna':
      case 'yubihsm':
        return 'hsm_native';
      default:
        return 'hsm_native';
    }
  }

  private isFIPSCompliant(providerType?: HSMProviderType): boolean {
    // Most cloud HSMs are FIPS 140-2 Level 3 compliant
    return providerType !== 'software_hsm';
  }
}

// =============================================================================
// Configuration Types
// =============================================================================

export interface HSMServiceConfig {
  providers?: HSMProviderConfig[];
  defaultProvider?: string;
  keyRotationPolicy?: KeyRotationPolicy;
}

export interface HSMProviderConfig {
  id?: string;
  name: string;
  type: HSMProviderType;
  endpoint?: string;
  region?: string;
  partition?: string;
  credentials?: {
    username?: string;
    password?: string;
    certificatePath?: string;
    privateKeyPath?: string;
  };
}

export interface KeyRotationPolicy {
  enabled: boolean;
  intervalDays: number;
  retainOldVersions: number;
}

// =============================================================================
// Custom Error Class
// =============================================================================

export class HSMError extends Error {
  constructor(
    public code: string,
    message: string
  ) {
    super(message);
    this.name = 'HSMError';
  }
}

// =============================================================================
// Factory Function
// =============================================================================

export function createHSMService(config?: HSMServiceConfig): HSMServiceImpl {
  return new HSMServiceImpl(config);
}
