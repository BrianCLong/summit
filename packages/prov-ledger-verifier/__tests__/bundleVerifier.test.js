"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const bundleVerifier_js_1 = require("../src/bundleVerifier.js");
const fixturesDir = path_1.default.resolve(process.cwd(), 'fixtures');
describe('bundle verifier integration', () => {
    it('verifies a valid bundle directory', async () => {
        const report = await (0, bundleVerifier_js_1.verifyBundle)(path_1.default.join(fixturesDir, 'valid-bundle'));
        expect(report.ok).toBe(true);
        expect(report.summary.missingEvidence).toHaveLength(0);
        expect(report.summary.hashMismatches).toHaveLength(0);
        expect(report.checks.transformChains.ok).toBe(true);
    });
    it('verifies a valid bundle zip', async () => {
        const report = await (0, bundleVerifier_js_1.verifyBundle)(path_1.default.join(fixturesDir, 'valid-bundle.zip'));
        expect(report.ok).toBe(true);
    });
    it('fails when evidence is missing', async () => {
        const report = await (0, bundleVerifier_js_1.verifyBundle)(path_1.default.join(fixturesDir, 'missing-evidence'));
        expect(report.ok).toBe(false);
        expect(report.summary.missingEvidence).toContain('evidence-2');
        expect(report.checks.evidenceHashes.ok).toBe(false);
    });
    it('fails when hashes are tampered', async () => {
        const report = await (0, bundleVerifier_js_1.verifyBundle)(path_1.default.join(fixturesDir, 'hash-mismatch'));
        expect(report.ok).toBe(false);
        expect(report.summary.hashMismatches.length).toBeGreaterThan(0);
        expect(report.checks.hashTree.ok).toBe(false);
    });
});
