import assert from 'node:assert';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { enforceImageGate } from '../src/imageGate.ts';
import type { ImageGateConfig } from '../src/types.ts';

test('fails when artifacts are missing', async () => {
  const config: ImageGateConfig = {
    stageImages: [
      {
        name: 'ghcr.io/example/app@sha256:bad',
        digest: 'sha256:bad',
        signaturePath: 'missing.sig',
        provenancePath: 'missing.intoto.jsonl'
      }
    ]
  };

  const result = await enforceImageGate(process.cwd(), config);
  assert.strictEqual(result.ok, false);
  assert.ok(result.details.length > 0);
});

test('passes when digest, signature, and provenance are present', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'image-gate-'));
  const sigPath = path.join(tmpDir, 'sig');
  const provPath = path.join(tmpDir, 'prov');
  fs.writeFileSync(sigPath, 'signature');
  fs.writeFileSync(provPath, 'provenance');

  const config: ImageGateConfig = {
    stageImages: [
      {
        name: 'ghcr.io/example/app@sha256:9d13b3c4a2b1d4f996bb77dd2f1373b8e6e0dffcb31d4660b9e6f29a3f2a1e5e',
        digest: 'sha256:9d13b3c4a2b1d4f996bb77dd2f1373b8e6e0dffcb31d4660b9e6f29a3f2a1e5e',
        signaturePath: sigPath,
        provenancePath: provPath
      }
    ]
  };

  const result = await enforceImageGate('/', config);
  assert.strictEqual(result.ok, true);
});
