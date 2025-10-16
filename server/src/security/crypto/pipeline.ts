import crypto from 'node:crypto';
import { CertificateValidator } from './certificates.js';
import { InMemoryKeyStore, KeyManager, type KeyStore } from './keyStore.js';
import {
  DatabaseAuditLogger,
  type AuditLogger,
  type HardwareSecurityModule,
  Rfc3161TimestampingService,
  SoftwareHSM,
  type TimestampingService,
} from './services.js';
import type {
  ChainValidationResult,
  KeyVersion,
  SignatureBundle,
  SigningAlgorithm,
  VerificationContext,
  VerificationResult,
} from './types.js';

export interface SignOptions {
  includeTimestamp?: boolean;
  metadata?: Record<string, unknown>;
}

export interface CryptoPipelineOptions {
  keyStore?: KeyStore;
  trustAnchors?: string[];
  hsm?: HardwareSecurityModule;
  timestampingService?: TimestampingService;
  auditLogger?: AuditLogger;
  defaultKeyId?: string;
}

export class CryptoPipeline {
  private readonly keyManager: KeyManager;
  private readonly certificateValidator: CertificateValidator;
  private readonly hsm: HardwareSecurityModule;
  private readonly timestampingService?: TimestampingService;
  private readonly auditLogger?: AuditLogger;
  private readonly defaultKeyId?: string;

  constructor(options: CryptoPipelineOptions = {}) {
    this.keyManager = new KeyManager(
      options.keyStore ?? new InMemoryKeyStore(),
    );
    this.certificateValidator = new CertificateValidator(
      options.trustAnchors ?? [],
    );
    this.hsm = options.hsm ?? new SoftwareHSM();
    this.timestampingService = options.timestampingService;
    this.auditLogger = options.auditLogger;
    this.defaultKeyId = options.defaultKeyId;
  }

  async registerKeyVersion(key: KeyVersion): Promise<void> {
    await this.keyManager.registerKeyVersion(key);
  }

  async rotateKey(
    keyId: string,
    key: Omit<
      KeyVersion,
      'id' | 'version' | 'createdAt' | 'rotatedAt' | 'isActive'
    > & {
      version?: number;
      createdAt?: Date;
    },
  ): Promise<KeyVersion> {
    const next = await this.keyManager.rotateKey(keyId, key);
    await this.logAudit({
      action: 'rotate',
      keyId,
      keyVersion: next.version,
      algorithm: next.algorithm,
      success: true,
      metadata: key.metadata ?? undefined,
    });
    return next;
  }

  async signPayload(
    payload: Buffer | string,
    keyId?: string,
    options: SignOptions = {},
  ): Promise<SignatureBundle> {
    const material = Buffer.isBuffer(payload) ? payload : Buffer.from(payload);
    const effectiveKeyId = keyId ?? this.defaultKeyId;
    if (!effectiveKeyId) {
      throw new Error('No keyId specified for signing payload');
    }

    const key = await this.keyManager.getActiveKey(effectiveKeyId);
    if (!key) {
      throw new Error(`Active key not found for ${effectiveKeyId}`);
    }

    const signature = await this.hsm.sign(material, key);
    let timestampToken: string | undefined;
    if (options.includeTimestamp && this.timestampingService) {
      timestampToken =
        await this.timestampingService.getTimestampToken(material);
    }

    const bundle: SignatureBundle = {
      keyId: effectiveKeyId,
      keyVersion: key.version,
      algorithm: key.algorithm,
      signature: signature.toString('base64'),
      timestampToken,
      certificateChain: key.certificateChain,
      metadata: options.metadata ?? undefined,
    };

    await this.logAudit({
      action: 'sign',
      keyId: effectiveKeyId,
      keyVersion: key.version,
      algorithm: key.algorithm,
      success: true,
      metadata: options.metadata as any,
    });

    return bundle;
  }

  async verifySignature(
    payload: Buffer | string,
    bundle: SignatureBundle,
    context: VerificationContext = {},
  ): Promise<VerificationResult> {
    const errors: string[] = [];
    const material = Buffer.isBuffer(payload) ? payload : Buffer.from(payload);

    if (context.expectedKeyId && context.expectedKeyId !== bundle.keyId) {
      errors.push(
        `Unexpected key id ${bundle.keyId}, expected ${context.expectedKeyId}`,
      );
    }

    if (
      context.expectedAlgorithm &&
      context.expectedAlgorithm !== bundle.algorithm
    ) {
      errors.push(`Unexpected algorithm ${bundle.algorithm}`);
    }

    let key = await this.keyManager.getKey(bundle.keyId, bundle.keyVersion);
    if (!key) {
      key = await this.keyManager.getActiveKey(bundle.keyId);
    }
    let publicKeyPem = key?.publicKeyPem;
    let certificateResult: ChainValidationResult | undefined;

    if (
      key &&
      key.validTo &&
      key.validTo.getTime() < Date.now() &&
      !context.allowExpiredKeys
    ) {
      errors.push(`Key ${key.id} version ${key.version} is expired`);
    }

    if (!publicKeyPem) {
      if (bundle.certificateChain?.length) {
        certificateResult = this.certificateValidator.validate(
          bundle.certificateChain,
        );
        if (!certificateResult.valid) {
          errors.push(...certificateResult.errors);
        }
        try {
          const leaf = new crypto.X509Certificate(bundle.certificateChain[0]);
          publicKeyPem = leaf.publicKey
            .export({ type: 'spki', format: 'pem' })
            .toString();
        } catch (error: any) {
          errors.push(
            `Unable to extract public key from leaf certificate: ${error.message}`,
          );
        }
      } else if (key?.privateKeyPem) {
        const privateKey = crypto.createPrivateKey(key.privateKeyPem);
        publicKeyPem = crypto
          .createPublicKey(privateKey)
          .export({ type: 'spki', format: 'pem' })
          .toString();
      } else {
        errors.push(`No public key material found for ${bundle.keyId}`);
      }
    }

    let signatureValid = false;
    if (publicKeyPem) {
      signatureValid = this.verifyWithAlgorithm(
        bundle.algorithm,
        material,
        Buffer.from(bundle.signature, 'base64'),
        publicKeyPem,
      );
      if (!signatureValid) {
        errors.push('Signature verification failed');
      }
    }

    let timestampValid: boolean | undefined;
    if (bundle.timestampToken && this.timestampingService?.verify) {
      timestampValid = await this.timestampingService.verify(
        material,
        bundle.timestampToken,
      );
      if (!timestampValid) {
        errors.push('Timestamp token verification failed');
      }
    }

    const result: VerificationResult = {
      valid: errors.length === 0 && signatureValid,
      keyId: bundle.keyId,
      keyVersion: bundle.keyVersion,
      algorithm: bundle.algorithm,
      chainValidated: certificateResult?.valid,
      timestampVerified: timestampValid,
      errors: errors.length ? errors : undefined,
    };

    await this.logAudit({
      action: 'verify',
      keyId: bundle.keyId,
      keyVersion: bundle.keyVersion,
      algorithm: bundle.algorithm,
      success: result.valid,
      reason: result.errors?.join('; '),
      metadata: context as any,
    });

    return result;
  }

