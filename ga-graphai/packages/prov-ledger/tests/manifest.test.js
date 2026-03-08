"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const node_crypto_1 = require("node:crypto");
const manifest_js_1 = require("../src/manifest.js");
function buildLedgerEntries() {
    const timestamp = new Date('2024-01-01T00:00:00Z').toISOString();
    const first = {
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
    first.hash = (0, node_crypto_1.createHash)('sha256')
        .update(first.id + JSON.stringify(first.payload))
        .digest('hex');
    const second = {
        id: 'evt-2',
        category: 'analysis',
        actor: 'nlp-service',
        action: 'extract',
        resource: 'entity',
        payload: { entityId: 'person-1', confidence: 0.92 },
        timestamp,
        hash: '',
        previousHash: first.hash,
    };
    second.hash = (0, node_crypto_1.createHash)('sha256')
        .update(second.id + JSON.stringify(second.payload) + second.previousHash)
        .digest('hex');
    return [first, second];
}
(0, vitest_1.describe)('export manifest', () => {
    const { privateKey, publicKey } = (0, node_crypto_1.generateKeyPairSync)('rsa', { modulusLength: 2048 });
    const issuerPrivateKey = privateKey.export({ format: 'pem', type: 'pkcs1' }).toString();
    const issuerPublicKey = publicKey.export({ format: 'pem', type: 'pkcs1' }).toString();
    (0, vitest_1.it)('creates a manifest with deterministic merkle root', () => {
        const entries = buildLedgerEntries();
        const transparencyLog = new manifest_js_1.TransparencyLog(() => new Date('2024-01-02T00:00:00Z'));
        const manifest = (0, manifest_js_1.createExportManifest)({
            caseId: 'case-42',
            ledger: entries,
            issuer: 'issuer-1',
            keyId: 'k1',
            privateKey: issuerPrivateKey,
            publicKey: issuerPublicKey,
            transparencyLog,
            now: () => new Date('2024-01-02T00:00:00Z'),
        });
        (0, vitest_1.expect)(manifest.caseId).toBe('case-42');
        (0, vitest_1.expect)(manifest.merkleRoot).toHaveLength(64);
        const verification = (0, manifest_js_1.verifyManifest)(manifest, entries, {
            evidence: {
                generatedAt: new Date().toISOString(),
                headHash: entries.at(-1)?.hash,
                entries,
            },
            transparencyLog,
        });
        (0, vitest_1.expect)(verification.valid).toBe(true);
        (0, vitest_1.expect)(verification.reasons).toHaveLength(0);
        (0, vitest_1.expect)(transparencyLog.list()).toHaveLength(1);
        (0, vitest_1.expect)(transparencyLog.verify(manifest)).toBe(true);
    });
    (0, vitest_1.it)('detects tampering when payload changes', () => {
        const entries = buildLedgerEntries().slice(0, 1);
        const transparencyLog = new manifest_js_1.TransparencyLog();
        const manifest = (0, manifest_js_1.createExportManifest)({
            caseId: 'case-99',
            ledger: entries,
            privateKey: issuerPrivateKey,
            publicKey: issuerPublicKey,
        });
        manifest.transforms[0].payloadHash = 'tampered';
        const verification = (0, manifest_js_1.verifyManifest)(manifest, entries, {
            publicKey: issuerPublicKey,
            transparencyLog,
        });
        (0, vitest_1.expect)(verification.valid).toBe(false);
        (0, vitest_1.expect)(verification.reasons).toContain('Payload hash mismatch for transform evt-1');
    });
    (0, vitest_1.it)('rejects manifests with invalid signatures', () => {
        const entries = buildLedgerEntries();
        const transparencyLog = new manifest_js_1.TransparencyLog();
        const manifest = (0, manifest_js_1.createExportManifest)({
            caseId: 'case-12',
            ledger: entries,
            privateKey: issuerPrivateKey,
            publicKey: issuerPublicKey,
            transparencyLog,
        });
        manifest.signature.signature = 'corrupted';
        const verification = (0, manifest_js_1.verifyManifest)(manifest, entries, { publicKey: issuerPublicKey });
        (0, vitest_1.expect)(verification.valid).toBe(false);
        (0, vitest_1.expect)(verification.reasons).toContain('Invalid issuer signature');
    });
    (0, vitest_1.it)('prevents snapshot replay with transparency log', () => {
        const entries = buildLedgerEntries();
        const transparencyLog = new manifest_js_1.TransparencyLog();
        const manifest = (0, manifest_js_1.createExportManifest)({
            caseId: 'case-13',
            ledger: entries,
            snapshotId: 'snap-1',
            privateKey: issuerPrivateKey,
            publicKey: issuerPublicKey,
            transparencyLog,
        });
        (0, vitest_1.expect)(transparencyLog.verify(manifest)).toBe(true);
        const tampered = { ...manifest, merkleRoot: 'deadbeef' };
        (0, vitest_1.expect)(() => transparencyLog.record(tampered)).toThrow('Snapshot replay detected');
    });
});
