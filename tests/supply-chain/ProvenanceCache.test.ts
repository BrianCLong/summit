// @ts-nocheck
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { ProvenanceCache } from '../../src/supply-chain/ProvenanceCache';

describe('ProvenanceCache', () => {
  const setupWorkspace = async () => {
    const workspace = await fs.mkdtemp(path.join(os.tmpdir(), 'prov-cache-'));
    const artifactPath = path.join(workspace, 'artifact.bin');
    const attestationPath = `${artifactPath}.attestation.json`;
    const inputPath = path.join(workspace, 'input.txt');

    await fs.writeFile(artifactPath, 'artifact-contents');
    await fs.writeFile(attestationPath, 'attestation-contents');
    await fs.writeFile(inputPath, 'input-v1');

    return { workspace, artifactPath, attestationPath, inputPath };
  };

  it('returns cache hit when inputs and artifacts are unchanged', async () => {
    const { workspace, artifactPath, attestationPath, inputPath } =
      await setupWorkspace();

    const cache = new ProvenanceCache({
      cacheFile: path.join(workspace, '.provenance-cache.json'),
      artifactPath,
      attestationPath,
      inputs: [inputPath],
    });

    const firstPass = await cache.validate();
    expect(firstPass.cacheHit).toBe(false);

    const record = await cache.snapshot({ rekorEntryUUID: 'uuid-1' });
    await cache.persist(record);

    const secondPass = await cache.validate();
    expect(secondPass.cacheHit).toBe(true);
    expect(secondPass.previous?.rekorEntryUUID).toBe('uuid-1');
  });

  it('detects cache misses when inputs change', async () => {
    const { workspace, artifactPath, attestationPath, inputPath } =
      await setupWorkspace();

    const cache = new ProvenanceCache({
      cacheFile: path.join(workspace, '.provenance-cache.json'),
      artifactPath,
      attestationPath,
      inputs: [inputPath],
    });

    const baseline = await cache.snapshot();
    await cache.persist(baseline);

    await fs.writeFile(inputPath, 'input-v2');

    const secondPass = await cache.validate();
    expect(secondPass.cacheHit).toBe(false);
    expect(secondPass.reason).toBe('inputs fingerprint changed');
  });
});
