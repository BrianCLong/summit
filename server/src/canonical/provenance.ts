/**
 * Canonical Entities - Provenance Carriers
 *
 * Implements cryptographically-verifiable provenance tracking:
 * source → assertion → transform pipeline with content hashing
 */

import crypto from 'crypto';

export interface ProvenanceSource {
  /** Source identifier (URL, file path, system name) */
  sourceId: string;

  /** Source type (api, file, database, manual, etc.) */
  sourceType: string;

  /** When the data was retrieved from source */
  retrievedAt: Date;

  /** Source-specific metadata */
  sourceMetadata: Record<string, any>;

  /** Hash of original source content */
  sourceContentHash: string;
}

export interface ProvenanceAssertion {
  /** Unique assertion ID */
  assertionId: string;

  /** The claim being made (e.g., "entity exists", "property has value") */
  claim: string;

  /** Who/what made this assertion */
  assertedBy: {
    type: 'user' | 'system' | 'algorithm' | 'import';
    identifier: string;
  };

  /** When the assertion was made */
  assertedAt: Date;

  /** Confidence level (0-1) */
  confidence: number;

  /** Supporting evidence references */
  evidence: string[];

  /** Hash of assertion content */
  assertionHash: string;
}

export interface ProvenanceTransform {
  /** Unique transform ID */
  transformId: string;

  /** Transform type (normalization, enrichment, inference, etc.) */
  transformType: string;

  /** Algorithm or process used */
  algorithm: string;

  /** Algorithm version */
  algorithmVersion: string;

  /** Input references */
  inputs: string[];

  /** Transform parameters */
  parameters: Record<string, any>;

  /** When transform was applied */
  transformedAt: Date;

  /** Hash of transform operation */
  transformHash: string;
}

export interface ProvenanceChain {
  /** Unique chain ID */
  chainId: string;

  /** Source of the data */
  source: ProvenanceSource;

  /** Assertions made about the data */
  assertions: ProvenanceAssertion[];

  /** Transforms applied to the data */
  transforms: ProvenanceTransform[];

  /** Final hash of entire chain */
  chainHash: string;

  /** When this chain was created */
  createdAt: Date;
}

export interface ProvenanceManifest {
  /** Manifest version */
  version: string;

  /** What entities/subgraph this manifest covers */
  scope: {
    entityIds: string[];
    entityTypes: string[];
    timeRange?: {
      from: Date;
      to: Date;
    };
  };

  /** All provenance chains for this manifest */
  chains: ProvenanceChain[];

  /** Manifest metadata */
  metadata: {
    generatedAt: Date;
    generatedBy: string;
    description?: string;
  };

  /** Signature of entire manifest */
  manifestHash: string;
}

/**
 * Hash a provenance source
 */
