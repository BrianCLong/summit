/**
 * Export Manifest Generation
 *
 * Creates verifiable export packages with hash trees and chain-of-custody evidence.
 */

import { createHash } from 'crypto';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface ExportManifest {
  /** Manifest version */
  version: '1.0';
  /** Export ID */
  exportId: string;
  /** Export timestamp */
  exportedAt: Date;
  /** User who created export */
  exportedBy: string;
  /** Tenant ID */
  tenantId: string;
  /** Investigation ID */
  investigationId?: string;
  /** Authority that granted export */
  authorityId?: string;
  /** Export contents */
  contents: {
    /** Number of entities */
    entityCount: number;
    /** Number of relationships */
    relationshipCount: number;
    /** Entity types included */
    entityTypes: string[];
    /** Date range of data */
    dateRange?: {
      from: Date;
      to: Date;
    };
  };
  /** Hash tree for verification */
  hashTree: MerkleTree;
  /** Signatures */
  signatures: ExportSignature[];
  /** Revocation status */
  revocation?: {
    revoked: boolean;
    revokedAt?: Date;
    revokedBy?: string;
    reason?: string;
  };
  /** Chain of custody */
  chainOfCustody: CustodyEvent[];
}

export interface MerkleTree {
  /** Root hash */
  rootHash: string;
  /** Tree depth */
  depth: number;
  /** Leaf hashes (entity/relationship hashes) */
  leaves: string[];
  /** Algorithm used */
  algorithm: 'sha256';
}

export interface ExportSignature {
  /** Signer ID */
  signerId: string;
  /** Signature algorithm */
  algorithm: 'RS256' | 'ES256';
  /** Signature value (base64) */
  signature: string;
  /** Signed at */
  signedAt: Date;
  /** Certificate thumbprint */
  certificateThumbprint?: string;
}

export interface CustodyEvent {
  /** Event ID */
  eventId: string;
  /** Event type */
  eventType: 'created' | 'accessed' | 'transferred' | 'verified' | 'revoked';
  /** Actor */
  actor: string;
  /** Timestamp */
  timestamp: Date;
  /** Details */
  details?: Record<string, unknown>;
  /** Hash of manifest at this point */
  manifestHash: string;
}

// -----------------------------------------------------------------------------
// Manifest Builder
// -----------------------------------------------------------------------------

export class ExportManifestBuilder {
  private entityHashes: string[] = [];
  private relationshipHashes: string[] = [];
  private entityTypes: Set<string> = new Set();
  private minDate: Date | null = null;
  private maxDate: Date | null = null;

  /**
   * Add an entity to the manifest
   */
  addEntity(entity: {
    id: string;
    type: string;
    props: Record<string, unknown>;
    createdAt: Date;
  }): void {
    const hash = this.hashEntity(entity);
    this.entityHashes.push(hash);
    this.entityTypes.add(entity.type);
    this.updateDateRange(entity.createdAt);
  }

  /**
   * Add a relationship to the manifest
   */
  addRelationship(relationship: {
    id: string;
    from: string;
    to: string;
    type: string;
    props?: Record<string, unknown>;
  }): void {
    const hash = this.hashRelationship(relationship);
    this.relationshipHashes.push(hash);
  }

  /**
   * Build the export manifest
   */
  build(options: {
    exportedBy: string;
    tenantId: string;
    investigationId?: string;
    authorityId?: string;
  }): ExportManifest {
    const allLeaves = [...this.entityHashes, ...this.relationshipHashes];
    const hashTree = this.buildMerkleTree(allLeaves);

    const exportId = this.generateId();
    const manifest: ExportManifest = {
      version: '1.0',
      exportId,
      exportedAt: new Date(),
      exportedBy: options.exportedBy,
      tenantId: options.tenantId,
      investigationId: options.investigationId,
      authorityId: options.authorityId,
      contents: {
        entityCount: this.entityHashes.length,
        relationshipCount: this.relationshipHashes.length,
        entityTypes: Array.from(this.entityTypes),
        dateRange: this.minDate && this.maxDate
          ? { from: this.minDate, to: this.maxDate }
          : undefined,
      },
      hashTree,
      signatures: [],
      chainOfCustody: [
        {
          eventId: this.generateId(),
          eventType: 'created',
          actor: options.exportedBy,
          timestamp: new Date(),
          manifestHash: hashTree.rootHash,
        },
      ],
    };

    return manifest;
  }

  /**
   * Hash an entity
   */
  private hashEntity(entity: any): string {
    const data = JSON.stringify({
      id: entity.id,
      type: entity.type,
      props: entity.props,
    });
    return createHash('sha256').update(data).digest('hex');
  }

  /**
   * Hash a relationship
   */
  private hashRelationship(rel: any): string {
    const data = JSON.stringify({
      id: rel.id,
      from: rel.from,
      to: rel.to,
      type: rel.type,
    });
    return createHash('sha256').update(data).digest('hex');
  }

