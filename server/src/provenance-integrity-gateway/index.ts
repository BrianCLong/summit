/**
 * Provenance & Integrity Gateway (PIG)
 *
 * Official Content Firewall for governments and enterprises providing:
 * - Inbound media provenance verification (C2PA)
 * - Outbound official content signing
 * - Impersonation and deepfake detection
 * - Tamper-evident truth bundle generation
 * - Asset revocation and propagation
 * - Governance and compliance dashboards
 *
 * @module provenance-integrity-gateway
 */

// Types
export * from './types.js';

// Services
export { C2PAValidationService, c2paValidationService, type C2PAValidationServiceConfig } from './C2PAValidationService.js';
export { ContentSigningService, contentSigningService, type ContentSigningServiceConfig } from './ContentSigningService.js';
export { DeepfakeDetectionService, deepfakeDetectionService, type DeepfakeDetectionConfig } from './DeepfakeDetectionService.js';
export { TruthBundleService, truthBundleService, type TruthBundleServiceConfig } from './TruthBundleService.js';
export { NarrativeConflictService, narrativeConflictService, type NarrativeConflictConfig } from './NarrativeConflictService.js';
export { PIGGovernanceService, pigGovernanceService, type PIGGovernanceServiceConfig } from './PIGGovernanceService.js';

// Main Gateway
export { ProvenanceIntegrityGateway, createPIGInstance, type PIGConfig } from './ProvenanceIntegrityGateway.js';
