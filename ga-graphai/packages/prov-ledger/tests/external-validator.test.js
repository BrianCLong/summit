"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_crypto_1 = require("node:crypto");
const vitest_1 = require("vitest");
const data_integrity_1 = require("@ga-graphai/data-integrity");
const manifest_js_1 = require("../src/manifest.js");
const externalValidator_js_1 = require("../src/externalValidator.js");
function computeHash(entry) {
    const hash = (0, node_crypto_1.createHash)('sha256');
    hash.update(entry.id);
    hash.update(entry.category);
    hash.update(entry.actor);
    hash.update(entry.action);
    hash.update(entry.resource);
    hash.update(JSON.stringify(entry.payload));
    hash.update(entry.timestamp);
    if (entry.previousHash) {
        hash.update(entry.previousHash);
    }
    return hash.digest('hex');
}
function buildLedgerEntries() {
    const timestamp = new Date('2024-06-01T00:00:00Z').toISOString();
    const ingest = {
        id: 'evt-1',
        category: 'ingest',
        actor: 'collector',
        action: 'register',
        resource: 'rss-feed',
        payload: { url: 'https://example.com/feed', checksum: 'abc123' },
        timestamp,
        hash: '',
        previousHash: undefined,
    };
    ingest.hash = computeHash(ingest);
    const analysis = {
        id: 'evt-2',
        category: 'analysis',
        actor: 'nlp-service',
        action: 'extract',
        resource: 'entity',
        payload: { entityId: 'person-1', confidence: 0.92 },
        timestamp,
        hash: '',
        previousHash: ingest.hash,
    };
    analysis.hash = computeHash(analysis);
    return [ingest, analysis];
}
const fixedNow = () => new Date('2024-06-01T12:00:00Z');
(0, vitest_1.describe)('ProvenanceBundleValidator', () => {
    const { privateKey, publicKey } = (0, node_crypto_1.generateKeyPairSync)('rsa', { modulusLength: 2048 });
    const issuerPrivateKey = privateKey.export({ format: 'pem', type: 'pkcs1' }).toString();
    const issuerPublicKey = publicKey.export({ format: 'pem', type: 'pkcs1' }).toString();
    (0, vitest_1.it)('submits provenance bundles for third-party verification with custody tracking', async () => {
        const entries = buildLedgerEntries();
        const bundle = {
            generatedAt: fixedNow().toISOString(),
            headHash: entries.at(-1)?.hash,
            entries,
        };
        const manifest = (0, manifest_js_1.createExportManifest)({
            caseId: 'case-77',
            ledger: entries,
            privateKey: issuerPrivateKey,
            publicKey: issuerPublicKey,
            now: fixedNow,
        });
        const captured = [];
        const validator = {
            name: 'TrustCheck',
            async verify(payload) {
                captured.push(payload);
                return {
                    validator: 'TrustCheck',
                    status: 'verified',
                    correlationId: 'ver-001',
                    checkedAt: fixedNow().toISOString(),
                    notes: 'signature matched',
                };
            },
        };
        const bundleValidator = new externalValidator_js_1.ProvenanceBundleValidator(validator, {
            complianceFramework: 'NIST 800-53',
            attestor: 'trust-office',
            custodyLocation: 'us-east-1',
            now: fixedNow,
        });
        const report = await bundleValidator.validate(bundle, manifest);
        (0, vitest_1.expect)(report.manifestVerification.valid).toBe(true);
        (0, vitest_1.expect)(report.thirdParty.status).toBe('verified');
        (0, vitest_1.expect)(report.thirdParty.validator).toBe('TrustCheck');
        (0, vitest_1.expect)(report.compliance.status).toBe('compliant');
        (0, vitest_1.expect)(report.compliance.framework).toBe('NIST 800-53');
        (0, vitest_1.expect)(report.compliance.attestedBy).toBe('trust-office');
        (0, vitest_1.expect)(report.compliance.evidenceRef).toBe((0, externalValidator_js_1.hashBundle)(bundle));
        (0, vitest_1.expect)(report.custodyTrail.map((event) => event.stage)).toEqual([
            'received',
            'submitted',
            'verified',
            'attested',
        ]);
        (0, vitest_1.expect)(report.custodyTrail[1].location).toBe('us-east-1');
        (0, vitest_1.expect)(captured[0].bundleHash).toBe((0, externalValidator_js_1.hashBundle)(bundle));
        (0, vitest_1.expect)(captured[0].manifest.merkleRoot).toBe(manifest.merkleRoot);
    });
    (0, vitest_1.it)('flags compliance when manifest verification fails', async () => {
        const entries = buildLedgerEntries();
        const bundle = {
            generatedAt: fixedNow().toISOString(),
            headHash: entries.at(-1)?.hash,
            entries,
        };
        const manifest = (0, manifest_js_1.createExportManifest)({
            caseId: 'case-21',
            ledger: entries,
            privateKey: issuerPrivateKey,
            publicKey: issuerPublicKey,
            now: fixedNow,
        });
        manifest.merkleRoot = 'tampered-root';
        const validator = {
            name: 'AttestCorp',
            async verify() {
                return {
                    validator: 'AttestCorp',
                    status: 'verified',
                    correlationId: 'ver-404',
                    checkedAt: fixedNow().toISOString(),
                };
            },
        };
        const bundleValidator = new externalValidator_js_1.ProvenanceBundleValidator(validator, { now: fixedNow });
        const report = await bundleValidator.validate(bundle, manifest);
        (0, vitest_1.expect)(report.manifestVerification.valid).toBe(false);
        (0, vitest_1.expect)(report.compliance.status).toBe('non-compliant');
        (0, vitest_1.expect)(report.custodyTrail.at(-1)?.stage).toBe('attested');
    });
    (0, vitest_1.it)('hashes bundles deterministically with canonical ordering and domain separation', () => {
        const entries = buildLedgerEntries();
        const bundle = {
            generatedAt: fixedNow().toISOString(),
            headHash: entries.at(-1)?.hash,
            entries,
        };
        const reorderedKeys = entries.map((entry) => ({
            hash: entry.hash,
            timestamp: entry.timestamp,
            id: entry.id,
            category: entry.category,
            actor: entry.actor,
            action: entry.action,
            resource: entry.resource,
            payload: { ...entry.payload },
            previousHash: entry.previousHash,
        }));
        const reorderedBundle = {
            generatedAt: bundle.generatedAt,
            headHash: bundle.headHash,
            entries: reorderedKeys,
        };
        (0, vitest_1.expect)((0, externalValidator_js_1.hashBundle)(bundle)).toBe((0, externalValidator_js_1.hashBundle)(reorderedBundle));
    });
    (0, vitest_1.it)('applies domain separation to avoid collisions with other hash domains', () => {
        const entries = buildLedgerEntries();
        const bundle = {
            generatedAt: fixedNow().toISOString(),
            headHash: entries.at(-1)?.hash,
            entries,
        };
        const bundleHash = (0, externalValidator_js_1.hashBundle)(bundle);
        const rawHash = (0, data_integrity_1.stableHash)({ headHash: bundle.headHash, entries: bundle.entries });
        (0, vitest_1.expect)(bundleHash).not.toBe(rawHash);
    });
    (0, vitest_1.it)('throws when headHash is missing', () => {
        const entries = buildLedgerEntries();
        const bundle = {
            generatedAt: fixedNow().toISOString(),
            headHash: undefined,
            entries,
        };
        (0, vitest_1.expect)(() => (0, externalValidator_js_1.hashBundle)(bundle)).toThrow(/headHash/);
    });
    (0, vitest_1.it)('rejects duplicate ledger entries', () => {
        const entries = buildLedgerEntries();
        const duplicate = { ...entries[0] };
        const bundle = {
            generatedAt: fixedNow().toISOString(),
            headHash: entries.at(-1)?.hash,
            entries: [entries[0], duplicate],
        };
        (0, vitest_1.expect)(() => (0, externalValidator_js_1.hashBundle)(bundle)).toThrow(/duplicate entry/);
    });
    (0, vitest_1.it)('detects ordering changes in bundles', () => {
        const entries = buildLedgerEntries();
        const bundle = {
            generatedAt: fixedNow().toISOString(),
            headHash: entries.at(-1)?.hash,
            entries,
        };
        const reversedBundle = {
            generatedAt: bundle.generatedAt,
            headHash: bundle.headHash,
            entries: [...entries].reverse(),
        };
        (0, vitest_1.expect)((0, externalValidator_js_1.hashBundle)(bundle)).not.toBe((0, externalValidator_js_1.hashBundle)(reversedBundle));
    });
});
