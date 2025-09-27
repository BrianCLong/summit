import { ReplayResult, Signer, SparManifest } from './types';
import { computeHash, stableStringify } from './utils';

export function replayManifest(manifest: SparManifest, signer?: Signer): ReplayResult {
  const canonicalPayload = {
    promptTemplate: manifest.promptTemplate,
    inputs: manifest.inputs,
    toolTraces: manifest.toolTraces,
    output: manifest.output,
    metadata: manifest.metadata,
    policyTags: manifest.policyTags,
  };

  const canonical = stableStringify(canonicalPayload);
  const hash = computeHash(canonical);

  if (hash !== manifest.hash) {
    throw new Error('Manifest hash mismatch');
  }

  if (signer && !signer.verify(manifest.hash, manifest.signature)) {
    throw new Error('Manifest signature mismatch');
  }

  return {
    canonical,
    hash,
    manifest,
  };
}
