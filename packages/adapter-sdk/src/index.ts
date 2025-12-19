export {
  buildAdapterBundle,
} from './bundle/builder.js';

export {
  verifyAdapterBundle,
} from './bundle/verifier.js';

export type {
  AdapterArtifacts,
  AdapterCompatibilityMatrix,
  AdapterManifest,
  AdapterRuntimeTarget,
  BundleBuildOptions,
  BundleBuildResult,
  BundleVerificationOptions,
  BundleVerificationResult,
} from './bundle/types.js';

export { BundleValidationError } from './bundle/types.js';
