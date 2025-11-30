/**
 * Proof-Carrying Analytics (PCA) Verifier
 * Main entry point - exports all core functionality
 */

export { ProvenanceHasher } from './hasher.js';
export { ManifestBuilder } from './manifest.js';
export { ProvenanceVerifier } from './verifier.js';
export {
  defaultExecutor,
  parseTransform,
  dedupeTransform,
  aggregateTransform,
  filterTransform,
} from './transforms.js';
export type {
  Transform,
  ProvenanceNode,
  ProvenanceManifest,
  TransformDAG,
  VerificationResult,
} from './types.js';
export { program as cli } from './cli.js';
