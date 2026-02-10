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
export * from './proof-carrying-types';

// Core components
export { HashTreeBuilder, createHashTreeBuilder } from './hash-tree-builder';
export type { FileHashInfo } from './hash-tree-builder';

export {
  ModelCardGenerator,
  createModelCardFromExport,
  calculateQualityMetrics,
  mergeModelCards,
} from './model-card-generator';
export type { DataSource, TransformInput, QualityMetrics } from './model-card-generator';

export {
  DisclosurePackager,
  AudienceScopes,
} from './disclosure-packager';
export type { PackagerConfig, PackageOptions } from './disclosure-packager';

export {
  RevocationRegistry,
  DistributedRevocationChecker,
  PersistentRevocationRegistry,
} from './revocation-registry';
export type {
  RevocationRegistryConfig,
  RevokeOptions,
  DatabaseAdapter,
} from './revocation-registry';

export {
  CitationValidator,
  PublishingPipeline,
  StandardLicenses,
} from './citation-validator';
export type {
  CitationRegistry,
  ValidationConfig,
} from './citation-validator';

export {
  BundleVerifier,
  quickVerify,
  verifyWalletFile,
} from './bundle-verifier';
export type { VerifierConfig } from './bundle-verifier';

export {
  ProofCarryingPublisher,
  createPublisherFromEnv,
  integrateWithExport,
} from './proof-carrying-publisher';
export type {
  PublisherConfig,
  PublishOptions,
  ExportIntegrationOptions,
} from './proof-carrying-publisher';
