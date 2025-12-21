/**
 * STIX 2.1 Bundle Serializer
 *
 * Creates valid STIX 2.1 bundles from IntelGraph entities with
 * full provenance tracking, TLP markings, and digital signatures.
 */

import { randomUUID, createHash, createHmac } from 'node:crypto';
import type { Pool } from 'pg';
import type { Driver } from 'neo4j-driver';
import type { Entity } from '../../repos/EntityRepo.js';
import type {
  StixBundle,
  StixObject,
  StixIdentifier,
  BundleExportOptions,
  BundleExportResult,
  Identity,
  Relationship,
  TlpLevel,
} from './types.js';
import {
  INTELGRAPH_EXTENSION_DEFINITION,
  getTlpMarking,
} from './types.js';
import {
  mapEntityToStix,
  createRelationship,
  createProducerIdentity,
  getTlpMarkingRef,
  type EntityMappingResult,
  type RelationshipInput,
} from './entity-mapper.js';
import logger from '../../config/logger.js';

const bundleLogger = logger.child({ module: 'stix-bundle-serializer' });

// ============================================================================
// Bundle Factory
// ============================================================================

export interface BundleFactoryDeps {
  pg: Pool;
  neo4j: Driver;
}

export class StixBundleFactory {
  constructor(private deps: BundleFactoryDeps) {}

  /**
   * Export entities to a STIX 2.1 bundle
   */
  async exportBundle(
    entities: Entity[],
    options: BundleExportOptions,
    exportedBy: string,
  ): Promise<BundleExportResult> {
    const startTime = Date.now();
    bundleLogger.info({
      entityCount: entities.length,
      options: {
        tlpLevel: options.tlpLevel,
        includeRelationships: options.includeRelationships,
        includeExtensions: options.includeExtensions,
      },
    }, 'Starting STIX bundle export');

    // Create producer identity
    const producer = createProducerIdentity(
      options.producerName || 'IntelGraph Platform',
      options.producerClass || 'system',
    );

    // Get TLP marking
    const tlpLevel = options.tlpLevel || 'green';
    const tlpMarking = getTlpMarking(tlpLevel);
    const tlpMarkingRef = getTlpMarkingRef(tlpLevel);

    // Build mapping context
    const mappingContext = {
      producerRef: producer.id,
      tlpMarkingRef,
      labels: options.labels,
      includeExtensions: options.includeExtensions ?? true,
      investigationId: options.investigationId,
      caseId: options.caseId,
    };

    // Map entities to STIX objects
    const mappingResults: EntityMappingResult[] = [];
    const entityIdToStixId = new Map<string, StixIdentifier>();

    for (const entity of entities) {
      const result = mapEntityToStix(entity, mappingContext);
      mappingResults.push(result);
      entityIdToStixId.set(entity.id, result.stixId);
    }

    // Collect all STIX objects
    const objects: StixObject[] = [
      producer,
      tlpMarking,
    ];

    // Add IntelGraph extension definition if using extensions
    if (options.includeExtensions !== false) {
      objects.push(INTELGRAPH_EXTENSION_DEFINITION);
    }

    // Add mapped entities
    for (const result of mappingResults) {
      objects.push(result.stixObject);
    }

    // Fetch and add relationships if requested
    let relationshipCount = 0;
    if (options.includeRelationships !== false) {
      const relationships = await this.fetchRelationships(
        entities.map(e => e.id),
        entityIdToStixId,
        options.relationshipDepth || 1,
        mappingContext,
      );
      objects.push(...relationships);
      relationshipCount = relationships.length;
    }

    // Create bundle
    const bundle = createBundle(objects);

    // Calculate checksum
    const checksum = calculateBundleChecksum(bundle);

    // Sign bundle if key provided
    let signature: string | undefined;
    let signatureAlgorithm: string | undefined;
    if (options.signingKey) {
      const sigResult = signBundle(bundle, options.signingKey);
      signature = sigResult.signature;
      signatureAlgorithm = sigResult.algorithm;
    }

    const duration = Date.now() - startTime;
    bundleLogger.info({
      bundleId: bundle.id,
      objectCount: objects.length,
      entityCount: entities.length,
      relationshipCount,
      duration,
    }, 'STIX bundle export completed');

    return {
      bundle,
      metadata: {
        exportedAt: new Date().toISOString(),
        exportedBy,
        entityCount: entities.length,
        relationshipCount,
        tlpLevel,
        signature,
        signatureAlgorithm,
        checksum,
      },
    };
  }

