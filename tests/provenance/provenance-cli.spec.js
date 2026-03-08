"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_crypto_1 = require("node:crypto");
const node_fs_1 = require("node:fs");
const node_path_1 = __importDefault(require("node:path"));
const node_url_1 = require("node:url");
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = require("node:test");
const index_js_1 = require("../../services/provenance-cli/src/index.js");
const __filename = (0, node_url_1.fileURLToPath)(import.meta.url);
const __dirname = node_path_1.default.dirname(__filename);
const examplesDir = node_path_1.default.resolve(__dirname, '../../exports/examples');
function loadJson(name) {
    const filePath = node_path_1.default.join(examplesDir, name);
    return JSON.parse((0, node_fs_1.readFileSync)(filePath, 'utf8'));
}
(0, node_test_1.test)('sample export verifies against the ledger snapshot', () => {
    const manifest = loadJson('manifest.json');
    const ledger = loadJson('ledger.json');
    const publicKey = (0, node_fs_1.readFileSync)(node_path_1.default.join(examplesDir, 'export-public.pem'), 'utf8');
    const result = (0, index_js_1.verifyManifest)(manifest, ledger, { manifestPublicKey: publicKey });
    strict_1.default.equal(result.valid, true, result.errors.join('\n'));
    strict_1.default.equal(result.ledger.valid, true, result.ledger.errors.join('\n'));
});
(0, node_test_1.test)('tampered manifest evidence is detected', () => {
    const manifest = loadJson('manifest-tampered.json');
    const ledger = loadJson('ledger.json');
    const publicKey = (0, node_fs_1.readFileSync)(node_path_1.default.join(examplesDir, 'export-public.pem'), 'utf8');
    const result = (0, index_js_1.verifyManifest)(manifest, ledger, { manifestPublicKey: publicKey });
    strict_1.default.equal(result.valid, false);
    (0, strict_1.default)(result.errors.some((error) => error.includes('content hash mismatch')));
});
(0, node_test_1.test)('ledger signature tampering is caught', () => {
    const ledger = loadJson('ledger.json');
    ledger.entries[0].signature = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==';
    const verification = (0, index_js_1.verifyLedger)(ledger);
    strict_1.default.equal(verification.valid, false);
    (0, strict_1.default)(verification.errors.some((err) => err.includes('invalid signature')));
});
(0, node_test_1.test)('evidence chain is materialized for API use', () => {
    const manifest = loadJson('manifest.json');
    const ledger = loadJson('ledger.json');
    const chains = (0, index_js_1.buildEvidenceChain)('entity-123', manifest, ledger);
    strict_1.default.equal(chains.length, 1);
    strict_1.default.equal(chains[0].evidence.length, manifest.claims[0].evidence.length);
    (0, strict_1.default)(chains[0].evidence.every((node) => node.actor.length > 0));
});
(0, node_test_1.test)('append + sign workflow produces verifiable manifest', () => {
    const { privateKey: ledgerPriv, publicKey: ledgerPub } = (0, node_crypto_1.generateKeyPairSync)('ed25519');
    const ledgerPrivatePem = ledgerPriv.export({ type: 'pkcs8', format: 'pem' }).toString();
    const ledgerPublicPem = ledgerPub.export({ type: 'spki', format: 'pem' }).toString();
    const ledger = {
        version: '1.0',
        ledgerId: 'unit-test-ledger',
        publicKeys: [
            { keyId: 'ledger-signer', algorithm: 'ed25519', publicKey: ledgerPublicPem },
        ],
        entries: [],
        rootHash: '',
    };
    const ingestHash = '2bd806c97f0e00af1a1fc3328fa763a9269723c8db8fac4f93af71db186d6e90'; // sha256("ingest")
    (0, index_js_1.appendLedgerEntry)(ledger, {
        claimId: 'claim-test',
        entityId: 'entity-test',
        evidenceId: 'evidence-ingest',
        stage: 'ingest',
        contentHash: ingestHash,
        actor: 'ingest-service',
        signingKeyId: 'ledger-signer',
    }, ledgerPrivatePem);
    const transformHash = '3a7bd3e2360a3d80d6b0f42776f0a8d8f7c11d1f0aa3bd4dc735dc1f9a5d4f27'; // sha256("transform")
    (0, index_js_1.appendLedgerEntry)(ledger, {
        claimId: 'claim-test',
        entityId: 'entity-test',
        evidenceId: 'evidence-transform',
        stage: 'transform',
        contentHash: transformHash,
        actor: 'fusion-service',
        signingKeyId: 'ledger-signer',
        metadata: { modelVersion: 'v1.2.0' },
    }, ledgerPrivatePem);
    const ledgerVerification = (0, index_js_1.verifyLedger)(ledger);
    strict_1.default.equal(ledgerVerification.valid, true, ledgerVerification.errors.join('\n'));
    const manifest = {
        version: '1.0',
        bundle: {
            id: 'bundle-test',
            generatedAt: new Date().toISOString(),
            sourceSystem: 'unit-test',
            environment: 'sandbox',
            exportType: 'unit',
            itemCount: 1,
        },
        claims: [
            {
                claimId: 'claim-test',
                entityId: 'entity-test',
                type: 'demo',
                disposition: 'suspected',
                summary: 'Synthetic unit test claim',
                createdAt: new Date().toISOString(),
                confidence: 'medium',
                evidence: ledger.entries.map((entry) => ({
                    evidenceId: entry.evidenceId,
                    stage: entry.stage,
                    artifactHash: entry.contentHash,
                    ledgerSequence: entry.sequence,
                })),
            },
        ],
        artifacts: [],
        ledger: {
            uri: './ledger.json',
            rootHash: ledgerVerification.rootHash,
            entries: ledger.entries.map((entry) => ({
                sequence: entry.sequence,
                hash: entry.hash,
            })),
        },
        integrity: {
            manifestHash: '',
        },
    };
    const { privateKey: manifestPriv, publicKey: manifestPub } = (0, node_crypto_1.generateKeyPairSync)('ed25519');
    const manifestPrivatePem = manifestPriv.export({ type: 'pkcs8', format: 'pem' }).toString();
    const manifestPublicPem = manifestPub.export({ type: 'spki', format: 'pem' }).toString();
    (0, index_js_1.signManifest)(manifest, manifestPrivatePem, 'manifest-signer');
    strict_1.default.notEqual(manifest.integrity.manifestHash.length, 0);
    strict_1.default.equal(manifest.integrity.manifestHash, (0, index_js_1.calculateManifestHash)(manifest));
    const verification = (0, index_js_1.verifyManifest)(manifest, ledger, { manifestPublicKey: manifestPublicPem });
    strict_1.default.equal(verification.valid, true, verification.errors.join('\n'));
});
