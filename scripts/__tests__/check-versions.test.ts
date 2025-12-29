import { mkdtemp, rm, writeFile, mkdir } from 'fs/promises';
import os from 'os';
import path from 'path';
import { assertVersionsAligned, collectWorkspaceManifestPaths } from '../check-versions';

describe('check-versions utilities', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), 'check-versions-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('collects workspace package manifests from pnpm-workspace globs', async () => {
    await writeFile(
      path.join(tempDir, 'pnpm-workspace.yaml'),
      "packages:\n  - 'packages/*'\n  - 'tools/*'\nexclude:\n  - 'archive/**'\n",
    );

    await writeFile(path.join(tempDir, 'package.json'), JSON.stringify({ name: 'root', version: '1.0.0' }, null, 2));

    const packageADir = path.join(tempDir, 'packages', 'a');
    await mkdir(packageADir, { recursive: true });
    await writeFile(path.join(packageADir, 'package.json'), JSON.stringify({ name: 'pkg-a', version: '1.0.0' }, null, 2));

    const toolDir = path.join(tempDir, 'tools', 'utility');
    await mkdir(toolDir, { recursive: true });
    await writeFile(path.join(toolDir, 'package.json'), JSON.stringify({ name: 'pkg-tool', version: '1.0.0' }, null, 2));

    const paths = await collectWorkspaceManifestPaths(tempDir);
    expect(paths).toEqual(['.', 'packages/a', 'tools/utility']);
  });

  it('throws when versions are not aligned', () => {
    const packages = [
      { name: 'root', version: '1.0.0', path: '.' },
      { name: 'service-a', version: '1.0.1', path: 'services/a' },
    ];

    expect(() => assertVersionsAligned(packages, '1.0.0')).toThrow('Version mismatch detected');
  });
});
