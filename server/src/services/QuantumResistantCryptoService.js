"use strict";
// @ts-nocheck
/**
 * Quantum-Resistant Cryptography Service
 * Provides post-quantum cryptographic operations for Summit platform
 * Implements NIST PQC standards: Kyber, Dilithium, FALCON, SPHINCS+
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.quantumCryptoService = exports.QuantumResistantCryptoService = void 0;
const events_1 = require("events");
const post_quantum_crypto_1 = require("@intelgraph/post-quantum-crypto");
class QuantumResistantCryptoService extends events_1.EventEmitter {
    keyStore = new Map();
    rotationPolicies = new Map();
    operationLog = [];
    maxOperationHistory = 10000;
    rotationTimer = null;
    // Algorithm instances
    kyber768;
    kyber1024;
    dilithium3;
    dilithium5;
    falcon512;
    sphincs128f;
    hybridKEM;
    validator;
    benchmarker;
    constructor() {
        super();
        console.log('[PQC] Initializing Quantum-Resistant Cryptography Service');
        // Initialize algorithm instances
        this.kyber768 = (0, post_quantum_crypto_1.createKyberKEM)(post_quantum_crypto_1.SecurityLevel.LEVEL_3);
        this.kyber1024 = (0, post_quantum_crypto_1.createKyberKEM)(post_quantum_crypto_1.SecurityLevel.LEVEL_5);
        this.dilithium3 = (0, post_quantum_crypto_1.createDilithiumSignature)(post_quantum_crypto_1.SecurityLevel.LEVEL_3);
        this.dilithium5 = (0, post_quantum_crypto_1.createDilithiumSignature)(post_quantum_crypto_1.SecurityLevel.LEVEL_5);
        this.falcon512 = (0, post_quantum_crypto_1.createFalconSignature)(post_quantum_crypto_1.SecurityLevel.LEVEL_1);
        this.sphincs128f = (0, post_quantum_crypto_1.createSphincsSignature)(post_quantum_crypto_1.SecurityLevel.LEVEL_1, true);
        this.hybridKEM = (0, post_quantum_crypto_1.createHybridKEM)('x25519');
        this.validator = (0, post_quantum_crypto_1.createValidator)();
        this.benchmarker = (0, post_quantum_crypto_1.createBenchmarker)(10);
        // Initialize default rotation policies
        this.initializeRotationPolicies();
        // Start key rotation monitor
        if (process.env.NODE_ENV !== 'test') {
            this.rotationTimer = setInterval(() => this.checkKeyRotations(), 3600000); // Every hour
        }
        console.log('[PQC] Service initialized with NIST PQC algorithms');
    }
    initializeRotationPolicies() {
        const defaultPolicies = [
            {
                algorithmId: post_quantum_crypto_1.PQCAlgorithm.KYBER_768,
                rotationIntervalDays: 90,
                autoRotate: true,
                notifyBeforeDays: 7,
            },
            {
                algorithmId: post_quantum_crypto_1.PQCAlgorithm.KYBER_1024,
                rotationIntervalDays: 180,
                autoRotate: true,
                notifyBeforeDays: 14,
            },
            {
                algorithmId: post_quantum_crypto_1.PQCAlgorithm.DILITHIUM_3,
                rotationIntervalDays: 365,
                autoRotate: false,
                notifyBeforeDays: 30,
            },
            {
                algorithmId: post_quantum_crypto_1.PQCAlgorithm.DILITHIUM_5,
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
    async generateKeyPair(algorithm, options = {}) {
        const startTime = Date.now();
        try {
            let keyPair;
            switch (algorithm) {
                case post_quantum_crypto_1.PQCAlgorithm.KYBER_512:
                    keyPair = await (0, post_quantum_crypto_1.createKyberKEM)(post_quantum_crypto_1.SecurityLevel.LEVEL_1).generateKeyPair();
                    break;
                case post_quantum_crypto_1.PQCAlgorithm.KYBER_768:
                    keyPair = await this.kyber768.generateKeyPair();
                    break;
                case post_quantum_crypto_1.PQCAlgorithm.KYBER_1024:
                    keyPair = await this.kyber1024.generateKeyPair();
                    break;
                case post_quantum_crypto_1.PQCAlgorithm.DILITHIUM_2:
                    keyPair = await (0, post_quantum_crypto_1.createDilithiumSignature)(post_quantum_crypto_1.SecurityLevel.LEVEL_2).generateKeyPair();
                    break;
                case post_quantum_crypto_1.PQCAlgorithm.DILITHIUM_3:
                    keyPair = await this.dilithium3.generateKeyPair();
                    break;
                case post_quantum_crypto_1.PQCAlgorithm.DILITHIUM_5:
                    keyPair = await this.dilithium5.generateKeyPair();
                    break;
                case post_quantum_crypto_1.PQCAlgorithm.FALCON_512:
                    keyPair = await this.falcon512.generateKeyPair();
                    break;
                case post_quantum_crypto_1.PQCAlgorithm.FALCON_1024:
                    keyPair = await (0, post_quantum_crypto_1.createFalconSignature)(post_quantum_crypto_1.SecurityLevel.LEVEL_5).generateKeyPair();
                    break;
                case post_quantum_crypto_1.PQCAlgorithm.SPHINCS_PLUS_128F:
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
            const keyStore = {
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
        }
        catch (error) {
            const err = error;
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
    async encapsulate(keyId) {
        const startTime = Date.now();
        const keyStore = this.keyStore.get(keyId);
        if (!keyStore) {
            throw new Error(`Key not found: ${keyId}`);
        }
        if (!this.isKEMAlgorithm(keyStore.algorithm)) {
            throw new Error(`Algorithm ${keyStore.algorithm} does not support encapsulation`);
        }
        try {
            let result;
            if (keyStore.algorithm.startsWith('kyber')) {
                const kem = this.getKyberInstance(keyStore.algorithm);
                result = await kem.encapsulate(keyStore.publicKey);
            }
            else {
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
        }
        catch (error) {
            const err = error;
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
    async decapsulate(keyId, ciphertext) {
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
            let sharedSecret;
            if (keyStore.algorithm.startsWith('kyber')) {
                const kem = this.getKyberInstance(keyStore.algorithm);
                sharedSecret = await kem.decapsulate(ciphertext, keyStore.privateKey);
            }
            else {
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
        }
        catch (error) {
            const err = error;
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
    async sign(keyId, message) {
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
        }
        catch (error) {
            const err = error;
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
    async verify(keyId, message, signature) {
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
        }
        catch (error) {
            const err = error;
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
    async generateHybridKeyPair(options = {}) {
        const startTime = Date.now();
        try {
            const hybridKem = options.classicalAlgorithm
                ? (0, post_quantum_crypto_1.createHybridKEM)(options.classicalAlgorithm)
                : this.hybridKEM;
            const keyPair = await hybridKem.generateKeyPair();
            const keyId = options.keyId || this.generateKeyId();
            const now = new Date();
            const expiresAt = options.expiresInDays
                ? new Date(now.getTime() + options.expiresInDays * 24 * 60 * 60 * 1000)
                : undefined;
            const keyStore = {
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
        }
        catch (error) {
            const err = error;
            this.logOperation({
                success: false,
                operation: 'generateHybridKeyPair',
                algorithm: post_quantum_crypto_1.PQCAlgorithm.KYBER_768,
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
    async validateAlgorithm(algorithm) {
        if (this.isKEMAlgorithm(algorithm)) {
            const kem = this.getKyberInstance(algorithm);
            return this.validator.validateKEM(kem, 5);
        }
        else if (this.isSignatureAlgorithm(algorithm)) {
            const signer = this.getSignatureInstance(algorithm);
            return this.validator.validateSignature(signer, 5);
        }
        return false;
    }
    /**
     * Run performance benchmark for an algorithm
     */
    async benchmarkAlgorithm(algorithm) {
        if (this.isKEMAlgorithm(algorithm)) {
            const kem = this.getKyberInstance(algorithm);
            const results = await this.benchmarker.benchmarkKEM(kem);
            return this.benchmarker.formatResults(results);
        }
        else if (this.isSignatureAlgorithm(algorithm)) {
            const signer = this.getSignatureInstance(algorithm);
            const results = await this.benchmarker.benchmarkSignature(signer);
            return this.benchmarker.formatResults(results);
        }
        throw new Error(`Unknown algorithm: ${algorithm}`);
    }
    /**
     * Get quantum risk assessment report
     */
    async getQuantumRiskReport() {
        const keys = Array.from(this.keyStore.values());
        const now = new Date();
        const vulnerableAssets = keys.filter((k) => !this.isQuantumResistant(k.algorithm)).length;
        const migratedAssets = keys.filter((k) => this.isQuantumResistant(k.algorithm)).length;
        const pendingMigrations = vulnerableAssets;
        const recommendations = [];
        if (vulnerableAssets > 0) {
            recommendations.push('Migrate RSA/ECDSA keys to CRYSTALS-Dilithium or FALCON');
            recommendations.push('Replace classical key exchanges with Kyber KEM');
        }
        const expiringSoon = keys.filter((k) => k.expiresAt && k.expiresAt.getTime() - now.getTime() < 30 * 24 * 60 * 60 * 1000);
        if (expiringSoon.length > 0) {
            recommendations.push(`${expiringSoon.length} keys expire within 30 days - schedule rotation`);
        }
        recommendations.push('Implement hybrid schemes for defense-in-depth');
        recommendations.push('Enable automatic key rotation for KEMs');
        recommendations.push('Conduct regular algorithm validation tests');
        let overallRiskLevel;
        if (vulnerableAssets === 0) {
            overallRiskLevel = 'low';
        }
        else if (vulnerableAssets < migratedAssets) {
            overallRiskLevel = 'medium';
        }
        else if (vulnerableAssets < migratedAssets * 2) {
            overallRiskLevel = 'high';
        }
        else {
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
    getKey(keyId) {
        return this.keyStore.get(keyId);
    }
    /**
     * Get public key only (safe to share)
     */
    getPublicKey(keyId) {
        return this.keyStore.get(keyId)?.publicKey;
    }
    /**
     * List all keys
     */
    listKeys(options = {}) {
        const now = new Date();
        return Array.from(this.keyStore.values())
            .filter((k) => {
            if (options.algorithm && k.algorithm !== options.algorithm)
                return false;
            if (!options.includeExpired && k.expiresAt && k.expiresAt < now)
                return false;
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
    deleteKey(keyId) {
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
    async rotateKey(keyId) {
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
    getStatistics() {
        const keys = Array.from(this.keyStore.values());
        const keysByAlgorithm = keys.reduce((acc, key) => {
            acc[key.algorithm] = (acc[key.algorithm] || 0) + 1;
            return acc;
        }, {});
        const operations = this.operationLog;
        const successful = operations.filter((o) => o.success).length;
        const failed = operations.filter((o) => !o.success).length;
        const byOperation = operations.reduce((acc, op) => {
            acc[op.operation] = (acc[op.operation] || 0) + 1;
            return acc;
        }, {});
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
    getSupportedAlgorithms() {
        return {
            kem: [
                post_quantum_crypto_1.PQCAlgorithm.KYBER_512,
                post_quantum_crypto_1.PQCAlgorithm.KYBER_768,
                post_quantum_crypto_1.PQCAlgorithm.KYBER_1024,
            ],
            signature: [
                post_quantum_crypto_1.PQCAlgorithm.DILITHIUM_2,
                post_quantum_crypto_1.PQCAlgorithm.DILITHIUM_3,
                post_quantum_crypto_1.PQCAlgorithm.DILITHIUM_5,
                post_quantum_crypto_1.PQCAlgorithm.FALCON_512,
                post_quantum_crypto_1.PQCAlgorithm.FALCON_1024,
                post_quantum_crypto_1.PQCAlgorithm.SPHINCS_PLUS_128F,
                post_quantum_crypto_1.PQCAlgorithm.SPHINCS_PLUS_128S,
                post_quantum_crypto_1.PQCAlgorithm.SPHINCS_PLUS_192F,
                post_quantum_crypto_1.PQCAlgorithm.SPHINCS_PLUS_192S,
                post_quantum_crypto_1.PQCAlgorithm.SPHINCS_PLUS_256F,
                post_quantum_crypto_1.PQCAlgorithm.SPHINCS_PLUS_256S,
            ],
        };
    }
    // Private helper methods
    generateKeyId() {
        return `pqc-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    }
    isKEMAlgorithm(algorithm) {
        return algorithm.startsWith('kyber');
    }
    isSignatureAlgorithm(algorithm) {
        return (algorithm.startsWith('dilithium') ||
            algorithm.startsWith('falcon') ||
            algorithm.startsWith('sphincs'));
    }
    isQuantumResistant(algorithm) {
        return (algorithm.startsWith('kyber') ||
            algorithm.startsWith('dilithium') ||
            algorithm.startsWith('falcon') ||
            algorithm.startsWith('sphincs'));
    }
    getKyberInstance(algorithm) {
        switch (algorithm) {
            case post_quantum_crypto_1.PQCAlgorithm.KYBER_512:
                return (0, post_quantum_crypto_1.createKyberKEM)(post_quantum_crypto_1.SecurityLevel.LEVEL_1);
            case post_quantum_crypto_1.PQCAlgorithm.KYBER_768:
                return this.kyber768;
            case post_quantum_crypto_1.PQCAlgorithm.KYBER_1024:
                return this.kyber1024;
            default:
                return this.kyber768;
        }
    }
    getSignatureInstance(algorithm) {
        switch (algorithm) {
            case post_quantum_crypto_1.PQCAlgorithm.DILITHIUM_2:
                return (0, post_quantum_crypto_1.createDilithiumSignature)(post_quantum_crypto_1.SecurityLevel.LEVEL_2);
            case post_quantum_crypto_1.PQCAlgorithm.DILITHIUM_3:
                return this.dilithium3;
            case post_quantum_crypto_1.PQCAlgorithm.DILITHIUM_5:
                return this.dilithium5;
            case post_quantum_crypto_1.PQCAlgorithm.FALCON_512:
                return this.falcon512;
            case post_quantum_crypto_1.PQCAlgorithm.FALCON_1024:
                return (0, post_quantum_crypto_1.createFalconSignature)(post_quantum_crypto_1.SecurityLevel.LEVEL_5);
            case post_quantum_crypto_1.PQCAlgorithm.SPHINCS_PLUS_128F:
                return this.sphincs128f;
            case post_quantum_crypto_1.PQCAlgorithm.SPHINCS_PLUS_128S:
                return (0, post_quantum_crypto_1.createSphincsSignature)(post_quantum_crypto_1.SecurityLevel.LEVEL_1, false);
            case post_quantum_crypto_1.PQCAlgorithm.SPHINCS_PLUS_192F:
                return (0, post_quantum_crypto_1.createSphincsSignature)(post_quantum_crypto_1.SecurityLevel.LEVEL_3, true);
            case post_quantum_crypto_1.PQCAlgorithm.SPHINCS_PLUS_192S:
                return (0, post_quantum_crypto_1.createSphincsSignature)(post_quantum_crypto_1.SecurityLevel.LEVEL_3, false);
            case post_quantum_crypto_1.PQCAlgorithm.SPHINCS_PLUS_256F:
                return (0, post_quantum_crypto_1.createSphincsSignature)(post_quantum_crypto_1.SecurityLevel.LEVEL_5, true);
            case post_quantum_crypto_1.PQCAlgorithm.SPHINCS_PLUS_256S:
                return (0, post_quantum_crypto_1.createSphincsSignature)(post_quantum_crypto_1.SecurityLevel.LEVEL_5, false);
            default:
                return this.dilithium3;
        }
    }
    logOperation(result) {
        this.operationLog.unshift(result);
        if (this.operationLog.length > this.maxOperationHistory) {
            this.operationLog = this.operationLog.slice(0, this.maxOperationHistory);
        }
        this.emit('operation', result);
    }
    checkKeyRotations() {
        const now = new Date();
        for (const [keyId, keyStore] of this.keyStore.entries()) {
            const policy = this.rotationPolicies.get(keyStore.algorithm);
            if (!policy)
                continue;
            if (keyStore.expiresAt) {
                const daysUntilExpiry = (keyStore.expiresAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000);
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
exports.QuantumResistantCryptoService = QuantumResistantCryptoService;
// Export singleton instance
exports.quantumCryptoService = new QuantumResistantCryptoService();
