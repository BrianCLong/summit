import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildMediaEvidence } from '../provenance.js';

const MINIMAL_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PxX1VQAAAABJRU5ErkJggg==';

function writeFixture(filename: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'summit-media-'));
  const filePath = path.join(dir, filename);
  fs.writeFileSync(filePath, Buffer.from(MINIMAL_PNG_BASE64, 'base64'));
  return filePath;
}

function hashBuffer(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

describe('media provenance evidence', () => {
  it('extracts deterministic metadata from a fixture', async () => {
    const fixturePath = writeFixture('fixture.png');
    const inputPath = path.relative(process.cwd(), fixturePath);
    const evidence = await buildMediaEvidence({
      inputPath,
      resolvedPath: fixturePath,
      toolName: 'summit',
      toolVersion: 'test',
    });

    expect(evidence.report.media.mime).toBe('image/png');
    expect(evidence.report.media.container).toBe('png');
    expect(evidence.report.media.codec).toBe('png');
    expect(evidence.report).not.toHaveProperty('generatedAt');
    expect(evidence.metrics).not.toHaveProperty('generatedAt');
  });

  it('matches the golden report output for a fixture', async () => {
    const fixturePath = writeFixture('golden.png');
    const buffer = fs.readFileSync(fixturePath);
    const expectedHash = hashBuffer(buffer);
    const inputPath = path.relative(process.cwd(), fixturePath);

    const evidence = await buildMediaEvidence({
      inputPath,
      resolvedPath: fixturePath,
      toolName: 'summit',
      toolVersion: 'test',
    });

    expect(evidence.report).toMatchObject({
      schemaVersion: '1.0.0',
      input: {
        path: inputPath,
        filename: 'golden.png',
      },
      media: {
        sha256: expectedHash,
        mime: 'image/png',
        extension: '.png',
        container: 'png',
        codec: 'png',
      },
      provenance: {
        c2pa: {
          present: false,
          status: 'absent',
        },
      },
    });

    expect(evidence.metrics).toEqual({
      schemaVersion: '1.0.0',
      counts: {
        files: 1,
        c2paPresent: 0,
        c2paUnverified: 0,
      },
    });
  });
});
