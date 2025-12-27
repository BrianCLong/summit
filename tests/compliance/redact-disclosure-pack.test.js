const os = require('os');
const path = require('path');
const { mkdtemp, rm, writeFile, readFile } = require('fs/promises');
const {
  redactDisclosurePack,
  scanDisclosurePack,
} = require('../../scripts/compliance/redact-disclosure-pack.cjs');

describe('disclosure pack redaction', () => {
  const denylistPath = path.resolve('compliance/pii-denylist.txt');
  const patternsPath = path.resolve('compliance/secret-patterns.json');

  let tempDir;

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), 'disclosure-pack-'));
  });

  afterEach(async () => {
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  test('scan detects denylist and patterns (deny case)', async () => {
    const filePath = path.join(tempDir, 'evidence.json');
    const content =
      'PII_SAMPLE_DO_NOT_SHIP test@example.com AKIA1234567890ABCD12';
    await writeFile(filePath, content, 'utf8');

    const scanResult = scanDisclosurePack({
      targetDir: tempDir,
      denylistPath,
      patternsPath,
    });

    expect(scanResult.violations.length).toBeGreaterThan(0);
  });

  test('redaction removes denylist terms and secret patterns', async () => {
    const filePath = path.join(tempDir, 'evidence.json');
    const content =
      'PII_SAMPLE_DO_NOT_SHIP test@example.com AKIA1234567890ABCD12';
    await writeFile(filePath, content, 'utf8');

    const result = redactDisclosurePack({
      targetDir: tempDir,
      denylistPath,
      patternsPath,
    });

    expect(result.redactedFiles).toBe(1);
    expect(result.violations).toHaveLength(0);

    const updated = await readFile(filePath, 'utf8');
    expect(updated).not.toContain('PII_SAMPLE_DO_NOT_SHIP');
    expect(updated).not.toContain('test@example.com');
    expect(updated).not.toContain('AKIA1234567890ABCD12');
    expect(updated).toContain('[REDACTED]');
    expect(updated).toContain('[REDACTED_EMAIL]');
    expect(updated).toContain('AKIA[REDACTED]');
  });
});
