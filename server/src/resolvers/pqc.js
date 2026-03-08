"use strict";
// @ts-nocheck
/**
 * Post-Quantum Cryptography GraphQL Resolvers
 * Implements resolvers for PQC operations
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
exports.pqcResolvers = void 0;
const graphql_subscriptions_1 = require("graphql-subscriptions");
const QuantumResistantCryptoService_js_1 = require("../services/QuantumResistantCryptoService.js");
const post_quantum_crypto_1 = require("@intelgraph/post-quantum-crypto");
const policyWrapper_js_1 = require("./policyWrapper.js");
// PubSub for subscriptions
const pubsub = new graphql_subscriptions_1.PubSub();
// Event names
const PQC_KEY_GENERATED = 'PQC_KEY_GENERATED';
const PQC_KEY_EXPIRING = 'PQC_KEY_EXPIRING';
const PQC_OPERATION = 'PQC_OPERATION';
// Wire up service events to pubsub
QuantumResistantCryptoService_js_1.quantumCryptoService.on('keyGenerated', (data) => {
    pubsub.publish(PQC_KEY_GENERATED, { pqcKeyGenerated: data });
});
QuantumResistantCryptoService_js_1.quantumCryptoService.on('keyExpiringWarning', (data) => {
    pubsub.publish(PQC_KEY_EXPIRING, { pqcKeyExpiringWarning: data });
});
QuantumResistantCryptoService_js_1.quantumCryptoService.on('operation', (data) => {
    pubsub.publish(PQC_OPERATION, { pqcOperation: data });
});
// Helper to convert Uint8Array to base64
function toBase64(data) {
    return Buffer.from(data).toString('base64');
}
// Helper to convert base64 to Uint8Array
function fromBase64(base64) {
    return new Uint8Array(Buffer.from(base64, 'base64'));
}
// Helper to map algorithm string to enum
function mapAlgorithm(algorithm) {
    const mapping = {
        KYBER_512: post_quantum_crypto_1.PQCAlgorithm.KYBER_512,
        KYBER_768: post_quantum_crypto_1.PQCAlgorithm.KYBER_768,
        KYBER_1024: post_quantum_crypto_1.PQCAlgorithm.KYBER_1024,
        DILITHIUM_2: post_quantum_crypto_1.PQCAlgorithm.DILITHIUM_2,
        DILITHIUM_3: post_quantum_crypto_1.PQCAlgorithm.DILITHIUM_3,
        DILITHIUM_5: post_quantum_crypto_1.PQCAlgorithm.DILITHIUM_5,
        FALCON_512: post_quantum_crypto_1.PQCAlgorithm.FALCON_512,
        FALCON_1024: post_quantum_crypto_1.PQCAlgorithm.FALCON_1024,
        SPHINCS_PLUS_128F: post_quantum_crypto_1.PQCAlgorithm.SPHINCS_PLUS_128F,
        SPHINCS_PLUS_128S: post_quantum_crypto_1.PQCAlgorithm.SPHINCS_PLUS_128S,
        SPHINCS_PLUS_192F: post_quantum_crypto_1.PQCAlgorithm.SPHINCS_PLUS_192F,
        SPHINCS_PLUS_192S: post_quantum_crypto_1.PQCAlgorithm.SPHINCS_PLUS_192S,
        SPHINCS_PLUS_256F: post_quantum_crypto_1.PQCAlgorithm.SPHINCS_PLUS_256F,
        SPHINCS_PLUS_256S: post_quantum_crypto_1.PQCAlgorithm.SPHINCS_PLUS_256S,
    };
    return mapping[algorithm] || post_quantum_crypto_1.PQCAlgorithm.KYBER_768;
}
// Helper to format key for GraphQL response
function formatKey(key) {
    return {
        keyId: key.keyId,
        algorithm: key.algorithm.toUpperCase().replace(/-/g, '_'),
        publicKey: toBase64(key.publicKey),
        createdAt: key.createdAt.toISOString(),
        expiresAt: key.expiresAt?.toISOString() || null,
        metadata: key.metadata,
        isHybrid: key.metadata?.hybrid === true,
    };
}
exports.pqcResolvers = {
    Query: {
        pqcKey: async (_, { keyId }) => {
            const key = QuantumResistantCryptoService_js_1.quantumCryptoService.getKey(keyId);
            if (!key)
                return null;
            return formatKey(key);
        },
        pqcPublicKey: async (_, { keyId }) => {
            const publicKey = QuantumResistantCryptoService_js_1.quantumCryptoService.getPublicKey(keyId);
            if (!publicKey)
                return null;
            return toBase64(publicKey);
        },
        pqcKeys: async (_, { algorithm, includeExpired, }) => {
            const keys = QuantumResistantCryptoService_js_1.quantumCryptoService.listKeys({
                algorithm: algorithm ? mapAlgorithm(algorithm) : undefined,
                includeExpired: includeExpired || false,
            });
            return keys.map(formatKey);
        },
        pqcSupportedAlgorithms: async () => {
            const algorithms = QuantumResistantCryptoService_js_1.quantumCryptoService.getSupportedAlgorithms();
            return {
                kem: algorithms.kem.map((a) => a.toUpperCase().replace(/-/g, '_')),
                signature: algorithms.signature.map((a) => a.toUpperCase().replace(/-/g, '_')),
            };
        },
        pqcStatistics: async () => {
            return QuantumResistantCryptoService_js_1.quantumCryptoService.getStatistics();
        },
        pqcQuantumRiskReport: async () => {
            const report = await QuantumResistantCryptoService_js_1.quantumCryptoService.getQuantumRiskReport();
            return {
                ...report,
                timestamp: report.timestamp.toISOString(),
                overallRiskLevel: report.overallRiskLevel.toUpperCase(),
            };
        },
    },
    Mutation: {
        pqcGenerateKeyPair: async (_, { algorithm, keyId, expiresInDays, metadata, }) => {
            const key = await QuantumResistantCryptoService_js_1.quantumCryptoService.generateKeyPair(mapAlgorithm(algorithm), {
                keyId,
                expiresInDays,
                metadata,
            });
            return formatKey(key);
        },
        pqcGenerateHybridKeyPair: async (_, { classicalAlgorithm, quantumSecurityLevel, expiresInDays, }) => {
            const securityLevelMap = {
                LEVEL_1: 1,
                LEVEL_2: 2,
                LEVEL_3: 3,
                LEVEL_4: 4,
                LEVEL_5: 5,
            };
            const key = await QuantumResistantCryptoService_js_1.quantumCryptoService.generateHybridKeyPair({
                classicalAlgorithm: classicalAlgorithm || 'x25519',
                quantumSecurityLevel: quantumSecurityLevel
                    ? securityLevelMap[quantumSecurityLevel]
                    : undefined,
                expiresInDays,
            });
            return formatKey(key);
        },
        pqcEncapsulate: async (_, { keyId }) => {
            const result = await QuantumResistantCryptoService_js_1.quantumCryptoService.encapsulate(keyId);
            // Return ciphertext and a hash of the shared secret (not the secret itself)
            const crypto = await Promise.resolve().then(() => __importStar(require('crypto')));
            const secretHash = crypto
                .createHash('sha256')
                .update(result.sharedSecret)
                .digest('hex');
            return {
                ciphertext: toBase64(result.ciphertext),
                sharedSecretHash: secretHash,
            };
        },
        pqcDecapsulate: async (_, { keyId, ciphertext }) => {
            const sharedSecret = await QuantumResistantCryptoService_js_1.quantumCryptoService.decapsulate(keyId, fromBase64(ciphertext));
            // Return hash of shared secret, not the secret itself
            const crypto = await Promise.resolve().then(() => __importStar(require('crypto')));
            return crypto.createHash('sha256').update(sharedSecret).digest('hex');
        },
        pqcSign: async (_, { keyId, message }) => {
            const messageBytes = new TextEncoder().encode(message);
            const result = await QuantumResistantCryptoService_js_1.quantumCryptoService.sign(keyId, messageBytes);
            return {
                signature: toBase64(result.signature),
                algorithm: result.algorithm.toUpperCase().replace(/-/g, '_'),
                timestamp: result.timestamp.toISOString(),
                metadata: result.metadata,
            };
        },
        pqcVerify: async (_, { keyId, message, signature, }) => {
            const messageBytes = new TextEncoder().encode(message);
            const signatureBytes = fromBase64(signature);
            const isValid = await QuantumResistantCryptoService_js_1.quantumCryptoService.verify(keyId, messageBytes, signatureBytes);
            const key = QuantumResistantCryptoService_js_1.quantumCryptoService.getKey(keyId);
            return {
                isValid,
                algorithm: key?.algorithm.toUpperCase().replace(/-/g, '_'),
                timestamp: new Date().toISOString(),
            };
        },
        pqcDeleteKey: async (_, { keyId }) => {
            return QuantumResistantCryptoService_js_1.quantumCryptoService.deleteKey(keyId);
        },
        pqcRotateKey: async (_, { keyId }) => {
            const key = await QuantumResistantCryptoService_js_1.quantumCryptoService.rotateKey(keyId);
            return formatKey(key);
        },
        pqcValidateAlgorithm: async (_, { algorithm }) => {
            const isValid = await QuantumResistantCryptoService_js_1.quantumCryptoService.validateAlgorithm(mapAlgorithm(algorithm));
            return {
                algorithm: algorithm,
                isValid,
                testedAt: new Date().toISOString(),
            };
        },
        pqcBenchmarkAlgorithm: async (_, { algorithm }) => {
            const formattedResults = await QuantumResistantCryptoService_js_1.quantumCryptoService.benchmarkAlgorithm(mapAlgorithm(algorithm));
            return {
                algorithm: algorithm,
                formattedResults,
            };
        },
    },
    Subscription: {
        pqcKeyGenerated: {
            subscribe: () => pubsub.asyncIterator([PQC_KEY_GENERATED]),
        },
        pqcKeyExpiringWarning: {
            subscribe: () => pubsub.asyncIterator([PQC_KEY_EXPIRING]),
        },
        pqcOperation: {
            subscribe: () => pubsub.asyncIterator([PQC_OPERATION]),
        },
    },
};
exports.default = (0, policyWrapper_js_1.wrapResolversWithPolicy)('PQC', exports.pqcResolvers);
