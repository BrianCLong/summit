import * as fs from 'fs';
import * as path from 'path';
import { ReleaseBundle, parseManifest, parseChecksums } from './core.js';

export function loadBundleFromDir(dirPath: string): ReleaseBundle {
  const manifestPath = path.join(dirPath, 'release-manifest.json');
  const checksumsPath = path.join(dirPath, 'checksums.txt');

  if (!fs.existsSync(manifestPath)) {
    throw new Error(`Manifest not found at ${manifestPath}`);
  }

  const manifestContent = fs.readFileSync(manifestPath, 'utf-8');
  const manifest = parseManifest(manifestContent);

  let checksums: Record<string, string> = {};
  if (fs.existsSync(checksumsPath)) {
    const checksumsContent = fs.readFileSync(checksumsPath, 'utf-8');
    checksums = parseChecksums(checksumsContent);
  }

  return {
    manifest,
    checksums
  };
}

export { parseManifest, parseChecksums, ReleaseBundle } from './core.js';
