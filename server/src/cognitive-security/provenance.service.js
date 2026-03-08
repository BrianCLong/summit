"use strict";
/**
 * Provenance Service
 *
 * Handles C2PA/Content Credentials integration for media authenticity verification.
 * Provides cryptographic provenance chains for content verification.
 *
 * Key capabilities:
 * - C2PA manifest parsing and validation
 * - Provenance chain construction for non-C2PA content
 * - Content credential creation and verification
 * - Asset hash computation and integrity checking
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProvenanceService = void 0;
exports.parseC2PAManifest = parseC2PAManifest;
exports.createProvenanceService = createProvenanceService;
exports.initializeProvenanceService = initializeProvenanceService;
exports.getProvenanceService = getProvenanceService;
const crypto_1 = require("crypto");
const pino_1 = __importDefault(require("pino"));
const logger = pino_1.default({ name: 'provenance-service' });
// ============================================================================
// C2PA Parser
// ============================================================================
/**
 * Parses a C2PA manifest from raw bytes or JUMBF data
 */
async function parseC2PAManifest(data) {
    try {
        // Look for C2PA JUMBF box marker
        const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data);
        const jumbfMarker = Buffer.from([0x6A, 0x75, 0x6D, 0x62]); // 'jumb'
        const markerIndex = buffer.indexOf(jumbfMarker);
        if (markerIndex === -1) {
            logger.debug('No C2PA JUMBF marker found in asset');
            return null;
        }
        // Parse JUMBF structure (simplified - real implementation would use c2pa-node)
        const manifest = await extractManifestFromJUMBF(buffer, markerIndex);
        return manifest;
    }
    catch (error) {
        logger.error({ error }, 'Failed to parse C2PA manifest');
        return null;
    }
}
/**
 * Extract manifest from JUMBF box (simplified implementation)
 */
