/**
 * TAXII 2.1 Service E2E Tests
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { TaxiiService } from '../taxii-service.js';
import { createBundle } from '../bundle-serializer.js';
import { createProducerIdentity, getTlpMarking } from '../entity-mapper.js';
import type { StixBundle, StixObject } from '../types.js';

// Mock dependencies
const mockPg = {
  query: jest.fn().mockResolvedValue({ rows: [] }),
} as any;

const mockNeo4j = {
  session: jest.fn().mockReturnValue({
    executeRead: jest.fn().mockResolvedValue({ records: [] }),
    close: jest.fn().mockResolvedValue(undefined),
  }),
} as any;

describe('TAXII 2.1 Service E2E', () => {
  let taxiiService: TaxiiService;

  beforeEach(() => {
    taxiiService = new TaxiiService(
      {
        baseUrl: 'http://localhost:4000',
        title: 'Test TAXII Server',
        description: 'Test server for E2E tests',
        contact: 'test@example.com',
      },
      { pg: mockPg, neo4j: mockNeo4j },
    );
  });

  describe('Discovery Endpoints', () => {
    it('should return valid discovery document', () => {
      const discovery = taxiiService.getDiscoveryDocument();

      expect(discovery.title).toBe('Test TAXII Server');
      expect(discovery.description).toBe('Test server for E2E tests');
      expect(discovery.contact).toBe('test@example.com');
      expect(discovery.api_roots).toHaveLength(1);
      expect(discovery.api_roots[0]).toContain('/taxii2/api/');
    });

    it('should return valid API root information', () => {
      const apiRoot = taxiiService.getApiRootInfo();

      expect(apiRoot.title).toContain('Test TAXII Server');
      expect(apiRoot.versions).toContain('2.1');
      expect(apiRoot.max_content_length).toBeGreaterThan(0);
    });
  });

  describe('Collection Management', () => {
    it('should have default collection', () => {
      const collections = taxiiService.listCollections();

      expect(collections.length).toBeGreaterThanOrEqual(1);
      expect(collections.some(c => c.id === 'default')).toBe(true);
    });

    it('should register new collection', () => {
      taxiiService.registerCollection({
        id: 'test-collection',
        title: 'Test Collection',
        description: 'A test collection',
        canRead: true,
        canWrite: true,
      });

      const collection = taxiiService.getCollection('test-collection');

      expect(collection).toBeDefined();
      expect(collection?.title).toBe('Test Collection');
    });

    it('should return collection metadata', () => {
      const metadata = taxiiService.getCollectionMetadata('default');

      expect(metadata).toBeDefined();
      expect(metadata?.id).toBe('default');
      expect(metadata?.can_read).toBe(true);
      expect(metadata?.can_write).toBe(true);
      expect(metadata?.media_types).toContain('application/stix+json;version=2.1');
    });

    it('should return null for unknown collection', () => {
      const metadata = taxiiService.getCollectionMetadata('unknown');
      expect(metadata).toBeNull();
    });
  });

  describe('Object Storage', () => {
    let testBundle: StixBundle;

    beforeEach(() => {
      testBundle = createBundle([
        createProducerIdentity('Test Producer'),
        getTlpMarking('green'),
      ]);
    });

    it('should add objects to collection', () => {
      const status = taxiiService.addObjects('default', testBundle, 'user-1');

      expect(status.status).toBe('complete');
      expect(status.success_count).toBe(2);
      expect(status.failure_count).toBe(0);
    });

    it('should retrieve objects from collection', () => {
      taxiiService.addObjects('default', testBundle, 'user-1');

      const envelope = taxiiService.getObjects('default');

      expect(envelope.objects).toHaveLength(2);
    });

    it('should filter objects by type', () => {
      taxiiService.addObjects('default', testBundle, 'user-1');

      const envelope = taxiiService.getObjects('default', {
        type: ['identity'],
      });

      expect(envelope.objects).toHaveLength(1);
      expect(envelope.objects[0].type).toBe('identity');
    });

    it('should paginate results', () => {
      // Add many objects
      const objects: StixObject[] = Array.from({ length: 15 }, (_, i) =>
        createProducerIdentity(`Producer ${i}`),
      );
      const largeBundle = createBundle(objects);
      taxiiService.addObjects('default', largeBundle, 'user-1');

      // First page
      const page1 = taxiiService.getObjects('default', { limit: 10 });
      expect(page1.objects).toHaveLength(10);
      expect(page1.more).toBe(true);
      expect(page1.next).toBeDefined();

      // Second page
      const page2 = taxiiService.getObjects('default', {
        limit: 10,
        next: page1.next,
      });
      expect(page2.objects).toHaveLength(5);
      expect(page2.more).toBe(false);
    });

    it('should get object by ID', () => {
      taxiiService.addObjects('default', testBundle, 'user-1');

      const objectId = testBundle.objects[0].id;
      const envelope = taxiiService.getObject('default', objectId);

      expect(envelope).toBeDefined();
      expect(envelope?.objects).toHaveLength(1);
      expect(envelope?.objects[0].id).toBe(objectId);
    });

    it('should return null for unknown object', () => {
      const envelope = taxiiService.getObject('default', 'identity--unknown' as any);
      expect(envelope).toBeNull();
    });

    it('should delete object', () => {
      taxiiService.addObjects('default', testBundle, 'user-1');

      const objectId = testBundle.objects[0].id;
      const deleted = taxiiService.deleteObject('default', objectId, 'user-1');

      expect(deleted).toBe(true);

      const envelope = taxiiService.getObject('default', objectId);
      expect(envelope).toBeNull();
    });

    it('should return false when deleting unknown object', () => {
      const deleted = taxiiService.deleteObject('default', 'identity--unknown' as any, 'user-1');
      expect(deleted).toBe(false);
    });
  });

  describe('Manifest', () => {
    it('should return manifest for collection', () => {
      const bundle = createBundle([
        createProducerIdentity('Producer 1'),
        createProducerIdentity('Producer 2'),
      ]);
      taxiiService.addObjects('default', bundle, 'user-1');

      const manifest = taxiiService.getManifest('default');

      expect(manifest.objects).toHaveLength(2);
      expect(manifest.objects[0].id).toBeDefined();
      expect(manifest.objects[0].date_added).toBeDefined();
      expect(manifest.objects[0].version).toBeDefined();
      expect(manifest.objects[0].media_type).toBe('application/stix+json;version=2.1');
    });
  });

  describe('Status Tracking', () => {
    it('should track add operation status', () => {
      const bundle = createBundle([createProducerIdentity('Test')]);
      const addStatus = taxiiService.addObjects('default', bundle, 'user-1');

      const status = taxiiService.getStatus(addStatus.id);

      expect(status).toBeDefined();
      expect(status?.id).toBe(addStatus.id);
      expect(status?.status).toBe('complete');
    });

    it('should return null for unknown status', () => {
      const status = taxiiService.getStatus('unknown-status-id');
      expect(status).toBeNull();
    });
  });

  describe('Error Handling', () => {
    it('should throw for unknown collection on getObjects', () => {
      expect(() => taxiiService.getObjects('unknown')).toThrow('Collection not found');
    });

    it('should throw for read-only collection on addObjects', () => {
      taxiiService.registerCollection({
        id: 'read-only',
        title: 'Read Only Collection',
        canRead: true,
        canWrite: false,
      });

      const bundle = createBundle([createProducerIdentity('Test')]);

      expect(() =>
        taxiiService.addObjects('read-only', bundle, 'user-1'),
      ).toThrow('does not allow writing');
    });

    it('should throw for read-only collection on deleteObject', () => {
      taxiiService.registerCollection({
        id: 'read-only',
        title: 'Read Only Collection',
        canRead: true,
        canWrite: false,
      });

      expect(() =>
        taxiiService.deleteObject('read-only', 'identity--test' as any, 'user-1'),
      ).toThrow('does not allow writing');
    });
  });

  describe('Added After Filter', () => {
    it('should filter objects by added_after', async () => {
      const bundle1 = createBundle([createProducerIdentity('Producer 1')]);
      taxiiService.addObjects('default', bundle1, 'user-1');

      // Wait a bit to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 10));
      const midTime = new Date().toISOString();
      await new Promise(resolve => setTimeout(resolve, 10));

      const bundle2 = createBundle([createProducerIdentity('Producer 2')]);
      taxiiService.addObjects('default', bundle2, 'user-1');

      const envelope = taxiiService.getObjects('default', {
        addedAfter: midTime,
      });

      expect(envelope.objects).toHaveLength(1);
    });
  });
});

describe('TAXII 2.1 Compliance', () => {
  let taxiiService: TaxiiService;

  beforeEach(() => {
    taxiiService = new TaxiiService(
      {
        baseUrl: 'http://localhost:4000',
        title: 'Compliance Test Server',
      },
      { pg: mockPg, neo4j: mockNeo4j },
    );
  });

  it('should support TAXII 2.1 media types', () => {
    const metadata = taxiiService.getCollectionMetadata('default');

    expect(metadata?.media_types).toContain('application/stix+json;version=2.1');
    expect(metadata?.media_types).toContain('application/taxii+json;version=2.1');
  });

  it('should report TAXII 2.1 version', () => {
    const apiRoot = taxiiService.getApiRootInfo();

    expect(apiRoot.versions).toContain('2.1');
  });

  it('should enforce max_content_length', () => {
    const apiRoot = taxiiService.getApiRootInfo();

    expect(apiRoot.max_content_length).toBe(10_485_760); // 10MB default
  });
});
