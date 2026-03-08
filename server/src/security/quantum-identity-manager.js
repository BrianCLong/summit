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
exports.quantumIdentityManager = exports.QuantumIdentityManager = void 0;
const logger_js_1 = require("../config/logger.js");
const crypto = __importStar(require("crypto"));
/**
 * Service for Quantum-Resistant Service Identity (Task #110).
 * Simulates PQC Key Encapsulation (KEM) and Digital Signatures.
 */
class QuantumIdentityManager {
    static instance;
    rootKey; // Simulated Root CA Key
    constructor() {
        this.rootKey = process.env.PQC_ROOT_KEY || crypto.randomBytes(32).toString('hex');
    }
    static getInstance() {
        if (!QuantumIdentityManager.instance) {
            QuantumIdentityManager.instance = new QuantumIdentityManager();
        }
        return QuantumIdentityManager.instance;
    }
    /**
     * For drills/testing: Force re-initialization to pick up environment changes.
     */
    reinitialize() {
        this.rootKey = process.env.PQC_ROOT_KEY || crypto.randomBytes(32).toString('hex');
        logger_js_1.logger.info('QuantumIdentityManager: Root key reinitialized');
    }
    /**
     * Issues a new Quantum Identity for a service.
     */
    issueIdentity(serviceId) {
        logger_js_1.logger.info({ serviceId }, 'QuantumIdentity: Issuing PQC Identity');
        // Simulate Kyber Key Generation
        const publicKey = `pqc-kyber-v1:${crypto.randomBytes(32).toString('base64')}`;
        const identity = {
            serviceId,
            publicKey,
            algorithm: 'KYBER-768',
            issuedAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 86400000).toISOString() // 24 hours
        };
        const signature = this.sign(this.buildSignaturePayload(identity));
        return { ...identity, signature };
    }
    /**
     * Verifies a Quantum Identity.
     */
    verifyIdentity(identity) {
        if (identity.algorithm !== 'KYBER-768' &&
            identity.algorithm !== 'DILITHIUM-3') {
            logger_js_1.logger.warn({ serviceId: identity.serviceId, algorithm: identity.algorithm }, 'QuantumIdentity: Unsupported algorithm');
            return false;
        }
        const isValid = this.verify(this.buildSignaturePayload({
            serviceId: identity.serviceId,
            publicKey: identity.publicKey,
            algorithm: identity.algorithm,
            issuedAt: identity.issuedAt,
            expiresAt: identity.expiresAt
        }), identity.signature);
        if (!isValid) {
            logger_js_1.logger.warn({ serviceId: identity.serviceId }, 'QuantumIdentity: Invalid signature');
            return false;
        }
        if (new Date(identity.expiresAt) < new Date()) {
            logger_js_1.logger.warn({ serviceId: identity.serviceId }, 'QuantumIdentity: Identity expired');
            return false;
        }
        return true;
    }
    /**
     * Simulates PQC Key Encapsulation Mechanism (KEM) Handshake.
     * Alice (Initiator) uses Bob's Public Key to encapsulate a shared secret.
     */
    encapsulate(peerPublicKey) {
        if (!peerPublicKey.startsWith('pqc-kyber-v1:')) {
            throw new Error('Invalid PQC Public Key format');
        }
        // Simulate KEM
        const sharedSecret = crypto.randomBytes(32).toString('hex');
        const ciphertext = `kem-enc:${crypto.randomBytes(16).toString('hex')}`;
        logger_js_1.logger.debug('QuantumIdentity: KEM Encapsulation complete');
        return { sharedSecret, ciphertext };
    }
    /**
     * Simulates PQC Key Decapsulation.
     * Bob (Receiver) uses his Private Key (implicit here) to recover the shared secret.
     */
    decapsulate(ciphertext) {
        if (!ciphertext.startsWith('kem-enc:')) {
            throw new Error('Invalid KEM Ciphertext');
        }
        return 'simulated-decapsulated-secret';
    }
    // --- Private Helpers ---
    buildSignaturePayload(identity) {
        return [
            identity.serviceId,
            identity.publicKey,
            identity.algorithm,
            identity.issuedAt,
            identity.expiresAt
        ].join('|');
    }
    sign(data) {
        // Simulate Dilithium signature
        const hash = crypto.createHmac('sha256', this.rootKey).update(data).digest('hex');
        return `pqc-sig:${hash}`;
    }
    verify(data, signature) {
        if (!signature.startsWith('pqc-sig:'))
            return false;
        const hash = crypto.createHmac('sha256', this.rootKey).update(data).digest('hex');
        return signature === `pqc-sig:${hash}`;
    }
}
exports.QuantumIdentityManager = QuantumIdentityManager;
exports.quantumIdentityManager = QuantumIdentityManager.getInstance();
