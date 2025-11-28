import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { SecretAuditLogger } from '../security/secret-audit-logger';

export type SecretProviderName = 'vault' | 'awsSecretsManager' | 'environment' | 'file';

export interface SecretManagerVaultConfig {
  address?: string;
  tokenEnv?: string;
  kvMountPath?: string;
  namespace?: string;
}

export interface SecretManagerAwsConfig {
  region?: string;
  endpoint?: string;
  accessKeyEnv?: string;
  secretKeyEnv?: string;
  sessionTokenEnv?: string;
}

export interface SecretManagerOptions {
  cacheTtlSeconds?: number;
  rotationIntervalSeconds?: number;
  auditLogPath?: string;
  encryptionKeyEnv?: string;
  providerPreference?: SecretProviderName[];
  vaultConfig?: SecretManagerVaultConfig;
  awsConfig?: SecretManagerAwsConfig;
  fileBasePath?: string;
}

interface CachedSecret {
  value: string;
  expiresAt: number;
}

interface SecretReference {
  protocol: 'vault' | 'aws-sm' | 'env' | 'enc' | 'file';
  key: string;
  field?: string;
  raw: string;
  optional: boolean;
  defaultValue?: string;
  ttlSeconds?: number;
}

export class SecretManager {
  private cache: Map<string, CachedSecret> = new Map();
  private auditLogger: SecretAuditLogger;
  private options: Required<SecretManagerOptions>;
  private rotationTimer?: NodeJS.Timer;

  constructor(options: SecretManagerOptions = {}) {
    this.options = {
      cacheTtlSeconds: options.cacheTtlSeconds ?? 300,
      rotationIntervalSeconds: options.rotationIntervalSeconds ?? 600,
      auditLogPath: options.auditLogPath ?? path.join(process.cwd(), 'logs/config-audit.log'),
      encryptionKeyEnv: options.encryptionKeyEnv ?? 'CONFIG_ENCRYPTION_KEY',
      providerPreference: options.providerPreference ?? ['vault', 'awsSecretsManager', 'environment', 'file'],
      vaultConfig: options.vaultConfig ?? {},
      awsConfig: options.awsConfig ?? {},
      fileBasePath: options.fileBasePath ?? process.cwd(),
    };
    this.auditLogger = new SecretAuditLogger(this.options.auditLogPath);
    this.configureRotation();
  }

  updateOptions(options: SecretManagerOptions) {
    this.options = { ...this.options, ...options };
    this.configureRotation();
    if (options.auditLogPath) {
      this.auditLogger = new SecretAuditLogger(options.auditLogPath);
    }
  }

