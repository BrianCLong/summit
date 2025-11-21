/**
 * Provenance Ledger Extensions
 *
 * Enhanced provenance tracking for Summit platform with:
 * - Bitemporal evidence chains
 * - AI/Copilot attribution
 * - Export manifests with hash trees
 * - Citation tracking
 *
 * @module prov-ledger-extensions
 */

// Evidence chain exports
export {
  EvidenceChainBuilder,
  EvidenceChainVerifier,
  type EvidenceChain,
  type EvidenceNode,
  type VerificationResult as EvidenceVerificationResult,
} from './evidence-chain';

// AI Attribution exports
export * from './ai-attribution';

// Export manifest exports (rename conflicting type)
export {
  ExportManifestBuilder,
  ExportManifestVerifier,
  type ExportManifest,
  type MerkleTree,
  type ExportSignature,
  type CustodyEvent,
  type VerificationResult as ManifestVerificationResult,
} from './export-manifest';

// Citation tracker exports
export * from './citation-tracker';