  /**
   * Build Merkle tree from leaf hashes
   */
  private buildMerkleTree(leaves: string[]): MerkleTree {
    if (leaves.length === 0) {
      return {
        rootHash: createHash('sha256').update('empty').digest('hex'),
        depth: 0,
        leaves: [],
        algorithm: 'sha256',
      };
    }

    let currentLevel = [...leaves];
    let depth = 0;

    while (currentLevel.length > 1) {
      const nextLevel: string[] = [];
      for (let i = 0; i < currentLevel.length; i += 2) {
        const left = currentLevel[i];
        const right = currentLevel[i + 1] || left; // Duplicate last if odd
        const combined = createHash('sha256')
          .update(left + right)
          .digest('hex');
        nextLevel.push(combined);
      }
      currentLevel = nextLevel;
      depth++;
    }

    return {
      rootHash: currentLevel[0],
      depth,
      leaves,
      algorithm: 'sha256',
    };
  }

  /**
   * Update date range
   */
  private updateDateRange(date: Date): void {
    if (!this.minDate || date < this.minDate) {
      this.minDate = date;
    }
    if (!this.maxDate || date > this.maxDate) {
      this.maxDate = date;
    }
  }

  /**
   * Generate ID
   */
  private generateId(): string {
    return `exp_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// -----------------------------------------------------------------------------
// Manifest Verification
// -----------------------------------------------------------------------------

export class ExportManifestVerifier {
  /**
   * Verify manifest integrity
   */
  verifyIntegrity(manifest: ExportManifest, data: {
    entities: any[];
    relationships: any[];
  }): VerificationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Verify entity count
    if (data.entities.length !== manifest.contents.entityCount) {
      errors.push(`Entity count mismatch: expected ${manifest.contents.entityCount}, got ${data.entities.length}`);
    }

    // Verify relationship count
    if (data.relationships.length !== manifest.contents.relationshipCount) {
      errors.push(`Relationship count mismatch: expected ${manifest.contents.relationshipCount}, got ${data.relationships.length}`);
    }

    // Recompute leaf hashes
    const entityHashes = data.entities.map((e) =>
      createHash('sha256')
        .update(JSON.stringify({ id: e.id, type: e.type, props: e.props }))
        .digest('hex')
    );
    const relHashes = data.relationships.map((r) =>
      createHash('sha256')
        .update(JSON.stringify({ id: r.id, from: r.from, to: r.to, type: r.type }))
        .digest('hex')
    );

    const allHashes = [...entityHashes, ...relHashes];

    // Verify leaf hashes match
    const expectedLeaves = new Set(manifest.hashTree.leaves);
    for (const hash of allHashes) {
      if (!expectedLeaves.has(hash)) {
        errors.push(`Data contains hash not in manifest: ${hash.substring(0, 16)}...`);
      }
    }

    // Recompute Merkle root
    const recomputedTree = this.computeMerkleRoot(allHashes);
    if (recomputedTree !== manifest.hashTree.rootHash) {
      errors.push('Merkle root hash mismatch - data has been tampered with');
    }

    // Check revocation
    if (manifest.revocation?.revoked) {
      warnings.push(`Manifest was revoked on ${manifest.revocation.revokedAt}: ${manifest.revocation.reason}`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      merkleRoot: manifest.hashTree.rootHash,
      recomputedRoot: recomputedTree,
    };
  }

  /**
   * Verify signature
   */
  verifySignature(manifest: ExportManifest, publicKey: string): boolean {
    // In production, use crypto.verify with the actual signature
    // This is a placeholder
    return manifest.signatures.length > 0;
  }

  /**
   * Compute Merkle root from leaves
   */
  private computeMerkleRoot(leaves: string[]): string {
    if (leaves.length === 0) {
      return createHash('sha256').update('empty').digest('hex');
    }

    let currentLevel = [...leaves];
    while (currentLevel.length > 1) {
      const nextLevel: string[] = [];
      for (let i = 0; i < currentLevel.length; i += 2) {
        const left = currentLevel[i];
        const right = currentLevel[i + 1] || left;
        nextLevel.push(
          createHash('sha256').update(left + right).digest('hex')
        );
      }
      currentLevel = nextLevel;
    }

    return currentLevel[0];
  }
}

export interface VerificationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  merkleRoot: string;
  recomputedRoot: string;
}

// -----------------------------------------------------------------------------
// Chain of Custody
// -----------------------------------------------------------------------------

export class ChainOfCustodyManager {
  /**
   * Record access event
   */
  recordAccess(
    manifest: ExportManifest,
    actor: string,
    details?: Record<string, unknown>
  ): void {
    manifest.chainOfCustody.push({
      eventId: this.generateId(),
      eventType: 'accessed',
      actor,
      timestamp: new Date(),
      details,
      manifestHash: manifest.hashTree.rootHash,
    });
  }

  /**
   * Record transfer event
   */
  recordTransfer(
    manifest: ExportManifest,
    fromActor: string,
    toActor: string,
    details?: Record<string, unknown>
  ): void {
    manifest.chainOfCustody.push({
      eventId: this.generateId(),
      eventType: 'transferred',
      actor: fromActor,
      timestamp: new Date(),
      details: { ...details, transferredTo: toActor },
      manifestHash: manifest.hashTree.rootHash,
    });
  }

  /**
   * Revoke manifest
   */
  revoke(
    manifest: ExportManifest,
    actor: string,
    reason: string
  ): void {
    manifest.revocation = {
      revoked: true,
      revokedAt: new Date(),
      revokedBy: actor,
      reason,
    };

    manifest.chainOfCustody.push({
      eventId: this.generateId(),
      eventType: 'revoked',
      actor,
      timestamp: new Date(),
      details: { reason },
      manifestHash: manifest.hashTree.rootHash,
    });
  }

  private generateId(): string {
    return `coc_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
