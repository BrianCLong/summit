"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.SecretManager = void 0;
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const secret_audit_logger_js_1 = require("../security/secret-audit-logger.js");
class SecretManager {
    cache = new Map();
    auditLogger;
    options;
    rotationTimer;
    constructor(options = {}) {
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
        this.auditLogger = new secret_audit_logger_js_1.SecretAuditLogger(this.options.auditLogPath);
        this.configureRotation();
    }
    updateOptions(options) {
        this.options = { ...this.options, ...options };
        this.configureRotation();
        if (options.auditLogPath) {
            this.auditLogger = new secret_audit_logger_js_1.SecretAuditLogger(options.auditLogPath);
        }
    }
    static encrypt(plaintext, key) {
        const iv = crypto.randomBytes(12);
        const hashKey = crypto.createHash('sha256').update(key).digest();
        const cipher = crypto.createCipheriv('aes-256-gcm', hashKey, iv);
        const ciphertext = Buffer.concat([cipher.update(Buffer.from(plaintext, 'utf8')), cipher.final()]);
        const authTag = cipher.getAuthTag();
        return `enc::v1:${iv.toString('base64')}:${authTag.toString('base64')}:${ciphertext.toString('base64')}`;
    }
    resolveConfig(config) {
        if (Array.isArray(config)) {
            return config.map(value => this.resolveConfig(value));
        }
        if (config && typeof config === 'object') {
            return Object.keys(config).reduce((acc, key) => {
                acc[key] = this.resolveConfig(config[key]);
                return acc;
            }, {});
        }
        if (typeof config === 'string') {
            return this.resolveString(config);
        }
        return config;
    }
    rotateSecret(reference) {
        this.cache.delete(reference);
        this.resolveString(reference, true);
    }
    close() {
        if (this.rotationTimer) {
            clearInterval(this.rotationTimer);
        }
    }
    configureRotation() {
        if (this.rotationTimer) {
            clearInterval(this.rotationTimer);
        }
        if (this.options.rotationIntervalSeconds > 0) {
            this.rotationTimer = setInterval(() => this.evictExpired(), this.options.rotationIntervalSeconds * 1000);
        }
    }
    evictExpired() {
        const now = Date.now();
        const keysToDelete = [];
        this.cache.forEach((value, key) => {
            if (value.expiresAt <= now) {
                keysToDelete.push(key);
            }
        });
        keysToDelete.forEach(key => this.cache.delete(key));
    }
    resolveString(value, rotated = false) {
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
            }
            catch (error) {
                if (!reference.optional) {
                    this.auditLogger.record({
                        provider,
                        reference: reference.raw,
                        cached: false,
                        rotated,
                        success: false,
                        message: error.message,
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
    orderProviders(reference) {
        const ordered = [];
        const preferred = reference.protocol === 'vault'
            ? 'vault'
            : reference.protocol === 'aws-sm'
                ? 'awsSecretsManager'
                : reference.protocol === 'file'
                    ? 'file'
                    : 'environment';
        if (this.options.providerPreference.includes(preferred)) {
            ordered.push(preferred);
        }
        for (const provider of this.options.providerPreference) {
            if (!ordered.includes(provider)) {
                ordered.push(provider);
            }
        }
        return ordered;
    }
    parseReference(value) {
        if (value.startsWith('vault://') || value.startsWith('aws-sm://') || value.startsWith('env://') || value.startsWith('file://')) {
            const url = new URL(value);
            const optional = url.searchParams.get('optional') === 'true';
            const defaultValue = url.searchParams.get('default') ?? undefined;
            const ttl = url.searchParams.get('ttl');
            const rawKey = `${url.hostname}${url.pathname}`.replace(/\/+/g, '/');
            const normalizedKey = value.startsWith('file://') && !url.hostname
                ? rawKey
                : rawKey.replace(/^\//, '');
            return {
                protocol: value.startsWith('vault://')
                    ? 'vault'
                    : value.startsWith('aws-sm://')
                        ? 'aws-sm'
                        : value.startsWith('file://')
                            ? 'file'
                            : 'env',
                key: normalizedKey.replace(/\/+$/, ''),
                field: url.hash ? url.hash.replace('#', '') : undefined,
                raw: value,
                optional,
                defaultValue,
                ttlSeconds: ttl ? Number(ttl) : undefined,
            };
        }
        if (value.startsWith('enc::')) {
            return { protocol: 'enc', key: value, raw: value, optional: false };
        }
        return null;
    }
    decryptValue(value) {
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
    fetchFromProvider(provider, reference) {
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
    fromEnv(reference) {
        const envValue = process.env[reference.key];
        if (envValue)
            return envValue;
        const fallbackKey = reference.field ? `${reference.key}__${reference.field}` : reference.key;
        const fallback = process.env[fallbackKey];
        if (fallback)
            return fallback;
        if (reference.defaultValue !== undefined)
            return reference.defaultValue;
        throw new Error(`Environment variable ${reference.key} not set`);
    }
    fromVault(reference) {
        const configuredPath = this.options.vaultConfig?.address?.startsWith('file://')
            ? this.options.vaultConfig.address.replace('file://', '')
            : undefined;
        const secretFile = process.env.VAULT_SECRETS_FILE || configuredPath || path.join(process.cwd(), 'server/config/vault.secrets.json');
        if (fs.existsSync(secretFile)) {
            const secrets = JSON.parse(fs.readFileSync(secretFile, 'utf-8'));
            const value = this.lookupSecret(secrets, reference);
            if (value)
                return value;
        }
        const envKey = this.buildEnvKey('VAULT_SECRET', reference);
        const envValue = process.env[envKey];
        if (envValue)
            return envValue;
        if (reference.defaultValue !== undefined)
            return reference.defaultValue;
        throw new Error(`Vault secret ${reference.key} not found`);
    }
    fromAwsSecrets(reference) {
        const configuredPath = this.options.awsConfig?.endpoint?.startsWith('file://')
            ? this.options.awsConfig.endpoint.replace('file://', '')
            : undefined;
        const secretFile = process.env.AWS_SECRETS_FILE || configuredPath || path.join(process.cwd(), 'server/config/aws.secrets.json');
        if (fs.existsSync(secretFile)) {
            const secrets = JSON.parse(fs.readFileSync(secretFile, 'utf-8'));
            const value = this.lookupSecret(secrets, reference);
            if (value)
                return value;
        }
        const envKey = this.buildEnvKey('AWS_SECRET', reference);
        const envValue = process.env[envKey];
        if (envValue)
            return envValue;
        if (reference.defaultValue !== undefined)
            return reference.defaultValue;
        throw new Error(`AWS Secrets Manager value ${reference.key} not found`);
    }
    fromFile(reference) {
        const base = this.options.fileBasePath || process.cwd();
        const filePath = path.isAbsolute(reference.key) ? reference.key : path.join(base, reference.key);
        if (!fs.existsSync(filePath)) {
            if (reference.defaultValue !== undefined)
                return reference.defaultValue;
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
            }
            catch (error) {
                throw new Error(`Secret file ${filePath} is not valid JSON: ${error.message}`);
            }
            if (reference.defaultValue !== undefined)
                return reference.defaultValue;
            throw new Error(`Field ${reference.field} missing in secret file ${filePath}`);
        }
        return raw.trim();
    }
    lookupSecret(source, reference) {
        const pathParts = reference.key.split('/').filter(Boolean);
        let current = source;
        for (const part of pathParts) {
            current = current?.[part];
            if (current === undefined)
                return undefined;
        }
        if (reference.field) {
            return current?.[reference.field];
        }
        if (typeof current === 'string') {
            return current;
        }
        return undefined;
    }
    buildEnvKey(prefix, reference) {
        const sanitizedKey = reference.key.replace(/\//g, '_').replace(/-/g, '_').toUpperCase();
        const sanitizedField = reference.field ? `__${reference.field.replace(/-/g, '_').toUpperCase()}` : '';
        return `${prefix}__${sanitizedKey}${sanitizedField}`;
    }
}
exports.SecretManager = SecretManager;
