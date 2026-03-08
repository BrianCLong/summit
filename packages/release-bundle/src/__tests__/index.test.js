"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const node_assert_1 = __importDefault(require("node:assert"));
const node_path_1 = __importDefault(require("node:path"));
const index_js_1 = require("../index.js");
// Since we are running compiled JS from dist/, fixtures are relative to project root or we need to resolve them carefully
// But in standard node setup, if we run `node --test dist/__tests__/*.test.js`, process.cwd() is usually package root.
const FIXTURES_DIR = node_path_1.default.resolve('fixtures');
(0, node_test_1.test)('parseReleaseStatus happy path', () => {
    const status = (0, index_js_1.parseReleaseStatus)({ status: 'ready' });
    node_assert_1.default.strictEqual(status, 'ready');
    const statusRaw = (0, index_js_1.parseReleaseStatus)('draft');
    node_assert_1.default.strictEqual(statusRaw, 'draft');
});
(0, node_test_1.test)('parseReleaseStatus failure path', () => {
    node_assert_1.default.throws(() => (0, index_js_1.parseReleaseStatus)({ status: 'unknown' }));
    node_assert_1.default.throws(() => (0, index_js_1.parseReleaseStatus)('invalid'));
});
(0, node_test_1.test)('parseBundleIndex happy path', () => {
    const index = (0, index_js_1.parseBundleIndex)({
        schemaVersion: '1.0',
        entries: { 'file.txt': 'sha256:123' }
    });
    node_assert_1.default.strictEqual(index.schemaVersion, '1.0');
    node_assert_1.default.strictEqual(index.entries['file.txt'], 'sha256:123');
});
(0, node_test_1.test)('checkCompatibility enforces major version', () => {
    const v1Manifest = {
        schemaVersion: '1.0',
        name: 'test',
        version: '1.0.0',
        majorVersion: 1
    };
    node_assert_1.default.strictEqual((0, index_js_1.checkCompatibility)({ manifest: v1Manifest }, 1).compatible, true);
    const v2Manifest = {
        ...v1Manifest,
        version: '2.0.0',
        majorVersion: 2
    };
    const result = (0, index_js_1.checkCompatibility)({ manifest: v2Manifest }, 1);
    node_assert_1.default.strictEqual(result.compatible, false);
    if (!result.compatible) {
        node_assert_1.default.match(result.reason, /does not match/);
    }
});
(0, node_test_1.test)('loadBundleFromDir loads fixtures', async () => {
    // We expect fixtures to be present in packages/release-bundle/fixtures/
    // and we are running this test presumably from packages/release-bundle/
    const bundle = await (0, index_js_1.loadBundleFromDir)(FIXTURES_DIR);
    node_assert_1.default.ok(bundle.status, 'Should load status');
    node_assert_1.default.strictEqual(bundle.status, 'ready');
    node_assert_1.default.ok(bundle.index, 'Should load index');
    node_assert_1.default.strictEqual(bundle.index?.schemaVersion, '1.0.0');
    node_assert_1.default.ok(bundle.manifest, 'Should load manifest');
    node_assert_1.default.strictEqual(bundle.manifest?.name, 'test-bundle');
    node_assert_1.default.ok(bundle.provenance, 'Should load provenance');
});
