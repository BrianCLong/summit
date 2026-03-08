"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const verify_evidence_bundle_1 = require("./verify-evidence-bundle");
const path_1 = __importDefault(require("path"));
describe('Evidence Bundle Verifier', () => {
    const fixturesDir = path_1.default.join(process.cwd(), 'tests/fixtures/evidence-bundle');
    it('should pass for a valid manifest with all referenced files existing', async () => {
        const validManifest = path_1.default.join(fixturesDir, 'valid-manifest.json');
        const result = await (0, verify_evidence_bundle_1.verifyEvidenceBundle)(validManifest);
        expect(result.success).toBe(true);
        expect(result.messages).toContain('All referenced files exist.');
    });
    it('should fail for an invalid schema', async () => {
        const invalidSchema = path_1.default.join(fixturesDir, 'invalid-schema.json');
        const result = await (0, verify_evidence_bundle_1.verifyEvidenceBundle)(invalidSchema);
        expect(result.success).toBe(false);
        expect(result.messages.some(m => m.includes('Schema Error'))).toBe(true);
    });
    it('should fail if referenced files are missing', async () => {
        const missingFiles = path_1.default.join(fixturesDir, 'missing-files.json');
        const result = await (0, verify_evidence_bundle_1.verifyEvidenceBundle)(missingFiles);
        expect(result.success).toBe(false);
        expect(result.messages.some(m => m.includes('File missing'))).toBe(true);
    });
    it('should fail if redaction markers are missing in release_metadata', async () => {
        const missingRedaction = path_1.default.join(fixturesDir, 'missing-redaction.json');
        const result = await (0, verify_evidence_bundle_1.verifyEvidenceBundle)(missingRedaction);
        expect(result.success).toBe(false);
        expect(result.messages.some(m => m.includes('Redaction Marker Missing'))).toBe(true);
    });
    it('should pass if redaction uses explicit REDACTED marker', async () => {
        const redactedManifest = path_1.default.join(fixturesDir, 'redacted-manifest.json');
        const result = await (0, verify_evidence_bundle_1.verifyEvidenceBundle)(redactedManifest);
        expect(result.success).toBe(true);
    });
    it('should fail if manifest file does not exist', async () => {
        const result = await (0, verify_evidence_bundle_1.verifyEvidenceBundle)('non-existent.json');
        expect(result.success).toBe(false);
        expect(result.messages[0]).toContain('Manifest not found');
    });
    it('should fail for invalid JSON', async () => {
        const invalidJsonPath = path_1.default.join(fixturesDir, 'bad-json.json');
        const result = await (0, verify_evidence_bundle_1.verifyEvidenceBundle)(invalidJsonPath);
        expect(result.success).toBe(false);
        expect(result.messages[0]).toContain('Invalid JSON');
    });
});
