import { verifyEvidenceBundle } from './verify-evidence-bundle';
import path from 'path';

describe('Evidence Bundle Verifier', () => {
  const fixturesDir = path.join(process.cwd(), 'tests/fixtures/evidence-bundle');

  it('should pass for a valid manifest with all referenced files existing', async () => {
    const validManifest = path.join(fixturesDir, 'valid-manifest.json');
    const result = await verifyEvidenceBundle(validManifest);
    expect(result.success).toBe(true);
    expect(result.messages).toContain('All referenced files exist.');
  });

  it('should fail for an invalid schema', async () => {
    const invalidSchema = path.join(fixturesDir, 'invalid-schema.json');
    const result = await verifyEvidenceBundle(invalidSchema);
    expect(result.success).toBe(false);
    expect(result.messages.some(m => m.includes('Schema Error'))).toBe(true);
  });

  it('should fail if referenced files are missing', async () => {
    const missingFiles = path.join(fixturesDir, 'missing-files.json');
    const result = await verifyEvidenceBundle(missingFiles);
    expect(result.success).toBe(false);
    expect(result.messages.some(m => m.includes('File missing'))).toBe(true);
  });

  it('should fail if redaction markers are missing in release_metadata', async () => {
    const missingRedaction = path.join(fixturesDir, 'missing-redaction.json');
    const result = await verifyEvidenceBundle(missingRedaction);
    expect(result.success).toBe(false);
    expect(result.messages.some(m => m.includes('Redaction Marker Missing'))).toBe(true);
  });

  it('should pass if redaction uses explicit REDACTED marker', async () => {
    const redactedManifest = path.join(fixturesDir, 'redacted-manifest.json');
    const result = await verifyEvidenceBundle(redactedManifest);
    expect(result.success).toBe(true);
  });

  it('should fail if manifest file does not exist', async () => {
    const result = await verifyEvidenceBundle('non-existent.json');
    expect(result.success).toBe(false);
    expect(result.messages[0]).toContain('Manifest not found');
  });

  it('should fail for invalid JSON', async () => {
    const invalidJsonPath = path.join(fixturesDir, 'bad-json.json');
    const result = await verifyEvidenceBundle(invalidJsonPath);
    expect(result.success).toBe(false);
    expect(result.messages[0]).toContain('Invalid JSON');
  });
});
