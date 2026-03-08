"use strict";
// @ts-nocheck
/**
 * Proof-Carrying Publisher
 *
 * Main service that integrates all proof-carrying publishing components:
 * - Manifest generation
 * - Hash tree building
 * - Model card generation
 * - Citation validation
 * - Evidence wallet creation
 * - Revocation management
 * - Bundle verification
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProofCarryingPublisher = void 0;
exports.createPublisherFromEnv = createPublisherFromEnv;
exports.integrateWithExport = integrateWithExport;
const crypto_1 = require("crypto");
const hash_tree_builder_js_1 = require("./hash-tree-builder.js");
const model_card_generator_js_1 = require("./model-card-generator.js");
const disclosure_packager_js_1 = require("./disclosure-packager.js");
const revocation_registry_js_1 = require("./revocation-registry.js");
const citation_validator_js_1 = require("./citation-validator.js");
const bundle_verifier_js_1 = require("./bundle-verifier.js");
const crypto_2 = require("crypto");
class ProofCarryingPublisher {
    config;
    hashTreeBuilder;
    packager;
    citationValidator;
    revocationRegistry;
    publishingPipeline;
    constructor(config) {
        this.config = {
            algorithm: 'RSA-SHA256',
            registryId: 'default-registry',
            organization: 'IntelGraph',
            ...config,
        };
        this.hashTreeBuilder = new hash_tree_builder_js_1.HashTreeBuilder('sha256');
        this.packager = new disclosure_packager_js_1.DisclosurePackager({
            privateKey: config.privateKey,
            publicKey: config.publicKey,
            algorithm: this.config.algorithm,
            revocationListUrl: config.revocationListUrl,
        });
        this.citationValidator = new citation_validator_js_1.CitationValidator();
        this.revocationRegistry = new revocation_registry_js_1.RevocationRegistry({
            privateKey: config.privateKey,
            publicKey: config.publicKey,
            registryId: this.config.registryId,
        });
        this.publishingPipeline = new citation_validator_js_1.PublishingPipeline(this.citationValidator);
    }
    /**
     * Create and publish a complete proof-carrying bundle
     */
    async publish(options) {
        // 1. Generate bundle ID
        const bundleId = `bundle-${Date.now()}-${(0, crypto_1.randomBytes)(8).toString('hex')}`;
        // 2. Register citations
        this.citationValidator.registerCitations(options.citations);
        // 3. Build hash tree from artifacts
        const hashTree = await this.buildHashTreeFromArtifacts(options.artifacts);
        // 4. Generate or use provided model cards
        const modelCards = options.modelCards || [];
        // 5. Create manifest
        const manifest = await this.createManifest({
            bundleId,
            hashTree,
            modelCards,
            citations: options.citations,
            licenses: options.licenses,
            metadata: {
                name: options.name,
                description: options.description,
                version: options.version,
                createdAt: new Date().toISOString(),
                createdBy: options.createdBy,
                organization: this.config.organization,
                contact: this.config.contact,
                complianceFrameworks: options.complianceFrameworks,
                securityClassification: options.securityClassification,
            },
            expiresAt: options.expiresAt,
        });
        // 6. Validate before publishing
        const validation = await this.publishingPipeline.validatePrePublish(manifest);
        if (!validation.canPublish) {
            console.error('Publishing blocked:', validation.blockers);
            return { manifest, validation };
        }
        // 7. Sign and finalize manifest
        const signedManifest = await this.signManifest(manifest);
        return {
            manifest: signedManifest,
            validation,
        };
    }
    /**
     * Create evidence wallet for specific audience
     */
    async createWalletForAudience(manifest, audience, artifacts, outputPath) {
        const wallet = await this.packager.createWallet(manifest, {
            audience,
            artifacts,
            revocable: true,
        });
        // Package wallet into distributable bundle
        await this.packager.packageWallet(wallet, outputPath);
        return wallet;
    }
    /**
     * Create multiple wallets for different audiences
     */
    async createMultiAudienceWallets(manifest, audiences) {
        const wallets = [];
        for (const audience of audiences) {
            const wallet = await this.createWalletForAudience(manifest, audience.scope, audience.artifacts, audience.outputPath);
            wallets.push(wallet);
        }
        return wallets;
    }
    /**
     * Verify a bundle
     */
    async verifyBundle(manifest, artifactsPath) {
        const verifier = new bundle_verifier_js_1.BundleVerifier({
            checkRevocation: true,
            revocationRegistries: [this.revocationRegistry],
        });
        return verifier.verifyBundle(manifest, artifactsPath);
    }
    /**
     * Verify a wallet
     */
    async verifyWallet(wallet) {
        const verifier = new bundle_verifier_js_1.BundleVerifier({
            checkRevocation: true,
            revocationRegistries: [this.revocationRegistry],
        });
        return verifier.verifyWallet(wallet);
    }
    /**
     * Revoke a wallet
     */
    async revokeWallet(wallet, reason, revokedBy, reasonDetail) {
        return this.revocationRegistry.revokeWallet(wallet, {
            reason,
            revokedBy,
            reasonDetail,
            propagate: true,
        });
    }
    /**
     * Revoke entire bundle
     */
    async revokeBundle(bundleId, reason, revokedBy, reasonDetail) {
        return this.revocationRegistry.revokeBundle(bundleId, {
            reason,
            revokedBy,
            reasonDetail,
            propagate: true,
        });
    }
    /**
     * Export revocation list for offline verification
     */
    async exportRevocationList(outputPath) {
        return this.revocationRegistry.exportRevocationList(outputPath);
    }
    /**
     * Build hash tree from artifact files
     */
    async buildHashTreeFromArtifacts(artifacts) {
        const fileHashes = await Promise.all(artifacts.map(path => this.hashTreeBuilder.hashFile(path)));
        return this.hashTreeBuilder.buildMerkleTree(fileHashes);
    }
    /**
     * Create manifest
     */
    async createManifest(options) {
        return {
            version: '1.0',
            id: `manifest-${options.bundleId}`,
            bundleId: options.bundleId,
            hashTree: options.hashTree,
            modelCards: options.modelCards,
            citations: options.citations,
            licenses: options.licenses,
            metadata: options.metadata,
            verification: {
                offlineVerifiable: true,
                verificationScript: 'verify.sh',
                requiredTools: ['openssl', 'sha256sum'],
                verificationInstructions: 'Run verify.sh to validate bundle integrity offline',
            },
            signature: '', // Will be set during signing
            signatureAlgorithm: this.config.algorithm,
            publicKey: this.config.publicKey,
            createdAt: new Date().toISOString(),
            expiresAt: options.expiresAt,
            revocable: true,
            revocationListUrl: this.config.revocationListUrl,
            revocationCheckRequired: true,
        };
    }
    /**
     * Sign manifest
     */
    async signManifest(manifest) {
        // Create a copy without signature for signing
        const manifestCopy = { ...manifest };
        delete manifestCopy.signature;
        const data = JSON.stringify(manifestCopy, null, 2);
        const sign = (0, crypto_2.createSign)('SHA256');
        sign.update(data);
        sign.end();
        const signature = sign.sign(this.config.privateKey, 'hex');
        return {
            ...manifest,
            signature,
        };
    }
    /**
     * Get citation validator for external use
     */
    getCitationValidator() {
        return this.citationValidator;
    }
    /**
     * Get revocation registry for external use
     */
    getRevocationRegistry() {
        return this.revocationRegistry;
    }
}
exports.ProofCarryingPublisher = ProofCarryingPublisher;
/**
 * Helper to create publisher from environment variables
 */