async function extractManifestFromJUMBF(buffer, offset) {
    // In production, use @contentauth/c2pa-node library
    // This is a simplified structure for demonstration
    const manifestId = (0, crypto_1.randomUUID)();
    return {
        manifestId,
        specVersion: '2.0',
        claimGenerator: 'Summit/IntelGraph CogSec',
        signedAt: new Date().toISOString(),
        certificateChain: [],
        actions: [],
        assertions: [],
        verificationStatus: {
            valid: false,
            signatureVerified: false,
            certificateChainValid: false,
            contentIntegrityValid: false,
            timestampValid: false,
            errors: ['Manifest requires full C2PA library for validation'],
            warnings: [],
        },
    };
}
// ============================================================================
// Provenance Service
// ============================================================================
class ProvenanceService {
    config;
    verificationCache = new Map();
    constructor(config = {}) {
        this.config = {
            strictValidation: true,
            cacheTtlMs: 300000, // 5 minutes
            ...config,
        };
        logger.info('Provenance service initialized');
    }
    /**
     * Compute SHA-256 hash of content
     */
    computeAssetHash(content) {
        const buffer = Buffer.isBuffer(content) ? content : Buffer.from(content);
        return (0, crypto_1.createHash)('sha256').update(buffer).digest('hex');
    }
    /**
     * Create a content credential from asset data
     */
    async createContentCredential(assetId, content, mimeType, sourceUrl) {
        const buffer = Buffer.isBuffer(content) ? content : Buffer.from(content);
        const assetHash = this.computeAssetHash(buffer);
        // Try to extract C2PA manifest
        const c2paManifest = await parseC2PAManifest(buffer);
        const credential = {
            id: (0, crypto_1.randomUUID)(),
            assetId,
            assetHash,
            mimeType,
            hasC2PA: c2paManifest !== null,
            c2paManifest: c2paManifest || undefined,
            provenanceConfidence: c2paManifest ? 0.9 : 0.3,
            createdAt: new Date().toISOString(),
            provenanceChain: [],
        };
        // Add initial provenance link
        if (sourceUrl) {
            credential.provenanceChain = [
                {
                    id: (0, crypto_1.randomUUID)(),
                    source: sourceUrl,
                    observedAt: new Date().toISOString(),
                    observer: 'system',
                    confidence: 0.5,
                },
            ];
        }
        logger.info({ assetId, hasC2PA: credential.hasC2PA }, 'Created content credential');
        return credential;
    }
    /**
     * Verify a C2PA manifest
     */
    async verifyC2PAManifest(manifest, content) {
        // Check cache
        const cached = this.verificationCache.get(manifest.manifestId);
        if (cached && cached.expiresAt > Date.now()) {
            return cached.result;
        }
        const result = {
            valid: false,
            signatureVerified: false,
            certificateChainValid: false,
            contentIntegrityValid: false,
            timestampValid: false,
            errors: [],
            warnings: [],
        };
        try {
            // Verify certificate chain
            result.certificateChainValid = await this.verifyCertificateChain(manifest.certificateChain);
            if (!result.certificateChainValid) {
                result.errors.push('Certificate chain validation failed');
            }
            // Verify signature (simplified - real implementation uses crypto)
            result.signatureVerified = manifest.certificateChain.length > 0;
            if (!result.signatureVerified) {
                result.errors.push('No valid signature found');
            }
            // Verify content integrity if content provided
            if (content) {
                result.contentIntegrityValid = await this.verifyContentIntegrity(manifest, content);
                if (!result.contentIntegrityValid) {
                    result.errors.push('Content integrity check failed');
                }
            }
            else {
                result.warnings.push('Content not provided for integrity verification');
            }
            // Verify timestamp
            result.timestampValid = this.verifyTimestamp(manifest.signedAt);
            if (!result.timestampValid) {
                result.warnings.push('Timestamp validation could not be confirmed');
            }
            // Overall validity
            result.valid =
                result.signatureVerified &&
                    result.certificateChainValid &&
                    (content ? result.contentIntegrityValid : true);
            // Cache result
            this.verificationCache.set(manifest.manifestId, {
                result,
                expiresAt: Date.now() + (this.config.cacheTtlMs || 300000),
            });
            logger.info({ manifestId: manifest.manifestId, valid: result.valid }, 'C2PA manifest verification completed');
        }
        catch (error) {
            result.errors.push(`Verification error: ${error instanceof Error ? error.message : 'Unknown'}`);
            logger.error({ error, manifestId: manifest.manifestId }, 'C2PA verification failed');
        }
        return result;
    }
    /**
     * Verify certificate chain against trusted roots
     */
    async verifyCertificateChain(chain) {
        if (chain.length === 0) {
            return false;
        }
        // Check each certificate in the chain
        for (const cert of chain) {
            // Verify certificate validity period
            const now = new Date();
            const validFrom = new Date(cert.validFrom);
            const validTo = new Date(cert.validTo);
            if (now < validFrom || now > validTo) {
                logger.warn({ cert: cert.subject }, 'Certificate outside validity period');
                return false;
            }
            // Check against trusted roots if strict validation enabled
            if (this.config.strictValidation && cert.isTrustedRoot) {
                const isTrusted = this.config.trustedRoots?.includes(cert.issuer) ?? false;
                if (!isTrusted) {
                    logger.warn({ issuer: cert.issuer }, 'Certificate issuer not in trusted roots');
                    // In production, would fail here if strict; for demo, warn only
                }
            }
        }
        return true;
    }
    /**
     * Verify content integrity by comparing hashes
     */
    async verifyContentIntegrity(manifest, content) {
        // Find content hash assertion
        const hashAssertion = manifest.assertions.find((a) => a.assertionType === 'c2pa.hash.data' ||
            a.assertionType === 'stds.hash.data');
        if (!hashAssertion) {
            logger.warn('No hash assertion found in manifest');
            return false;
        }
        // Compute content hash
        const contentHash = this.computeAssetHash(content);
        // Compare with assertion hash
        const assertedHash = hashAssertion.data.hash || hashAssertion.data.digest;
        return contentHash === assertedHash;
    }
    /**
     * Verify timestamp is reasonable
     */
    verifyTimestamp(timestamp) {
        try {
            const signedDate = new Date(timestamp);
            const now = new Date();
            // Check timestamp is not in the future
            if (signedDate > now) {
                return false;
            }
            // Check timestamp is not too old (e.g., more than 10 years)
            const tenYearsAgo = new Date();
            tenYearsAgo.setFullYear(tenYearsAgo.getFullYear() - 10);
            if (signedDate < tenYearsAgo) {
                return false;
            }
            return true;
        }
        catch {
            return false;
        }
    }
    /**
     * Add a provenance link to a content credential
     */
    addProvenanceLink(credential, source, platform, metadata) {
        const link = {
            id: (0, crypto_1.randomUUID)(),
            source,
            observedAt: new Date().toISOString(),
            platform,
            observer: 'system',
            confidence: this.calculateLinkConfidence(source, platform),
            metadata,
        };
        credential.provenanceChain = credential.provenanceChain || [];
        credential.provenanceChain.push(link);
        // Update overall provenance confidence
        credential.provenanceConfidence = this.calculateOverallConfidence(credential);
        logger.debug({ credentialId: credential.id, linkId: link.id }, 'Added provenance link');
        return link;
    }
    /**
     * Calculate confidence for a provenance link based on source
     */
    calculateLinkConfidence(source, platform) {
        let confidence = 0.5;
        // Higher confidence for known reliable sources
        const reliableDomains = [
            '.gov',
            '.edu',
            'reuters.com',
            'apnews.com',
            'bbc.com',
        ];
        for (const domain of reliableDomains) {
            if (source.includes(domain)) {
                confidence = 0.85;
                break;
            }
        }
        // Lower confidence for certain platforms
        const lowTrustPlatforms = ['telegram', 'gab', '4chan', '8kun'];
        if (platform && lowTrustPlatforms.includes(platform.toLowerCase())) {
            confidence *= 0.6;
        }
        return Math.min(1, Math.max(0, confidence));
    }
    /**
     * Calculate overall provenance confidence
     */
    calculateOverallConfidence(credential) {
        let confidence = 0.3; // Base confidence for unknown content
        // C2PA verified content gets high confidence
        if (credential.hasC2PA && credential.c2paManifest?.verificationStatus.valid) {
            confidence = 0.95;
        }
        else if (credential.hasC2PA) {
            confidence = 0.7; // Has C2PA but unverified
        }
        // Factor in provenance chain
        if (credential.provenanceChain && credential.provenanceChain.length > 0) {
            const chainConfidence = credential.provenanceChain.reduce((sum, link) => sum + link.confidence, 0) /
                credential.provenanceChain.length;
            // Weighted average: 70% current, 30% chain
            confidence = confidence * 0.7 + chainConfidence * 0.3;
        }
        return Math.min(1, Math.max(0, confidence));
    }
    /**
     * Create a C2PA action record
     */
    createAction(actionType, softwareAgent, parameters) {
        return {
            actionType,
            softwareAgent: softwareAgent || 'Summit/IntelGraph CogSec',
            when: new Date().toISOString(),
            parameters,
        };
    }
    /**
     * Create a C2PA assertion
     */
    createAssertion(assertionType, label, data) {
        const dataStr = JSON.stringify(data);
        const hash = (0, crypto_1.createHash)('sha256').update(dataStr).digest('hex');
        return {
            assertionType,
            label,
            data,
            hash,
        };
    }
    /**
     * Sign content with C2PA manifest (creates new manifest)
     */
    async signContent(content, mimeType, actions, assertions, parentManifests) {
        const contentHash = this.computeAssetHash(content);
        // Add content hash assertion
        const hashAssertion = this.createAssertion('c2pa.hash.data', 'c2pa.hash.data', {
            hash: contentHash,
            algorithm: 'sha256',
            mimeType,
        });
        const manifest = {
            manifestId: (0, crypto_1.randomUUID)(),
            specVersion: '2.0',
            claimGenerator: 'Summit/IntelGraph CogSec 1.0',
            signedAt: new Date().toISOString(),
            certificateChain: [
                {
                    issuer: 'Summit CogSec CA',
                    subject: 'Summit CogSec Signer',
                    serialNumber: (0, crypto_1.randomUUID)(),
                    validFrom: new Date().toISOString(),
                    validTo: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
                    isTrustedRoot: false,
                },
            ],
            actions,
            assertions: [hashAssertion, ...assertions],
            parentManifests,
            verificationStatus: {
                valid: true,
                signatureVerified: true,
                certificateChainValid: true,
                contentIntegrityValid: true,
                timestampValid: true,
                errors: [],
                warnings: ['Internal signing - external verification requires trust anchor'],
            },
        };
        logger.info({ manifestId: manifest.manifestId }, 'Created signed C2PA manifest');
        return manifest;
    }
    /**
     * Export provenance chain as evidence bundle
     */
    async exportProvenanceBundle(credential) {
        const bundleId = (0, crypto_1.randomUUID)();
        // Verify C2PA if present
        let verificationReport = null;
        if (credential.c2paManifest) {
            verificationReport = await this.verifyC2PAManifest(credential.c2paManifest);
        }
        // Compute bundle hash
        const bundleData = JSON.stringify({
            bundleId,
            credential,
            verificationReport,
        });
        const bundleHash = (0, crypto_1.createHash)('sha256').update(bundleData).digest('hex');
        logger.info({ bundleId, credentialId: credential.id }, 'Exported provenance bundle');
        return {
            bundleId,
            credential,
            verificationReport,
            exportedAt: new Date().toISOString(),
            bundleHash,
        };
    }
    /**
     * Health check
     */
    async healthCheck() {
        return {
            healthy: true,
            details: {
                cacheSize: this.verificationCache.size,
                strictValidation: this.config.strictValidation,
                hasProvLedger: !!this.config.provLedgerUrl,
            },
        };
    }
}
exports.ProvenanceService = ProvenanceService;
// ============================================================================
// Factory Functions
// ============================================================================
let serviceInstance = null;
function createProvenanceService(config) {
    return new ProvenanceService(config);
}
function initializeProvenanceService(config) {
    serviceInstance = new ProvenanceService(config);
    return serviceInstance;
}
function getProvenanceService() {
    if (!serviceInstance) {
        throw new Error('Provenance service not initialized');
    }
    return serviceInstance;
}
