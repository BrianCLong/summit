"use strict";
/**
 * Proof-Carrying Publishing Tests
 *
 * Comprehensive tests for end-to-end proof-carrying publishing.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const crypto_1 = require("crypto");
const fs_1 = require("fs");
const path_1 = require("path");
const os_1 = require("os");
const proof_carrying_publisher_js_1 = require("../proof-carrying-publisher.js");
const hash_tree_builder_js_1 = require("../hash-tree-builder.js");
const model_card_generator_js_1 = require("../model-card-generator.js");
const disclosure_packager_js_1 = require("../disclosure-packager.js");
const revocation_registry_js_1 = require("../revocation-registry.js");
const citation_validator_js_1 = require("../citation-validator.js");
const bundle_verifier_js_1 = require("../bundle-verifier.js");
(0, globals_1.describe)('Proof-Carrying Publishing', () => {
    let tempDir;
    let publisher;
    let keyPair;
    (0, globals_1.beforeEach)(async () => {
        // Create temp directory for tests
        tempDir = (0, path_1.join)((0, os_1.tmpdir)(), `pcp-test-${(0, crypto_1.randomUUID)()}`);
        await fs_1.promises.mkdir(tempDir, { recursive: true });
        // Generate key pair for testing
        const keys = (0, crypto_1.generateKeyPairSync)('rsa', {
            modulusLength: 2048,
            publicKeyEncoding: { type: 'spki', format: 'pem' },
            privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
        });
        keyPair = {
            privateKey: keys.privateKey,
            publicKey: keys.publicKey,
        };
        // Create publisher instance
        publisher = new proof_carrying_publisher_js_1.ProofCarryingPublisher({
            privateKey: keyPair.privateKey,
            publicKey: keyPair.publicKey,
            organization: 'IntelGraph Test',
            contact: 'test@intelgraph.ai',
        });
    });
    (0, globals_1.describe)('Hash Tree Builder', () => {
        (0, globals_1.it)('should build Merkle tree from files', async () => {
            const builder = new hash_tree_builder_js_1.HashTreeBuilder('sha256');
            // Create test files
            const file1 = (0, path_1.join)(tempDir, 'file1.txt');
            const file2 = (0, path_1.join)(tempDir, 'file2.txt');
            await fs_1.promises.writeFile(file1, 'test data 1');
            await fs_1.promises.writeFile(file2, 'test data 2');
            const hash1 = await builder.hashFile(file1);
            const hash2 = await builder.hashFile(file2);
            (0, globals_1.expect)(hash1.hash).toBeTruthy();
            (0, globals_1.expect)(hash2.hash).toBeTruthy();
            (0, globals_1.expect)(hash1.hash).not.toBe(hash2.hash);
            const tree = builder.buildMerkleTree([hash1, hash2]);
            (0, globals_1.expect)(tree.root).toBeTruthy();
            (0, globals_1.expect)(tree.algorithm).toBe('sha256');
            (0, globals_1.expect)(tree.leaves).toHaveLength(2);
        });
        (0, globals_1.it)('should verify hash tree integrity', async () => {
            const builder = new hash_tree_builder_js_1.HashTreeBuilder('sha256');
            const file1 = (0, path_1.join)(tempDir, 'file1.txt');
            await fs_1.promises.writeFile(file1, 'test data');
            const hash = await builder.hashFile(file1);
            const tree = builder.buildMerkleTree([hash]);
            const result = builder.verifyHashTree(tree);
            (0, globals_1.expect)(result.valid).toBe(true);
            (0, globals_1.expect)(result.errors).toHaveLength(0);
        });
        (0, globals_1.it)('should detect tampered hash tree', async () => {
            const builder = new hash_tree_builder_js_1.HashTreeBuilder('sha256');
            const file1 = (0, path_1.join)(tempDir, 'file1.txt');
            await fs_1.promises.writeFile(file1, 'test data');
            const hash = await builder.hashFile(file1);
            const tree = builder.buildMerkleTree([hash]);
            // Tamper with root
            tree.root = 'invalid-hash';
            const result = builder.verifyHashTree(tree);
            (0, globals_1.expect)(result.valid).toBe(false);
            (0, globals_1.expect)(result.errors.length).toBeGreaterThan(0);
        });
        (0, globals_1.it)('should generate and verify Merkle proofs', async () => {
            const builder = new hash_tree_builder_js_1.HashTreeBuilder('sha256');
            const file1 = (0, path_1.join)(tempDir, 'file1.txt');
            const file2 = (0, path_1.join)(tempDir, 'file2.txt');
            await fs_1.promises.writeFile(file1, 'test data 1');
            await fs_1.promises.writeFile(file2, 'test data 2');
            const hash1 = await builder.hashFile(file1);
            const hash2 = await builder.hashFile(file2);
            const tree = builder.buildMerkleTree([hash1, hash2]);
            const proof = builder.generateProof(file1, tree);
            (0, globals_1.expect)(proof).toBeTruthy();
            (0, globals_1.expect)(Array.isArray(proof)).toBe(true);
        });
    });
    (0, globals_1.describe)('Model Card Generator', () => {
        (0, globals_1.it)('should create model card with lineage', () => {
            const generator = model_card_generator_js_1.ModelCardGenerator.create('test-model', 'Test Model', 'Test model card', 'test-user');
            generator.addSource({
                id: 'source-1',
                type: 'database',
                location: 'test-db',
                timestamp: new Date().toISOString(),
            });
            generator.addTransform({
                type: 'REDACTION',
                parameters: { fields: ['email'] },
                operator: 'test-user',
            });
            generator.setSensitivity('confidential');
            generator.setRecordCount(100);
            const card = generator.build();
            (0, globals_1.expect)(card.id).toBe('test-model');
            (0, globals_1.expect)(card.name).toBe('Test Model');
            (0, globals_1.expect)(card.sources).toHaveLength(1);
            (0, globals_1.expect)(card.transforms).toHaveLength(1);
            (0, globals_1.expect)(card.dataSensitivity).toBe('confidential');
            (0, globals_1.expect)(card.recordCount).toBe(100);
        });
        (0, globals_1.it)('should validate transform chain', () => {
            const generator = model_card_generator_js_1.ModelCardGenerator.create('test-model', 'Test Model', 'Test', 'test-user');
            generator.addTransform({
                type: 'FILTERING',
                parameters: {},
                operator: 'test-user',
            }, 'input data');
            generator.setLastTransformOutput('output data');
            const result = generator.validateTransformChain();
            (0, globals_1.expect)(result.valid).toBe(true);
            (0, globals_1.expect)(result.errors).toHaveLength(0);
        });
    });
    (0, globals_1.describe)('Citation Validator', () => {
        (0, globals_1.it)('should validate required citations', () => {
            const validator = new citation_validator_js_1.CitationValidator();
            const citation = {
                id: 'cit-1',
                type: 'data',
                required: true,
                title: 'Test Dataset',
                organization: 'IntelGraph',
                license: citation_validator_js_1.StandardLicenses['MIT'],
                verified: true,
                verifiedAt: new Date().toISOString(),
                verificationMethod: 'manual',
            };
            validator.registerCitation(citation);
            const result = validator.validateForPublishing([citation]);
            (0, globals_1.expect)(result.canPublish).toBe(true);
            (0, globals_1.expect)(result.blockers).toHaveLength(0);
        });
        (0, globals_1.it)('should block publishing with missing citations', () => {
            const validator = new citation_validator_js_1.CitationValidator();
            const citation = {
                id: 'cit-1',
                type: 'data',
                required: true,
                title: 'Test Dataset',
                organization: 'IntelGraph',
                license: citation_validator_js_1.StandardLicenses['MIT'],
                verified: false, // Not verified
            };
            const result = validator.validateForPublishing([citation]);
            (0, globals_1.expect)(result.canPublish).toBe(false);
            (0, globals_1.expect)(result.blockers.length).toBeGreaterThan(0);
            (0, globals_1.expect)(result.missingCitations).toHaveLength(1);
        });
        (0, globals_1.it)('should detect license incompatibilities', () => {
            const validator = new citation_validator_js_1.CitationValidator();
            const citations = [
                {
                    id: 'cit-1',
                    type: 'code',
                    required: true,
                    title: 'GPL Code',
                    license: citation_validator_js_1.StandardLicenses['GPL-3.0'],
                    verified: true,
                    verifiedAt: new Date().toISOString(),
                },
                {
                    id: 'cit-2',
                    type: 'code',
                    required: true,
                    title: 'MIT Code',
                    license: citation_validator_js_1.StandardLicenses['MIT'],
                    verified: true,
                    verifiedAt: new Date().toISOString(),
                },
            ];
            const result = validator.validateForPublishing(citations);
            (0, globals_1.expect)(result.licenseIssues.length).toBeGreaterThan(0);
        });
    });
    (0, globals_1.describe)('Disclosure Packager', () => {
        (0, globals_1.it)('should create evidence wallet', async () => {
            const packager = disclosure_packager_js_1.DisclosurePackager.createWithGeneratedKeys();
            // Create test manifest
            const file1 = (0, path_1.join)(tempDir, 'test.txt');
            await fs_1.promises.writeFile(file1, 'test data');
            const builder = new hash_tree_builder_js_1.HashTreeBuilder('sha256');
            const hash = await builder.hashFile(file1);
            const tree = builder.buildMerkleTree([hash]);
            const manifest = {
                version: '1.0',
                id: 'test-manifest',
                bundleId: 'test-bundle',
                hashTree: tree,
                modelCards: [],
                citations: [],
                licenses: [citation_validator_js_1.StandardLicenses['MIT']],
                metadata: {
                    name: 'Test Bundle',
                    description: 'Test',
                    version: '1.0',
                    createdAt: new Date().toISOString(),
                    createdBy: 'test-user',
                    securityClassification: 'public',
                },
                verification: {
                    offlineVerifiable: true,
                },
                signature: 'test-signature',
                signatureAlgorithm: 'RSA-SHA256',
                publicKey: 'test-key',
                createdAt: new Date().toISOString(),
                revocable: true,
                revocationCheckRequired: false,
            };
            const audience = disclosure_packager_js_1.AudienceScopes.public();
            const wallet = await packager.createWallet(manifest, {
                audience,
                artifacts: [file1],
            });
            (0, globals_1.expect)(wallet.id).toBeTruthy();
            (0, globals_1.expect)(wallet.bundleId).toBe('test-bundle');
            (0, globals_1.expect)(wallet.audience).toEqual(audience);
            (0, globals_1.expect)(wallet.signature).toBeTruthy();
        });
        (0, globals_1.it)('should package wallet into distributable bundle', async () => {
            const packager = disclosure_packager_js_1.DisclosurePackager.createWithGeneratedKeys();
            const file1 = (0, path_1.join)(tempDir, 'test.txt');
            await fs_1.promises.writeFile(file1, 'test data');
            const builder = new hash_tree_builder_js_1.HashTreeBuilder('sha256');
            const hash = await builder.hashFile(file1);
            const tree = builder.buildMerkleTree([hash]);
            const manifest = {
                version: '1.0',
                id: 'test-manifest',
                bundleId: 'test-bundle',
                hashTree: tree,
                modelCards: [],
                citations: [],
                licenses: [citation_validator_js_1.StandardLicenses['MIT']],
                metadata: {
                    name: 'Test Bundle',
                    description: 'Test',
                    version: '1.0',
                    createdAt: new Date().toISOString(),
                    createdBy: 'test-user',
                    securityClassification: 'public',
                },
                verification: {
                    offlineVerifiable: true,
                },
                signature: 'test-signature',
                signatureAlgorithm: 'RSA-SHA256',
                publicKey: 'test-key',
                createdAt: new Date().toISOString(),
                revocable: true,
                revocationCheckRequired: false,
            };
            const wallet = await packager.createWallet(manifest, {
                audience: disclosure_packager_js_1.AudienceScopes.public(),
                artifacts: [file1],
            });
            const outputPath = (0, path_1.join)(tempDir, 'wallet.zip');
            await packager.packageWallet(wallet, outputPath);
            const stats = await fs_1.promises.stat(outputPath);
            (0, globals_1.expect)(stats.isFile()).toBe(true);
            (0, globals_1.expect)(stats.size).toBeGreaterThan(0);
        }, 120000);
    });
    (0, globals_1.describe)('Revocation Registry', () => {
        (0, globals_1.it)('should revoke wallet', async () => {
            const registry = new revocation_registry_js_1.RevocationRegistry({
                privateKey: keyPair.privateKey,
                publicKey: keyPair.publicKey,
                registryId: 'test-registry',
            });
            const wallet = {
                id: 'wallet-1',
                bundleId: 'bundle-1',
            };
            const record = await registry.revokeWallet(wallet, {
                reason: 'compromised',
                revokedBy: 'admin',
                reasonDetail: 'Test revocation',
            });
            (0, globals_1.expect)(record.id).toBeTruthy();
            (0, globals_1.expect)(record.walletId).toBe('wallet-1');
            (0, globals_1.expect)(record.reason).toBe('compromised');
            (0, globals_1.expect)(record.signature).toBeTruthy();
            (0, globals_1.expect)(registry.isWalletRevoked('wallet-1')).toBe(true);
        });
        (0, globals_1.it)('should revoke bundle', async () => {
            const registry = new revocation_registry_js_1.RevocationRegistry({
                privateKey: keyPair.privateKey,
                publicKey: keyPair.publicKey,
                registryId: 'test-registry',
            });
            const record = await registry.revokeBundle('bundle-1', {
                reason: 'withdrawn',
                revokedBy: 'admin',
            });
            (0, globals_1.expect)(record.bundleId).toBe('bundle-1');
            (0, globals_1.expect)(registry.isBundleRevoked('bundle-1')).toBe(true);
        });
        (0, globals_1.it)('should export and import revocation list', async () => {
            const registry = new revocation_registry_js_1.RevocationRegistry({
                privateKey: keyPair.privateKey,
                publicKey: keyPair.publicKey,
                registryId: 'test-registry',
            });
            await registry.revokeBundle('bundle-1', {
                reason: 'expired',
                revokedBy: 'system',
            });
            const exportPath = (0, path_1.join)(tempDir, 'revocations.json');
            await registry.exportRevocationList(exportPath);
            const newRegistry = new revocation_registry_js_1.RevocationRegistry({
                privateKey: keyPair.privateKey,
                publicKey: keyPair.publicKey,
                registryId: 'test-registry-2',
            });
            await newRegistry.importRevocationList(exportPath);
            (0, globals_1.expect)(newRegistry.isBundleRevoked('bundle-1')).toBe(true);
        });
    });
    (0, globals_1.describe)('Bundle Verifier', () => {
        (0, globals_1.it)('should verify valid bundle', async () => {
            const file1 = (0, path_1.join)(tempDir, 'test.txt');
            await fs_1.promises.writeFile(file1, 'test data');
            const builder = new hash_tree_builder_js_1.HashTreeBuilder('sha256');
            const hash = await builder.hashFile(file1);
            const tree = builder.buildMerkleTree([hash]);
            const citation = {
                id: 'cit-1',
                type: 'data',
                required: true,
                title: 'Test Data',
                organization: 'IntelGraph',
                license: citation_validator_js_1.StandardLicenses['MIT'],
                verified: true,
                verifiedAt: new Date().toISOString(),
            };
            const result = await publisher.publish({
                name: 'Test Bundle',
                description: 'Test',
                version: '1.0',
                createdBy: 'test-user',
                artifacts: [file1],
                citations: [citation],
                licenses: [citation_validator_js_1.StandardLicenses['MIT']],
                securityClassification: 'public',
            });
            (0, globals_1.expect)(result.validation.canPublish).toBe(true);
            const verificationResult = await publisher.verifyBundle(result.manifest);
            (0, globals_1.expect)(verificationResult.valid).toBe(true);
            (0, globals_1.expect)(verificationResult.errors).toHaveLength(0);
            (0, globals_1.expect)(verificationResult.checks.hashTreeValid).toBe(true);
            (0, globals_1.expect)(verificationResult.checks.citationsComplete).toBe(true);
        });
        (0, globals_1.it)('should detect invalid signature', async () => {
            const verifier = new bundle_verifier_js_1.BundleVerifier({
                checkRevocation: false,
            });
            const manifest = {
                version: '1.0',
                id: 'test',
                bundleId: 'test',
                hashTree: {
                    root: 'test',
                    algorithm: 'sha256',
                    nodes: [],
                    leaves: [],
                    createdAt: new Date().toISOString(),
                },
                modelCards: [],
                citations: [],
                licenses: [],
                metadata: {
                    name: 'Test',
                    description: 'Test',
                    version: '1.0',
                    createdAt: new Date().toISOString(),
                    createdBy: 'test',
                },
                verification: {
                    offlineVerifiable: true,
                },
                signature: 'invalid-signature',
                signatureAlgorithm: 'RSA-SHA256',
                publicKey: keyPair.publicKey,
                createdAt: new Date().toISOString(),
                revocable: false,
                revocationCheckRequired: false,
            };
            const result = await verifier.verifyBundle(manifest);
            (0, globals_1.expect)(result.valid).toBe(false);
            (0, globals_1.expect)(result.checks.signatureValid).toBe(false);
        });
        (0, globals_1.it)('should detect revoked bundle', async () => {
            const file1 = (0, path_1.join)(tempDir, 'test.txt');
            await fs_1.promises.writeFile(file1, 'test data');
            const citation = {
                id: 'cit-1',
                type: 'data',
                required: true,
                title: 'Test Data',
                organization: 'IntelGraph',
                license: citation_validator_js_1.StandardLicenses['MIT'],
                verified: true,
                verifiedAt: new Date().toISOString(),
            };
            const result = await publisher.publish({
                name: 'Test Bundle',
                description: 'Test',
                version: '1.0',
                createdBy: 'test-user',
                artifacts: [file1],
                citations: [citation],
                licenses: [citation_validator_js_1.StandardLicenses['MIT']],
                securityClassification: 'public',
            });
            // Revoke the bundle
            await publisher.revokeBundle(result.manifest.bundleId, 'withdrawn', 'admin');
            // Verify should now fail
            const verificationResult = await publisher.verifyBundle(result.manifest);
            (0, globals_1.expect)(verificationResult.valid).toBe(false);
            (0, globals_1.expect)(verificationResult.checks.notRevoked).toBe(false);
        });
    });
    (0, globals_1.describe)('End-to-End Publishing', () => {
        (0, globals_1.it)('should publish complete bundle with all components', async () => {
            // Create test artifacts
            const file1 = (0, path_1.join)(tempDir, 'data.json');
            await fs_1.promises.writeFile(file1, JSON.stringify({ test: 'data' }));
            // Create citations
            const citations = [
                {
                    id: 'cit-1',
                    type: 'data',
                    required: true,
                    title: 'Test Dataset',
                    organization: 'IntelGraph',
                    license: citation_validator_js_1.StandardLicenses['Apache-2.0'],
                    verified: true,
                    verifiedAt: new Date().toISOString(),
                    verificationMethod: 'manual',
                },
            ];
            // Create model card
            const modelCard = model_card_generator_js_1.ModelCardGenerator.create('model-1', 'Test Model', 'Test model card', 'test-user')
                .addSource({
                id: 'source-1',
                type: 'database',
                location: 'test-db',
                timestamp: new Date().toISOString(),
            })
                .setSensitivity('internal')
                .setRecordCount(100)
                .build();
            // Publish
            const result = await publisher.publish({
                name: 'Complete Test Bundle',
                description: 'Full end-to-end test',
                version: '1.0',
                createdBy: 'test-user',
                artifacts: [file1],
                modelCards: [modelCard],
                citations,
                licenses: [citation_validator_js_1.StandardLicenses['Apache-2.0']],
                complianceFrameworks: ['GDPR'],
                securityClassification: 'internal',
            });
            // Validate publication
            (0, globals_1.expect)(result.validation.canPublish).toBe(true);
            (0, globals_1.expect)(result.validation.blockers).toHaveLength(0);
            // Verify manifest structure
            (0, globals_1.expect)(result.manifest.bundleId).toBeTruthy();
            (0, globals_1.expect)(result.manifest.hashTree.root).toBeTruthy();
            (0, globals_1.expect)(result.manifest.modelCards).toHaveLength(1);
            (0, globals_1.expect)(result.manifest.citations).toHaveLength(1);
            (0, globals_1.expect)(result.manifest.signature).toBeTruthy();
            // Verify bundle
            const verificationResult = await publisher.verifyBundle(result.manifest);
            (0, globals_1.expect)(verificationResult.valid).toBe(true);
            (0, globals_1.expect)(verificationResult.verifiedOffline).toBe(true);
        });
        (0, globals_1.it)('should block publishing with missing citations', async () => {
            const file1 = (0, path_1.join)(tempDir, 'data.json');
            await fs_1.promises.writeFile(file1, JSON.stringify({ test: 'data' }));
            const citations = [
                {
                    id: 'cit-1',
                    type: 'data',
                    required: true,
                    title: 'Test Dataset',
                    organization: 'IntelGraph',
                    license: citation_validator_js_1.StandardLicenses['MIT'],
                    verified: false, // Not verified!
                },
            ];
            const result = await publisher.publish({
                name: 'Test Bundle',
                description: 'Should fail',
                version: '1.0',
                createdBy: 'test-user',
                artifacts: [file1],
                citations,
                licenses: [citation_validator_js_1.StandardLicenses['MIT']],
            });
            (0, globals_1.expect)(result.validation.canPublish).toBe(false);
            (0, globals_1.expect)(result.validation.missingCitations).toHaveLength(1);
        });
        (0, globals_1.it)('should create and verify audience-scoped wallets', async () => {
            const file1 = (0, path_1.join)(tempDir, 'data.json');
            await fs_1.promises.writeFile(file1, JSON.stringify({ test: 'data' }));
            const citation = {
                id: 'cit-1',
                type: 'data',
                required: true,
                title: 'Test Data',
                organization: 'IntelGraph',
                license: citation_validator_js_1.StandardLicenses['MIT'],
                verified: true,
                verifiedAt: new Date().toISOString(),
            };
            const result = await publisher.publish({
                name: 'Test Bundle',
                description: 'Test',
                version: '1.0',
                createdBy: 'test-user',
                artifacts: [file1],
                citations: [citation],
                licenses: [citation_validator_js_1.StandardLicenses['MIT']],
                securityClassification: 'public',
            });
            // Create wallets for different audiences
            const publicWallet = await publisher.createWalletForAudience(result.manifest, disclosure_packager_js_1.AudienceScopes.public(), [file1], (0, path_1.join)(tempDir, 'public-wallet.zip'));
            const internalWallet = await publisher.createWalletForAudience(result.manifest, disclosure_packager_js_1.AudienceScopes.internal('IntelGraph'), [file1], (0, path_1.join)(tempDir, 'internal-wallet.zip'));
            (0, globals_1.expect)(publicWallet.audience.maxSensitivity).toBe('public');
            (0, globals_1.expect)(internalWallet.audience.maxSensitivity).toBe('internal');
            // Verify wallets
            const publicVerification = await publisher.verifyWallet(publicWallet);
            const internalVerification = await publisher.verifyWallet(internalWallet);
            (0, globals_1.expect)(publicVerification.valid).toBe(true);
            (0, globals_1.expect)(internalVerification.valid).toBe(true);
        });
        (0, globals_1.it)('should propagate revocation across wallets', async () => {
            const file1 = (0, path_1.join)(tempDir, 'data.json');
            await fs_1.promises.writeFile(file1, JSON.stringify({ test: 'data' }));
            const citation = {
                id: 'cit-1',
                type: 'data',
                required: true,
                title: 'Test Data',
                organization: 'IntelGraph',
                license: citation_validator_js_1.StandardLicenses['MIT'],
                verified: true,
                verifiedAt: new Date().toISOString(),
            };
            const result = await publisher.publish({
                name: 'Test Bundle',
                description: 'Test',
                version: '1.0',
                createdBy: 'test-user',
                artifacts: [file1],
                citations: [citation],
                licenses: [citation_validator_js_1.StandardLicenses['MIT']],
                securityClassification: 'public',
            });
            // Create multiple wallets
            const wallet1 = await publisher.createWalletForAudience(result.manifest, disclosure_packager_js_1.AudienceScopes.public(), [file1], (0, path_1.join)(tempDir, 'wallet1.zip'));
            const wallet2 = await publisher.createWalletForAudience(result.manifest, disclosure_packager_js_1.AudienceScopes.internal('IntelGraph'), [file1], (0, path_1.join)(tempDir, 'wallet2.zip'));
            // Revoke the entire bundle
            await publisher.revokeBundle(result.manifest.bundleId, 'compromised', 'admin', 'Security incident');
            // Both wallets should now fail verification
            const verification1 = await publisher.verifyWallet(wallet1);
            const verification2 = await publisher.verifyWallet(wallet2);
            (0, globals_1.expect)(verification1.valid).toBe(false);
            (0, globals_1.expect)(verification2.valid).toBe(false);
            (0, globals_1.expect)(verification1.checks.notRevoked).toBe(false);
            (0, globals_1.expect)(verification2.checks.notRevoked).toBe(false);
        });
    });
});
