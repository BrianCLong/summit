import crypto from 'crypto';

export function sha256(buf: Buffer) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}
export type Manifest = { version: number; claims: { id: string; hashRoot: string; chain: string[] }[] };
export function verifyManifest(manifest: Manifest) {
  if (!manifest || typeof manifest.version !== 'number' || manifest.version <= 0) {
    throw new Error('bad_manifest_version');
  }
  if (!Array.isArray(manifest.claims) || manifest.claims.length === 0) throw new Error('bad_manifest');

  const seenIds = new Set<string>();
  for (const c of manifest.claims) {
    if (!c.id || seenIds.has(c.id)) throw new Error('duplicate_claim');
    seenIds.add(c.id);
    if (!/^([a-f0-9]{64})$/.test(c.hashRoot)) throw new Error('bad_hash');
    if (!Array.isArray(c.chain) || c.chain.some((h) => !/^([a-f0-9]{64})$/.test(h))) {
      throw new Error('bad_chain');
    }
  }
  return true;
}
