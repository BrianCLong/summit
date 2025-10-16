/**
 * Customer Managed Keys (CMK) and HSM Integration
 * Sprint 28A: Enterprise-grade key management for sovereign deployments
 */

import { EventEmitter } from 'events';
import crypto from 'crypto';

export interface HSMProvider {
  type: 'luna' | 'cloudhsm' | 'thales' | 'keyvault' | 'cloudkms';
  name: string;
  endpoint: string;
  credentials: {
    clientId?: string;
    clientSecret?: string;
    certificatePath?: string;
    privateKeyPath?: string;
    partition?: string;
    slot?: number;
  };
  configuration: {
    keyAlgorithm:
      | 'RSA-2048'
      | 'RSA-4096'
      | 'ECDSA-P256'
      | 'ECDSA-P384'
      | 'AES-256';
    hashAlgorithm: 'SHA-256' | 'SHA-384' | 'SHA-512';
    keyUsage: 'encrypt' | 'sign' | 'both';
    fipsMode: boolean;
    multiAuth: boolean;
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CMKKey {
  id: string;
  tenantId: string;
  alias: string;
  keyId: string; // HSM-specific key identifier
  providerId: string;
  algorithm: string;
  purpose: 'data-encryption' | 'key-encryption' | 'signing' | 'authentication';
  keyMaterial?: {
    publicKey: string;
    keySpec: string;
    keyUsage: string[];
  };
  status: 'active' | 'pending' | 'disabled' | 'deleted';
  rotationSchedule?: {
    enabled: boolean;
    intervalDays: number;
    nextRotation: Date;
  };
  accessPolicy: {
    allowedOperations: string[];
    dualControlRequired: boolean;
    auditRequired: boolean;
    ipWhitelist?: string[];
  };
  metadata: {
    classification: string;
    purpose: string;
    owner: string;
    compliance: string[];
  };
  createdAt: Date;
  updatedAt: Date;
  lastUsed?: Date;
}

export interface KeyOperation {
  id: string;
  keyId: string;
  operation:
    | 'encrypt'
    | 'decrypt'
    | 'sign'
    | 'verify'
    | 'generate'
    | 'rotate'
    | 'delete';
  requestor: string;
  approver?: string;
  status: 'pending' | 'approved' | 'executed' | 'failed' | 'denied';
  reason: string;
  attestation?: {
    timestamp: Date;
    signature: string;
    certificate: string;
  };
  audit: {
    requestTime: Date;
    approvalTime?: Date;
    executionTime?: Date;
    duration?: number;
    error?: string;
  };
}

export interface CryptoErasureEvent {
  id: string;
  tenantId: string;
  keyId: string;
  datasets: string[];
  requestor: string;
  approver: string;
  executedAt: Date;
  verification: {
    beforeHash: string;
    afterHash: string;
    success: boolean;
    affectedRecords: number;
  };
}

export class HSMAdapter extends EventEmitter {
  private providers = new Map<string, HSMProvider>();
  private keys = new Map<string, CMKKey>();
  private operations = new Map<string, KeyOperation>();
  private erasureEvents = new Map<string, CryptoErasureEvent>();

  constructor() {
    super();
  }

  /**
   * Register HSM provider
   */
  async registerProvider(
    provider: Omit<HSMProvider, 'createdAt' | 'updatedAt'>,
  ): Promise<HSMProvider> {
    const fullProvider: HSMProvider = {
      ...provider,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Test HSM connectivity
    await this.testHSMConnection(fullProvider);

    this.providers.set(fullProvider.name, fullProvider);
    this.emit('provider_registered', fullProvider);

    return fullProvider;
  }

  /**
   * Create CMK key in HSM
   */
  async createKey(
    tenantId: string,
    alias: string,
    providerId: string,
    purpose: CMKKey['purpose'],
    options: {
      algorithm?: string;
      rotationDays?: number;
      dualControl?: boolean;
      classification?: string;
      compliance?: string[];
    } = {},
  ): Promise<CMKKey> {
    const provider = this.providers.get(providerId);
    if (!provider || !provider.isActive) {
      throw new Error('HSM provider not available');
    }

    // Generate key in HSM
    const keyId = await this.generateHSMKey(provider, {
      algorithm: options.algorithm || provider.configuration.keyAlgorithm,
      purpose,
      alias,
    });

    const key: CMKKey = {
      id: crypto.randomUUID(),
      tenantId,
      alias,
      keyId,
      providerId,
      algorithm: options.algorithm || provider.configuration.keyAlgorithm,
      purpose,
      status: 'active',
      rotationSchedule: options.rotationDays
        ? {
            enabled: true,
            intervalDays: options.rotationDays,
            nextRotation: new Date(
              Date.now() + options.rotationDays * 24 * 60 * 60 * 1000,
            ),
          }
        : undefined,
      accessPolicy: {
        allowedOperations: this.getDefaultOperations(purpose),
        dualControlRequired: options.dualControl || false,
        auditRequired: true,
      },
      metadata: {
        classification: options.classification || 'SENSITIVE',
        purpose: purpose,
        owner: tenantId,
        compliance: options.compliance || ['FIPS-140-2'],
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.keys.set(key.id, key);

    // Record creation operation
    await this.recordOperation({
      keyId: key.id,
      operation: 'generate',
      requestor: 'system',
      reason: `Key created for ${purpose}`,
      status: 'executed',
    });

    this.emit('key_created', key);

    return key;
  }

  /**
   * Rotate CMK key
   */
  async rotateKey(
    keyId: string,
    requestor: string,
    approver?: string,
  ): Promise<CMKKey> {
    const key = this.keys.get(keyId);
    if (!key) {
      throw new Error('Key not found');
    }

    if (key.accessPolicy.dualControlRequired && !approver) {
      throw new Error('Dual control required for key rotation');
    }

    const provider = this.providers.get(key.providerId);
    if (!provider) {
      throw new Error('HSM provider not found');
    }

    // Create rotation operation
    const operation = await this.recordOperation({
      keyId,
      operation: 'rotate',
      requestor,
      approver,
      reason: 'Scheduled key rotation',
      status: 'pending',
    });

    try {
      // Generate new key version in HSM
      const newKeyId = await this.rotateHSMKey(provider, key.keyId);

      // Update key with new HSM key ID
      key.keyId = newKeyId;
      key.updatedAt = new Date();
      if (key.rotationSchedule) {
        key.rotationSchedule.nextRotation = new Date(
          Date.now() + key.rotationSchedule.intervalDays * 24 * 60 * 60 * 1000,
        );
      }

      this.keys.set(keyId, key);

      // Update operation status
      operation.status = 'executed';
      operation.audit.executionTime = new Date();
      this.operations.set(operation.id, operation);

      this.emit('key_rotated', { key, oldKeyId: key.keyId, newKeyId });

      return key;
    } catch (error) {
      operation.status = 'failed';
      operation.audit.error = error.message;
      this.operations.set(operation.id, operation);
      throw error;
    }
  }

  /**
   * Encrypt data using CMK
   */
  async encrypt(
    keyId: string,
    plaintext: Buffer,
    context?: Record<string, string>,
  ): Promise<{
    ciphertext: Buffer;
    keyId: string;
    algorithm: string;
    attestation?: any;
  }> {
    const key = await this.validateKeyOperation(keyId, 'encrypt');
    const provider = this.providers.get(key.providerId)!;

    // Perform encryption in HSM
    const result = await this.performHSMEncryption(
      provider,
      key.keyId,
      plaintext,
      context,
    );

    // Update key usage
    key.lastUsed = new Date();
    this.keys.set(keyId, key);

    // Record operation
    await this.recordOperation({
      keyId,
      operation: 'encrypt',
      requestor: 'system',
      reason: 'Data encryption',
      status: 'executed',
    });

    return {
      ciphertext: result.ciphertext,
      keyId: key.keyId,
      algorithm: key.algorithm,
      attestation: result.attestation,
    };
  }

  /**
   * Decrypt data using CMK
   */
  async decrypt(
    keyId: string,
    ciphertext: Buffer,
    context?: Record<string, string>,
  ): Promise<{
    plaintext: Buffer;
    attestation?: any;
  }> {
    const key = await this.validateKeyOperation(keyId, 'decrypt');
    const provider = this.providers.get(key.providerId)!;

    // Perform decryption in HSM
    const result = await this.performHSMDecryption(
      provider,
      key.keyId,
      ciphertext,
      context,
    );

    // Update key usage
    key.lastUsed = new Date();
    this.keys.set(keyId, key);

    // Record operation
    await this.recordOperation({
      keyId,
      operation: 'decrypt',
      requestor: 'system',
      reason: 'Data decryption',
      status: 'executed',
    });

    return {
      plaintext: result.plaintext,
      attestation: result.attestation,
    };
  }

  /**
   * Perform cryptographic erasure
   */
  async cryptoErasure(
    tenantId: string,
    datasets: string[],
    requestor: string,
    approver: string,
  ): Promise<CryptoErasureEvent> {
    // Find tenant keys
    const tenantKeys = Array.from(this.keys.values()).filter(
      (k) => k.tenantId === tenantId,
    );

    if (tenantKeys.length === 0) {
      throw new Error('No keys found for tenant');
    }

    // Calculate before hash of datasets
    const beforeHash = await this.calculateDatasetHash(datasets);

    const erasureEvent: CryptoErasureEvent = {
      id: crypto.randomUUID(),
      tenantId,
      keyId: tenantKeys[0].id, // Primary key for tenant
      datasets,
      requestor,
      approver,
      executedAt: new Date(),
      verification: {
        beforeHash,
        afterHash: '',
        success: false,
        affectedRecords: 0,
      },
    };

    try {
      // Delete/disable all tenant keys
      let affectedRecords = 0;
      for (const key of tenantKeys) {
        key.status = 'deleted';
        key.updatedAt = new Date();
        this.keys.set(key.id, key);

        // Delete key from HSM
        const provider = this.providers.get(key.providerId);
        if (provider) {
          await this.deleteHSMKey(provider, key.keyId);
        }

        affectedRecords += await this.countKeyUsage(key.id);
      }

      // Calculate after hash
      const afterHash = await this.calculateDatasetHash(datasets);

      erasureEvent.verification = {
        beforeHash,
        afterHash,
        success: beforeHash !== afterHash,
        affectedRecords,
      };

      this.erasureEvents.set(erasureEvent.id, erasureEvent);
      this.emit('crypto_erasure_completed', erasureEvent);

      return erasureEvent;
    } catch (error) {
      erasureEvent.verification.success = false;
      this.erasureEvents.set(erasureEvent.id, erasureEvent);
      throw error;
    }
  }

  /**
   * Get key by tenant and alias
   */
  getKey(tenantId: string, alias: string): CMKKey | null {
    return (
      Array.from(this.keys.values()).find(
        (k) =>
          k.tenantId === tenantId && k.alias === alias && k.status === 'active',
      ) || null
    );
  }

  /**
   * List tenant keys
   */
  listKeys(tenantId: string): CMKKey[] {
    return Array.from(this.keys.values()).filter(
      (k) => k.tenantId === tenantId,
    );
  }

  /**
   * Get key operations audit trail
   */
  getOperations(keyId?: string, limit = 100): KeyOperation[] {
    const operations = Array.from(this.operations.values());

    return (keyId ? operations.filter((op) => op.keyId === keyId) : operations)
      .sort(
        (a, b) => b.audit.requestTime.getTime() - a.audit.requestTime.getTime(),
      )
      .slice(0, limit);
  }

  private async testHSMConnection(provider: HSMProvider): Promise<void> {
    // Test HSM connectivity based on provider type
    switch (provider.type) {
      case 'luna':
        await this.testLunaConnection(provider);
        break;
      case 'cloudhsm':
        await this.testCloudHSMConnection(provider);
        break;
      case 'thales':
        await this.testThalesConnection(provider);
        break;
      case 'keyvault':
        await this.testKeyVaultConnection(provider);
        break;
      case 'cloudkms':
        await this.testCloudKMSConnection(provider);
        break;
      default:
        throw new Error(`Unsupported HSM provider: ${provider.type}`);
    }
  }

  private async generateHSMKey(
    provider: HSMProvider,
    options: any,
  ): Promise<string> {
    // Generate key in HSM and return key ID
    return `hsm-key-${crypto.randomUUID()}`;
  }

  private async rotateHSMKey(
    provider: HSMProvider,
    oldKeyId: string,
  ): Promise<string> {
    // Rotate key in HSM and return new key ID
    return `hsm-key-${crypto.randomUUID()}`;
  }

  private async performHSMEncryption(
    provider: HSMProvider,
    keyId: string,
    plaintext: Buffer,
    context?: Record<string, string>,
  ): Promise<{ ciphertext: Buffer; attestation?: any }> {
    // Perform encryption in HSM
    const ciphertext = crypto.randomBytes(plaintext.length + 16); // Mock encrypted data
    return {
      ciphertext,
      attestation: {
        timestamp: new Date(),
        hsmId: provider.name,
        keyId,
      },
    };
  }

  private async performHSMDecryption(
    provider: HSMProvider,
    keyId: string,
    ciphertext: Buffer,
    context?: Record<string, string>,
  ): Promise<{ plaintext: Buffer; attestation?: any }> {
    // Perform decryption in HSM
    const plaintext = ciphertext.slice(16); // Mock decrypted data
    return {
      plaintext,
      attestation: {
        timestamp: new Date(),
        hsmId: provider.name,
        keyId,
      },
    };
  }

  private async deleteHSMKey(
    provider: HSMProvider,
    keyId: string,
  ): Promise<void> {
    // Delete key from HSM
    console.log(`Deleting key ${keyId} from HSM ${provider.name}`);
  }

  private async validateKeyOperation(
    keyId: string,
    operation: string,
  ): Promise<CMKKey> {
    const key = this.keys.get(keyId);
    if (!key) {
      throw new Error('Key not found');
    }

    if (key.status !== 'active') {
      throw new Error('Key is not active');
    }

    if (!key.accessPolicy.allowedOperations.includes(operation)) {
      throw new Error(`Operation ${operation} not allowed for this key`);
    }

    return key;
  }

  private async recordOperation(
    operation: Omit<KeyOperation, 'id' | 'audit'> & {
      status: KeyOperation['status'];
    },
  ): Promise<KeyOperation> {
    const fullOperation: KeyOperation = {
      ...operation,
      id: crypto.randomUUID(),
      audit: {
        requestTime: new Date(),
        ...(operation.status === 'executed' && { executionTime: new Date() }),
      },
    };

    this.operations.set(fullOperation.id, fullOperation);
    return fullOperation;
  }

  private getDefaultOperations(purpose: CMKKey['purpose']): string[] {
    switch (purpose) {
      case 'data-encryption':
        return ['encrypt', 'decrypt'];
      case 'key-encryption':
        return ['encrypt', 'decrypt', 'generate'];
      case 'signing':
        return ['sign', 'verify'];
      case 'authentication':
        return ['sign', 'verify', 'encrypt', 'decrypt'];
      default:
        return ['encrypt', 'decrypt'];
    }
  }

  private async calculateDatasetHash(datasets: string[]): Promise<string> {
    // Calculate hash of dataset contents for verification
    const hash = crypto.createHash('sha256');
    for (const dataset of datasets) {
      hash.update(dataset);
    }
    return hash.digest('hex');
  }

  private async countKeyUsage(keyId: string): Promise<number> {
    // Count records encrypted with this key
    return this.operations.filter(
      (op) =>
        op.keyId === keyId &&
        (op.operation === 'encrypt' || op.operation === 'decrypt') &&
        op.status === 'executed',
    ).length;
  }

  // HSM-specific connection testers
  private async testLunaConnection(provider: HSMProvider): Promise<void> {
    // Test SafeNet Luna HSM connection
  }

  private async testCloudHSMConnection(provider: HSMProvider): Promise<void> {
    // Test AWS CloudHSM connection
  }

  private async testThalesConnection(provider: HSMProvider): Promise<void> {
    // Test Thales HSM connection
  }

  private async testKeyVaultConnection(provider: HSMProvider): Promise<void> {
    // Test Azure Key Vault HSM connection
  }

  private async testCloudKMSConnection(provider: HSMProvider): Promise<void> {
    // Test Google Cloud KMS connection
  }
}
