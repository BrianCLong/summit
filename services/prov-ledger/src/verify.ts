export type ManifestClaim = { hashRoot: string; subject?: string };
export type Manifest = { claims: ManifestClaim[] };

function isHash(hex: string) {
  return /^([a-f0-9]{64})$/.test(hex);
}

export function verifyManifest(manifest: Manifest) {
  if (!manifest || !Array.isArray((manifest as any).claims)) {
    throw new Error('invalid manifest');
  }
  for (const claim of manifest.claims) {
    if (!claim || typeof claim.hashRoot !== 'string' || !isHash(claim.hashRoot)) {
      throw new Error('invalid hash');
    }
  }
  return true;
}