export function hashSource(source: Omit<ProvenanceSource, 'sourceContentHash'>): string {
  const content = JSON.stringify({
    sourceId: source.sourceId,
    sourceType: source.sourceType,
    retrievedAt: source.retrievedAt.toISOString(),
    sourceMetadata: source.sourceMetadata,
  });

  return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * Hash a provenance assertion
 */
export function hashAssertion(assertion: Omit<ProvenanceAssertion, 'assertionHash'>): string {
  const content = JSON.stringify({
    assertionId: assertion.assertionId,
    claim: assertion.claim,
    assertedBy: assertion.assertedBy,
    assertedAt: assertion.assertedAt.toISOString(),
    confidence: assertion.confidence,
    evidence: assertion.evidence.sort(),
  });

  return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * Hash a provenance transform
 */
export function hashTransform(transform: Omit<ProvenanceTransform, 'transformHash'>): string {
  const content = JSON.stringify({
    transformId: transform.transformId,
    transformType: transform.transformType,
    algorithm: transform.algorithm,
    algorithmVersion: transform.algorithmVersion,
    inputs: transform.inputs.sort(),
    parameters: transform.parameters,
    transformedAt: transform.transformedAt.toISOString(),
  });

  return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * Hash a complete provenance chain
 */
export function hashChain(chain: Omit<ProvenanceChain, 'chainHash'>): string {
  const content = JSON.stringify({
    chainId: chain.chainId,
    sourceHash: chain.source.sourceContentHash,
    assertionHashes: chain.assertions.map(a => a.assertionHash).sort(),
    transformHashes: chain.transforms.map(t => t.transformHash).sort(),
    createdAt: chain.createdAt.toISOString(),
  });

  return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * Hash a complete provenance manifest
 */
export function hashManifest(manifest: Omit<ProvenanceManifest, 'manifestHash'>): string {
  const content = JSON.stringify({
    version: manifest.version,
    scope: manifest.scope,
    chainHashes: manifest.chains.map(c => c.chainHash).sort(),
    metadata: manifest.metadata,
  });

  return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * Verify integrity of a provenance chain
 */
export function verifyChain(chain: ProvenanceChain): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Verify source hash
  const sourceHash = hashSource(chain.source);
  if (sourceHash !== chain.source.sourceContentHash) {
    errors.push(`Source hash mismatch: expected ${chain.source.sourceContentHash}, got ${sourceHash}`);
  }

  // Verify assertion hashes
  for (const assertion of chain.assertions) {
    const assertionHash = hashAssertion(assertion);
    if (assertionHash !== assertion.assertionHash) {
      errors.push(`Assertion ${assertion.assertionId} hash mismatch`);
    }
  }

  // Verify transform hashes
  for (const transform of chain.transforms) {
    const transformHash = hashTransform(transform);
    if (transformHash !== transform.transformHash) {
      errors.push(`Transform ${transform.transformId} hash mismatch`);
    }
  }

  // Verify chain hash
  const chainHash = hashChain(chain);
  if (chainHash !== chain.chainHash) {
    errors.push(`Chain hash mismatch: expected ${chain.chainHash}, got ${chainHash}`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Verify integrity of a provenance manifest
 */
export function verifyManifest(manifest: ProvenanceManifest): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Verify all chains
  for (const chain of manifest.chains) {
    const chainVerification = verifyChain(chain);
    if (!chainVerification.valid) {
      errors.push(`Chain ${chain.chainId} verification failed: ${chainVerification.errors.join(', ')}`);
    }
  }

  // Verify manifest hash
  const manifestHash = hashManifest(manifest);
  if (manifestHash !== manifest.manifestHash) {
    errors.push(`Manifest hash mismatch: expected ${manifest.manifestHash}, got ${manifestHash}`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Create a new provenance chain
 */
export function createProvenanceChain(
  chainId: string,
  source: Omit<ProvenanceSource, 'sourceContentHash'>,
  assertions: Omit<ProvenanceAssertion, 'assertionHash'>[],
  transforms: Omit<ProvenanceTransform, 'transformHash'>[],
): ProvenanceChain {
  const sourceWithHash: ProvenanceSource = {
    ...source,
    sourceContentHash: hashSource(source),
  };

  const assertionsWithHash: ProvenanceAssertion[] = assertions.map(a => ({
    ...a,
    assertionHash: hashAssertion(a),
  }));

  const transformsWithHash: ProvenanceTransform[] = transforms.map(t => ({
    ...t,
    transformHash: hashTransform(t),
  }));

  const chainWithoutHash: Omit<ProvenanceChain, 'chainHash'> = {
    chainId,
    source: sourceWithHash,
    assertions: assertionsWithHash,
    transforms: transformsWithHash,
    createdAt: new Date(),
  };

  return {
    ...chainWithoutHash,
    chainHash: hashChain(chainWithoutHash),
  };
}

/**
 * Create a provenance manifest for a set of chains
 */
export function createProvenanceManifest(
  scope: ProvenanceManifest['scope'],
  chains: ProvenanceChain[],
  metadata: ProvenanceManifest['metadata'],
): ProvenanceManifest {
  const manifestWithoutHash: Omit<ProvenanceManifest, 'manifestHash'> = {
    version: '1.0.0',
    scope,
    chains,
    metadata,
  };

  return {
    ...manifestWithoutHash,
    manifestHash: hashManifest(manifestWithoutHash),
  };
}
