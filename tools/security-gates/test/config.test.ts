import assert from 'node:assert';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { loadConfig } from '../src/config.ts';

test('loads a valid config', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gate-config-'));
  const configPath = path.join(tmpDir, 'config.json');
  fs.writeFileSync(
    configPath,
    JSON.stringify(
      {
        workflowGate: {
          workflowGlobs: ['.github/workflows/test.yml'],
          enforcePinnedActions: true,
          enforceMinimumPermissions: { contents: 'read' }
        },
        imageGate: {
          stageImages: [
            {
              name: 'ghcr.io/example/app@sha256:9d13b3c4a2b1d4f996bb77dd2f1373b8e6e0dffcb31d4660b9e6f29a3f2a1e5e',
              digest: 'sha256:9d13b3c4a2b1d4f996bb77dd2f1373b8e6e0dffcb31d4660b9e6f29a3f2a1e5e',
              signaturePath: 'sig',
              provenancePath: 'prov'
            }
          ]
        },
        secretScan: { paths: ['security'] },
        policyGate: {
          inputPath: 'policies/input.json',
          denyWildcardIam: true,
          allowPublicEndpoints: false
        }
      },
      null,
      2
    )
  );

  const config = loadConfig(configPath);
  assert.ok(config.workflowGate.workflowGlobs.includes('.github/workflows/test.yml'));
  assert.strictEqual(config.imageGate.stageImages.length, 1);
});

test('throws for missing required sections', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gate-config-'));
  const configPath = path.join(tmpDir, 'config.json');
  fs.writeFileSync(configPath, JSON.stringify({ workflowGate: { workflowGlobs: [] } }));
  assert.throws(() => loadConfig(configPath));
});
