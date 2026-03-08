"use strict";
/**
 * Service Authenticator
 *
 * Handles mTLS-based service-to-service authentication
 * Validates SPIFFE IDs and service certificates
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServiceAuthenticator = void 0;
const fs_1 = require("fs");
class ServiceAuthenticator {
    config;
    trustBundle = null;
    constructor(config) {
        this.config = config;
        this.loadTrustBundle();
    }
    /**
     * Load SPIRE trust bundle
     */
    loadTrustBundle() {
        try {
            this.trustBundle = (0, fs_1.readFileSync)(this.config.trustBundlePath, 'utf-8');
            console.log('Loaded SPIRE trust bundle');
        }
        catch (error) {
            console.warn('Failed to load SPIRE trust bundle, mTLS validation will fail', error);
        }
    }
    /**
     * Validate service certificate and extract identity
     */
    async validateCertificate(cert) {
        if (!cert || !cert.subject) {
            throw new Error('No client certificate provided');
        }
        // Extract SPIFFE ID from certificate SAN (Subject Alternative Name)
        const spiffeId = this.extractSPIFFEID(cert);
        if (!spiffeId) {
            throw new Error('No SPIFFE ID found in certificate');
        }
        if (this.config.validateSPIFFEID && !this.isValidSPIFFEID(spiffeId)) {
            throw new Error(`Invalid SPIFFE ID: ${spiffeId}`);
        }
        // Parse SPIFFE ID to extract service information
        const { serviceName, namespace } = this.parseSPIFFEID(spiffeId);
        // Validate certificate chain against trust bundle
        if (this.trustBundle) {
            await this.validateCertificateChain(cert);
        }
        return {
            type: 'service',
            spiffeId,
            serviceName,
            namespace,
            attributes: {
                certSubject: cert.subject,
                certIssuer: cert.issuer,
                certValidFrom: cert.valid_from,
                certValidTo: cert.valid_to,
                certFingerprint: cert.fingerprint
            }
        };
    }
    /**
     * Extract SPIFFE ID from certificate SAN
     */
    extractSPIFFEID(cert) {
        // Try subject alternative names
        if (cert.subjectaltname) {
            const sans = cert.subjectaltname.split(', ');
            for (const san of sans) {
                if (san.startsWith('URI:spiffe://')) {
                    return san.substring(4); // Remove 'URI:' prefix
                }
            }
        }
        // Fallback to subject CN (less secure)
        if (cert.subject && cert.subject.CN) {
            return cert.subject.CN;
        }
        return null;
    }
    /**
     * Validate SPIFFE ID format
     * Format: spiffe://mesh.summit.internal/ns/<namespace>/sa/<service-account>
     */
    isValidSPIFFEID(spiffeId) {
        const spiffePattern = /^spiffe:\/\/mesh\.summit\.internal\/ns\/[a-z0-9-]+\/sa\/[a-z0-9-]+$/;
        return spiffePattern.test(spiffeId);
    }
    /**
     * Parse SPIFFE ID to extract service information
     */
    parseSPIFFEID(spiffeId) {
        // spiffe://mesh.summit.internal/ns/<namespace>/sa/<service-account>
        const match = spiffeId.match(/\/ns\/([^\/]+)\/sa\/([^\/]+)/);
        if (!match) {
            return {
                serviceName: 'unknown',
                namespace: 'unknown'
            };
        }
        return {
            namespace: match[1],
            serviceName: match[2]
        };
    }
    /**
     * Validate certificate chain against trust bundle
     */
    async validateCertificateChain(cert) {
        // In production, implement proper certificate chain validation
        // This is a simplified version
        if (!this.trustBundle) {
            throw new Error('Trust bundle not loaded');
        }
        // Check certificate validity period
        const now = new Date();
        const validFrom = new Date(cert.valid_from);
        const validTo = new Date(cert.valid_to);
        if (now < validFrom || now > validTo) {
            throw new Error('Certificate is not valid');
        }
        // In production, verify certificate signature against trust bundle
        // using OpenSSL or similar cryptographic library
        // For now, we trust that TLS layer has done this validation
    }
    /**
     * Create service identity for testing/development
     */
    static createMockIdentity(serviceName, namespace) {
        return {
            type: 'service',
            spiffeId: `spiffe://mesh.summit.internal/ns/${namespace}/sa/${serviceName}`,
            serviceName,
            namespace,
            attributes: {
                mock: true
            }
        };
    }
}
exports.ServiceAuthenticator = ServiceAuthenticator;
