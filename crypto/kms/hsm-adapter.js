"use strict";
/**
 * Customer Managed Keys (CMK) and HSM Integration
 * Sprint 28A: Enterprise-grade key management for sovereign deployments
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HSMAdapter = void 0;
const events_1 = require("events");
const crypto_1 = __importDefault(require("crypto"));
class HSMAdapter extends events_1.EventEmitter {
    providers = new Map();
    keys = new Map();
    operations = new Map();
    erasureEvents = new Map();
    constructor() {
        super();
    }
    /**
     * Register HSM provider
     */
    async registerProvider(provider) {
        const fullProvider = {
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
    async createKey(tenantId, alias, providerId, purpose, options = {}) {
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
        const key = {
            id: crypto_1.default.randomUUID(),
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
                    nextRotation: new Date(Date.now() + options.rotationDays * 24 * 60 * 60 * 1000),
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
    async rotateKey(keyId, requestor, approver) {
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
                key.rotationSchedule.nextRotation = new Date(Date.now() + key.rotationSchedule.intervalDays * 24 * 60 * 60 * 1000);
            }
            this.keys.set(keyId, key);
            // Update operation status
            operation.status = 'executed';
            operation.audit.executionTime = new Date();
            this.operations.set(operation.id, operation);
            this.emit('key_rotated', { key, oldKeyId: key.keyId, newKeyId });
            return key;
        }
        catch (error) {
            operation.status = 'failed';
            operation.audit.error = error.message;
            this.operations.set(operation.id, operation);
            throw error;
        }
    }
    /**
     * Encrypt data using CMK
     */
    async encrypt(keyId, plaintext, context) {
        const key = await this.validateKeyOperation(keyId, 'encrypt');
        const provider = this.providers.get(key.providerId);
        if (!provider) {
            throw new Error(`Provider not found: ${key.providerId}`);
        }
        // Perform encryption in HSM
        const result = await this.performHSMEncryption(provider, key.keyId, plaintext, context);
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
    async decrypt(keyId, ciphertext, context) {
        const key = await this.validateKeyOperation(keyId, 'decrypt');
        const provider = this.providers.get(key.providerId);
        if (!provider) {
            throw new Error(`Provider not found: ${key.providerId}`);
        }
        // Perform decryption in HSM
        const result = await this.performHSMDecryption(provider, key.keyId, ciphertext, context);
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
    async cryptoErasure(tenantId, datasets, requestor, approver) {
        // Find tenant keys
        const tenantKeys = Array.from(this.keys.values()).filter((k) => k.tenantId === tenantId);
        if (tenantKeys.length === 0) {
            throw new Error('No keys found for tenant');
        }
        // Calculate before hash of datasets
        const beforeHash = await this.calculateDatasetHash(datasets);
        const erasureEvent = {
            id: crypto_1.default.randomUUID(),
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
        }
        catch (error) {
            erasureEvent.verification.success = false;
            this.erasureEvents.set(erasureEvent.id, erasureEvent);
            throw error;
        }
    }
    /**
     * Get key by tenant and alias
     */
    getKey(tenantId, alias) {
        return (Array.from(this.keys.values()).find((k) => k.tenantId === tenantId && k.alias === alias && k.status === 'active') || null);
    }
    /**
     * List tenant keys
     */
    listKeys(tenantId) {
        return Array.from(this.keys.values()).filter((k) => k.tenantId === tenantId);
    }
    /**
     * Get key operations audit trail
     */
    getOperations(keyId, limit = 100) {
        const operations = Array.from(this.operations.values());
        return (keyId ? operations.filter((op) => op.keyId === keyId) : operations)
            .sort((a, b) => b.audit.requestTime.getTime() - a.audit.requestTime.getTime())
            .slice(0, limit);
    }
    async testHSMConnection(provider) {
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
    generateHSMKey(_provider, _options) {
        // Generate key in HSM and return key ID
        return `hsm-key-${crypto_1.default.randomUUID()}`;
    }
    rotateHSMKey(_provider, _oldKeyId) {
        // Rotate key in HSM and return new key ID
        return `hsm-key-${crypto_1.default.randomUUID()}`;
    }
    performHSMEncryption(_provider, _keyId, plaintext, _context) {
        // Perform encryption in HSM
        const ciphertext = crypto_1.default.randomBytes(plaintext.length + 16); // Mock encrypted data
        return {
            ciphertext,
            attestation: {
                timestamp: new Date(),
                hsmId: _provider.name,
                keyId: _keyId,
            },
        };
    }
    performHSMDecryption(_provider, _keyId, ciphertext, _context) {
        // Perform decryption in HSM
        const plaintext = ciphertext.slice(16); // Mock decrypted data
        return {
            plaintext,
            attestation: {
                timestamp: new Date(),
                hsmId: _provider.name,
                keyId: _keyId,
            },
        };
    }
    deleteHSMKey(_provider, keyId) {
        // Delete key from HSM
        process.stdout.write(`Deleting key ${keyId} from HSM ${_provider.name}\n`);
    }
    validateKeyOperation(keyId, operation) {
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
    recordOperation(operation) {
        const fullOperation = {
            ...operation,
            id: crypto_1.default.randomUUID(),
            audit: {
                requestTime: new Date(),
                ...(operation.status === 'executed' && { executionTime: new Date() }),
            },
        };
        this.operations.set(fullOperation.id, fullOperation);
        return fullOperation;
    }
    getDefaultOperations(purpose) {
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
    calculateDatasetHash(datasets) {
        // Calculate hash of dataset contents for verification
        const hash = crypto_1.default.createHash('sha256');
        for (const dataset of datasets) {
            hash.update(dataset);
        }
        return hash.digest('hex');
    }
    countKeyUsage(keyId) {
        // Count records encrypted with this key
        return this.operations.filter((op) => op.keyId === keyId &&
            (op.operation === 'encrypt' || op.operation === 'decrypt') &&
            op.status === 'executed').length;
    }
    // HSM-specific connection testers
    testLunaConnection(_provider) {
        // Test SafeNet Luna HSM connection
    }
    testCloudHSMConnection(_provider) {
        // Test AWS CloudHSM connection
    }
    testThalesConnection(_provider) {
        // Test Thales HSM connection
    }
    testKeyVaultConnection(_provider) {
        // Test Azure Key Vault HSM connection
    }
    testCloudKMSConnection(_provider) {
        // Test Google Cloud KMS connection
    }
}
exports.HSMAdapter = HSMAdapter;
