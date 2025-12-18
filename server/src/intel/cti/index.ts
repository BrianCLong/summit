/**
 * IntelGraph CTI Module
 *
 * STIX 2.1 Bundle Export and TAXII 2.1 Server Implementation
 *
 * @module intel/cti
 */

// Types
export * from './types.js';

// Entity Mapping
export {
  mapEntityToStix,
  createRelationship,
  createSighting,
  createProducerIdentity,
  buildIntelGraphExtension,
  getTlpMarking,
  getTlpMarkingRef,
  type EntityMappingResult,
  type RelationshipInput,
  type SightingInput,
} from './entity-mapper.js';

// Bundle Serialization
export {
  StixBundleFactory,
  createBundle,
  calculateBundleChecksum,
  signBundle,
  verifyBundleSignature,
  serializeBundleToJson,
  serializeBundleWithEnvelope,
  parseBundleFromJson,
  validateBundle,
  mergeBundles,
  splitBundle,
  filterBundleByType,
  getReferencedIds,
  type BundleFactoryDeps,
  type BundleValidationResult,
} from './bundle-serializer.js';

// Signing Service
export {
  StixSigningService,
  generateSigningKey,
  serializeAirGapPackage,
  parseAirGapPackage,
  calculatePackageIntegrity,
  createSigningService,
  type SignatureAlgorithm,
  type SignatureMetadata,
  type DetachedSignature,
  type SignedBundle,
  type VerificationResult,
  type AirGapPackage,
} from './signing.js';

// TAXII Service
export {
  TaxiiService,
  createTaxiiService,
  type TaxiiServiceConfig,
  type CollectionConfig,
  type ObjectQueryOptions,
} from './taxii-service.js';
