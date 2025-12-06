import {
  createCipheriv,
  createHash,
  randomBytes,
} from 'node:crypto';
import {
  InMemoryKeyStore,
  KeyManager,
  type KeyStore,
} from './keyStore.js';
import {
  SoftwareHSM,
  type AuditLogger,
  type HardwareSecurityModule,
} from './services.js';
import type {
  CryptoAuditEvent,
  JsonObject,
  KeyVersion,
  SigningAlgorithm,
} from './types.js';

export type CustomerKeyProvider =
  | 'aws-kms'
  | 'azure-keyvault'
  | 'gcp-kms'
  | 'hsm';

export interface CustomerManagedKey {
  tenantId: string;
  keyId: string;
  provider: CustomerKeyProvider;
  algorithm: SigningAlgorithm;
  publicKeyPem: string;
  certificateChain?: string[];
  rotationIntervalHours?: number;
  metadata?: JsonObject;
  validFrom?: Date;
  validTo?: Date;
}

export interface RotationApproval {
  actor: string;
  reason?: string;
  scope?: string;
  approvedAt?: Date;
}

export interface RotationGuardrails {
  approvals: RotationApproval[];
  attestationToken: string;
  expiresAt: Date;
  changeTicket?: string;
  breakGlass?: boolean;
}

export interface EnvelopeEncryptionResult {
  ciphertext: string;
  iv: string;
  authTag: string;
  wrappedDataKey: string;
  wrapAuthTag: string;
  wrapIv: string;
  keyId: string;
  keyVersion: number;
  algorithm: string;
  kmsProvider: CustomerKeyProvider;
  aad?: JsonObject;
}

export interface ByokHsmOrchestratorOptions {
  keyStore?: KeyStore;
  hsm?: HardwareSecurityModule;
  auditLogger?: AuditLogger;
}

export class ByokHsmOrchestrator {
  private readonly keyManager: KeyManager;
  private readonly hsm: HardwareSecurityModule;
  private readonly auditLogger?: AuditLogger;
  private readonly tenantBindings = new Map<string, CustomerManagedKey>();

  constructor(options: ByokHsmOrchestratorOptions = {}) {
    this.keyManager = new KeyManager(options.keyStore ?? new InMemoryKeyStore());
    this.hsm = options.hsm ?? new SoftwareHSM();
    this.auditLogger = options.auditLogger;
  }

  async registerCustomerManagedKey(
    registration: CustomerManagedKey,
  ): Promise<KeyVersion> {
    const now = new Date();
    const version: KeyVersion = {
      id: registration.keyId,
      version: 1,
      algorithm: registration.algorithm,
      publicKeyPem: registration.publicKeyPem,
      certificateChain: registration.certificateChain,
      validFrom: registration.validFrom ?? now,
      validTo: registration.validTo,
      metadata: {
        tenantId: registration.tenantId,
        provider: registration.provider,
        rotationIntervalHours: registration.rotationIntervalHours ?? 24,
        ...registration.metadata,
      },
      isActive: true,
      createdAt: now,
    };

    this.tenantBindings.set(registration.keyId, registration);
    await this.keyManager.registerKeyVersion(version);
    await this.logAudit({
      action: 'rotate',
      keyId: registration.keyId,
      keyVersion: version.version,
      algorithm: registration.algorithm,
      success: true,
      metadata: {
        reason: 'initial-registration',
        tenantId: registration.tenantId,
        provider: registration.provider,
      },
    });

    return version;
  }

  async encryptForTenant(
    tenantId: string,
    keyId: string,
    plaintext: Buffer | string,
    aad?: JsonObject,
  ): Promise<EnvelopeEncryptionResult> {
    const binding = this.tenantBindings.get(keyId);
    if (!binding || binding.tenantId !== tenantId) {
      throw new Error(`Key ${keyId} is not registered for tenant ${tenantId}`);
    }

    const activeKey = await this.keyManager.getActiveKey(keyId);
    if (!activeKey) {
      throw new Error(`No active key found for ${keyId}`);
    }

    const dataKey = randomBytes(32);
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', dataKey, iv);
    const material = Buffer.isBuffer(plaintext)
      ? plaintext
      : Buffer.from(plaintext, 'utf8');

    let ciphertext = cipher.update(material, undefined, 'base64');
    ciphertext += cipher.final('base64');

    const wrapped = await this.wrapDataKey(dataKey, activeKey);

    await this.logAudit({
      action: 'sign',
      keyId,
      keyVersion: activeKey.version,
      algorithm: activeKey.algorithm,
      success: true,
      metadata: {
        purpose: 'byok-encryption',
        tenantId,
        aad,
      },
    });

    return {
      ciphertext,
      iv: iv.toString('base64'),
      authTag: cipher.getAuthTag().toString('base64'),
      wrappedDataKey: wrapped.wrappedDataKey,
      wrapAuthTag: wrapped.wrapAuthTag,
      wrapIv: wrapped.wrapIv,
      keyId,
      keyVersion: activeKey.version,
      algorithm: 'AES-256-GCM',
      kmsProvider: binding.provider,
      aad,
    };
  }