  /**
   * Fetch relationships between entities from Neo4j
   */
  private async fetchRelationships(
    entityIds: string[],
    entityIdToStixId: Map<string, StixIdentifier>,
    depth: number,
    ctx: { producerRef?: StixIdentifier; tlpMarkingRef?: StixIdentifier },
  ): Promise<Relationship[]> {
    if (entityIds.length === 0) return [];

    const session = this.deps.neo4j.session();
    try {
      const result = await session.executeRead(async (tx) => {
        return tx.run(
          `
          MATCH (source:Entity)-[r]->(target:Entity)
          WHERE source.id IN $entityIds AND target.id IN $entityIds
          RETURN source.id AS sourceId,
                 target.id AS targetId,
                 type(r) AS relType,
                 r.description AS description,
                 r.startTime AS startTime,
                 r.stopTime AS stopTime,
                 r.confidence AS confidence
          `,
          { entityIds },
        );
      });

      const relationships: Relationship[] = [];

      for (const record of result.records) {
        const sourceId = record.get('sourceId');
        const targetId = record.get('targetId');
        const sourceStixId = entityIdToStixId.get(sourceId);
        const targetStixId = entityIdToStixId.get(targetId);

        if (sourceStixId && targetStixId) {
          const input: RelationshipInput = {
            sourceEntityId: sourceId,
            sourceStixId,
            targetEntityId: targetId,
            targetStixId,
            relationshipType: record.get('relType'),
            description: record.get('description'),
            startTime: record.get('startTime'),
            stopTime: record.get('stopTime'),
            confidence: record.get('confidence'),
          };

          relationships.push(createRelationship(input, ctx));
        }
      }

      return relationships;
    } finally {
      await session.close();
    }
  }
}

// ============================================================================
// Bundle Creation Utilities
// ============================================================================

/**
 * Create a STIX 2.1 bundle from objects
 */
export function createBundle(objects: StixObject[]): StixBundle {
  return {
    type: 'bundle',
    id: `bundle--${randomUUID()}` as StixIdentifier,
    objects,
  };
}

/**
 * Calculate SHA-256 checksum of bundle
 */
export function calculateBundleChecksum(bundle: StixBundle): string {
  const content = JSON.stringify(bundle, Object.keys(bundle).sort());
  return createHash('sha256').update(content).digest('hex');
}

/**
 * Sign bundle with HMAC-SHA256
 */
export function signBundle(
  bundle: StixBundle,
  signingKey: string,
): { signature: string; algorithm: string } {
  const content = JSON.stringify(bundle, Object.keys(bundle).sort());
  const signature = createHmac('sha256', signingKey)
    .update(content)
    .digest('base64url');

  return {
    signature,
    algorithm: 'HMAC-SHA256',
  };
}

/**
 * Verify bundle signature
 */
export function verifyBundleSignature(
  bundle: StixBundle,
  signature: string,
  signingKey: string,
): boolean {
  const content = JSON.stringify(bundle, Object.keys(bundle).sort());
  const expectedSignature = createHmac('sha256', signingKey)
    .update(content)
    .digest('base64url');

  // Constant-time comparison
  if (signature.length !== expectedSignature.length) return false;
  let result = 0;
  for (let i = 0; i < signature.length; i++) {
    result |= signature.charCodeAt(i) ^ expectedSignature.charCodeAt(i);
  }
  return result === 0;
}

// ============================================================================
// Bundle Serialization Formats
// ============================================================================

/**
 * Serialize bundle to JSON string
 */
export function serializeBundleToJson(bundle: StixBundle, pretty = true): string {
  return JSON.stringify(bundle, null, pretty ? 2 : undefined);
}

/**
 * Serialize bundle with envelope (for TAXII)
 */
export function serializeBundleWithEnvelope(
  bundle: StixBundle,
  metadata: BundleExportResult['metadata'],
): string {
  const envelope = {
    '@context': {
      stix: 'http://stix.mitre.org/stix-2',
      intelgraph: 'https://intelgraph.io/schema/',
    },
    metadata: {
      ...metadata,
      bundleId: bundle.id,
      objectCount: bundle.objects.length,
    },
    bundle,
  };

  return JSON.stringify(envelope, null, 2);
}

/**
 * Parse bundle from JSON string
 */
export function parseBundleFromJson(json: string): StixBundle {
  const parsed = JSON.parse(json);

  if (parsed.type !== 'bundle') {
    throw new Error('Invalid STIX bundle: missing or invalid type');
  }

  if (!parsed.id?.startsWith('bundle--')) {
    throw new Error('Invalid STIX bundle: missing or invalid id');
  }

  if (!Array.isArray(parsed.objects)) {
    throw new Error('Invalid STIX bundle: objects must be an array');
  }

  return parsed as StixBundle;
}

// ============================================================================
// Bundle Validation
// ============================================================================

export interface BundleValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  statistics: {
    totalObjects: number;
    objectsByType: Record<string, number>;
    hasProducerIdentity: boolean;
    hasTlpMarking: boolean;
    hasExtensions: boolean;
  };
}

