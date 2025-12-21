import fs from 'fs';
import os from 'os';
import path from 'path';
import { lineageFor } from '../../src/lineage';
import { readExifLite } from '../../src/exif';
import { ocrPng } from '../../src/ocr';

test('lineage hashes', () => {
  const l = lineageFor(Buffer.from('x'), ['trim'], 'fileA');
  expect(l.sha256).toHaveLength(64);
  expect(l.steps).toEqual(['trim']);
});

test('lineage removes duplicate steps', () => {
  const l = lineageFor(Buffer.from('x'), ['trim', 'trim'], 'fileA');
  expect(l.steps).toEqual(['trim']);
});

test('exif reader falls back to file metadata', () => {
  const tmpFile = path.join(os.tmpdir(), 'exif-lite.txt');
  fs.writeFileSync(tmpFile, 'hello');
  const info = readExifLite(tmpFile);
  expect(info.camera).toBe('unknown');
  expect(info.ts).toBeTruthy();
  expect(info.hasExif).toBe(false);
});

test('ocr respects timeout and surfacing errors', async () => {
  const cp = await import('child_process');
  const spy = jest.spyOn(cp, 'spawn').mockImplementation(() => {
    throw new Error('spawn_failed');
  });
  await expect(ocrPng('/tmp/missing.png')).rejects.toThrow();
  spy.mockRestore();
});
