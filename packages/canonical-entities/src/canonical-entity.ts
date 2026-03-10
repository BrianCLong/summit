import { CanonicalEntity as BaseCanonicalEntity } from './types.js';

/**
 * Enhanced Canonical Entity for Identity Spine
 * Enforces that all graph interactions reference a verified canonical identity.
 */
export interface CanonicalEntity extends BaseCanonicalEntity {
  /**
   * The globally unique, verified identifier for this entity.
   * All graph edges MUST reference this ID only.
   */
  canonicalId: string;

  /** Metadata about the identity resolution process */
  identityMetadata: {
    resolverId: string;
    resolvedAt: Date;
    confidence: number;
    mergeHistory: string[];
  };
}

/**
 * Validates that an entity has a valid canonical identity.
 */
export function hasCanonicalIdentity(entity: any): entity is CanonicalEntity {
  return (
    entity &&
    typeof entity.canonicalId === 'string' &&
    entity.canonicalId.length > 0 &&
    entity.identityMetadata !== undefined
  );
}
