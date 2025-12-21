import crypto from 'crypto';

export function sha256(buf: Buffer) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

export type ManifestClaim = { id: string; hashRoot: string; chain: string[] };
export type Manifest = { version: number; claims: ManifestClaim[] };

function isHex64(input: string) {
  return /^[a-f0-9]{64}$/i.test(input);
}

function validateChain(chain: string[]) {
  if (!Array.isArray(chain)) throw new Error('bad_chain');
  for (const step of chain) {
    if (typeof step !== 'string' || !isHex64(step)) throw new Error('bad_chain');
  }
}

export function verifyManifest(manifest: Manifest) {
  if (!manifest || typeof manifest !== 'object') throw new Error('bad_manifest');
  if (!Number.isInteger(manifest.version) || manifest.version < 1) {
    throw new Error('bad_version');
  }
  if (!Array.isArray(manifest.claims) || manifest.claims.length === 0) {
    throw new Error('bad_manifest');
  }

  const ids = new Set<string>();
  for (const claim of manifest.claims) {
    if (!claim || typeof claim !== 'object') throw new Error('bad_claim');
    if (typeof claim.id !== 'string' || claim.id.trim().length === 0) {
      throw new Error('bad_claim');
    }
    if (ids.has(claim.id)) throw new Error('duplicate_claim');
    ids.add(claim.id);

    if (typeof claim.hashRoot !== 'string' || !isHex64(claim.hashRoot)) {
      throw new Error('bad_hash');
    }
    validateChain(claim.chain);
  }

  return true;
}
