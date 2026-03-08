"use strict";
// @ts-nocheck
/**
 * Key Manager
 *
 * Enterprise-grade key management for the Audit Black Box Service.
 * Supports HSM integration, key rotation, and post-quantum preparation.
 *
 * Features:
 * - HSM/Vault integration for master key storage
 * - Automatic key rotation with versioning
 * - Key derivation hierarchy (Master → Signing → Session)
 * - Hybrid classical/post-quantum signature preparation
 * - Secure key caching with automatic expiration
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.KeyManager = void 0;
exports.createKeyManager = createKeyManager;
const crypto_1 = require("crypto");
const events_1 = require("events");
/**
 * Default configuration
 */
const DEFAULT_CONFIG = {
    hsm: {
        enabled: false,
        provider: 'softhsm',
    },
    defaultAlgorithm: 'HMAC-SHA256',
    keyRotationIntervalMs: 365 * 24 * 60 * 60 * 1000, // 1 year
    sessionKeyTTLMs: 60 * 60 * 1000, // 1 hour
    cacheEnabled: true,
    cacheTTLMs: 5 * 60 * 1000, // 5 minutes
    postQuantumEnabled: false,
};
/**
 * Enterprise Key Manager
 */
class KeyManager extends events_1.EventEmitter {
    config;
    keyCache = new Map();
    masterKey = null;
    signingKeys = new Map();
    rotationTimer;
    constructor(config = {}) {
        super();
        this.config = { ...DEFAULT_CONFIG, ...config };
    }
    /**
     * Initialize the key manager
     */
    async initialize() {
        // Load or generate master key
        if (this.config.hsm.enabled) {
            await this.loadMasterKeyFromHSM();
        }
        else {
            await this.loadOrGenerateMasterKey();
        }
        // Generate signing key pair if using asymmetric algorithm
        if (this.requiresAsymmetricKey()) {
            await this.generateSigningKeyPair();
        }
        // Start rotation timer
        this.startRotationTimer();
        this.emit('initialized', {
            algorithm: this.config.defaultAlgorithm,
            hsmEnabled: this.config.hsm.enabled,
            postQuantumEnabled: this.config.postQuantumEnabled,
        });
    }
    /**
     * Get signing key for a tenant
     */
    async getSigningKey(tenantId = 'default') {
        const cacheKey = `signing:${tenantId}`;
        // Check cache
        if (this.config.cacheEnabled) {
            const cached = this.keyCache.get(cacheKey);
            if (cached && this.isCacheValid(cached)) {
                return { key: cached.key, metadata: cached.metadata };
            }
        }
        // Derive tenant-specific signing key
        const key = await this.deriveSigningKey(tenantId);
        const metadata = this.createKeyMetadata('signing', tenantId);
        // Cache the key
        if (this.config.cacheEnabled) {
            this.keyCache.set(cacheKey, {
                key,
                metadata,
                cachedAt: new Date(),
            });
        }
        return { key, metadata };
    }
    /**
     * Sign data using the appropriate algorithm
     */
    async sign(data, tenantId = 'default') {
        const { key, metadata } = await this.getSigningKey(tenantId);
        const dataBuffer = typeof data === 'string' ? Buffer.from(data) : data;
        let signature;
        switch (this.config.defaultAlgorithm) {
            case 'HMAC-SHA256':
                signature = (0, crypto_1.createHmac)('sha256', key)
                    .update(dataBuffer)
                    .digest('hex');
                break;
            case 'HMAC-SHA512':
                signature = (0, crypto_1.createHmac)('sha512', key)
                    .update(dataBuffer)
                    .digest('hex');
                break;
            case 'ECDSA-P256':
            case 'ECDSA-P384':
            case 'RSA-SHA256':
            case 'RSA-SHA512': {
                const signingKey = this.signingKeys.get(tenantId) || this.signingKeys.get('default');
                if (!signingKey) {
                    throw new Error('Signing key not available');
                }
                const sign = (0, crypto_1.createSign)(this.config.defaultAlgorithm.includes('256') ? 'SHA256' : 'SHA512');
                sign.update(dataBuffer);
                signature = sign.sign(signingKey.private, 'hex');
                break;
            }
            default:
                throw new Error(`Unsupported algorithm: ${this.config.defaultAlgorithm}`);
        }
        // If post-quantum is enabled, create hybrid signature
        if (this.config.postQuantumEnabled) {
            const pqSignature = await this.createPostQuantumSignature(dataBuffer);
            signature = `${signature}:PQ:${pqSignature}`;
        }
        return {
            signature,
            algorithm: this.config.defaultAlgorithm,
            keyId: metadata.id,
        };
    }
    /**
     * Verify a signature
     */
    async verify(data, signature, tenantId = 'default') {
        const { key } = await this.getSigningKey(tenantId);
        const dataBuffer = typeof data === 'string' ? Buffer.from(data) : data;
        // Handle hybrid signature
        let classicalSignature = signature;
        let pqSignature;
        if (signature.includes(':PQ:')) {
            const parts = signature.split(':PQ:');
            classicalSignature = parts[0];
            pqSignature = parts[1];
        }
        // Verify classical signature
        let classicalValid;
        switch (this.config.defaultAlgorithm) {
            case 'HMAC-SHA256': {
                const expected = (0, crypto_1.createHmac)('sha256', key)
                    .update(dataBuffer)
                    .digest('hex');
                classicalValid = expected === classicalSignature;
                break;
            }
            case 'HMAC-SHA512': {
                const expected = (0, crypto_1.createHmac)('sha512', key)
                    .update(dataBuffer)
                    .digest('hex');
                classicalValid = expected === classicalSignature;
                break;
            }
            case 'ECDSA-P256':
            case 'ECDSA-P384':
            case 'RSA-SHA256':
            case 'RSA-SHA512': {
                const signingKey = this.signingKeys.get(tenantId) || this.signingKeys.get('default');
                if (!signingKey) {
                    throw new Error('Signing key not available');
                }
                const verify = (0, crypto_1.createVerify)(this.config.defaultAlgorithm.includes('256') ? 'SHA256' : 'SHA512');
                verify.update(dataBuffer);
                classicalValid = verify.verify(signingKey.public, classicalSignature, 'hex');
                break;
            }
            default:
                throw new Error(`Unsupported algorithm: ${this.config.defaultAlgorithm}`);
        }
        // Verify post-quantum signature if present
        if (pqSignature && this.config.postQuantumEnabled) {
            const pqValid = await this.verifyPostQuantumSignature(dataBuffer, pqSignature);
            return classicalValid && pqValid;
        }
        return classicalValid;
    }
    /**
     * Rotate signing keys
     */
    async rotateKeys(tenantId = 'default') {
        this.emit('keyRotationStarted', { tenantId });
        // Generate new key
        const newKey = await this.deriveSigningKey(tenantId, Date.now());
        const metadata = this.createKeyMetadata('signing', tenantId);
        metadata.rotatedAt = new Date();
        // Update cache
        const cacheKey = `signing:${tenantId}`;
        this.keyCache.set(cacheKey, {
            key: newKey,
            metadata,
            cachedAt: new Date(),
        });
        // If asymmetric, rotate key pair
        if (this.requiresAsymmetricKey()) {
            await this.generateSigningKeyPair(tenantId);
        }
        this.emit('keyRotationCompleted', {
            tenantId,
            newKeyId: metadata.id,
        });
        return metadata;
    }
    /**
     * Encrypt data using master key
     */
    async encrypt(data) {
        if (!this.masterKey) {
            throw new Error('Master key not initialized');
        }
        const iv = (0, crypto_1.randomBytes)(16);
        const cipher = (0, crypto_1.createCipheriv)('aes-256-gcm', this.masterKey, iv);
        const ciphertext = Buffer.concat([cipher.update(data), cipher.final()]);
        const tag = cipher.getAuthTag();
        return { ciphertext, iv, tag };
    }
    /**
     * Decrypt data using master key
     */
    async decrypt(ciphertext, iv, tag) {
        if (!this.masterKey) {
            throw new Error('Master key not initialized');
        }
        const decipher = (0, crypto_1.createDecipheriv)('aes-256-gcm', this.masterKey, iv);
        decipher.setAuthTag(tag);
        return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    }
    /**
     * Get key fingerprint for auditing
     */
    getKeyFingerprint(key) {
        const keyBuffer = Buffer.isBuffer(key)
            ? key
            : key.export({ type: 'spki', format: 'der' });
        return (0, crypto_1.createHash)('sha256').update(keyBuffer).digest('hex').substring(0, 16);
    }
    /**
     * Export public key for verification
     */
    async exportPublicKey(tenantId = 'default') {
        if (!this.requiresAsymmetricKey()) {
            throw new Error('Public key only available for asymmetric algorithms');
        }
        const keyPair = this.signingKeys.get(tenantId) || this.signingKeys.get('default');
        if (!keyPair) {
            throw new Error('Key pair not available');
        }
        return keyPair.public.export({ type: 'spki', format: 'pem' });
    }
    /**
     * Get current algorithm
     */
    getAlgorithm() {
        return this.config.defaultAlgorithm;
    }
    /**
     * Shutdown and cleanup
     */
    async shutdown() {
        if (this.rotationTimer) {
            clearInterval(this.rotationTimer);
        }
        // Clear sensitive data from memory
        this.masterKey = null;
        this.keyCache.clear();
        this.signingKeys.clear();
        this.emit('shutdown');
    }
    // ============================================================================
    // Private Methods
    // ============================================================================
    /**
     * Load master key from HSM
     */
    async loadMasterKeyFromHSM() {
        const { hsm } = this.config;
        switch (hsm.provider) {
            case 'vault':
                // HashiCorp Vault integration
                // In production, use the Vault SDK
                this.masterKey = await this.vaultGetKey();
                break;
            case 'aws-kms':
                // AWS KMS integration
                // In production, use the AWS SDK
                this.masterKey = await this.awsKmsGetKey();
                break;
            case 'azure-keyvault':
                // Azure Key Vault integration
                this.masterKey = await this.azureKeyVaultGetKey();
                break;
            case 'gcp-kms':
                // GCP KMS integration
                this.masterKey = await this.gcpKmsGetKey();
                break;
            case 'softhsm':
                // Software HSM for development
                this.masterKey = await this.softHsmGetKey();
                break;
            default:
                throw new Error(`Unsupported HSM provider: ${hsm.provider}`);
        }
    }
    /**
     * Load or generate master key (non-HSM mode)
     */
    async loadOrGenerateMasterKey() {
        // In production, this should load from secure storage
        // For development, generate a deterministic key from environment
        const seed = process.env.AUDIT_MASTER_KEY_SEED || 'development-seed-change-in-production';
        this.masterKey = (0, crypto_1.pbkdf2Sync)(seed, 'audit-blackbox-salt', 100000, 32, 'sha256');
    }
    /**
     * Derive signing key for tenant
     */
    async deriveSigningKey(tenantId, version = 1) {
        if (!this.masterKey) {
            throw new Error('Master key not initialized');
        }
        const derivationData = `signing:${tenantId}:v${version}`;
        const salt = (0, crypto_1.createHash)('sha256').update(derivationData).digest();
        return (0, crypto_1.pbkdf2Sync)(this.masterKey, salt, 10000, 32, 'sha256');
    }
    /**
     * Generate signing key pair for asymmetric algorithms
     */
    async generateSigningKeyPair(tenantId = 'default') {
        let keyPair;
        switch (this.config.defaultAlgorithm) {
            case 'ECDSA-P256':
                keyPair = (0, crypto_1.generateKeyPairSync)('ec', {
                    namedCurve: 'P-256',
                });
                break;
            case 'ECDSA-P384':
                keyPair = (0, crypto_1.generateKeyPairSync)('ec', {
                    namedCurve: 'P-384',
                });
                break;
            case 'RSA-SHA256':
            case 'RSA-SHA512':
                keyPair = (0, crypto_1.generateKeyPairSync)('rsa', {
                    modulusLength: 4096,
                });
                break;
            default:
                return; // HMAC doesn't need key pair
        }
        this.signingKeys.set(tenantId, {
            private: keyPair.privateKey,
            public: keyPair.publicKey,
        });
    }
    /**
     * Create post-quantum signature (preparation for future)
     */
    async createPostQuantumSignature(data) {
        // This is a placeholder for future post-quantum cryptography
        // When NIST PQC standards are finalized and libraries available,
        // implement CRYSTALS-Dilithium or SPHINCS+ here
        // For now, use a hash-based signature simulation
        const hashBasedSig = (0, crypto_1.createHash)('sha3-256')
            .update(data)
            .update(this.masterKey || Buffer.from(''))
            .digest('hex');
        return hashBasedSig;
    }
    /**
     * Verify post-quantum signature
     */
    async verifyPostQuantumSignature(data, signature) {
        const expected = await this.createPostQuantumSignature(data);
        return expected === signature;
    }
    /**
     * Check if algorithm requires asymmetric key
     */
    requiresAsymmetricKey() {
        return (this.config.defaultAlgorithm.startsWith('ECDSA') ||
            this.config.defaultAlgorithm.startsWith('RSA'));
    }
    /**
     * Create key metadata
     */
    createKeyMetadata(type, tenantId) {
        const id = (0, crypto_1.randomBytes)(8).toString('hex');
        const now = new Date();
        return {
            id,
            type,
            algorithm: this.config.defaultAlgorithm,
            version: 1,
            createdAt: now,
            expiresAt: new Date(now.getTime() + this.config.keyRotationIntervalMs),
            status: 'active',
            tenantId,
            fingerprint: this.getKeyFingerprint(this.masterKey || Buffer.from('')),
        };
    }
    /**
     * Check if cache entry is valid
     */
    isCacheValid(cached) {
        const now = Date.now();
        const cachedAt = cached.cachedAt.getTime();
        return now - cachedAt < this.config.cacheTTLMs;
    }
    /**
     * Start key rotation timer
     */
    startRotationTimer() {
        // Check for key rotation every hour
        this.rotationTimer = setInterval(() => {
            this.checkAndRotateKeys().catch((err) => {
                this.emit('error', { type: 'rotation_check', error: err.message });
            });
        }, 60 * 60 * 1000); // 1 hour
    }
    /**
     * Check and rotate keys if needed
     */
    async checkAndRotateKeys() {
        const now = Date.now();
        for (const [cacheKey, cached] of this.keyCache.entries()) {
            if (cached.metadata.expiresAt.getTime() < now) {
                const tenantId = cached.metadata.tenantId || 'default';
                await this.rotateKeys(tenantId);
            }
        }
    }
    // ============================================================================
    // HSM Provider Implementations (Stubs - Replace with actual SDK calls)
    // ============================================================================
    async vaultGetKey() {
        // HashiCorp Vault implementation
        // const vault = require('node-vault')({ endpoint: this.config.hsm.endpoint });
        // const response = await vault.read(`${this.config.hsm.transitPath}/export/encryption-key/${this.config.hsm.keyName}`);
        // return Buffer.from(response.data.keys['1'], 'base64');
        // Stub for development
        return (0, crypto_1.randomBytes)(32);
    }
    async awsKmsGetKey() {
        // AWS KMS implementation
        // const { KMSClient, GenerateDataKeyCommand } = require('@aws-sdk/client-kms');
        // const client = new KMSClient({ region: this.config.hsm.credentials?.region });
        // const response = await client.send(new GenerateDataKeyCommand({ KeyId: this.config.hsm.credentials?.keyId, KeySpec: 'AES_256' }));
        // return Buffer.from(response.Plaintext);
        // Stub for development
        return (0, crypto_1.randomBytes)(32);
    }
    async azureKeyVaultGetKey() {
        // Azure Key Vault implementation
        // const { SecretClient } = require('@azure/keyvault-secrets');
        // const client = new SecretClient(this.config.hsm.endpoint, credential);
        // const secret = await client.getSecret(this.config.hsm.keyName);
        // return Buffer.from(secret.value, 'base64');
        // Stub for development
        return (0, crypto_1.randomBytes)(32);
    }
    async gcpKmsGetKey() {
        // GCP KMS implementation
        // const { KeyManagementServiceClient } = require('@google-cloud/kms');
        // const client = new KeyManagementServiceClient();
        // const [response] = await client.encrypt({ name: keyName, plaintext: Buffer.from('') });
        // return Buffer.from(response.ciphertext);
        // Stub for development
        return (0, crypto_1.randomBytes)(32);
    }
    async softHsmGetKey() {
        // Software HSM for development/testing
        // In production, use PKCS#11 interface
        return this.loadOrGenerateMasterKey().then(() => this.masterKey);
    }
}
exports.KeyManager = KeyManager;
/**
 * Create a configured key manager
 */
function createKeyManager(config = {}) {
    return new KeyManager(config);
}
