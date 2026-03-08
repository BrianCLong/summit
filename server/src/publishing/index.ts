/**
 * Proof-Carrying Publishing
 *
 * End-to-end proof-carrying publishing system for IntelGraph.
 *
 * Features:
 * - Verifiable manifests with hash trees, model cards, and citations
 * - Audience-scoped evidence wallets
 * - Cryptographic signatures and offline verification
 * - Revocation registry with propagation
 * - Citation validation and publishing gates
 */

// Types
export * from './proof-carrying-types.js';

// Core components
export { HashTreeBuilder, createHashTreeBuilder } from './hash-tree-builder.js';
export type { FileHashInfo } from './hash-tree-builder.js';

export {
  ModelCardGenerator,
  createModelCardFromExport,
  calculateQualityMetrics,
  mergeModelCards,
} from './model-card-generator.js';
export type { DataSource, TransformInput, QualityMetrics } from './model-card-generator.js';

export {
  DisclosurePackager,
  AudienceScopes,
} from './disclosure-packager.js';
export type { PackagerConfig, PackageOptions } from './disclosure-packager.js';

export {
  RevocationRegistry,
  DistributedRevocationChecker,
  PersistentRevocationRegistry,
} from './revocation-registry.js';
export type {
  RevocationRegistryConfig,
  RevokeOptions,
  DatabaseAdapter,
} from './revocation-registry.js';

export {
  CitationValidator,
  PublishingPipeline,
  StandardLicenses,
} from './citation-validator.js';
export type {
  CitationRegistry,
  ValidationConfig,
} from './citation-validator.js';

export {
  BundleVerifier,
  quickVerify,
  verifyWalletFile,
} from './bundle-verifier.js';
export type { VerifierConfig } from './bundle-verifier.js';

export {
  ProofCarryingPublisher,
  createPublisherFromEnv,
  integrateWithExport,
} from './proof-carrying-publisher.js';
export type {
  PublisherConfig,
  PublishOptions,
  ExportIntegrationOptions,
} from './proof-carrying-publisher.js';
