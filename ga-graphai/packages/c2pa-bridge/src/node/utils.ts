import { createHash } from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';
import mime from 'mime-types';
import { canonicalize } from '../common/canonical';
import { ProvenanceManifest } from '../types';
import { manifestCanonicalString } from '../common/manifest';

export async function hashFile(filePath: string): Promise<string> {
  const file = await fs.readFile(filePath);
  const hash = createHash('sha256');
  hash.update(file);
  return hash.digest('hex');
}

export function hashCanonical(value: unknown): string {
  const hash = createHash('sha256');
  if (typeof value === 'string') {
    hash.update(value);
  } else {
    hash.update(canonicalize(value));
  }
  return hash.digest('hex');
}

export function fingerprintPublicKey(publicKey: string): string {
  const hash = createHash('sha256');
  hash.update(publicKey.trim());
  return hash.digest('hex');
}

export function determineMime(assetPath: string, explicit?: string): string | undefined {
  if (explicit) {
    return explicit;
  }
  const guessed = mime.lookup(assetPath);
  return guessed || undefined;
}

export function defaultManifestPath(assetPath: string): string {
  return `${assetPath}.cpb.json`;
}

export function computeManifestHash(manifest: ProvenanceManifest): string {
  return hashCanonical(manifestCanonicalString(manifest));
}

export function computeClaimHash(manifest: ProvenanceManifest): string {
  return hashCanonical(manifest.claim);
}

export async function ensureDirectory(filePath: string): Promise<void> {
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
}
