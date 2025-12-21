export interface ManifestClaim { hashRoot: string; [k: string]: any }
export interface Manifest { claims: ManifestClaim[] }

export function verifyManifest(manifest: Manifest){
  if(!manifest || !Array.isArray((manifest as any).claims)){
    throw new Error('invalid manifest');
  }
  for(const claim of manifest.claims){
    if(typeof claim.hashRoot !== 'string' || !/^([a-f0-9]{64})$/.test(claim.hashRoot)){
      throw new Error('invalid hash');
    }
  }
  return true;
}
