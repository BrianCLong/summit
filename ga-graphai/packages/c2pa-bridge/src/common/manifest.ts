import { ProvenanceManifest } from '../types';
import { canonicalize } from './canonical';

export function unsignedManifest(manifest: ProvenanceManifest): Omit<ProvenanceManifest, 'signature'> {
  const { signature: _signature, ...rest } = manifest;
  return rest;
}

export function manifestCanonicalString(manifest: ProvenanceManifest): string {
  return canonicalize(unsignedManifest(manifest));
}

export function claimCanonicalString(manifest: ProvenanceManifest): string {
  return canonicalize(manifest.claim);
}
