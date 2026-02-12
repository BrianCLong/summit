// @ts-nocheck
import { createHash } from 'crypto';
import { mkdtemp, readFile, rm, writeFile } from 'fs/promises';
import os from 'os';
import path from 'path';
import { generateEvidenceBundle } from '../scripts/ops/generate-evidence-bundle';

const FIXED_TIMESTAMP = '2024-12-31T23:59:59Z';
const FIXED_COMMIT = '0123456789abcdef0123456789abcdef01234567';

const makeFile = async (root: string, relativePath: string, contents: string) => {
  const fullPath = path.join(root, relativePath);
  await writeFile(fullPath, contents);
  return fullPath;
};

describe('generateEvidenceBundle', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), 'evidence-bundle-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('creates a complete bundle with deterministic structure and manifest hashes', async () => {
    const controlMappingPath = await makeFile(tempDir, 'control-mapping.md', '# Controls');
    const sloConfigPath = await makeFile(tempDir, 'slo.yaml', 'service: api');
    const sloSnapshotPath = await makeFile(tempDir, 'slo-snapshot.json', JSON.stringify({ status: 'ok' }));
    const llmPolicyPath = await makeFile(tempDir, 'llm-policy.yaml', 'providers: []');
    const multiTenantPath = await makeFile(
      tempDir,
      'multi-tenant.json',
      JSON.stringify({ isolation: 'strict' }),
    );
    const sbomPath = await makeFile(tempDir, 'sbom.json', JSON.stringify({ components: [] }));
    const provenancePath = await makeFile(tempDir, 'prov.json', JSON.stringify({ provenance: true }));
    const packageJsonPath = await makeFile(
      tempDir,
      'package.json',
      JSON.stringify({ name: 'fixture', version: '0.0.1', dependencies: { alpha: '1.0.0' } }),
    );

    const { bundlePath, manifest } = await generateEvidenceBundle({
      outputRoot: path.join(tempDir, 'out'),
      timestamp: FIXED_TIMESTAMP,
      commitSha: FIXED_COMMIT,
      branch: 'main',
      controlMappingPath,
      sloConfigPath,
      sloSnapshotPath,
      llmPolicyPath,
      multiTenantSummaryPath: multiTenantPath,
      sbomPaths: [sbomPath],
      packageJsonPath,
      provenancePath,
      gaGateNotes: 'test-run',
    });

    const manifestOnDisk = JSON.parse(
      await readFile(path.join(bundlePath, 'manifest.json'), 'utf-8'),
    );
    expect(manifestOnDisk.files.map((f: { path: string }) => f.path)).toEqual(
      manifest.files.map(file => file.path),
    );

    const manifestHash = createHash('sha256')
      .update(await readFile(path.join(bundlePath, 'manifest.json')))
      .digest('hex');
    const manifestShaFile = (await readFile(path.join(bundlePath, 'manifest.sha256'), 'utf-8')).trim();
    expect(manifestShaFile).toBe(`${manifestHash}  manifest.json`);

    const requiredPaths = [
      'ga-gate-report.json',
      'ci/metadata.json',
      'provenance.json',
      'slo/config.yaml',
      'slo/snapshot.json',
      'llm/policy.yaml',
      'controls/multi-tenant-summary.json',
      'controls/control-mapping.md',
      'sboms/sbom.json',
    ];
    requiredPaths.forEach(expected =>
      expect(manifest.files.find(file => file.path === expected)).toBeDefined(),
    );

    expect(manifest.bundle.name).toContain('evidence-');
    expect(manifest.bundle.commit).toBe(FIXED_COMMIT);
  });

  it('fails fast when required inputs are missing', async () => {
    await expect(
      generateEvidenceBundle({
        outputRoot: path.join(tempDir, 'out'),
        timestamp: FIXED_TIMESTAMP,
        commitSha: FIXED_COMMIT,
        branch: 'main',
        controlMappingPath: path.join(tempDir, 'missing.md'),
      }),
    ).rejects.toThrow(/missing/i);
  });
});
