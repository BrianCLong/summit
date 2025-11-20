/**
 * Proof-Carrying Publishing Tests
 *
 * Comprehensive tests for end-to-end proof-carrying publishing.
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { randomBytes, generateKeyPairSync } from 'crypto';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

import { ProofCarryingPublisher } from '../proof-carrying-publisher';
import { HashTreeBuilder } from '../hash-tree-builder';
import { ModelCardGenerator } from '../model-card-generator';
import { DisclosurePackager, AudienceScopes } from '../disclosure-packager';
import { RevocationRegistry } from '../revocation-registry';
import { CitationValidator, StandardLicenses } from '../citation-validator';
import { BundleVerifier } from '../bundle-verifier';
import type {
  Citation,
  LicenseInfo,
  AudienceScope,
} from '../proof-carrying-types';

describe('Proof-Carrying Publishing', () => {
  let tempDir: string;
  let publisher: ProofCarryingPublisher;
  let keyPair: { privateKey: string; publicKey: string };

  beforeEach(async () => {
    // Create temp directory for tests
    tempDir = join(tmpdir(), `pcp-test-${randomBytes(8).toString('hex')}`);
    await fs.mkdir(tempDir, { recursive: true });

    // Generate key pair for testing
    const keys = generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });

    keyPair = {
      privateKey: keys.privateKey as string,
      publicKey: keys.publicKey as string,
    };

    // Create publisher instance
    publisher = new ProofCarryingPublisher({
      privateKey: keyPair.privateKey,
      publicKey: keyPair.publicKey,
      organization: 'IntelGraph Test',
      contact: 'test@intelgraph.ai',
    });
  });

  describe('Hash Tree Builder', () => {
    it('should build Merkle tree from files', async () => {
      const builder = new HashTreeBuilder('sha256');

      // Create test files
      const file1 = join(tempDir, 'file1.txt');
      const file2 = join(tempDir, 'file2.txt');
      await fs.writeFile(file1, 'test data 1');
      await fs.writeFile(file2, 'test data 2');

      const hash1 = await builder.hashFile(file1);
      const hash2 = await builder.hashFile(file2);

      expect(hash1.hash).toBeTruthy();
      expect(hash2.hash).toBeTruthy();
      expect(hash1.hash).not.toBe(hash2.hash);

      const tree = builder.buildMerkleTree([hash1, hash2]);

      expect(tree.root).toBeTruthy();
      expect(tree.algorithm).toBe('sha256');
      expect(tree.leaves).toHaveLength(2);
    });

    it('should verify hash tree integrity', async () => {
      const builder = new HashTreeBuilder('sha256');

      const file1 = join(tempDir, 'file1.txt');
      await fs.writeFile(file1, 'test data');

      const hash = await builder.hashFile(file1);
      const tree = builder.buildMerkleTree([hash]);

      const result = builder.verifyHashTree(tree);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect tampered hash tree', async () => {
      const builder = new HashTreeBuilder('sha256');

      const file1 = join(tempDir, 'file1.txt');
      await fs.writeFile(file1, 'test data');

      const hash = await builder.hashFile(file1);
      const tree = builder.buildMerkleTree([hash]);

      // Tamper with root
      tree.root = 'invalid-hash';

      const result = builder.verifyHashTree(tree);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should generate and verify Merkle proofs', async () => {
      const builder = new HashTreeBuilder('sha256');

      const file1 = join(tempDir, 'file1.txt');
      const file2 = join(tempDir, 'file2.txt');
      await fs.writeFile(file1, 'test data 1');
      await fs.writeFile(file2, 'test data 2');

      const hash1 = await builder.hashFile(file1);
      const hash2 = await builder.hashFile(file2);
      const tree = builder.buildMerkleTree([hash1, hash2]);

      const proof = builder.generateProof(file1, tree);

      expect(proof).toBeTruthy();
      expect(Array.isArray(proof)).toBe(true);
    });
  });

  describe('Model Card Generator', () => {
    it('should create model card with lineage', () => {
      const generator = ModelCardGenerator.create(
        'test-model',
        'Test Model',
        'Test model card',
        'test-user'
      );

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

      expect(card.id).toBe('test-model');
      expect(card.name).toBe('Test Model');
      expect(card.sources).toHaveLength(1);
      expect(card.transforms).toHaveLength(1);
      expect(card.dataSensitivity).toBe('confidential');
      expect(card.recordCount).toBe(100);
    });

    it('should validate transform chain', () => {
      const generator = ModelCardGenerator.create(
        'test-model',
        'Test Model',
        'Test',
        'test-user'
      );

      generator.addTransform(
        {
          type: 'FILTERING',
          parameters: {},
          operator: 'test-user',
        },
        'input data'
      );

      generator.setLastTransformOutput('output data');

      const result = generator.validateTransformChain();

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Citation Validator', () => {
    it('should validate required citations', () => {
      const validator = new CitationValidator();

      const citation: Citation = {
        id: 'cit-1',
        type: 'data',
        required: true,
        title: 'Test Dataset',
        license: StandardLicenses['MIT'],
        verified: true,
        verifiedAt: new Date().toISOString(),
        verificationMethod: 'manual',
      };

      validator.registerCitation(citation);

      const result = validator.validateForPublishing([citation]);

      expect(result.canPublish).toBe(true);
      expect(result.blockers).toHaveLength(0);
    });

    it('should block publishing with missing citations', () => {
      const validator = new CitationValidator();

      const citation: Citation = {
        id: 'cit-1',
        type: 'data',
        required: true,
        title: 'Test Dataset',
        license: StandardLicenses['MIT'],
        verified: false, // Not verified
      };

      const result = validator.validateForPublishing([citation]);

      expect(result.canPublish).toBe(false);
      expect(result.blockers.length).toBeGreaterThan(0);
      expect(result.missingCitations).toHaveLength(1);
    });

    it('should detect license incompatibilities', () => {
      const validator = new CitationValidator();

      const citations: Citation[] = [
        {
          id: 'cit-1',
          type: 'code',
          required: true,
          title: 'GPL Code',
          license: StandardLicenses['GPL-3.0'],
          verified: true,
          verifiedAt: new Date().toISOString(),
        },
        {
          id: 'cit-2',
          type: 'code',
          required: true,
          title: 'MIT Code',
          license: StandardLicenses['MIT'],
          verified: true,
          verifiedAt: new Date().toISOString(),
        },
      ];

      const result = validator.validateForPublishing(citations);

      expect(result.licenseIssues.length).toBeGreaterThan(0);
    });
  });

  describe('Disclosure Packager', () => {
    it('should create evidence wallet', async () => {
      const packager = DisclosurePackager.createWithGeneratedKeys();

      // Create test manifest
      const file1 = join(tempDir, 'test.txt');
      await fs.writeFile(file1, 'test data');

      const builder = new HashTreeBuilder('sha256');
      const hash = await builder.hashFile(file1);
      const tree = builder.buildMerkleTree([hash]);

      const manifest = {
        version: '1.0' as const,
        id: 'test-manifest',
        bundleId: 'test-bundle',
        hashTree: tree,
        modelCards: [],
        citations: [],
        licenses: [StandardLicenses['MIT']],
        metadata: {
          name: 'Test Bundle',
          description: 'Test',
          version: '1.0',
          createdAt: new Date().toISOString(),
          createdBy: 'test-user',
        },
        verification: {
          offlineVerifiable: true,
        },
        signature: 'test-signature',
        signatureAlgorithm: 'RSA-SHA256' as const,
        publicKey: 'test-key',
        createdAt: new Date().toISOString(),
        revocable: true,
        revocationCheckRequired: false,
      };

      const audience = AudienceScopes.public();

      const wallet = await packager.createWallet(manifest, {
        audience,
        artifacts: [file1],
      });

      expect(wallet.id).toBeTruthy();
      expect(wallet.bundleId).toBe('test-bundle');
      expect(wallet.audience).toEqual(audience);
      expect(wallet.signature).toBeTruthy();
    });

    it('should package wallet into distributable bundle', async () => {
      const packager = DisclosurePackager.createWithGeneratedKeys();

      const file1 = join(tempDir, 'test.txt');
      await fs.writeFile(file1, 'test data');

      const builder = new HashTreeBuilder('sha256');
      const hash = await builder.hashFile(file1);
      const tree = builder.buildMerkleTree([hash]);

      const manifest = {
        version: '1.0' as const,
        id: 'test-manifest',
        bundleId: 'test-bundle',
        hashTree: tree,
        modelCards: [],
        citations: [],
        licenses: [StandardLicenses['MIT']],
        metadata: {
          name: 'Test Bundle',
          description: 'Test',
          version: '1.0',
          createdAt: new Date().toISOString(),
          createdBy: 'test-user',
        },
        verification: {
          offlineVerifiable: true,
        },
        signature: 'test-signature',
        signatureAlgorithm: 'RSA-SHA256' as const,
        publicKey: 'test-key',
        createdAt: new Date().toISOString(),
        revocable: true,
        revocationCheckRequired: false,
      };

      const wallet = await packager.createWallet(manifest, {
        audience: AudienceScopes.public(),
        artifacts: [file1],
      });

      const outputPath = join(tempDir, 'wallet.zip');
      await packager.packageWallet(wallet, outputPath);

      const stats = await fs.stat(outputPath);
      expect(stats.isFile()).toBe(true);
      expect(stats.size).toBeGreaterThan(0);
    });
  });

  describe('Revocation Registry', () => {
    it('should revoke wallet', async () => {
      const registry = new RevocationRegistry({
        privateKey: keyPair.privateKey,
        publicKey: keyPair.publicKey,
        registryId: 'test-registry',
      });

      const wallet = {
        id: 'wallet-1',
        bundleId: 'bundle-1',
      } as any;

      const record = await registry.revokeWallet(wallet, {
        reason: 'compromised',
        revokedBy: 'admin',
        reasonDetail: 'Test revocation',
      });

      expect(record.id).toBeTruthy();
      expect(record.walletId).toBe('wallet-1');
      expect(record.reason).toBe('compromised');
      expect(record.signature).toBeTruthy();

      expect(registry.isWalletRevoked('wallet-1')).toBe(true);
    });

    it('should revoke bundle', async () => {
      const registry = new RevocationRegistry({
        privateKey: keyPair.privateKey,
        publicKey: keyPair.publicKey,
        registryId: 'test-registry',
      });

      const record = await registry.revokeBundle('bundle-1', {
        reason: 'withdrawn',
        revokedBy: 'admin',
      });

      expect(record.bundleId).toBe('bundle-1');
      expect(registry.isBundleRevoked('bundle-1')).toBe(true);
    });

    it('should export and import revocation list', async () => {
      const registry = new RevocationRegistry({
        privateKey: keyPair.privateKey,
        publicKey: keyPair.publicKey,
        registryId: 'test-registry',
      });

      await registry.revokeBundle('bundle-1', {
        reason: 'expired',
        revokedBy: 'system',
      });

      const exportPath = join(tempDir, 'revocations.json');
      await registry.exportRevocationList(exportPath);

      const newRegistry = new RevocationRegistry({
        privateKey: keyPair.privateKey,
        publicKey: keyPair.publicKey,
        registryId: 'test-registry-2',
      });

      await newRegistry.importRevocationList(exportPath);

      expect(newRegistry.isBundleRevoked('bundle-1')).toBe(true);
    });
  });

  describe('Bundle Verifier', () => {
    it('should verify valid bundle', async () => {
      const file1 = join(tempDir, 'test.txt');
      await fs.writeFile(file1, 'test data');

      const builder = new HashTreeBuilder('sha256');
      const hash = await builder.hashFile(file1);
      const tree = builder.buildMerkleTree([hash]);

      const citation: Citation = {
        id: 'cit-1',
        type: 'data',
        required: true,
        title: 'Test Data',
        license: StandardLicenses['MIT'],
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
        licenses: [StandardLicenses['MIT']],
      });

      expect(result.validation.canPublish).toBe(true);

      const verificationResult = await publisher.verifyBundle(result.manifest);

      expect(verificationResult.valid).toBe(true);
      expect(verificationResult.errors).toHaveLength(0);
      expect(verificationResult.checks.hashTreeValid).toBe(true);
      expect(verificationResult.checks.citationsComplete).toBe(true);
    });

    it('should detect invalid signature', async () => {
      const verifier = new BundleVerifier({
        checkRevocation: false,
      });

      const manifest = {
        version: '1.0' as const,
        id: 'test',
        bundleId: 'test',
        hashTree: {
          root: 'test',
          algorithm: 'sha256' as const,
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
        signatureAlgorithm: 'RSA-SHA256' as const,
        publicKey: keyPair.publicKey,
        createdAt: new Date().toISOString(),
        revocable: false,
        revocationCheckRequired: false,
      };

      const result = await verifier.verifyBundle(manifest);

      expect(result.valid).toBe(false);
      expect(result.checks.signatureValid).toBe(false);
    });

    it('should detect revoked bundle', async () => {
      const file1 = join(tempDir, 'test.txt');
      await fs.writeFile(file1, 'test data');

      const citation: Citation = {
        id: 'cit-1',
        type: 'data',
        required: true,
        title: 'Test Data',
        license: StandardLicenses['MIT'],
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
        licenses: [StandardLicenses['MIT']],
      });

      // Revoke the bundle
      await publisher.revokeBundle(
        result.manifest.bundleId,
        'withdrawn',
        'admin'
      );

      // Verify should now fail
      const verificationResult = await publisher.verifyBundle(result.manifest);

      expect(verificationResult.valid).toBe(false);
      expect(verificationResult.checks.notRevoked).toBe(false);
    });
  });

  describe('End-to-End Publishing', () => {
    it('should publish complete bundle with all components', async () => {
      // Create test artifacts
      const file1 = join(tempDir, 'data.json');
      await fs.writeFile(file1, JSON.stringify({ test: 'data' }));

      // Create citations
      const citations: Citation[] = [
        {
          id: 'cit-1',
          type: 'data',
          required: true,
          title: 'Test Dataset',
          organization: 'IntelGraph',
          license: StandardLicenses['Apache-2.0'],
          verified: true,
          verifiedAt: new Date().toISOString(),
          verificationMethod: 'manual',
        },
      ];

      // Create model card
      const modelCard = ModelCardGenerator.create(
        'model-1',
        'Test Model',
        'Test model card',
        'test-user'
      )
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
        licenses: [StandardLicenses['Apache-2.0']],
        complianceFrameworks: ['GDPR'],
        securityClassification: 'internal',
      });

      // Validate publication
      expect(result.validation.canPublish).toBe(true);
      expect(result.validation.blockers).toHaveLength(0);

      // Verify manifest structure
      expect(result.manifest.bundleId).toBeTruthy();
      expect(result.manifest.hashTree.root).toBeTruthy();
      expect(result.manifest.modelCards).toHaveLength(1);
      expect(result.manifest.citations).toHaveLength(1);
      expect(result.manifest.signature).toBeTruthy();

      // Verify bundle
      const verificationResult = await publisher.verifyBundle(result.manifest);
      expect(verificationResult.valid).toBe(true);
      expect(verificationResult.verifiedOffline).toBe(true);
    });

    it('should block publishing with missing citations', async () => {
      const file1 = join(tempDir, 'data.json');
      await fs.writeFile(file1, JSON.stringify({ test: 'data' }));

      const citations: Citation[] = [
        {
          id: 'cit-1',
          type: 'data',
          required: true,
          title: 'Test Dataset',
          license: StandardLicenses['MIT'],
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
        licenses: [StandardLicenses['MIT']],
      });

      expect(result.validation.canPublish).toBe(false);
      expect(result.validation.missingCitations).toHaveLength(1);
    });

    it('should create and verify audience-scoped wallets', async () => {
      const file1 = join(tempDir, 'data.json');
      await fs.writeFile(file1, JSON.stringify({ test: 'data' }));

      const citation: Citation = {
        id: 'cit-1',
        type: 'data',
        required: true,
        title: 'Test Data',
        license: StandardLicenses['MIT'],
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
        licenses: [StandardLicenses['MIT']],
      });

      // Create wallets for different audiences
      const publicWallet = await publisher.createWalletForAudience(
        result.manifest,
        AudienceScopes.public(),
        [file1],
        join(tempDir, 'public-wallet.zip')
      );

      const internalWallet = await publisher.createWalletForAudience(
        result.manifest,
        AudienceScopes.internal('IntelGraph'),
        [file1],
        join(tempDir, 'internal-wallet.zip')
      );

      expect(publicWallet.audience.maxSensitivity).toBe('public');
      expect(internalWallet.audience.maxSensitivity).toBe('internal');

      // Verify wallets
      const publicVerification = await publisher.verifyWallet(publicWallet);
      const internalVerification = await publisher.verifyWallet(internalWallet);

      expect(publicVerification.valid).toBe(true);
      expect(internalVerification.valid).toBe(true);
    });

    it('should propagate revocation across wallets', async () => {
      const file1 = join(tempDir, 'data.json');
      await fs.writeFile(file1, JSON.stringify({ test: 'data' }));

      const citation: Citation = {
        id: 'cit-1',
        type: 'data',
        required: true,
        title: 'Test Data',
        license: StandardLicenses['MIT'],
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
        licenses: [StandardLicenses['MIT']],
      });

      // Create multiple wallets
      const wallet1 = await publisher.createWalletForAudience(
        result.manifest,
        AudienceScopes.public(),
        [file1],
        join(tempDir, 'wallet1.zip')
      );

      const wallet2 = await publisher.createWalletForAudience(
        result.manifest,
        AudienceScopes.internal('IntelGraph'),
        [file1],
        join(tempDir, 'wallet2.zip')
      );

      // Revoke the entire bundle
      await publisher.revokeBundle(
        result.manifest.bundleId,
        'compromised',
        'admin',
        'Security incident'
      );

      // Both wallets should now fail verification
      const verification1 = await publisher.verifyWallet(wallet1);
      const verification2 = await publisher.verifyWallet(wallet2);

      expect(verification1.valid).toBe(false);
      expect(verification2.valid).toBe(false);
      expect(verification1.checks.notRevoked).toBe(false);
      expect(verification2.checks.notRevoked).toBe(false);
    });
  });
});
