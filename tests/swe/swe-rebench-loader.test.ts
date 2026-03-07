import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { SweRebenchLoader } from '../../datasets/swe-rebench/loader';

describe('SweRebenchLoader', () => {
  const tempDir = mkdtempSync(path.join(os.tmpdir(), 'swe-loader-'));

  afterAll(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('loads and filters JSON datasets', async () => {
    const datasetPath = path.join(tempDir, 'dataset.json');
    writeFileSync(
      datasetPath,
      JSON.stringify([
        {
          instance_id: 'one',
          repo: 'a/b',
          base_commit: 'abc',
          image_name: 'img:v1',
          language: 'python',
        },
        {
          instance_id: 'two',
          repo: 'a/c',
          base_commit: 'def',
          image_name: 'img:v2',
          language: 'java',
        },
      ])
    );

    const loader = new SweRebenchLoader();
    const rows = await loader.loadDataset(datasetPath, {
      languages: ['python'],
      maxInstances: 1,
    });

    expect(rows).toHaveLength(1);
    expect(rows[0].instance_id).toBe('one');
  });

  it('throws for malformed rows', async () => {
    const datasetPath = path.join(tempDir, 'invalid.json');
    writeFileSync(datasetPath, JSON.stringify([{ repo: 'a/b' }]));

    const loader = new SweRebenchLoader();
    await expect(loader.loadDataset(datasetPath)).rejects.toThrow('Invalid SWE-rebench row');
  });
});