/**
 * Validate a STIX 2.1 bundle
 */
export function validateBundle(bundle: StixBundle): BundleValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const objectsByType: Record<string, number> = {};

  // Check bundle structure
  if (bundle.type !== 'bundle') {
    errors.push('Bundle type must be "bundle"');
  }

  if (!bundle.id?.match(/^bundle--[0-9a-f-]{36}$/i)) {
    errors.push('Bundle ID must be in format bundle--{uuid}');
  }

  if (!Array.isArray(bundle.objects)) {
    errors.push('Bundle objects must be an array');
    return {
      valid: false,
      errors,
      warnings,
      statistics: {
        totalObjects: 0,
        objectsByType: {},
        hasProducerIdentity: false,
        hasTlpMarking: false,
        hasExtensions: false,
      },
    };
  }

  // Track statistics
  let hasProducerIdentity = false;
  let hasTlpMarking = false;
  let hasExtensions = false;
  const seenIds = new Set<string>();

  for (let i = 0; i < bundle.objects.length; i++) {
    const obj = bundle.objects[i];

    // Check for required properties
    if (!obj.type) {
      errors.push(`Object at index ${i} missing type`);
      continue;
    }

    if (!obj.id) {
      errors.push(`Object at index ${i} missing id`);
      continue;
    }

    // Check for duplicate IDs
    if (seenIds.has(obj.id)) {
      warnings.push(`Duplicate object ID: ${obj.id}`);
    }
    seenIds.add(obj.id);

    // Count by type
    objectsByType[obj.type] = (objectsByType[obj.type] || 0) + 1;

    // Check for producer identity
    if (obj.type === 'identity' && (obj as Identity).identity_class) {
      hasProducerIdentity = true;
    }

    // Check for TLP marking
    if (obj.type === 'marking-definition') {
      hasTlpMarking = true;
    }

    // Check for extensions
    if (obj.type === 'extension-definition') {
      hasExtensions = true;
    }

    // Validate spec_version
    if ('spec_version' in obj && obj.spec_version !== '2.1') {
      warnings.push(`Object ${obj.id} has non-2.1 spec_version: ${obj.spec_version}`);
    }

    // Validate timestamps
    if ('created' in obj && obj.created) {
      if (!isValidTimestamp(obj.created)) {
        warnings.push(`Object ${obj.id} has invalid created timestamp`);
      }
    }

    if ('modified' in obj && obj.modified) {
      if (!isValidTimestamp(obj.modified)) {
        warnings.push(`Object ${obj.id} has invalid modified timestamp`);
      }
    }
  }

  // Best practice warnings
  if (!hasProducerIdentity) {
    warnings.push('Bundle does not contain a producer identity');
  }

  if (!hasTlpMarking) {
    warnings.push('Bundle does not contain TLP marking definitions');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    statistics: {
      totalObjects: bundle.objects.length,
      objectsByType,
      hasProducerIdentity,
      hasTlpMarking,
      hasExtensions,
    },
  };
}

function isValidTimestamp(timestamp: string): boolean {
  const date = new Date(timestamp);
  return !isNaN(date.getTime());
}

// ============================================================================
// Bundle Merge Utilities
// ============================================================================

/**
 * Merge multiple STIX bundles into one
 */
export function mergeBundles(bundles: StixBundle[]): StixBundle {
  const seenIds = new Set<string>();
  const mergedObjects: StixObject[] = [];

  for (const bundle of bundles) {
    for (const obj of bundle.objects) {
      if (!seenIds.has(obj.id)) {
        seenIds.add(obj.id);
        mergedObjects.push(obj);
      }
    }
  }

  return createBundle(mergedObjects);
}

/**
 * Split a large bundle into smaller chunks
 */
export function splitBundle(bundle: StixBundle, maxObjectsPerBundle: number): StixBundle[] {
  const chunks: StixBundle[] = [];

  for (let i = 0; i < bundle.objects.length; i += maxObjectsPerBundle) {
    const chunkObjects = bundle.objects.slice(i, i + maxObjectsPerBundle);
    chunks.push(createBundle(chunkObjects));
  }

  return chunks;
}

/**
 * Filter bundle objects by type
 */
export function filterBundleByType(bundle: StixBundle, types: string[]): StixBundle {
  const filteredObjects = bundle.objects.filter(obj => types.includes(obj.type));
  return createBundle(filteredObjects);
}

/**
 * Extract object IDs referenced in relationships
 */
export function getReferencedIds(bundle: StixBundle): Set<StixIdentifier> {
  const ids = new Set<StixIdentifier>();

  for (const obj of bundle.objects) {
    if (obj.type === 'relationship') {
      const rel = obj as Relationship;
      ids.add(rel.source_ref);
      ids.add(rel.target_ref);
    }
  }

  return ids;
}