  static encrypt(plaintext: string, key: string): string {
    const iv = crypto.randomBytes(12);
    const hashKey = crypto.createHash('sha256').update(key).digest();
    const cipher = crypto.createCipheriv('aes-256-gcm', hashKey, iv);
    const ciphertext = Buffer.concat([cipher.update(Buffer.from(plaintext, 'utf8')), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return `enc::v1:${iv.toString('base64')}:${authTag.toString('base64')}:${ciphertext.toString('base64')}`;
  }

  resolveConfig(config: any): any {
    if (Array.isArray(config)) {
      return config.map(value => this.resolveConfig(value));
    }
    if (config && typeof config === 'object') {
      return Object.keys(config).reduce((acc, key) => {
        acc[key] = this.resolveConfig((config as any)[key]);
        return acc;
      }, {} as any);
    }
    if (typeof config === 'string') {
      return this.resolveString(config);
    }
    return config;
  }

  rotateSecret(reference: string) {
    this.cache.delete(reference);
    this.resolveString(reference, true);
  }

  close() {
    if (this.rotationTimer) {
      clearInterval(this.rotationTimer);
    }
  }

  private configureRotation() {
    if (this.rotationTimer) {
      clearInterval(this.rotationTimer);
    }
    if (this.options.rotationIntervalSeconds > 0) {
      this.rotationTimer = setInterval(() => this.evictExpired(), this.options.rotationIntervalSeconds * 1000);
    }
  }

  private evictExpired() {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (value.expiresAt <= now) {
        this.cache.delete(key);
      }
    }
  }

  private resolveString(value: string, rotated = false): any {
    const reference = this.parseReference(value);
    if (!reference) {
      return value;
    }

    if (reference.protocol === 'enc') {
      return this.decryptValue(value);
    }

    const cached = this.cache.get(reference.raw);
    if (cached && cached.expiresAt > Date.now()) {
      this.auditLogger.record({ provider: reference.protocol, reference: reference.raw, cached: true, rotated, success: true });
      return cached.value;
    }

    const providers = this.orderProviders(reference);
    for (const provider of providers) {
      try {
        const resolved = this.fetchFromProvider(provider, reference);
        const ttl = (reference.ttlSeconds ?? this.options.cacheTtlSeconds) * 1000;
        this.cache.set(reference.raw, { value: resolved, expiresAt: Date.now() + ttl });
        this.auditLogger.record({ provider, reference: reference.raw, cached: false, rotated, success: true });
        return resolved;
      } catch (error) {
        if (!reference.optional) {
          this.auditLogger.record({
            provider,
            reference: reference.raw,
            cached: false,
            rotated,
            success: false,
            message: (error as Error).message,
          });
        }
      }
    }

    if (reference.defaultValue !== undefined) {
      this.auditLogger.record({ provider: 'default', reference: reference.raw, cached: false, rotated, success: true });
      return reference.defaultValue;
    }

    throw new Error(`Unable to resolve secret for reference ${reference.raw}`);
  }

  private orderProviders(reference: SecretReference): SecretProviderName[] {
    const ordered: SecretProviderName[] = [];
    const preferred =
      reference.protocol === 'vault'
        ? 'vault'
        : reference.protocol === 'aws-sm'
          ? 'awsSecretsManager'
          : reference.protocol === 'file'
            ? 'file'
            : 'environment';

    if (this.options.providerPreference.includes(preferred as SecretProviderName)) {
      ordered.push(preferred as SecretProviderName);
    }

    for (const provider of this.options.providerPreference) {
      if (!ordered.includes(provider)) {
        ordered.push(provider);
      }
    }

    return ordered;
  }

  private parseReference(value: string): SecretReference | null {
    if (value.startsWith('vault://') || value.startsWith('aws-sm://') || value.startsWith('env://') || value.startsWith('file://')) {
      const url = new URL(value);
      const optional = url.searchParams.get('optional') === 'true';
      const defaultValue = url.searchParams.get('default') ?? undefined;
      const ttl = url.searchParams.get('ttl');
      return {
        protocol: value.startsWith('vault://')
          ? 'vault'
          : value.startsWith('aws-sm://')
            ? 'aws-sm'
            : value.startsWith('file://')
              ? 'file'
              : 'env',
        key: `${url.hostname}${url.pathname}`.replace(/\/+/g, '/').replace(/^\//, ''),
        field: url.hash ? url.hash.replace('#', '') : undefined,
        raw: value,
        optional,
        defaultValue,
        ttlSeconds: ttl ? Number(ttl) : undefined,
      };
    }
    if (value.startsWith('enc::')) {
      return { protocol: 'enc', key: value, raw: value, optional: false } as SecretReference;
    }
    return null;
  }

  private decryptValue(value: string): string {
    const parts = value.replace('enc::', '').split(':');
    if (parts.length !== 4) {
      throw new Error('Encrypted secret is malformed. Expected enc::v1:<iv>:<tag>:<ciphertext>');
    }
    const [, iv, tag, ciphertext] = parts;
    const key = process.env[this.options.encryptionKeyEnv];
    if (!key) {
      throw new Error(`Encryption key missing in env ${this.options.encryptionKeyEnv}`);
    }
    const keyBuffer = crypto.createHash('sha256').update(key).digest();
    const decipher = crypto.createDecipheriv('aes-256-gcm', keyBuffer, Buffer.from(iv, 'base64'));
    decipher.setAuthTag(Buffer.from(tag, 'base64'));
    const decrypted = Buffer.concat([decipher.update(Buffer.from(ciphertext, 'base64')), decipher.final()]);
    return decrypted.toString('utf8');
  }

  private fetchFromProvider(provider: SecretProviderName, reference: SecretReference): string {
    switch (provider) {
      case 'environment':
        return this.fromEnv(reference);
      case 'vault':
        return this.fromVault(reference);
      case 'awsSecretsManager':
        return this.fromAwsSecrets(reference);
      case 'file':
        return this.fromFile(reference);
      default:
        throw new Error(`Unknown provider ${provider}`);
    }
  }

  private fromEnv(reference: SecretReference): string {
    const envValue = process.env[reference.key];
    if (envValue) return envValue;
    const fallbackKey = reference.field ? `${reference.key}__${reference.field}` : reference.key;
    const fallback = process.env[fallbackKey];
    if (fallback) return fallback;
    if (reference.defaultValue !== undefined) return reference.defaultValue;
    throw new Error(`Environment variable ${reference.key} not set`);
  }

  private fromVault(reference: SecretReference): string {
    const configuredPath = this.options.vaultConfig?.address?.startsWith('file://')
      ? this.options.vaultConfig.address.replace('file://', '')
      : undefined;
    const secretFile = process.env.VAULT_SECRETS_FILE || configuredPath || path.join(process.cwd(), 'server/config/vault.secrets.json');
    if (fs.existsSync(secretFile)) {
      const secrets = JSON.parse(fs.readFileSync(secretFile, 'utf-8'));
      const value = this.lookupSecret(secrets, reference);
      if (value) return value;
    }
    const envKey = this.buildEnvKey('VAULT_SECRET', reference);
    const envValue = process.env[envKey];
    if (envValue) return envValue;
    if (reference.defaultValue !== undefined) return reference.defaultValue;
    throw new Error(`Vault secret ${reference.key} not found`);
  }

  private fromAwsSecrets(reference: SecretReference): string {
    const configuredPath = this.options.awsConfig?.endpoint?.startsWith('file://')
      ? this.options.awsConfig.endpoint.replace('file://', '')
      : undefined;
    const secretFile = process.env.AWS_SECRETS_FILE || configuredPath || path.join(process.cwd(), 'server/config/aws.secrets.json');
    if (fs.existsSync(secretFile)) {
      const secrets = JSON.parse(fs.readFileSync(secretFile, 'utf-8'));
      const value = this.lookupSecret(secrets, reference);
      if (value) return value;
    }
    const envKey = this.buildEnvKey('AWS_SECRET', reference);
    const envValue = process.env[envKey];
    if (envValue) return envValue;
    if (reference.defaultValue !== undefined) return reference.defaultValue;
    throw new Error(`AWS Secrets Manager value ${reference.key} not found`);
  }

  private fromFile(reference: SecretReference): string {
    const base = this.options.fileBasePath || process.cwd();
    const filePath = path.isAbsolute(reference.key) ? reference.key : path.join(base, reference.key);
    if (!fs.existsSync(filePath)) {
      if (reference.defaultValue !== undefined) return reference.defaultValue;
      throw new Error(`Secret file ${filePath} not found`);
    }
    const raw = fs.readFileSync(filePath, 'utf-8');
    if (reference.field) {
      try {
        const parsed = JSON.parse(raw);
        const value = parsed[reference.field];
        if (value !== undefined) {
          return typeof value === 'string' ? value : JSON.stringify(value);
        }
      } catch (error) {
        throw new Error(`Secret file ${filePath} is not valid JSON: ${(error as Error).message}`);
      }
      if (reference.defaultValue !== undefined) return reference.defaultValue;
      throw new Error(`Field ${reference.field} missing in secret file ${filePath}`);
    }
    return raw.trim();
  }

  private lookupSecret(source: Record<string, any>, reference: SecretReference): string | undefined {
    const pathParts = reference.key.split('/').filter(Boolean);
    let current: any = source;
    for (const part of pathParts) {
      current = current?.[part];
      if (current === undefined) return undefined;
    }
    if (reference.field) {
      return current?.[reference.field];
    }
    if (typeof current === 'string') {
      return current;
    }
    return undefined;
  }

  private buildEnvKey(prefix: string, reference: SecretReference): string {
    const sanitizedKey = reference.key.replace(/\//g, '_').replace(/-/g, '_').toUpperCase();
    const sanitizedField = reference.field ? `__${reference.field.replace(/-/g, '_').toUpperCase()}` : '';
    return `${prefix}__${sanitizedKey}${sanitizedField}`;
  }
}
