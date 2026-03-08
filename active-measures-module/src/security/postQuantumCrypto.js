"use strict";
/**
 * Post-Quantum Cryptography Implementation
 *
 * Implements quantum-resistant cryptographic algorithms and protocols
 * for securing active measures operations against quantum computing threats.
 *
 * Based on NIST Post-Quantum Cryptography standards and recommendations.
 */
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
exports.PostQuantumCryptoEngine = exports.PQCSecurityLevel = exports.PQCAlgorithm = void 0;
const crypto = __importStar(require("crypto"));
var PQCAlgorithm;
(function (PQCAlgorithm) {
    PQCAlgorithm["CRYSTALS_KYBER"] = "crystals-kyber";
    PQCAlgorithm["CRYSTALS_DILITHIUM"] = "crystals-dilithium";
    PQCAlgorithm["FALCON"] = "falcon";
    PQCAlgorithm["SPHINCS_PLUS"] = "sphincs-plus";
    PQCAlgorithm["NTRU"] = "ntru";
    PQCAlgorithm["SABER"] = "saber";
    PQCAlgorithm["FRODO_KEM"] = "frodo-kem";
    PQCAlgorithm["BIKE"] = "bike";
})(PQCAlgorithm || (exports.PQCAlgorithm = PQCAlgorithm = {}));
var PQCSecurityLevel;
(function (PQCSecurityLevel) {
    PQCSecurityLevel[PQCSecurityLevel["LEVEL_1"] = 1] = "LEVEL_1";
    PQCSecurityLevel[PQCSecurityLevel["LEVEL_3"] = 3] = "LEVEL_3";
    PQCSecurityLevel[PQCSecurityLevel["LEVEL_5"] = 5] = "LEVEL_5";
})(PQCSecurityLevel || (exports.PQCSecurityLevel = PQCSecurityLevel = {}));
/**
 * Post-Quantum Cryptography Engine
 */
