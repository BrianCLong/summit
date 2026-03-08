"use strict";
/**
 * STIX Signing Service Tests
 */
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const signing_js_1 = require("../signing.js");
const bundle_serializer_js_1 = require("../bundle-serializer.js");
const entity_mapper_js_1 = require("../entity-mapper.js");
(0, globals_1.describe)('STIX Signing Service', () => {
    let signingService;
    let testBundle;
    (0, globals_1.beforeEach)(() => {
        signingService = new signing_js_1.StixSigningService({
            signingKey: 'test-signing-key-12345',
            keyId: 'test-key-001',
        });
        testBundle = (0, bundle_serializer_js_1.createBundle)([(0, entity_mapper_js_1.createProducerIdentity)('Test Producer')]);
    });
    (0, globals_1.describe)('signBundle', () => {
        (0, globals_1.it)('should create a detached signature', () => {
            const signature = signingService.signBundle(testBundle);
            (0, globals_1.expect)(signature.signature).toBeTruthy();
            (0, globals_1.expect)(signature.metadata.algorithm).toBe('HMAC-SHA256');
            (0, globals_1.expect)(signature.metadata.keyId).toBe('test-key-001');
            (0, globals_1.expect)(signature.metadata.bundleId).toBe(testBundle.id);
            (0, globals_1.expect)(signature.metadata.bundleChecksum).toMatch(/^[0-9a-f]{64}$/);
            (0, globals_1.expect)(signature.encodedMetadata).toBeTruthy();
        });
        (0, globals_1.it)('should include producer identity in metadata', () => {
            const signature = signingService.signBundle(testBundle, {
                producerIdentity: 'user-123',
            });
            (0, globals_1.expect)(signature.metadata.producerIdentity).toBe('user-123');
        });
        (0, globals_1.it)('should support signature chaining', () => {
            const sig1 = signingService.signBundle(testBundle);
            const sig2 = signingService.signBundle(testBundle, {
                chainPrevious: sig1.signature,
            });
            (0, globals_1.expect)(sig2.metadata.chainPrevious).toBe(sig1.signature);
        });
    });
    (0, globals_1.describe)('verifySignature', () => {
        (0, globals_1.it)('should verify a valid signature', () => {
            const signature = signingService.signBundle(testBundle);
            const result = signingService.verifySignature(testBundle, signature);
            (0, globals_1.expect)(result.valid).toBe(true);
            (0, globals_1.expect)(result.errors).toHaveLength(0);
            (0, globals_1.expect)(result.metadata).toBeDefined();
        });
        (0, globals_1.it)('should reject modified bundle', () => {
            const signature = signingService.signBundle(testBundle);
            // Modify bundle after signing
            testBundle.objects.push((0, entity_mapper_js_1.createProducerIdentity)('Attacker'));
            const result = signingService.verifySignature(testBundle, signature);
            (0, globals_1.expect)(result.valid).toBe(false);
            (0, globals_1.expect)(result.errors.some(e => e.includes('checksum'))).toBe(true);
        });
        (0, globals_1.it)('should reject wrong key ID', () => {
            const signature = signingService.signBundle(testBundle);
            // Tamper with key ID
            signature.metadata.keyId = 'wrong-key';
            const result = signingService.verifySignature(testBundle, signature);
            (0, globals_1.expect)(result.valid).toBe(false);
            (0, globals_1.expect)(result.errors.some(e => e.includes('Key ID mismatch'))).toBe(true);
        });
        (0, globals_1.it)('should reject wrong bundle ID', () => {
            const signature = signingService.signBundle(testBundle);
            // Create new bundle with different ID
            const differentBundle = (0, bundle_serializer_js_1.createBundle)([(0, entity_mapper_js_1.createProducerIdentity)('Different')]);
            const result = signingService.verifySignature(differentBundle, signature);
            (0, globals_1.expect)(result.valid).toBe(false);
            (0, globals_1.expect)(result.errors.some(e => e.includes('Bundle ID mismatch'))).toBe(true);
        });
    });
    (0, globals_1.describe)('createSignedBundle / verifySignedBundle', () => {
        (0, globals_1.it)('should create and verify signed bundle', () => {
            const signedBundle = signingService.createSignedBundle(testBundle);
            (0, globals_1.expect)(signedBundle.bundle).toBe(testBundle);
            (0, globals_1.expect)(signedBundle.signature).toBeDefined();
            const result = signingService.verifySignedBundle(signedBundle);
            (0, globals_1.expect)(result.valid).toBe(true);
        });
    });
    (0, globals_1.describe)('Air-Gap Package', () => {
        (0, globals_1.it)('should create air-gap package with multiple bundles', () => {
            const bundle1 = (0, bundle_serializer_js_1.createBundle)([(0, entity_mapper_js_1.createProducerIdentity)('Producer 1')]);
            const bundle2 = (0, bundle_serializer_js_1.createBundle)([(0, entity_mapper_js_1.createProducerIdentity)('Producer 2')]);
            const pkg = signingService.createAirGapPackage([bundle1, bundle2]);
            (0, globals_1.expect)(pkg.version).toBe('1.0');
            (0, globals_1.expect)(pkg.format).toBe('stix-bundle-signed');
            (0, globals_1.expect)(pkg.bundles).toHaveLength(2);
            (0, globals_1.expect)(pkg.manifest.totalBundles).toBe(2);
            (0, globals_1.expect)(pkg.manifest.totalObjects).toBe(2);
            (0, globals_1.expect)(pkg.manifest.checksums).toHaveLength(2);
        });
        (0, globals_1.it)('should chain signatures in air-gap package', () => {
            const bundle1 = (0, bundle_serializer_js_1.createBundle)([(0, entity_mapper_js_1.createProducerIdentity)('Producer 1')]);
            const bundle2 = (0, bundle_serializer_js_1.createBundle)([(0, entity_mapper_js_1.createProducerIdentity)('Producer 2')]);
            const pkg = signingService.createAirGapPackage([bundle1, bundle2]);
            // First bundle has no chain previous
            (0, globals_1.expect)(pkg.bundles[0].signature.metadata.chainPrevious).toBeUndefined();
            // Second bundle chains to first
            (0, globals_1.expect)(pkg.bundles[1].signature.metadata.chainPrevious).toBe(pkg.bundles[0].signature.signature);
        });
        (0, globals_1.it)('should verify valid air-gap package', () => {
            const bundle1 = (0, bundle_serializer_js_1.createBundle)([(0, entity_mapper_js_1.createProducerIdentity)('Producer 1')]);
            const bundle2 = (0, bundle_serializer_js_1.createBundle)([(0, entity_mapper_js_1.createProducerIdentity)('Producer 2')]);
            const pkg = signingService.createAirGapPackage([bundle1, bundle2]);
            const result = signingService.verifyAirGapPackage(pkg);
            (0, globals_1.expect)(result.valid).toBe(true);
            (0, globals_1.expect)(result.manifestValid).toBe(true);
            (0, globals_1.expect)(result.bundleResults).toHaveLength(2);
            (0, globals_1.expect)(result.bundleResults.every(r => r.valid)).toBe(true);
        });
        (0, globals_1.it)('should detect broken signature chain', () => {
            const bundle1 = (0, bundle_serializer_js_1.createBundle)([(0, entity_mapper_js_1.createProducerIdentity)('Producer 1')]);
            const bundle2 = (0, bundle_serializer_js_1.createBundle)([(0, entity_mapper_js_1.createProducerIdentity)('Producer 2')]);
            const pkg = signingService.createAirGapPackage([bundle1, bundle2]);
            // Break the chain
            pkg.bundles[1].signature.metadata.chainPrevious = 'broken-signature';
            const result = signingService.verifyAirGapPackage(pkg);
            (0, globals_1.expect)(result.valid).toBe(false);
            (0, globals_1.expect)(result.errors.some(e => e.includes('chain broken'))).toBe(true);
        });
        (0, globals_1.it)('should detect manifest tampering', () => {
            const bundle1 = (0, bundle_serializer_js_1.createBundle)([(0, entity_mapper_js_1.createProducerIdentity)('Producer 1')]);
            const pkg = signingService.createAirGapPackage([bundle1]);
            // Tamper with manifest
            pkg.manifest.totalBundles = 5;
            const result = signingService.verifyAirGapPackage(pkg);
            (0, globals_1.expect)(result.valid).toBe(false);
            (0, globals_1.expect)(result.manifestValid).toBe(false);
        });
    });
    (0, globals_1.describe)('serializeAirGapPackage / parseAirGapPackage', () => {
        (0, globals_1.it)('should serialize and parse air-gap package', () => {
            const bundle = (0, bundle_serializer_js_1.createBundle)([(0, entity_mapper_js_1.createProducerIdentity)('Test')]);
            const pkg = signingService.createAirGapPackage([bundle]);
            const serialized = (0, signing_js_1.serializeAirGapPackage)(pkg);
            const parsed = (0, signing_js_1.parseAirGapPackage)(serialized);
            (0, globals_1.expect)(parsed.version).toBe(pkg.version);
            (0, globals_1.expect)(parsed.format).toBe(pkg.format);
            (0, globals_1.expect)(parsed.bundles).toHaveLength(1);
        });
        (0, globals_1.it)('should throw on invalid package version', () => {
            const invalid = JSON.stringify({ version: '2.0', format: 'stix-bundle-signed' });
            (0, globals_1.expect)(() => (0, signing_js_1.parseAirGapPackage)(invalid)).toThrow('Unsupported package version');
        });
        (0, globals_1.it)('should throw on invalid package format', () => {
            const invalid = JSON.stringify({ version: '1.0', format: 'invalid' });
            (0, globals_1.expect)(() => (0, signing_js_1.parseAirGapPackage)(invalid)).toThrow('Unsupported package format');
        });
    });
    (0, globals_1.describe)('generateSigningKey', () => {
        (0, globals_1.it)('should generate secure random key', () => {
            const key1 = (0, signing_js_1.generateSigningKey)();
            const key2 = (0, signing_js_1.generateSigningKey)();
            (0, globals_1.expect)(key1).not.toBe(key2);
            (0, globals_1.expect)(key1.length).toBeGreaterThan(20);
        });
        (0, globals_1.it)('should generate key of specified length', () => {
            const key16 = (0, signing_js_1.generateSigningKey)(16);
            const key64 = (0, signing_js_1.generateSigningKey)(64);
            // Base64url encoding increases length by ~33%
            (0, globals_1.expect)(key64.length).toBeGreaterThan(key16.length);
        });
    });
    (0, globals_1.describe)('calculatePackageIntegrity', () => {
        (0, globals_1.it)('should calculate package integrity hash', () => {
            const bundle = (0, bundle_serializer_js_1.createBundle)([(0, entity_mapper_js_1.createProducerIdentity)('Test')]);
            const pkg = signingService.createAirGapPackage([bundle]);
            const hash = (0, signing_js_1.calculatePackageIntegrity)(pkg);
            (0, globals_1.expect)(hash).toMatch(/^[0-9a-f]{64}$/);
        });
        (0, globals_1.it)('should detect package modifications', () => {
            const bundle = (0, bundle_serializer_js_1.createBundle)([(0, entity_mapper_js_1.createProducerIdentity)('Test')]);
            const pkg = signingService.createAirGapPackage([bundle]);
            const hash1 = (0, signing_js_1.calculatePackageIntegrity)(pkg);
            // Modify package
            pkg.manifest.totalObjects = 999;
            const hash2 = (0, signing_js_1.calculatePackageIntegrity)(pkg);
            (0, globals_1.expect)(hash1).not.toBe(hash2);
        });
    });
});
(0, globals_1.describe)('HMAC Algorithm Variants', () => {
    (0, globals_1.it)('should support HMAC-SHA384', () => {
        const service = new signing_js_1.StixSigningService({
            signingKey: 'test-key',
            algorithm: 'HMAC-SHA384',
        });
        const bundle = (0, bundle_serializer_js_1.createBundle)([(0, entity_mapper_js_1.createProducerIdentity)('Test')]);
        const signature = service.signBundle(bundle);
        (0, globals_1.expect)(signature.metadata.algorithm).toBe('HMAC-SHA384');
        const result = service.verifySignature(bundle, signature);
        (0, globals_1.expect)(result.valid).toBe(true);
    });
    (0, globals_1.it)('should support HMAC-SHA512', () => {
        const service = new signing_js_1.StixSigningService({
            signingKey: 'test-key',
            algorithm: 'HMAC-SHA512',
        });
        const bundle = (0, bundle_serializer_js_1.createBundle)([(0, entity_mapper_js_1.createProducerIdentity)('Test')]);
        const signature = service.signBundle(bundle);
        (0, globals_1.expect)(signature.metadata.algorithm).toBe('HMAC-SHA512');
        const result = service.verifySignature(bundle, signature);
        (0, globals_1.expect)(result.valid).toBe(true);
    });
});
