/**
 * ManifestService Unit Tests
 */

import { ManifestService, type ManifestItem } from '../../src/services/ManifestService.js';
import type { EvidenceItem, ClaimItem } from '../../src/types/index.js';

describe('ManifestService', () => {
  let manifestService: ManifestService;

  beforeEach(() => {
    manifestService = new ManifestService();
  });

  describe('createManifest', () => {
    it('should create a valid manifest with items', () => {
      const items: ManifestItem[] = [
        {
          itemId: 'item-1',
          itemType: 'evidence',
          content: { id: 'item-1', data: 'test data 1' },
          path: 'evidence/0001_item-1.json',
        },
        {
          itemId: 'item-2',
          itemType: 'evidence',
          content: { id: 'item-2', data: 'test data 2' },
          path: 'evidence/0002_item-2.json',
        },
      ];

      const { manifest, rootHash } = manifestService.createManifest(
        'bundle-123',
        'evidence',
        items,
        'user-1',
        'provenance-chain-1',
      );

      expect(manifest.bundleId).toBe('bundle-123');
      expect(manifest.bundleType).toBe('evidence');
      expect(manifest.createdBy).toBe('user-1');
      expect(manifest.provenanceChainId).toBe('provenance-chain-1');
      expect(manifest.itemHashes).toHaveLength(2);
      expect(manifest.rootHash).toBe(rootHash);
      expect(manifest.signatures).toHaveLength(0);
    });

    it('should create empty manifest for no items', () => {
      const { manifest, rootHash } = manifestService.createManifest(
        'bundle-empty',
        'claim',
        [],
        'user-1',
        'provenance-chain-1',
      );

      expect(manifest.itemHashes).toHaveLength(0);
      expect(rootHash).toBeTruthy(); // Should have a hash for empty manifest
    });

    it('should produce deterministic hashes for same content', () => {
      const items: ManifestItem[] = [
        {
          itemId: 'item-1',
          itemType: 'evidence',
          content: { id: 'item-1', value: 42 },
          path: 'evidence/0001.json',
        },
      ];

      const result1 = manifestService.createManifest(
        'bundle-1',
        'evidence',
        items,
        'user-1',
        'prov-1',
      );

      const result2 = manifestService.createManifest(
        'bundle-1',
        'evidence',
        items,
        'user-1',
        'prov-1',
      );

      expect(result1.manifest.itemHashes[0].contentHash).toBe(
        result2.manifest.itemHashes[0].contentHash,
      );
    });
  });

  describe('signManifest', () => {
    it('should sign a manifest and return a valid signature', () => {
      const items: ManifestItem[] = [
        {
          itemId: 'item-1',
          itemType: 'evidence',
          content: { id: 'item-1' },
          path: 'evidence/0001.json',
        },
      ];

      const { manifest } = manifestService.createManifest(
        'bundle-1',
        'evidence',
        items,
        'user-1',
        'prov-1',
      );

      const keys = manifestService.generateSigningKeys();

      const signature = manifestService.signManifest(
        manifest,
        'signer-1',
        'reviewer',
        keys.privateKey,
        keys.keyId,
      );

      expect(signature.signerId).toBe('signer-1');
      expect(signature.signerRole).toBe('reviewer');
      expect(signature.algorithm).toBe('ed25519');
      expect(signature.signature).toBeTruthy();
      expect(signature.keyId).toBe(keys.keyId);
    });
  });

  describe('verifyManifest', () => {
    it('should verify a valid manifest', () => {
      const items: ManifestItem[] = [
        {
          itemId: 'item-1',
          itemType: 'evidence',
          content: { id: 'item-1', data: 'test' },
          path: 'evidence/0001.json',
        },
        {
          itemId: 'item-2',
          itemType: 'evidence',
          content: { id: 'item-2', data: 'test2' },
          path: 'evidence/0002.json',
        },
      ];

      const { manifest } = manifestService.createManifest(
        'bundle-1',
        'evidence',
        items,
        'user-1',
        'prov-1',
      );

      const keys = manifestService.generateSigningKeys();
      const signature = manifestService.signManifest(
        manifest,
        'signer-1',
        'reviewer',
        keys.privateKey,
        keys.keyId,
      );
      manifest.signatures.push(signature);

      const publicKeys = new Map([[keys.keyId, keys.publicKey]]);
      const result = manifestService.verifyManifest(manifest, items, publicKeys);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.itemCount).toBe(2);
    });

    it('should detect missing items', () => {
      const items: ManifestItem[] = [
        {
          itemId: 'item-1',
          itemType: 'evidence',
          content: { id: 'item-1' },
          path: 'evidence/0001.json',
        },
      ];

      const { manifest } = manifestService.createManifest(
        'bundle-1',
        'evidence',
        items,
        'user-1',
        'prov-1',
      );

      // Verify with empty items (simulating missing)
      const result = manifestService.verifyManifest(manifest, [], new Map());

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing item: item-1');
    });

    it('should detect tampered content', () => {
      const items: ManifestItem[] = [
        {
          itemId: 'item-1',
          itemType: 'evidence',
          content: { id: 'item-1', data: 'original' },
          path: 'evidence/0001.json',
        },
      ];

      const { manifest } = manifestService.createManifest(
        'bundle-1',
        'evidence',
        items,
        'user-1',
        'prov-1',
      );

      // Tamper with content
      const tamperedItems: ManifestItem[] = [
        {
          itemId: 'item-1',
          itemType: 'evidence',
          content: { id: 'item-1', data: 'tampered' },
          path: 'evidence/0001.json',
        },
      ];

      const result = manifestService.verifyManifest(manifest, tamperedItems, new Map());

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('Hash mismatch'))).toBe(true);
    });
  });

  describe('evidenceToManifestItems', () => {
    it('should convert evidence items to manifest items', () => {
      const evidence: EvidenceItem[] = [
        {
          id: 'ev-1',
          type: 'document',
          title: 'Test Document',
          sourceUri: 'file://test.pdf',
          contentHash: 'abc123',
          mimeType: 'application/pdf',
          sizeBytes: 1024,
          collectedAt: '2024-01-01T00:00:00Z',
          collectedBy: 'user-1',
          chainOfCustodyHash: 'def456',
          classificationLevel: 'CONFIDENTIAL',
          sensitivityMarkings: [],
          licenseType: 'INTERNAL_USE_ONLY',
          metadata: {},
        },
      ];

      const manifestItems = manifestService.evidenceToManifestItems(evidence);

      expect(manifestItems).toHaveLength(1);
      expect(manifestItems[0].itemId).toBe('ev-1');
      expect(manifestItems[0].itemType).toBe('evidence');
      expect(manifestItems[0].path).toMatch(/^evidence\/\d+_ev-1\.json$/);
    });
  });

  describe('claimsToManifestItems', () => {
    it('should convert claim items to manifest items', () => {
      const claims: ClaimItem[] = [
        {
          id: 'claim-1',
          statement: 'Test claim statement',
          confidence: 0.85,
          source: 'human',
          createdBy: 'analyst-1',
          createdAt: '2024-01-01T00:00:00Z',
          supportingEvidenceIds: ['ev-1'],
          contradictingEvidenceIds: [],
          status: 'approved',
          provenanceHash: 'hash123',
          entityRefs: [],
          tags: ['test'],
        },
      ];

      const manifestItems = manifestService.claimsToManifestItems(claims);

      expect(manifestItems).toHaveLength(1);
      expect(manifestItems[0].itemId).toBe('claim-1');
      expect(manifestItems[0].itemType).toBe('claim');
      expect(manifestItems[0].path).toMatch(/^claims\/\d+_claim-1\.json$/);
    });
  });

  describe('hashContent', () => {
    it('should produce consistent hashes for same content', () => {
      const content = { key: 'value', nested: { array: [1, 2, 3] } };

      const hash1 = manifestService.hashContent(content);
      const hash2 = manifestService.hashContent(content);

      expect(hash1).toBe(hash2);
    });

    it('should produce different hashes for different content', () => {
      const content1 = { key: 'value1' };
      const content2 = { key: 'value2' };

      const hash1 = manifestService.hashContent(content1);
      const hash2 = manifestService.hashContent(content2);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('computeChainHash', () => {
    it('should compute chain hash correctly', () => {
      const prevHash = 'GENESIS';
      const payload = { event: 'test', timestamp: '2024-01-01' };

      const hash = manifestService.computeChainHash(prevHash, payload);

      expect(hash).toBeTruthy();
      expect(hash).toHaveLength(64); // SHA-256 produces 64 hex chars
    });

    it('should produce different hashes for different prevHash', () => {
      const payload = { event: 'test' };

      const hash1 = manifestService.computeChainHash('prev1', payload);
      const hash2 = manifestService.computeChainHash('prev2', payload);

      expect(hash1).not.toBe(hash2);
    });
  });
});
