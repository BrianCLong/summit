"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_assert_1 = __importDefault(require("node:assert"));
const node_crypto_1 = __importDefault(require("node:crypto"));
const node_fs_1 = __importDefault(require("node:fs"));
const node_os_1 = __importDefault(require("node:os"));
const node_path_1 = __importDefault(require("node:path"));
const node_test_1 = __importDefault(require("node:test"));
const index_js_1 = require("../src/index.js");
const fixturesRoot = node_path_1.default.join(process.cwd(), 'tests', 'fixtures');
(0, node_test_1.default)('accepts a valid manifest bundle', async () => {
    const bundlePath = node_path_1.default.join(fixturesRoot, 'good-bundle');
    const report = await (0, index_js_1.verifyManifest)(bundlePath);
    node_assert_1.default.equal(report.valid, true);
    node_assert_1.default.equal(report.issues.length, 0);
    node_assert_1.default.ok(report.filesChecked > 0);
});
(0, node_test_1.default)('flags missing files', async () => {
    const bundlePath = node_path_1.default.join(fixturesRoot, 'missing-file-bundle');
    const report = await (0, index_js_1.verifyManifest)(bundlePath);
    node_assert_1.default.equal(report.valid, false);
    node_assert_1.default.ok(report.issues.some((issue) => issue.code === 'MISSING_FILE'));
});
(0, node_test_1.default)('flags hash mismatches', async () => {
    const bundlePath = node_path_1.default.join(fixturesRoot, 'hash-mismatch-bundle');
    const report = await (0, index_js_1.verifyManifest)(bundlePath);
    node_assert_1.default.equal(report.valid, false);
    node_assert_1.default.ok(report.issues.some((issue) => issue.code === 'HASH_MISMATCH'));
});
(0, node_test_1.default)('detects broken transform chains', async () => {
    const bundlePath = node_path_1.default.join(fixturesRoot, 'broken-transform-bundle');
    const report = await (0, index_js_1.verifyManifest)(bundlePath);
    node_assert_1.default.equal(report.valid, false);
    node_assert_1.default.ok(report.issues.some((issue) => issue.code === 'TRANSFORM_BROKEN'));
});
(0, node_test_1.default)('path traversal safety property', () => {
    const root = '/tmp/bundle';
    for (let i = 0; i < 50; i += 1) {
        const token = node_crypto_1.default.randomBytes(4).toString('hex');
        const candidate = i % 2 === 0 ? `../${token}` : `/abs/${token}`;
        node_assert_1.default.throws(() => (0, index_js_1.toCanonicalPath)(root, candidate));
    }
});
(0, node_test_1.default)('verifies signed disclosure bundles', async () => {
    const tempDir = node_fs_1.default.mkdtempSync(node_path_1.default.join(node_os_1.default.tmpdir(), 'prov-manifest-'));
    const manifest = {
        manifestVersion: '1.0.0',
        createdAt: new Date('2025-01-01T00:00:00Z').toISOString(),
        documents: [
            {
                id: 'doc-1',
                path: 'doc.txt',
                sha256: node_crypto_1.default.createHash('sha256').update('hello').digest('hex'),
            },
        ],
        disclosure: {
            audience: { policyId: 'aud:public', label: 'Public' },
            redactions: [
                {
                    field: 'email',
                    path: 'doc.txt',
                    reason: 'PII',
                    appliedAt: new Date('2025-01-01T00:00:00Z').toISOString(),
                },
            ],
            license: { id: 'CC-BY-4.0', name: 'Creative Commons BY 4.0' },
        },
    };
    node_fs_1.default.writeFileSync(node_path_1.default.join(tempDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
    node_fs_1.default.writeFileSync(node_path_1.default.join(tempDir, 'doc.txt'), 'hello');
    const { privateKey, publicKey } = node_crypto_1.default.generateKeyPairSync('ed25519');
    const signatureFile = (0, index_js_1.signManifest)(manifest, {
        privateKeyPem: privateKey.export({ type: 'pkcs8', format: 'pem' }).toString(),
        publicKeyPem: publicKey.export({ type: 'spki', format: 'pem' }).toString(),
        keyId: 'test-key',
    });
    node_fs_1.default.writeFileSync(node_path_1.default.join(tempDir, 'signature.json'), JSON.stringify(signatureFile, null, 2));
    const report = await (0, index_js_1.verifyManifest)(tempDir);
    node_assert_1.default.equal(report.valid, true);
    node_assert_1.default.equal(report.signature?.valid, true);
    node_assert_1.default.equal(report.disclosure?.licenseId, 'CC-BY-4.0');
});