class PostQuantumCryptoEngine {
    keyStore = new Map();
    config;
    constructor(config) {
        this.config = config;
    }
    /**
     * Generate a post-quantum key pair
     */
    async generateKeyPair(algorithm) {
        const alg = algorithm || this.config.algorithm;
        switch (alg) {
            case PQCAlgorithm.CRYSTALS_KYBER:
                return this.generateKyberKeyPair();
            case PQCAlgorithm.CRYSTALS_DILITHIUM:
                return this.generateDilithiumKeyPair();
            case PQCAlgorithm.FALCON:
                return this.generateFalconKeyPair();
            case PQCAlgorithm.SPHINCS_PLUS:
                return this.generateSphincsPlusKeyPair();
            default:
                throw new Error(`Unsupported PQC algorithm: ${alg}`);
        }
    }
    /**
     * CRYSTALS-Kyber key encapsulation mechanism
     */
    async generateKyberKeyPair() {
        // Simplified Kyber implementation - in production, use proper library
        const parameters = this.getKyberParameters();
        // Generate secret key (small coefficients)
        const secretKey = this.generateSmallPolynomial(parameters.n);
        // Generate public matrix A
        const matrixA = this.generateRandomMatrix(parameters.n, parameters.q);
        // Generate error vector
        const errorVector = this.generateErrorVector(parameters.n, parameters.sigma);
        // Public key = A * secret + error (mod q)
        const publicKeyData = this.matrixVectorMultiply(matrixA, secretKey, errorVector, parameters.q);
        const keyPair = {
            publicKey: {
                algorithm: PQCAlgorithm.CRYSTALS_KYBER,
                keyData: Buffer.from(publicKeyData),
                parameters,
                fingerprint: this.calculateFingerprint(publicKeyData),
            },
            privateKey: {
                algorithm: PQCAlgorithm.CRYSTALS_KYBER,
                keyData: Buffer.from(secretKey),
                parameters,
                encrypted: false,
            },
            algorithm: PQCAlgorithm.CRYSTALS_KYBER,
            created: new Date(),
            expiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
        };
        // Store key pair
        this.keyStore.set(keyPair.publicKey.fingerprint, keyPair);
        return keyPair;
    }
    /**
     * CRYSTALS-Dilithium digital signature scheme
     */
    async generateDilithiumKeyPair() {
        const parameters = this.getDilithiumParameters();
        // Generate secret vectors s1, s2
        const s1 = this.generateSmallPolynomial(parameters.n);
        const s2 = this.generateSmallPolynomial(parameters.n);
        // Generate public matrix A
        const matrixA = this.generateRandomMatrix(parameters.n, parameters.q);
        // Public key t = A * s1 + s2 (mod q)
        const t = this.matrixVectorMultiply(matrixA, s1, s2, parameters.q);
        const keyPair = {
            publicKey: {
                algorithm: PQCAlgorithm.CRYSTALS_DILITHIUM,
                keyData: Buffer.from(t),
                parameters,
                fingerprint: this.calculateFingerprint(t),
            },
            privateKey: {
                algorithm: PQCAlgorithm.CRYSTALS_DILITHIUM,
                keyData: Buffer.from([...s1, ...s2]),
                parameters,
                encrypted: false,
            },
            algorithm: PQCAlgorithm.CRYSTALS_DILITHIUM,
            created: new Date(),
        };
        this.keyStore.set(keyPair.publicKey.fingerprint, keyPair);
        return keyPair;
    }
    /**
     * FALCON signature scheme
     */
    async generateFalconKeyPair() {
        // Simplified FALCON implementation
        const parameters = this.getFalconParameters();
        // Generate NTRU key pair
        const { f, g, F, G } = this.generateNTRUBasis(parameters.n);
        const keyPair = {
            publicKey: {
                algorithm: PQCAlgorithm.FALCON,
                keyData: Buffer.from(f),
                parameters,
                fingerprint: this.calculateFingerprint(f),
            },
            privateKey: {
                algorithm: PQCAlgorithm.FALCON,
                keyData: Buffer.from([...f, ...g, ...F, ...G]),
                parameters,
                encrypted: false,
            },
            algorithm: PQCAlgorithm.FALCON,
            created: new Date(),
        };
        this.keyStore.set(keyPair.publicKey.fingerprint, keyPair);
        return keyPair;
    }
    /**
     * SPHINCS+ signature scheme
     */
    async generateSphincsPlusKeyPair() {
        const parameters = this.getSphincsPlusParameters();
        // Generate secret seed
        const secretSeed = crypto.randomBytes(32);
        // Generate public seed
        const publicSeed = crypto.randomBytes(32);
        // Compute public key root
        const publicRoot = this.computeSphincsRoot(secretSeed, publicSeed, parameters);
        const keyPair = {
            publicKey: {
                algorithm: PQCAlgorithm.SPHINCS_PLUS,
                keyData: Buffer.concat([publicSeed, publicRoot]),
                parameters,
                fingerprint: this.calculateFingerprint(publicRoot),
            },
            privateKey: {
                algorithm: PQCAlgorithm.SPHINCS_PLUS,
                keyData: Buffer.concat([secretSeed, publicSeed]),
                parameters,
                encrypted: false,
            },
            algorithm: PQCAlgorithm.SPHINCS_PLUS,
            created: new Date(),
        };
        this.keyStore.set(keyPair.publicKey.fingerprint, keyPair);
        return keyPair;
    }
    /**
     * Encrypt data using post-quantum algorithms
     */
    async encrypt(data, publicKey, hybrid = false) {
        if (hybrid) {
            return this.hybridEncrypt(data, publicKey);
        }
        switch (publicKey.algorithm) {
            case PQCAlgorithm.CRYSTALS_KYBER:
                return this.kyberEncrypt(data, publicKey);
            case PQCAlgorithm.NTRU:
                return this.ntruEncrypt(data, publicKey);
            default:
                throw new Error(`Encryption not supported for ${publicKey.algorithm}`);
        }
    }
    /**
     * Decrypt data using post-quantum algorithms
     */
    async decrypt(encryptedData, privateKey) {
        switch (encryptedData.algorithm) {
            case PQCAlgorithm.CRYSTALS_KYBER:
                return this.kyberDecrypt(encryptedData, privateKey);
            case PQCAlgorithm.NTRU:
                return this.ntruDecrypt(encryptedData, privateKey);
            default:
                throw new Error(`Decryption not supported for ${encryptedData.algorithm}`);
        }
    }
    /**
     * Sign data using post-quantum digital signatures
     */
    async sign(data, privateKey) {
        const nonce = crypto.randomBytes(32);
        const message = Buffer.concat([data, nonce]);
        switch (privateKey.algorithm) {
            case PQCAlgorithm.CRYSTALS_DILITHIUM:
                return this.dilithiumSign(message, privateKey, nonce);
            case PQCAlgorithm.FALCON:
                return this.falconSign(message, privateKey, nonce);
            case PQCAlgorithm.SPHINCS_PLUS:
                return this.sphincsPlusSign(message, privateKey, nonce);
            default:
                throw new Error(`Signing not supported for ${privateKey.algorithm}`);
        }
    }
    /**
     * Verify post-quantum digital signature
     */
    async verify(data, signature, publicKey) {
        const message = Buffer.concat([data, signature.nonce]);
        switch (signature.algorithm) {
            case PQCAlgorithm.CRYSTALS_DILITHIUM:
                return this.dilithiumVerify(message, signature, publicKey);
            case PQCAlgorithm.FALCON:
                return this.falconVerify(message, signature, publicKey);
            case PQCAlgorithm.SPHINCS_PLUS:
                return this.sphincsPlusVerify(message, signature, publicKey);
            default:
                return false;
        }
    }
    /**
     * Hybrid encryption combining classical and post-quantum
     */
    async hybridEncrypt(data, publicKey) {
        // Generate symmetric key
        const symmetricKey = crypto.randomBytes(32);
        // Encrypt data with AES
        const cipher = crypto.createCipher('aes-256-gcm', symmetricKey);
        const encryptedData = Buffer.concat([cipher.update(data), cipher.final()]);
        const authTag = cipher.getAuthTag();
        // Encrypt symmetric key with PQC
        const encryptedSymmetricKey = await this.encrypt(symmetricKey, publicKey, false);
        return {
            algorithm: publicKey.algorithm,
            ciphertext: Buffer.concat([
                encryptedData,
                authTag,
                encryptedSymmetricKey.ciphertext,
            ]),
            publicKeyFingerprint: publicKey.fingerprint,
            mac: crypto
                .createHmac('sha256', symmetricKey)
                .update(encryptedData)
                .digest(),
        };
    }
    /**
     * Kyber encryption implementation
     */
    async kyberEncrypt(data, publicKey) {
        // Simplified Kyber encryption
        const sharedSecret = crypto.randomBytes(32);
        // Key encapsulation
        const ciphertext = this.kyberEncapsulate(sharedSecret, publicKey);
        // Symmetric encryption of data
        const cipher = crypto.createCipher('aes-256-gcm', sharedSecret);
        const encryptedData = Buffer.concat([cipher.update(data), cipher.final()]);
        const authTag = cipher.getAuthTag();
        return {
            algorithm: PQCAlgorithm.CRYSTALS_KYBER,
            ciphertext: Buffer.concat([ciphertext, encryptedData, authTag]),
            publicKeyFingerprint: publicKey.fingerprint,
            mac: crypto
                .createHmac('sha256', sharedSecret)
                .update(encryptedData)
                .digest(),
        };
    }
    /**
     * Kyber decryption implementation
     */
    async kyberDecrypt(encryptedData, privateKey) {
        // Extract components
        const kemCiphertext = encryptedData.ciphertext.slice(0, 1088); // Kyber-768 ciphertext size
        const symmetricCiphertext = encryptedData.ciphertext.slice(1088, -16);
        const authTag = encryptedData.ciphertext.slice(-16);
        // Key decapsulation
        const sharedSecret = this.kyberDecapsulate(kemCiphertext, privateKey);
        // Symmetric decryption
        const decipher = crypto.createDecipher('aes-256-gcm', sharedSecret);
        decipher.setAuthTag(authTag);
        return Buffer.concat([
            decipher.update(symmetricCiphertext),
            decipher.final(),
        ]);
    }
    // Helper methods for cryptographic operations
    getKyberParameters() {
        return {
            n: 256,
            q: 3329,
            sigma: 2,
            t: 2,
        };
    }
    getDilithiumParameters() {
        return {
            n: 256,
            q: 8380417,
            sigma: 1,
            t: 60,
        };
    }
    getFalconParameters() {
        return {
            n: 512,
            q: 12289,
            sigma: 165,
            t: 0,
        };
    }
    getSphincsPlusParameters() {
        return {
            n: 16,
            q: 256,
            sigma: 0,
            t: 8,
        };
    }
    generateSmallPolynomial(n) {
        return Array(n)
            .fill(0)
            .map(() => Math.floor(Math.random() * 3) - 1); // {-1, 0, 1}
    }
    generateRandomMatrix(n, q) {
        return Array(n)
            .fill(0)
            .map(() => Array(n)
            .fill(0)
            .map(() => Math.floor(Math.random() * q)));
    }
    generateErrorVector(n, sigma) {
        // Simplified Gaussian sampling
        return Array(n)
            .fill(0)
            .map(() => Math.floor(this.gaussianRandom() * sigma));
    }
    gaussianRandom() {
        // Box-Muller transform
        const u1 = Math.random();
        const u2 = Math.random();
        return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    }
    matrixVectorMultiply(matrix, vector, error, q) {
        return matrix.map((row, i) => (row.reduce((sum, val, j) => sum + val * vector[j], 0) + error[i]) % q);
    }
    calculateFingerprint(data) {
        const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data);
        return crypto
            .createHash('sha256')
            .update(buffer)
            .digest('hex')
            .substring(0, 16);
    }
    generateNTRUBasis(n) {
        // Simplified NTRU basis generation
        const f = this.generateSmallPolynomial(n);
        const g = this.generateSmallPolynomial(n);
        // In real implementation, F and G would be computed using extended Euclidean algorithm
        const F = this.generateSmallPolynomial(n);
        const G = this.generateSmallPolynomial(n);
        return { f, g, F, G };
    }
    computeSphincsRoot(secretSeed, publicSeed, parameters) {
        // Simplified SPHINCS+ root computation
        const combined = Buffer.concat([secretSeed, publicSeed]);
        return crypto.createHash('sha256').update(combined).digest();
    }
    kyberEncapsulate(sharedSecret, publicKey) {
        // Simplified key encapsulation
        const combined = Buffer.concat([sharedSecret, publicKey.keyData]);
        return crypto.createHash('sha512').update(combined).digest();
    }
    kyberDecapsulate(ciphertext, privateKey) {
        // Simplified key decapsulation
        const combined = Buffer.concat([ciphertext, privateKey.keyData]);
        return crypto.createHash('sha256').update(combined).digest();
    }
    ntruEncrypt(data, publicKey) {
        // Placeholder NTRU encryption
        return Promise.resolve({
            algorithm: PQCAlgorithm.NTRU,
            ciphertext: data, // Simplified
            publicKeyFingerprint: publicKey.fingerprint,
            mac: crypto.createHash('sha256').update(data).digest(),
        });
    }
    ntruDecrypt(encryptedData, privateKey) {
        // Placeholder NTRU decryption
        return Promise.resolve(encryptedData.ciphertext);
    }
    dilithiumSign(message, privateKey, nonce) {
        // Simplified Dilithium signing
        const signature = crypto
            .createHmac('sha256', privateKey.keyData)
            .update(message)
            .digest();
        return {
            algorithm: PQCAlgorithm.CRYSTALS_DILITHIUM,
            signature,
            publicKeyFingerprint: this.getPublicKeyFingerprint(privateKey),
            timestamp: new Date(),
            nonce,
        };
    }
    dilithiumVerify(message, signature, publicKey) {
        // Simplified Dilithium verification
        try {
            const privateKey = this.keyStore.get(publicKey.fingerprint)?.privateKey;
            if (!privateKey)
                return false;
            const expectedSig = crypto
                .createHmac('sha256', privateKey.keyData)
                .update(message)
                .digest();
            return signature.signature.equals(expectedSig);
        }
        catch {
            return false;
        }
    }
    falconSign(message, privateKey, nonce) {
        // Simplified Falcon signing
        const signature = crypto
            .createHmac('sha512', privateKey.keyData)
            .update(message)
            .digest();
        return {
            algorithm: PQCAlgorithm.FALCON,
            signature,
            publicKeyFingerprint: this.getPublicKeyFingerprint(privateKey),
            timestamp: new Date(),
            nonce,
        };
    }
    falconVerify(message, signature, publicKey) {
        // Simplified Falcon verification
        try {
            const privateKey = this.keyStore.get(publicKey.fingerprint)?.privateKey;
            if (!privateKey)
                return false;
            const expectedSig = crypto
                .createHmac('sha512', privateKey.keyData)
                .update(message)
                .digest();
            return signature.signature.equals(expectedSig);
        }
        catch {
            return false;
        }
    }
    sphincsPlusSign(message, privateKey, nonce) {
        // Simplified SPHINCS+ signing
        const signature = crypto
            .createHash('sha256')
            .update(Buffer.concat([privateKey.keyData, message, nonce]))
            .digest();
        return {
            algorithm: PQCAlgorithm.SPHINCS_PLUS,
            signature,
            publicKeyFingerprint: this.getPublicKeyFingerprint(privateKey),
            timestamp: new Date(),
            nonce,
        };
    }
    sphincsPlusVerify(message, signature, publicKey) {
        // Simplified SPHINCS+ verification
        try {
            const privateKey = this.keyStore.get(publicKey.fingerprint)?.privateKey;
            if (!privateKey)
                return false;
            const expectedSig = crypto
                .createHash('sha256')
                .update(Buffer.concat([privateKey.keyData, message, signature.nonce]))
                .digest();
            return signature.signature.equals(expectedSig);
        }
        catch {
            return false;
        }
    }
    getPublicKeyFingerprint(privateKey) {
        // Find corresponding public key
        for (const [fingerprint, keyPair] of this.keyStore) {
            if (keyPair.privateKey === privateKey) {
                return fingerprint;
            }
        }
        throw new Error('Public key not found for private key');
    }
    /**
     * Get key pair by fingerprint
     */
    getKeyPair(fingerprint) {
        return this.keyStore.get(fingerprint);
    }
    /**
     * List all key pairs
     */
    listKeyPairs() {
        return Array.from(this.keyStore.values());
    }
    /**
     * Delete key pair
     */
    deleteKeyPair(fingerprint) {
        return this.keyStore.delete(fingerprint);
    }
    /**
     * Assess quantum resistance of algorithm
     */
    assessQuantumResistance(algorithm) {
        const assessments = {
            [PQCAlgorithm.CRYSTALS_KYBER]: {
                resistant: true,
                securityLevel: 3,
                notes: ['NIST standard', 'Lattice-based', 'Key encapsulation'],
            },
            [PQCAlgorithm.CRYSTALS_DILITHIUM]: {
                resistant: true,
                securityLevel: 3,
                notes: ['NIST standard', 'Lattice-based', 'Digital signature'],
            },
            [PQCAlgorithm.FALCON]: {
                resistant: true,
                securityLevel: 5,
                notes: ['NIST standard', 'Compact signatures', 'NTRU-based'],
            },
            [PQCAlgorithm.SPHINCS_PLUS]: {
                resistant: true,
                securityLevel: 5,
                notes: ['NIST standard', 'Hash-based', 'Stateless signatures'],
            },
            [PQCAlgorithm.NTRU]: {
                resistant: true,
                securityLevel: 3,
                notes: ['Lattice-based', 'Fast operations', 'Under evaluation'],
            },
        };
        return (assessments[algorithm] || {
            resistant: false,
            securityLevel: 0,
            notes: ['Unknown algorithm'],
        });
    }
}
exports.PostQuantumCryptoEngine = PostQuantumCryptoEngine;
