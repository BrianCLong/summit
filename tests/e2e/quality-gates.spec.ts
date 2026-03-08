import { test, expect } from '@playwright/test';
import fs from 'fs/promises';
import path from 'path';

test.describe('Quality gate evidence bundle', () => {
  const manifestPath = path.resolve(process.cwd(), 'EVIDENCE_BUNDLE.manifest.json');
  const acceptancePackDir = path.resolve(process.cwd(), 'docs/acceptance-packs');

  test('enumerates the mandatory CI quality gates', async () => {
    const raw = await fs.readFile(manifestPath, 'utf-8');
    const manifest = JSON.parse(raw);
    const gates = (manifest.ci_quality_gates || []).map((gate: any) => gate.name);

    expect(gates).toEqual(
      expect.arrayContaining([
        'lint',
        'type-check',
        'unit-tests',
        'integration-tests',
        'e2e-tests',
        'sbom',
        'policy-simulation',
        'secret-scan'
      ])
    );
  });

  test('tracks acceptance pack descriptors for release evidence automation', async () => {
    const files = await fs.readdir(acceptancePackDir);
    const descriptors = files.filter((file) => file.endsWith('.json'));
    expect(descriptors.length).toBeGreaterThan(0);

    const raw = await fs.readFile(manifestPath, 'utf-8');
    const manifest = JSON.parse(raw);
    const expectedDescriptors = (manifest.acceptance_packs || []).map((pack: any) => path.basename(pack.descriptor));

    expect(expectedDescriptors.length).toBeGreaterThan(0);
    expectedDescriptors.forEach((descriptor) => {
      expect(descriptors).toContain(descriptor);
    });
  });
});
