import fs from 'fs';
import { createHash } from 'crypto';
import { PluginManifest } from './PluginHost';

export async function verifySignature(manifest: PluginManifest, filePath: string) {
  if (!manifest.signature || !manifest.sbomDigest) {
    throw new Error('unsigned plugin');
  }
  const buf = fs.readFileSync(filePath);
  const digest = createHash('sha256').update(buf).digest('hex');
  if (digest !== manifest.sbomDigest) {
    throw new Error('sbom mismatch');
  }
}
