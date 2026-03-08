"use strict";
/**
 * PKI (Public Key Infrastructure) Manager
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
exports.PKIManager = void 0;
const elliptic_1 = require("elliptic");
const forge = __importStar(require("node-forge"));
const uuid_1 = require("uuid");
const ec = new elliptic_1.ec('secp256k1');
class PKIManager {
    logger;
    certificates = new Map();
    revokedCerts = new Set();
    constructor(logger) {
        this.logger = logger;
    }
    /**
     * Generate ECDSA key pair
     */
    generateECDSAKeyPair() {
        const keyPair = ec.genKeyPair();
        return {
            publicKey: keyPair.getPublic('hex'),
            privateKey: keyPair.getPrivate('hex'),
            algorithm: 'ECDSA',
        };
    }
    /**
     * Generate RSA key pair
     */
    generateRSAKeyPair(bits = 2048) {
        const keypair = forge.pki.rsa.generateKeyPair({ bits });
        return {
            publicKey: forge.pki.publicKeyToPem(keypair.publicKey),
            privateKey: forge.pki.privateKeyToPem(keypair.privateKey),
            algorithm: 'RSA',
        };
    }
    /**
     * Sign data with ECDSA
     */
    signECDSA(data, privateKeyHex) {
        const key = ec.keyFromPrivate(privateKeyHex, 'hex');
        const hash = forge.md.sha256.create().update(data).digest().toHex();
        const signature = key.sign(hash);
        return signature.toDER('hex');
    }
    /**
     * Verify ECDSA signature
     */
    verifyECDSA(data, signature, publicKeyHex) {
        try {
            const key = ec.keyFromPublic(publicKeyHex, 'hex');
            const hash = forge.md.sha256.create().update(data).digest().toHex();
            return key.verify(hash, signature);
        }
        catch (error) {
            return false;
        }
    }
    /**
     * Sign data with RSA
     */
    signRSA(data, privateKeyPem) {
        const privateKey = forge.pki.privateKeyFromPem(privateKeyPem);
        const md = forge.md.sha256.create();
        md.update(data, 'utf8');
        const signature = privateKey.sign(md);
        return forge.util.encode64(signature);
    }
    /**
     * Verify RSA signature
     */
    verifyRSA(data, signature, publicKeyPem) {
        try {
            const publicKey = forge.pki.publicKeyFromPem(publicKeyPem);
            const md = forge.md.sha256.create();
            md.update(data, 'utf8');
            const decodedSignature = forge.util.decode64(signature);
            return publicKey.verify(md.digest().bytes(), decodedSignature);
        }
        catch (error) {
            return false;
        }
    }
    /**
     * Issue certificate
     */
    issueCertificate(subject, issuer, publicKey, validityDays = 365, issuerPrivateKey) {
        const cert = {
            id: (0, uuid_1.v4)(),
            subject,
            issuer,
            publicKey,
            serialNumber: Date.now().toString(),
            validFrom: Date.now(),
            validTo: Date.now() + validityDays * 24 * 60 * 60 * 1000,
            signature: '',
            revoked: false,
        };
        // Sign certificate
        if (issuerPrivateKey) {
            const certData = JSON.stringify({
                subject: cert.subject,
                issuer: cert.issuer,
                publicKey: cert.publicKey,
                serialNumber: cert.serialNumber,
                validFrom: cert.validFrom,
                validTo: cert.validTo,
            });
            cert.signature = this.signECDSA(certData, issuerPrivateKey);
        }
        this.certificates.set(cert.id, cert);
        this.logger.info({ certId: cert.id, subject, issuer }, 'Certificate issued');
        return cert;
    }
    /**
     * Revoke certificate
     */
    revokeCertificate(certId, reason) {
        const cert = this.certificates.get(certId);
        if (!cert) {
            throw new Error('Certificate not found');
        }
        cert.revoked = true;
        this.revokedCerts.add(certId);
        this.logger.info({ certId, reason }, 'Certificate revoked');
    }
    /**
     * Verify certificate
     */
    verifyCertificate(certId) {
        const errors = [];
        const cert = this.certificates.get(certId);
        if (!cert) {
            return { valid: false, errors: ['Certificate not found'] };
        }
        // Check revocation
        if (cert.revoked) {
            errors.push('Certificate has been revoked');
        }
        // Check expiration
        const now = Date.now();
        if (now < cert.validFrom) {
            errors.push('Certificate not yet valid');
        }
        if (now > cert.validTo) {
            errors.push('Certificate has expired');
        }
        return {
            valid: errors.length === 0,
            errors,
        };
    }
    /**
     * Get certificate
     */
    getCertificate(certId) {
        return this.certificates.get(certId);
    }
    /**
     * Check if certificate is revoked
     */
    isCertificateRevoked(certId) {
        return this.revokedCerts.has(certId);
    }
    /**
     * Multi-signature support
     */
    createMultiSignature(data, privateKeys, threshold) {
        if (privateKeys.length < threshold) {
            throw new Error('Insufficient private keys for threshold');
        }
        const signatures = [];
        const publicKeys = [];
        for (const privateKey of privateKeys) {
            const signature = this.signECDSA(data, privateKey);
            signatures.push(signature);
            const key = ec.keyFromPrivate(privateKey, 'hex');
            publicKeys.push(key.getPublic('hex'));
        }
        return {
            signatures,
            threshold,
            publicKeys,
        };
    }
    /**
     * Verify multi-signature
     */
    verifyMultiSignature(data, signatures, publicKeys, threshold) {
        let validSignatures = 0;
        for (let i = 0; i < signatures.length; i++) {
            if (this.verifyECDSA(data, signatures[i], publicKeys[i])) {
                validSignatures++;
            }
        }
        return validSignatures >= threshold;
    }
}
exports.PKIManager = PKIManager;