  private verifyWithAlgorithm(
    algorithm: SigningAlgorithm,
    payload: Buffer,
    signature: Buffer,
    publicKey: string,
  ): boolean {
    try {
      switch (algorithm) {
        case 'RSA_SHA256': {
          const verifier = crypto.createVerify('RSA-SHA256');
          verifier.update(payload);
          verifier.end();
          return verifier.verify(publicKey, signature);
        }
        case 'ECDSA_P256_SHA256': {
          const verifier = crypto.createVerify('SHA256');
          verifier.update(payload);
          verifier.end();
          return verifier.verify(
            { key: publicKey, dsaEncoding: 'ieee-p1363' },
            signature,
          );
        }
        case 'ECDSA_P384_SHA384': {
          const verifier = crypto.createVerify('SHA384');
          verifier.update(payload);
          verifier.end();
          return verifier.verify(
            { key: publicKey, dsaEncoding: 'ieee-p1363' },
            signature,
          );
        }
        case 'EdDSA_ED25519':
          return crypto.verify(null, payload, publicKey, signature);
        default:
          throw new Error(`Unsupported verification algorithm ${algorithm}`);
      }
    } catch (error) {
      console.warn('Signature verification error', error);
      return false;
    }
  }

  private async logAudit(
    event: Parameters<AuditLogger['log']>[0],
  ): Promise<void> {
    if (!this.auditLogger) return;
    await this.auditLogger.log(event);
  }
}

export interface EnvKeyDefinition {
  id: string;
  algorithm: SigningAlgorithm;
  privateKeyPem?: string;
  publicKeyPem?: string;
  certificateChain?: string[];
  version?: number;
  metadata?: Record<string, unknown>;
  active?: boolean;
}

export interface DefaultPipelineOptions {
  timestampingEndpointEnv?: string;
  auditSubsystem?: string;
  trustAnchorsEnv?: string;
}

export async function createDefaultCryptoPipeline(
  options: DefaultPipelineOptions = {},
): Promise<CryptoPipeline | null> {
  const raw = process.env.CRYPTO_SIGNING_KEYS;
  if (!raw) {
    return null;
  }

  let parsed: EnvKeyDefinition[];
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    console.error('Failed to parse CRYPTO_SIGNING_KEYS', error);
    return null;
  }

  if (!Array.isArray(parsed) || !parsed.length) {
    console.error('CRYPTO_SIGNING_KEYS must be a non-empty array');
    return null;
  }

  const keyStore = new InMemoryKeyStore();
  const auditLogger = new DatabaseAuditLogger(
    options.auditSubsystem ?? 'crypto-pipeline',
  );

  const trustAnchors = options.trustAnchorsEnv
    ? process.env[options.trustAnchorsEnv]?.split(':::').filter(Boolean)
    : undefined;

  let timestampingService: TimestampingService | undefined;
  if (options.timestampingEndpointEnv) {
    const endpoint = process.env[options.timestampingEndpointEnv];
    if (endpoint) {
      timestampingService = new Rfc3161TimestampingService(endpoint);
    }
  }

  const pipeline = new CryptoPipeline({
    keyStore,
    auditLogger,
    timestampingService,
    trustAnchors,
  });

  for (const definition of parsed) {
    const version: KeyVersion = {
      id: definition.id,
      version: definition.version ?? 1,
      algorithm: definition.algorithm,
      publicKeyPem: definition.publicKeyPem ?? '',
      privateKeyPem: definition.privateKeyPem,
      certificateChain: definition.certificateChain,
      metadata: definition.metadata as any,
      createdAt: new Date(),
      validFrom: new Date(),
      isActive: definition.active ?? true,
    };
    if (!version.publicKeyPem && version.privateKeyPem) {
      const keyObject = crypto.createPrivateKey(version.privateKeyPem);
      version.publicKeyPem = crypto
        .createPublicKey(keyObject)
        .export({ type: 'spki', format: 'pem' })
        .toString();
    }
    await pipeline.registerKeyVersion(version);
  }

  return pipeline;
}
