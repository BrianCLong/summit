"use strict";
/**
 * STIX Bundle Serializer Tests
 */
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const bundle_serializer_js_1 = require("../bundle-serializer.js");
const entity_mapper_js_1 = require("../entity-mapper.js");
(0, globals_1.describe)('STIX Bundle Serializer', () => {
    (0, globals_1.describe)('createBundle', () => {
        (0, globals_1.it)('should create a valid STIX 2.1 bundle', () => {
            const identity = (0, entity_mapper_js_1.createProducerIdentity)('Test Producer');
            const objects = [identity];
            const bundle = (0, bundle_serializer_js_1.createBundle)(objects);
            (0, globals_1.expect)(bundle.type).toBe('bundle');
            (0, globals_1.expect)(bundle.id).toMatch(/^bundle--[0-9a-f-]{36}$/);
            (0, globals_1.expect)(bundle.objects).toHaveLength(1);
            (0, globals_1.expect)(bundle.objects[0]).toBe(identity);
        });
        (0, globals_1.it)('should create bundle with multiple objects', () => {
            const identity = (0, entity_mapper_js_1.createProducerIdentity)('Test Producer');
            const tlpMarking = (0, entity_mapper_js_1.getTlpMarking)('green');
            const objects = [identity, tlpMarking];
            const bundle = (0, bundle_serializer_js_1.createBundle)(objects);
            (0, globals_1.expect)(bundle.objects).toHaveLength(2);
        });
    });
    (0, globals_1.describe)('calculateBundleChecksum', () => {
        (0, globals_1.it)('should calculate SHA-256 checksum', () => {
            const bundle = (0, bundle_serializer_js_1.createBundle)([(0, entity_mapper_js_1.createProducerIdentity)('Test')]);
            const checksum = (0, bundle_serializer_js_1.calculateBundleChecksum)(bundle);
            (0, globals_1.expect)(checksum).toMatch(/^[0-9a-f]{64}$/);
        });
        (0, globals_1.it)('should produce consistent checksum for same bundle', () => {
            const identity = (0, entity_mapper_js_1.createProducerIdentity)('Test');
            // Create bundles with same content but different IDs won't work
            // So we use the same bundle
            const bundle = (0, bundle_serializer_js_1.createBundle)([identity]);
            const checksum1 = (0, bundle_serializer_js_1.calculateBundleChecksum)(bundle);
            const checksum2 = (0, bundle_serializer_js_1.calculateBundleChecksum)(bundle);
            (0, globals_1.expect)(checksum1).toBe(checksum2);
        });
    });
    (0, globals_1.describe)('signBundle / verifyBundleSignature', () => {
        const signingKey = 'test-signing-key-for-bundle-tests';
        (0, globals_1.it)('should sign and verify a bundle', () => {
            const bundle = (0, bundle_serializer_js_1.createBundle)([(0, entity_mapper_js_1.createProducerIdentity)('Test')]);
            const { signature, algorithm } = (0, bundle_serializer_js_1.signBundle)(bundle, signingKey);
            (0, globals_1.expect)(signature).toBeTruthy();
            (0, globals_1.expect)(algorithm).toBe('HMAC-SHA256');
            const isValid = (0, bundle_serializer_js_1.verifyBundleSignature)(bundle, signature, signingKey);
            (0, globals_1.expect)(isValid).toBe(true);
        });
        (0, globals_1.it)('should fail verification with wrong key', () => {
            const bundle = (0, bundle_serializer_js_1.createBundle)([(0, entity_mapper_js_1.createProducerIdentity)('Test')]);
            const { signature } = (0, bundle_serializer_js_1.signBundle)(bundle, signingKey);
            const isValid = (0, bundle_serializer_js_1.verifyBundleSignature)(bundle, signature, 'wrong-key');
            (0, globals_1.expect)(isValid).toBe(false);
        });
        (0, globals_1.it)('should fail verification with modified bundle', () => {
            const bundle = (0, bundle_serializer_js_1.createBundle)([(0, entity_mapper_js_1.createProducerIdentity)('Test')]);
            const { signature } = (0, bundle_serializer_js_1.signBundle)(bundle, signingKey);
            // Modify bundle
            bundle.objects.push((0, entity_mapper_js_1.createProducerIdentity)('Modified'));
            const isValid = (0, bundle_serializer_js_1.verifyBundleSignature)(bundle, signature, signingKey);
            (0, globals_1.expect)(isValid).toBe(false);
        });
    });
    (0, globals_1.describe)('serializeBundleToJson / parseBundleFromJson', () => {
        (0, globals_1.it)('should serialize and parse bundle', () => {
            const original = (0, bundle_serializer_js_1.createBundle)([(0, entity_mapper_js_1.createProducerIdentity)('Test')]);
            const json = (0, bundle_serializer_js_1.serializeBundleToJson)(original);
            const parsed = (0, bundle_serializer_js_1.parseBundleFromJson)(json);
            (0, globals_1.expect)(parsed.type).toBe(original.type);
            (0, globals_1.expect)(parsed.id).toBe(original.id);
            (0, globals_1.expect)(parsed.objects).toHaveLength(original.objects.length);
        });
        (0, globals_1.it)('should throw on invalid bundle JSON', () => {
            (0, globals_1.expect)(() => (0, bundle_serializer_js_1.parseBundleFromJson)('{"type": "invalid"}')).toThrow('Invalid STIX bundle');
            (0, globals_1.expect)(() => (0, bundle_serializer_js_1.parseBundleFromJson)('{"type": "bundle", "id": "invalid"}')).toThrow('Invalid STIX bundle');
        });
    });
    (0, globals_1.describe)('validateBundle', () => {
        (0, globals_1.it)('should validate a correct bundle', () => {
            const bundle = (0, bundle_serializer_js_1.createBundle)([
                (0, entity_mapper_js_1.createProducerIdentity)('Test'),
                (0, entity_mapper_js_1.getTlpMarking)('green'),
            ]);
            const result = (0, bundle_serializer_js_1.validateBundle)(bundle);
            (0, globals_1.expect)(result.valid).toBe(true);
            (0, globals_1.expect)(result.errors).toHaveLength(0);
            (0, globals_1.expect)(result.statistics.totalObjects).toBe(2);
            (0, globals_1.expect)(result.statistics.hasProducerIdentity).toBe(true);
            (0, globals_1.expect)(result.statistics.hasTlpMarking).toBe(true);
        });
        (0, globals_1.it)('should detect missing producer identity', () => {
            const bundle = (0, bundle_serializer_js_1.createBundle)([(0, entity_mapper_js_1.getTlpMarking)('green')]);
            const result = (0, bundle_serializer_js_1.validateBundle)(bundle);
            (0, globals_1.expect)(result.warnings).toContain('Bundle does not contain a producer identity');
        });
        (0, globals_1.it)('should detect duplicate object IDs', () => {
            const identity = (0, entity_mapper_js_1.createProducerIdentity)('Test');
            const bundle = (0, bundle_serializer_js_1.createBundle)([identity, identity]);
            const result = (0, bundle_serializer_js_1.validateBundle)(bundle);
            (0, globals_1.expect)(result.warnings.some(w => w.includes('Duplicate object ID'))).toBe(true);
        });
    });
    (0, globals_1.describe)('mergeBundles', () => {
        (0, globals_1.it)('should merge multiple bundles', () => {
            const bundle1 = (0, bundle_serializer_js_1.createBundle)([(0, entity_mapper_js_1.createProducerIdentity)('Producer 1')]);
            const bundle2 = (0, bundle_serializer_js_1.createBundle)([(0, entity_mapper_js_1.createProducerIdentity)('Producer 2')]);
            const merged = (0, bundle_serializer_js_1.mergeBundles)([bundle1, bundle2]);
            (0, globals_1.expect)(merged.objects).toHaveLength(2);
        });
        (0, globals_1.it)('should deduplicate objects by ID', () => {
            const identity = (0, entity_mapper_js_1.createProducerIdentity)('Test');
            const bundle1 = (0, bundle_serializer_js_1.createBundle)([identity]);
            const bundle2 = (0, bundle_serializer_js_1.createBundle)([identity]);
            const merged = (0, bundle_serializer_js_1.mergeBundles)([bundle1, bundle2]);
            (0, globals_1.expect)(merged.objects).toHaveLength(1);
        });
    });
    (0, globals_1.describe)('splitBundle', () => {
        (0, globals_1.it)('should split large bundle into chunks', () => {
            const objects = Array.from({ length: 25 }, (_, i) => (0, entity_mapper_js_1.createProducerIdentity)(`Producer ${i}`));
            const bundle = (0, bundle_serializer_js_1.createBundle)(objects);
            const chunks = (0, bundle_serializer_js_1.splitBundle)(bundle, 10);
            (0, globals_1.expect)(chunks).toHaveLength(3);
            (0, globals_1.expect)(chunks[0].objects).toHaveLength(10);
            (0, globals_1.expect)(chunks[1].objects).toHaveLength(10);
            (0, globals_1.expect)(chunks[2].objects).toHaveLength(5);
        });
    });
    (0, globals_1.describe)('filterBundleByType', () => {
        (0, globals_1.it)('should filter objects by type', () => {
            const identity = (0, entity_mapper_js_1.createProducerIdentity)('Test');
            const tlpMarking = (0, entity_mapper_js_1.getTlpMarking)('green');
            const bundle = (0, bundle_serializer_js_1.createBundle)([identity, tlpMarking]);
            const filtered = (0, bundle_serializer_js_1.filterBundleByType)(bundle, ['identity']);
            (0, globals_1.expect)(filtered.objects).toHaveLength(1);
            (0, globals_1.expect)(filtered.objects[0].type).toBe('identity');
        });
    });
});
(0, globals_1.describe)('Entity Mapper', () => {
    (0, globals_1.describe)('mapEntityToStix', () => {
        (0, globals_1.it)('should map person entity to identity', () => {
            const entity = {
                id: '123e4567-e89b-12d3-a456-426614174000',
                tenantId: 'tenant-1',
                kind: 'person',
                labels: ['analyst'],
                props: { name: 'John Doe', email: 'john@example.com' },
                createdAt: new Date(),
                updatedAt: new Date(),
                createdBy: 'user-1',
            };
            const result = (0, entity_mapper_js_1.mapEntityToStix)(entity);
            (0, globals_1.expect)(result.stixType).toBe('identity');
            (0, globals_1.expect)(result.stixObject.name).toBe('John Doe');
            (0, globals_1.expect)(result.stixObject.identity_class).toBe('individual');
        });
        (0, globals_1.it)('should map organization entity to identity', () => {
            const entity = {
                id: '123e4567-e89b-12d3-a456-426614174001',
                tenantId: 'tenant-1',
                kind: 'organization',
                labels: ['vendor'],
                props: { name: 'Acme Corp', sectors: ['technology'] },
                createdAt: new Date(),
                updatedAt: new Date(),
                createdBy: 'user-1',
            };
            const result = (0, entity_mapper_js_1.mapEntityToStix)(entity);
            (0, globals_1.expect)(result.stixType).toBe('identity');
            (0, globals_1.expect)(result.stixObject.identity_class).toBe('organization');
        });
        (0, globals_1.it)('should map indicator entity with IOC pattern', () => {
            const entity = {
                id: '123e4567-e89b-12d3-a456-426614174002',
                tenantId: 'tenant-1',
                kind: 'indicator',
                labels: ['malicious-ip'],
                props: {
                    name: 'Malicious IP',
                    ioc_type: 'ipv4',
                    ioc_value: '192.168.1.100',
                },
                createdAt: new Date(),
                updatedAt: new Date(),
                createdBy: 'user-1',
            };
            const result = (0, entity_mapper_js_1.mapEntityToStix)(entity);
            (0, globals_1.expect)(result.stixType).toBe('indicator');
            (0, globals_1.expect)(result.stixObject.pattern).toBe("[ipv4-addr:value = '192.168.1.100']");
        });
        (0, globals_1.it)('should include IntelGraph extension when enabled', () => {
            const entity = {
                id: '123e4567-e89b-12d3-a456-426614174003',
                tenantId: 'tenant-1',
                kind: 'person',
                labels: [],
                props: { name: 'Test' },
                createdAt: new Date(),
                updatedAt: new Date(),
                createdBy: 'user-1',
            };
            const result = (0, entity_mapper_js_1.mapEntityToStix)(entity, { includeExtensions: true });
            (0, globals_1.expect)(result.stixObject.extensions).toBeDefined();
        });
    });
});