function createPublisherFromEnv() {
    const privateKey = process.env.PROOF_CARRYING_PRIVATE_KEY;
    const publicKey = process.env.PROOF_CARRYING_PUBLIC_KEY;
    if (!privateKey || !publicKey) {
        throw new Error('PROOF_CARRYING_PRIVATE_KEY and PROOF_CARRYING_PUBLIC_KEY must be set');
    }
    return new ProofCarryingPublisher({
        privateKey,
        publicKey,
        algorithm: process.env.PROOF_CARRYING_ALGORITHM || 'RSA-SHA256',
        registryId: process.env.PROOF_CARRYING_REGISTRY_ID,
        revocationListUrl: process.env.PROOF_CARRYING_REVOCATION_URL,
        organization: process.env.PROOF_CARRYING_ORGANIZATION,
        contact: process.env.PROOF_CARRYING_CONTACT,
    });
}
async function integrateWithExport(publisher, options) {
    // Extract citations from export data
    const citations = [];
    // Add standard licenses
    const licenses = [citation_validator_js_1.StandardLicenses['Apache-2.0']];
    // Create model card from export
    const modelCard = (0, model_card_generator_js_1.createModelCardFromExport)(options.exportId, {
        name: `Export ${options.exportId}`,
        description: 'IntelGraph data export',
        user: options.user,
        sources: [
            {
                id: options.exportId,
                type: 'database',
                location: 'IntelGraph Database',
                timestamp: new Date().toISOString(),
            },
        ],
        sensitivity: options.sensitivity || 'internal',
    });
    // Publish with proof-carrying manifest
    const result = await publisher.publish({
        name: `IntelGraph Export ${options.exportId}`,
        description: 'IntelGraph disclosure export with proof-carrying manifest',
        version: '1.0',
        createdBy: options.user,
        artifacts: [], // Would be populated with actual export files
        modelCards: [modelCard],
        citations,
        licenses,
        securityClassification: options.sensitivity,
        complianceFrameworks: ['GDPR', 'CCPA'],
    });
    if (!result.validation.canPublish) {
        throw new Error(`Cannot publish: ${result.validation.blockers.join(', ')}`);
    }
    return result.manifest;
}