  async rotateKeyWithZeroTrust(
    keyId: string,
    next: {
      algorithm: SigningAlgorithm;
      publicKeyPem: string;
      certificateChain?: string[];
      validFrom?: Date;
      validTo?: Date;
      guardrails: RotationGuardrails;
      metadata?: JsonObject;
    },
  ): Promise<KeyVersion> {
    const binding = this.tenantBindings.get(keyId);
    if (!binding) {
      throw new Error(`Key ${keyId} is not bound to a tenant`);
    }

    this.validateGuardrails(next.guardrails);

    const rotated = await this.keyManager.rotateKey(keyId, {
      algorithm: next.algorithm,
      publicKeyPem: next.publicKeyPem,
      certificateChain: next.certificateChain,
      validFrom: next.validFrom ?? new Date(),
      validTo: next.validTo,
      metadata: {
        tenantId: binding.tenantId,
        provider: binding.provider,
        guardrails: {
          approvals: next.guardrails.approvals,
          attestationToken: next.guardrails.attestationToken,
          expiresAt: next.guardrails.expiresAt.toISOString(),
          changeTicket: next.guardrails.changeTicket,
          breakGlass: next.guardrails.breakGlass ?? false,
        },
        ...next.metadata,
      },
    });

    await this.logAudit({
      action: 'rotate',
      keyId,
      keyVersion: rotated.version,
      algorithm: rotated.algorithm,
      success: true,
      metadata: rotated.metadata,
    });

    return rotated;
  }

  async getRotationReadiness(
    keyId: string,
    asOf: Date = new Date(),
  ): Promise<{ status: 'healthy' | 'due' | 'overdue'; nextRotationAt?: Date }>
  {
    const binding = this.tenantBindings.get(keyId);
    if (!binding) {
      throw new Error(`Key ${keyId} is not bound to a tenant`);
    }

    const activeKey = await this.keyManager.getActiveKey(keyId);
    if (!activeKey) {
      throw new Error(`No active key found for ${keyId}`);
    }

    const rotationHours = binding.rotationIntervalHours ?? 24;
    const nextRotationAt = new Date(
      activeKey.createdAt.getTime() + rotationHours * 60 * 60 * 1000,
    );

    if (asOf > nextRotationAt) {
      return { status: 'overdue', nextRotationAt };
    }

    const dueSoon = new Date(nextRotationAt.getTime() - 60 * 60 * 1000);
    if (asOf >= dueSoon) {
      return { status: 'due', nextRotationAt };
    }

    return { status: 'healthy', nextRotationAt };
  }

  private async wrapDataKey(dataKey: Buffer, key: KeyVersion) {
    const publicKey = await this.hsm.exportPublicKey(key);
    const wrappingKey = createHash('sha256').update(publicKey).digest();
    const wrapIv = createHash('sha1')
      .update(`${key.id}:${key.version}`)
      .digest()
      .subarray(0, 12);

    const cipher = createCipheriv('aes-256-gcm', wrappingKey, wrapIv);
    let wrappedDataKey = cipher.update(dataKey, undefined, 'base64');
    wrappedDataKey += cipher.final('base64');

    return {
      wrappedDataKey,
      wrapAuthTag: cipher.getAuthTag().toString('base64'),
      wrapIv: wrapIv.toString('base64'),
    };
  }

  private validateGuardrails(guardrails: RotationGuardrails) {
    if (!guardrails.attestationToken || guardrails.attestationToken.length < 16) {
      throw new Error('Guardrail attestation token is missing or too short');
    }

    if (guardrails.approvals.length < 2 && !guardrails.breakGlass) {
      throw new Error('At least two approvals are required for rotation');
    }

    if (guardrails.expiresAt.getTime() <= Date.now()) {
      throw new Error('Guardrail attestation is expired');
    }
  }

  private async logAudit(event: CryptoAuditEvent) {
    if (this.auditLogger) {
      await this.auditLogger.log(event);
    }
  }
}
