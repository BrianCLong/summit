"use strict";
/**
 * TAXII 2.1 Service E2E Tests
 */
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const taxii_service_js_1 = require("../taxii-service.js");
const bundle_serializer_js_1 = require("../bundle-serializer.js");
const entity_mapper_js_1 = require("../entity-mapper.js");
// Mock dependencies
const mockPg = {
    query: globals_1.jest.fn().mockResolvedValue({ rows: [] }),
};
const mockNeo4j = {
    session: globals_1.jest.fn().mockReturnValue({
        executeRead: globals_1.jest.fn().mockResolvedValue({ records: [] }),
        close: globals_1.jest.fn().mockResolvedValue(undefined),
    }),
};
(0, globals_1.describe)('TAXII 2.1 Service E2E', () => {
    let taxiiService;
    (0, globals_1.beforeEach)(() => {
        taxiiService = new taxii_service_js_1.TaxiiService({
            baseUrl: 'http://localhost:4000',
            title: 'Test TAXII Server',
            description: 'Test server for E2E tests',
            contact: 'test@example.com',
        }, { pg: mockPg, neo4j: mockNeo4j });
    });
    (0, globals_1.describe)('Discovery Endpoints', () => {
        (0, globals_1.it)('should return valid discovery document', () => {
            const discovery = taxiiService.getDiscoveryDocument();
            (0, globals_1.expect)(discovery.title).toBe('Test TAXII Server');
            (0, globals_1.expect)(discovery.description).toBe('Test server for E2E tests');
            (0, globals_1.expect)(discovery.contact).toBe('test@example.com');
            (0, globals_1.expect)(discovery.api_roots).toHaveLength(1);
            (0, globals_1.expect)(discovery.api_roots[0]).toContain('/taxii2/api/');
        });
        (0, globals_1.it)('should return valid API root information', () => {
            const apiRoot = taxiiService.getApiRootInfo();
            (0, globals_1.expect)(apiRoot.title).toContain('Test TAXII Server');
            (0, globals_1.expect)(apiRoot.versions).toContain('2.1');
            (0, globals_1.expect)(apiRoot.max_content_length).toBeGreaterThan(0);
        });
    });
    (0, globals_1.describe)('Collection Management', () => {
        (0, globals_1.it)('should have default collection', () => {
            const collections = taxiiService.listCollections();
            (0, globals_1.expect)(collections.length).toBeGreaterThanOrEqual(1);
            (0, globals_1.expect)(collections.some(c => c.id === 'default')).toBe(true);
        });
        (0, globals_1.it)('should register new collection', () => {
            taxiiService.registerCollection({
                id: 'test-collection',
                title: 'Test Collection',
                description: 'A test collection',
                canRead: true,
                canWrite: true,
            });
            const collection = taxiiService.getCollection('test-collection');
            (0, globals_1.expect)(collection).toBeDefined();
            (0, globals_1.expect)(collection?.title).toBe('Test Collection');
        });
        (0, globals_1.it)('should return collection metadata', () => {
            const metadata = taxiiService.getCollectionMetadata('default');
            (0, globals_1.expect)(metadata).toBeDefined();
            (0, globals_1.expect)(metadata?.id).toBe('default');
            (0, globals_1.expect)(metadata?.can_read).toBe(true);
            (0, globals_1.expect)(metadata?.can_write).toBe(true);
            (0, globals_1.expect)(metadata?.media_types).toContain('application/stix+json;version=2.1');
        });
        (0, globals_1.it)('should return null for unknown collection', () => {
            const metadata = taxiiService.getCollectionMetadata('unknown');
            (0, globals_1.expect)(metadata).toBeNull();
        });
    });
    (0, globals_1.describe)('Object Storage', () => {
        let testBundle;
        (0, globals_1.beforeEach)(() => {
            testBundle = (0, bundle_serializer_js_1.createBundle)([
                (0, entity_mapper_js_1.createProducerIdentity)('Test Producer'),
                (0, entity_mapper_js_1.getTlpMarking)('green'),
            ]);
        });
        (0, globals_1.it)('should add objects to collection', () => {
            const status = taxiiService.addObjects('default', testBundle, 'user-1');
            (0, globals_1.expect)(status.status).toBe('complete');
            (0, globals_1.expect)(status.success_count).toBe(2);
            (0, globals_1.expect)(status.failure_count).toBe(0);
        });
        (0, globals_1.it)('should retrieve objects from collection', () => {
            taxiiService.addObjects('default', testBundle, 'user-1');
            const envelope = taxiiService.getObjects('default');
            (0, globals_1.expect)(envelope.objects).toHaveLength(2);
        });
        (0, globals_1.it)('should filter objects by type', () => {
            taxiiService.addObjects('default', testBundle, 'user-1');
            const envelope = taxiiService.getObjects('default', {
                type: ['identity'],
            });
            (0, globals_1.expect)(envelope.objects).toHaveLength(1);
            (0, globals_1.expect)(envelope.objects[0].type).toBe('identity');
        });
        (0, globals_1.it)('should paginate results', () => {
            // Add many objects
            const objects = Array.from({ length: 15 }, (_, i) => (0, entity_mapper_js_1.createProducerIdentity)(`Producer ${i}`));
            const largeBundle = (0, bundle_serializer_js_1.createBundle)(objects);
            taxiiService.addObjects('default', largeBundle, 'user-1');
            // First page
            const page1 = taxiiService.getObjects('default', { limit: 10 });
            (0, globals_1.expect)(page1.objects).toHaveLength(10);
            (0, globals_1.expect)(page1.more).toBe(true);
            (0, globals_1.expect)(page1.next).toBeDefined();
            // Second page
            const page2 = taxiiService.getObjects('default', {
                limit: 10,
                next: page1.next,
            });
            (0, globals_1.expect)(page2.objects).toHaveLength(5);
            (0, globals_1.expect)(page2.more).toBe(false);
        });
        (0, globals_1.it)('should get object by ID', () => {
            taxiiService.addObjects('default', testBundle, 'user-1');
            const objectId = testBundle.objects[0].id;
            const envelope = taxiiService.getObject('default', objectId);
            (0, globals_1.expect)(envelope).toBeDefined();
            (0, globals_1.expect)(envelope?.objects).toHaveLength(1);
            (0, globals_1.expect)(envelope?.objects[0].id).toBe(objectId);
        });
        (0, globals_1.it)('should return null for unknown object', () => {
            const envelope = taxiiService.getObject('default', 'identity--unknown');
            (0, globals_1.expect)(envelope).toBeNull();
        });
        (0, globals_1.it)('should delete object', () => {
            taxiiService.addObjects('default', testBundle, 'user-1');
            const objectId = testBundle.objects[0].id;
            const deleted = taxiiService.deleteObject('default', objectId, 'user-1');
            (0, globals_1.expect)(deleted).toBe(true);
            const envelope = taxiiService.getObject('default', objectId);
            (0, globals_1.expect)(envelope).toBeNull();
        });
        (0, globals_1.it)('should return false when deleting unknown object', () => {
            const deleted = taxiiService.deleteObject('default', 'identity--unknown', 'user-1');
            (0, globals_1.expect)(deleted).toBe(false);
        });
    });
    (0, globals_1.describe)('Manifest', () => {
        (0, globals_1.it)('should return manifest for collection', () => {
            const bundle = (0, bundle_serializer_js_1.createBundle)([
                (0, entity_mapper_js_1.createProducerIdentity)('Producer 1'),
                (0, entity_mapper_js_1.createProducerIdentity)('Producer 2'),
            ]);
            taxiiService.addObjects('default', bundle, 'user-1');
            const manifest = taxiiService.getManifest('default');
            (0, globals_1.expect)(manifest.objects).toHaveLength(2);
            (0, globals_1.expect)(manifest.objects[0].id).toBeDefined();
            (0, globals_1.expect)(manifest.objects[0].date_added).toBeDefined();
            (0, globals_1.expect)(manifest.objects[0].version).toBeDefined();
            (0, globals_1.expect)(manifest.objects[0].media_type).toBe('application/stix+json;version=2.1');
        });
    });
    (0, globals_1.describe)('Status Tracking', () => {
        (0, globals_1.it)('should track add operation status', () => {
            const bundle = (0, bundle_serializer_js_1.createBundle)([(0, entity_mapper_js_1.createProducerIdentity)('Test')]);
            const addStatus = taxiiService.addObjects('default', bundle, 'user-1');
            const status = taxiiService.getStatus(addStatus.id);
            (0, globals_1.expect)(status).toBeDefined();
            (0, globals_1.expect)(status?.id).toBe(addStatus.id);
            (0, globals_1.expect)(status?.status).toBe('complete');
        });
        (0, globals_1.it)('should return null for unknown status', () => {
            const status = taxiiService.getStatus('unknown-status-id');
            (0, globals_1.expect)(status).toBeNull();
        });
    });
    (0, globals_1.describe)('Error Handling', () => {
        (0, globals_1.it)('should throw for unknown collection on getObjects', () => {
            (0, globals_1.expect)(() => taxiiService.getObjects('unknown')).toThrow('Collection not found');
        });
        (0, globals_1.it)('should throw for read-only collection on addObjects', () => {
            taxiiService.registerCollection({
                id: 'read-only',
                title: 'Read Only Collection',
                canRead: true,
                canWrite: false,
            });
            const bundle = (0, bundle_serializer_js_1.createBundle)([(0, entity_mapper_js_1.createProducerIdentity)('Test')]);
            (0, globals_1.expect)(() => taxiiService.addObjects('read-only', bundle, 'user-1')).toThrow('does not allow writing');
        });
        (0, globals_1.it)('should throw for read-only collection on deleteObject', () => {
            taxiiService.registerCollection({
                id: 'read-only',
                title: 'Read Only Collection',
                canRead: true,
                canWrite: false,
            });
            (0, globals_1.expect)(() => taxiiService.deleteObject('read-only', 'identity--test', 'user-1')).toThrow('does not allow writing');
        });
    });
    (0, globals_1.describe)('Added After Filter', () => {
        (0, globals_1.it)('should filter objects by added_after', async () => {
            const bundle1 = (0, bundle_serializer_js_1.createBundle)([(0, entity_mapper_js_1.createProducerIdentity)('Producer 1')]);
            taxiiService.addObjects('default', bundle1, 'user-1');
            // Wait a bit to ensure different timestamps
            await new Promise(resolve => setTimeout(resolve, 10));
            const midTime = new Date().toISOString();
            await new Promise(resolve => setTimeout(resolve, 10));
            const bundle2 = (0, bundle_serializer_js_1.createBundle)([(0, entity_mapper_js_1.createProducerIdentity)('Producer 2')]);
            taxiiService.addObjects('default', bundle2, 'user-1');
            const envelope = taxiiService.getObjects('default', {
                addedAfter: midTime,
            });
            (0, globals_1.expect)(envelope.objects).toHaveLength(1);
        });
    });
});
(0, globals_1.describe)('TAXII 2.1 Compliance', () => {
    let taxiiService;
    (0, globals_1.beforeEach)(() => {
        taxiiService = new taxii_service_js_1.TaxiiService({
            baseUrl: 'http://localhost:4000',
            title: 'Compliance Test Server',
        }, { pg: mockPg, neo4j: mockNeo4j });
    });
    (0, globals_1.it)('should support TAXII 2.1 media types', () => {
        const metadata = taxiiService.getCollectionMetadata('default');
        (0, globals_1.expect)(metadata?.media_types).toContain('application/stix+json;version=2.1');
        (0, globals_1.expect)(metadata?.media_types).toContain('application/taxii+json;version=2.1');
    });
    (0, globals_1.it)('should report TAXII 2.1 version', () => {
        const apiRoot = taxiiService.getApiRootInfo();
        (0, globals_1.expect)(apiRoot.versions).toContain('2.1');
    });
    (0, globals_1.it)('should enforce max_content_length', () => {
        const apiRoot = taxiiService.getApiRootInfo();
        (0, globals_1.expect)(apiRoot.max_content_length).toBe(10_485_760); // 10MB default
    });
});
