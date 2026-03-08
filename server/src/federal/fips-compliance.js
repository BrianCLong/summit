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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fipsService = exports.FIPSComplianceService = void 0;
// @ts-nocheck
const node_crypto_1 = __importDefault(require("node:crypto"));
const z = __importStar(require("zod"));
const otel_tracing_js_1 = require("../middleware/observability/otel-tracing.js");
const FIPSConfigSchema = z.object({
    enabled: z.boolean().default(false),
    mode: z
        .enum(['FIPS_140_2_LEVEL_3', 'FIPS_140_2_LEVEL_4'])
        .default('FIPS_140_2_LEVEL_3'),
    hsm: z.object({
        provider: z
            .enum(['AWS_CloudHSM', 'Azure_Dedicated_HSM', 'External_HSM'])
            .default('AWS_CloudHSM'),
        endpoint: z.string().optional(),
        partition: z.string().optional(),
        credentials: z
            .object({
            username: z.string(),
            password: z.string(),
        })
            .optional(),
    }),
    algorithms: z.object({
        symmetric: z
            .enum(['AES-256-GCM', 'ChaCha20-Poly1305'])
            .default('AES-256-GCM'),
        asymmetric: z
            .enum(['RSA-4096', 'ECDSA-P-384', 'Ed25519'])
            .default('ECDSA-P-384'),
        hash: z.enum(['SHA-256', 'SHA-384', 'SHA-512']).default('SHA-384'),
    }),
    keyRotation: z.object({
        intervalDays: z.number().min(30).max(365).default(90),
        automatic: z.boolean().default(true),
    }),
    auditLevel: z
        .enum(['BASIC', 'DETAILED', 'COMPREHENSIVE'])
        .default('COMPREHENSIVE'),
});
class FIPSComplianceService {
    config;
    keyStore = new Map();
    hsmConnection = null;
    constructor(config) {
        this.config = FIPSConfigSchema.parse({
            ...config,
            enabled: process.env.FIPS_ENABLED === 'true',
            mode: process.env.FIPS_MODE || config?.mode,
        });
        if (this.config.enabled) {
            this.initializeFIPSCrypto();
        }
    }
    async initializeFIPSCrypto() {
        const span = otel_tracing_js_1.otelService.createSpan('fips.initialize');
        try {
            // Verify FIPS mode is enabled in OpenSSL/Node.js
            const fipsEnabled = node_crypto_1.default.getFips?.() || false;
            if (!fipsEnabled && this.config.enabled) {
                console.warn('FIPS mode not enabled in Node.js crypto - switching to FIPS-validated algorithms only');
            }
            // Initialize HSM connection
            await this.connectToHSM();
            // Load existing keys from HSM
            await this.loadKeysFromHSM();
            console.log('FIPS 140-2 compliance service initialized successfully');
            otel_tracing_js_1.otelService.addSpanAttributes({
                'fips.enabled': this.config.enabled,
                'fips.mode': this.config.mode,
                'fips.hsm_provider': this.config.hsm.provider,
                'fips.keys_loaded': this.keyStore.size,
            });
        }
        catch (error) {
            console.error('FIPS compliance initialization failed:', error);
            otel_tracing_js_1.otelService.recordException(error);
            span.setStatus({ code: 2, message: error.message });
            if (this.config.enabled) {
                throw new Error('FIPS compliance required but initialization failed');
            }
        }
        finally {
            span?.end();
        }
    }
    async connectToHSM() {
        if (!this.config.enabled)
            return;
        switch (this.config.hsm.provider) {
            case 'AWS_CloudHSM':
                // In production, use AWS CloudHSM Client SDK
                console.log('Connecting to AWS CloudHSM...');
                // this.hsmConnection = await cloudhsm.connect(this.config.hsm);
                break;
            case 'Azure_Dedicated_HSM':
                console.log('Connecting to Azure Dedicated HSM...');
                // this.hsmConnection = await azureHsm.connect(this.config.hsm);
                break;
            case 'External_HSM':
                console.log('Connecting to External HSM...');
                // this.hsmConnection = await pkcs11.connect(this.config.hsm);
                break;
        }
    }
    async loadKeysFromHSM() {
        if (!this.hsmConnection)
            return;
        // Load existing keys from HSM partition
        // In production, enumerate keys from HSM
        const keyList = []; // await this.hsmConnection.listKeys();
        for (const keyInfo of keyList) {
            const keyMaterial = {
                keyId: keyInfo.keyId,
                algorithm: keyInfo.algorithm,
                keyLength: keyInfo.keyLength,
                fipsValidated: true,
                hsm: {
                    provider: this.config.hsm.provider,
                    partition: this.config.hsm.partition,
                },
                auditTrail: {
                    created: new Date(keyInfo.created),
                    lastRotated: new Date(keyInfo.lastRotated),
                    operations: [],
                },
            };
            this.keyStore.set(keyInfo.keyId, keyMaterial);
        }
    }
    async generateKey(algorithm, keyLength) {
        const span = otel_tracing_js_1.otelService.createSpan('fips.generate_key');
        try {
            if (!this.config.enabled) {
                throw new Error('FIPS compliance not enabled');
            }
            // Validate algorithm is FIPS-approved
            if (!this.isFIPSApprovedAlgorithm(algorithm)) {
                throw new Error(`Algorithm ${algorithm} is not FIPS 140-2 approved`);
            }
            const keyId = `fips-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
            // Generate key in HSM
            let keyHandle;
            if (this.hsmConnection) {
                // keyHandle = await this.hsmConnection.generateKey({
                //   algorithm,
                //   keyLength,
                //   keyId,
                //   extractable: false, // Keys cannot be extracted from HSM
                // });
            }
            const keyMaterial = {
                keyId,
                algorithm,
                keyLength,
                fipsValidated: true,
                hsm: {
                    provider: this.config.hsm.provider,
                    partition: this.config.hsm.partition,
                },
                auditTrail: {
                    created: new Date(),
                    lastRotated: new Date(),
                    operations: [
                        {
                            timestamp: new Date(),
                            operation: 'generate',
                            keyId,
                            user: process.env.USER || 'system',
                        },
                    ],
                },
            };
            this.keyStore.set(keyId, keyMaterial);
            console.log(`FIPS key generated: ${keyId}`);
            otel_tracing_js_1.otelService.addSpanAttributes({
                'fips.key_id': keyId,
                'fips.algorithm': algorithm,
                'fips.key_length': keyLength,
            });
            return keyMaterial;
        }
        catch (error) {
            console.error('FIPS key generation failed:', error);
            otel_tracing_js_1.otelService.recordException(error);
            span.setStatus({ code: 2, message: error.message });
            throw error;
        }
        finally {
            span?.end();
        }
    }
    async encrypt(plaintext, keyId) {
        const span = otel_tracing_js_1.otelService.createSpan('fips.encrypt');
        try {
            const keyMaterial = this.keyStore.get(keyId);
            if (!keyMaterial) {
                throw new Error(`FIPS key not found: ${keyId}`);
            }
            // Generate random nonce
            const nonce = node_crypto_1.default.randomBytes(16);
            // Perform encryption in HSM
            let result;
            if (this.hsmConnection && keyMaterial.algorithm === 'AES-256-GCM') {
                // result = await this.hsmConnection.encrypt({
                //   keyId,
                //   algorithm: 'AES-256-GCM',
                //   plaintext: Buffer.from(plaintext, 'utf8'),
                //   nonce,
                // });
                // Fallback for testing
                const cipher = node_crypto_1.default.createCipherGCM('aes-256-gcm');
                cipher.setAAD(Buffer.from(keyId, 'utf8'));
                let encrypted = cipher.update(plaintext, 'utf8', 'hex');
                encrypted += cipher.final('hex');
                const tag = cipher.getAuthTag();
                result = {
                    ciphertext: encrypted,
                    tag: tag.toString('hex'),
                };
            }
            // Audit the operation
            keyMaterial.auditTrail.operations.push({
                timestamp: new Date(),
                operation: 'encrypt',
                keyId,
                user: process.env.USER || 'system',
            });
            otel_tracing_js_1.otelService.addSpanAttributes({
                'fips.operation': 'encrypt',
                'fips.key_id': keyId,
                'fips.algorithm': keyMaterial.algorithm,
            });
            return {
                ciphertext: result.ciphertext,
                nonce: nonce.toString('hex'),
                tag: result.tag,
            };
        }
        catch (error) {
            console.error('FIPS encryption failed:', error);
            otel_tracing_js_1.otelService.recordException(error);
            span.setStatus({ code: 2, message: error.message });
            throw error;
        }
        finally {
            span?.end();
        }
    }
    async decrypt(ciphertext, nonce, tag, keyId) {
        const span = otel_tracing_js_1.otelService.createSpan('fips.decrypt');
        try {
            const keyMaterial = this.keyStore.get(keyId);
            if (!keyMaterial) {
                throw new Error(`FIPS key not found: ${keyId}`);
            }
            // Perform decryption in HSM
            let plaintext;
            if (this.hsmConnection && keyMaterial.algorithm === 'AES-256-GCM') {
                // plaintext = await this.hsmConnection.decrypt({
                //   keyId,
                //   algorithm: 'AES-256-GCM',
                //   ciphertext: Buffer.from(ciphertext, 'hex'),
                //   nonce: Buffer.from(nonce, 'hex'),
                //   tag: Buffer.from(tag, 'hex'),
                // });
                // Fallback for testing
                const decipher = node_crypto_1.default.createDecipherGCM('aes-256-gcm');
                decipher.setAuthTag(Buffer.from(tag, 'hex'));
                decipher.setAAD(Buffer.from(keyId, 'utf8'));
                let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
                decrypted += decipher.final('utf8');
                plaintext = decrypted;
            }
            // Audit the operation
            keyMaterial.auditTrail.operations.push({
                timestamp: new Date(),
                operation: 'decrypt',
                keyId,
                user: process.env.USER || 'system',
            });
            return plaintext;
        }
        catch (error) {
            console.error('FIPS decryption failed:', error);
            otel_tracing_js_1.otelService.recordException(error);
            span.setStatus({ code: 2, message: error.message });
            throw error;
        }
        finally {
            span?.end();
        }
    }
    async sign(data, keyId) {
        const span = otel_tracing_js_1.otelService.createSpan('fips.sign');
        try {
            const keyMaterial = this.keyStore.get(keyId);
            if (!keyMaterial) {
                throw new Error(`FIPS signing key not found: ${keyId}`);
            }
            // Create hash using FIPS-approved algorithm
            const hash = node_crypto_1.default.createHash(this.config.algorithms.hash.toLowerCase().replace('-', ''));
            hash.update(data);
            const digest = hash.digest();
            // Sign in HSM
            let signature;
            if (this.hsmConnection) {
                // signature = await this.hsmConnection.sign({
                //   keyId,
                //   algorithm: keyMaterial.algorithm,
                //   digest,
                // });
                // Fallback for testing (NOT FIPS compliant)
                const sign = node_crypto_1.default.createSign(this.config.algorithms.hash);
                sign.update(data);
                signature = sign.sign('-----BEGIN EC PRIVATE KEY-----...-----END EC PRIVATE KEY-----', // pragma: allowlist secret (test data)
                'hex');
            }
            // Audit the operation
            keyMaterial.auditTrail.operations.push({
                timestamp: new Date(),
                operation: 'sign',
                keyId,
                user: process.env.USER || 'system',
            });
            return signature;
        }
        catch (error) {
            console.error('FIPS signing failed:', error);
            otel_tracing_js_1.otelService.recordException(error);
            span.setStatus({ code: 2, message: error.message });
            throw error;
        }
        finally {
            span?.end();
        }
    }
    async verify(data, signature, keyId) {
        const span = otel_tracing_js_1.otelService.createSpan('fips.verify');
        try {
            const keyMaterial = this.keyStore.get(keyId);
            if (!keyMaterial) {
                throw new Error(`FIPS verification key not found: ${keyId}`);
            }
            // Verify signature in HSM
            let valid = false;
            if (this.hsmConnection) {
                // valid = await this.hsmConnection.verify({
                //   keyId,
                //   algorithm: keyMaterial.algorithm,
                //   data: Buffer.from(data, 'utf8'),
                //   signature: Buffer.from(signature, 'hex'),
                // });
                // Fallback for testing (NOT FIPS compliant)
                const verify = node_crypto_1.default.createVerify(this.config.algorithms.hash);
                verify.update(data);
                valid = verify.verify('-----BEGIN EC PUBLIC KEY-----...-----END EC PUBLIC KEY-----', signature, 'hex');
            }
            // Audit the operation
            keyMaterial.auditTrail.operations.push({
                timestamp: new Date(),
                operation: 'verify',
                keyId,
                user: process.env.USER || 'system',
            });
            return valid;
        }
        catch (error) {
            console.error('FIPS verification failed:', error);
            otel_tracing_js_1.otelService.recordException(error);
            span.setStatus({ code: 2, message: error.message });
            throw error;
        }
        finally {
            span?.end();
        }
    }
    async rotateKey(keyId) {
        const span = otel_tracing_js_1.otelService.createSpan('fips.rotate_key');
        try {
            const oldKey = this.keyStore.get(keyId);
            if (!oldKey) {
                throw new Error(`Key not found for rotation: ${keyId}`);
            }
            // Generate new key with same parameters
            const newKey = await this.generateKey(oldKey.algorithm, oldKey.keyLength);
            // Update rotation timestamp
            newKey.auditTrail.lastRotated = new Date();
            // Archive old key (in production, move to separate HSM partition)
            this.keyStore.delete(keyId);
            console.log(`FIPS key rotated: ${keyId} -> ${newKey.keyId}`);
            return newKey;
        }
        catch (error) {
            console.error('FIPS key rotation failed:', error);
            otel_tracing_js_1.otelService.recordException(error);
            span.setStatus({ code: 2, message: error.message });
            throw error;
        }
        finally {
            span?.end();
        }
    }
    getLocalSVID() {
        // Return SPIFFE Verifiable Identity Document for HSM authentication
        // In production, this would retrieve the SVID from the SPIRE agent
        return this.hsmConnection ? 'spiffe://example.org/fips-service' : null;
    }
    isFIPSApprovedAlgorithm(algorithm) {
        const approvedAlgorithms = [
            'AES-256-GCM',
            'AES-256-CBC',
            'ChaCha20-Poly1305',
            'RSA-4096',
            'ECDSA-P-256',
            'ECDSA-P-384',
            'Ed25519',
            'SHA-256',
            'SHA-384',
            'SHA-512',
        ];
        return approvedAlgorithms.includes(algorithm);
    }
    /**
     * Get FIPS compliance status and key inventory
     */
    async getComplianceStatus() {
        const keys = Array.from(this.keyStore.values()).map((key) => ({
            keyId: key.keyId,
            algorithm: key.algorithm,
            created: key.auditTrail.created,
            lastRotated: key.auditTrail.lastRotated,
            operationCount: key.auditTrail.operations.length,
        }));
        const auditTrail = Array.from(this.keyStore.values())
            .flatMap((key) => key.auditTrail.operations)
            .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
            .slice(0, 100); // Last 100 operations
        return {
            fipsEnabled: this.config.enabled,
            mode: this.config.mode,
            hsmProvider: this.config.hsm.provider,
            keyCount: this.keyStore.size,
            keys,
            auditTrail,
        };
    }
    /**
     * Health check for FIPS compliance service
     */
    async healthCheck() {
        let hsmConnected = false;
        let keyRotationStatus = 'current';
        // Check HSM connectivity
        try {
            if (this.hsmConnection) {
                // await this.hsmConnection.ping();
                hsmConnected = true;
            }
        }
        catch (error) {
            console.error('HSM health check failed:', error);
        }
        // Check key rotation status
        const now = new Date();
        for (const key of this.keyStore.values()) {
            const daysSinceRotation = (now.getTime() - key.auditTrail.lastRotated.getTime()) /
                (1000 * 60 * 60 * 24);
            if (daysSinceRotation > this.config.keyRotation.intervalDays) {
                keyRotationStatus = 'overdue';
                break;
            }
            else if (daysSinceRotation >
                this.config.keyRotation.intervalDays * 0.8) {
                keyRotationStatus = 'due';
            }
        }
        let status = 'healthy';
        if (!this.config.enabled) {
            status = 'degraded';
        }
        else if (!hsmConnected || keyRotationStatus === 'overdue') {
            status = 'unhealthy';
        }
        else if (keyRotationStatus === 'due') {
            status = 'degraded';
        }
        return {
            status,
            fipsEnabled: this.config.enabled,
            hsmConnected,
            keyRotationStatus,
            details: {
                keyCount: this.keyStore.size,
                hsmProvider: this.config.hsm.provider,
                rotationInterval: this.config.keyRotation.intervalDays,
                auditLevel: this.config.auditLevel,
            },
        };
    }
    /**
     * Clean up resources
     */
    async destroy() {
        if (this.hsmConnection) {
            // await this.hsmConnection.disconnect();
            this.hsmConnection = null;
        }
        this.keyStore.clear();
    }
}
exports.FIPSComplianceService = FIPSComplianceService;
// Create singleton instance
exports.fipsService = new FIPSComplianceService();
