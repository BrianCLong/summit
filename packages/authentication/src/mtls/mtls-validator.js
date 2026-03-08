"use strict";
/**
 * Mutual TLS (mTLS) Validator
 *
 * Validates client certificates for mutual authentication
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MTLSValidator = void 0;
const logger_js_1 = require("../utils/logger.js");
const logger = (0, logger_js_1.createLogger)('mtls-validator');
class MTLSValidator {
    config;
    trustedFingerprints = new Set();
    constructor(config) {
        this.config = config;
    }
    validateClientCertificate(socket) {
        if (!this.config.enabled) {
            return null;
        }
        const cert = socket.getPeerCertificate();
        if (!cert || !Object.keys(cert).length) {
            if (this.config.requireClientCert) {
                logger.error('Client certificate required but not provided');
                throw new Error('Client certificate required');
            }
            return null;
        }
        // Extract certificate information
        const clientCert = {
            subject: cert.subject,
            issuer: cert.issuer,
            validFrom: cert.valid_from,
            validTo: cert.valid_to,
            fingerprint: cert.fingerprint,
            serialNumber: cert.serialNumber,
        };
        // Validate certificate
        this.validateCertificate(clientCert);
        logger.info('Client certificate validated', {
            cn: clientCert.subject.CN,
            fingerprint: clientCert.fingerprint,
        });
        return clientCert;
    }
    validateCertificate(cert) {
        // Check if certificate is expired
        const now = new Date();
        const validFrom = new Date(cert.validFrom);
        const validTo = new Date(cert.validTo);
        if (now < validFrom || now > validTo) {
            throw new Error('Client certificate expired or not yet valid');
        }
        // Check allowed CNs
        if (this.config.allowedCNs && this.config.allowedCNs.length > 0) {
            if (!cert.subject.CN || !this.config.allowedCNs.includes(cert.subject.CN)) {
                throw new Error('Client certificate CN not allowed');
            }
        }
        // Check allowed organizations
        if (this.config.allowedOrganizations && this.config.allowedOrganizations.length > 0) {
            if (!cert.subject.O || !this.config.allowedOrganizations.includes(cert.subject.O)) {
                throw new Error('Client certificate organization not allowed');
            }
        }
        // Check trusted fingerprints
        if (this.trustedFingerprints.size > 0) {
            if (!this.trustedFingerprints.has(cert.fingerprint)) {
                throw new Error('Client certificate fingerprint not trusted');
            }
        }
    }
    addTrustedFingerprint(fingerprint) {
        this.trustedFingerprints.add(fingerprint);
        logger.info('Trusted fingerprint added', { fingerprint });
    }
    removeTrustedFingerprint(fingerprint) {
        this.trustedFingerprints.delete(fingerprint);
        logger.info('Trusted fingerprint removed', { fingerprint });
    }
    getTrustedFingerprints() {
        return Array.from(this.trustedFingerprints);
    }
}
exports.MTLSValidator = MTLSValidator;
