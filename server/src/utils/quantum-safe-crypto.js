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
exports.pqcCrypto = exports.QuantumSafeCrypto = void 0;
const crypto = __importStar(require("crypto"));
const logger_js_1 = require("../config/logger.js");
/**
 * Quantum-Safe Cryptography Utilities (Experimental - Task #103).
 * Provides wrappers for PQC algorithms and hybrid schemes.
 */
class QuantumSafeCrypto {
    static instance;
    constructor() { }
    static getInstance() {
        if (!QuantumSafeCrypto.instance) {
            QuantumSafeCrypto.instance = new QuantumSafeCrypto();
        }
        return QuantumSafeCrypto.instance;
    }
    /**
     * Generates a hybrid key (Experimental).
     * Combines a classical key (e.g. ECC) with a simulated quantum-safe component.
     */
    async generateHybridKey() {
        logger_js_1.logger.info('PQC: Generating experimental hybrid key');
        // Classical ECC component
        const { publicKey } = crypto.generateKeyPairSync('ec', {
            namedCurve: 'secp256k1',
        });
        // Simulated Quantum-Safe component (e.g. representing a Kyber key)
        const qsComponent = crypto.randomBytes(32).toString('hex');
        return {
            classical: publicKey.export({ type: 'spki', format: 'pem' }).toString(),
            quantumSafe: qsComponent
        };
    }
    /**
     * Constant-time comparison to defend against timing side-channel attacks.
     */
    constantTimeCompare(a, b) {
        if (a.length !== b.length) {
            return false;
        }
        return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
    }
}
exports.QuantumSafeCrypto = QuantumSafeCrypto;
exports.pqcCrypto = QuantumSafeCrypto.getInstance();
