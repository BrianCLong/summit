/**
 * Provenance Tracker
 *
 * Preserves provenance chain and manages ID mapping for federated objects.
 * Integrates with prov-ledger service for chain-of-custody.
 */

import { v4 as uuidv4 } from 'uuid';
import pino from 'pino';
import { SharedObjectRef, ShareableObjectType } from '../models/types.js';

const logger = pino({ name: 'provenance-tracker' });

/**
 * Provenance entry for prov-ledger
 */
export interface ProvenanceEntry {
  id: string;
  entityId: string;
  activity: string;
  agent: string;
  timestamp: Date;
  attributes: Record<string, unknown>;
  previousEntry?: string; // Link to previous entry in chain
}

/**
 * ID mapping entry
 */
export interface IdMapping {
  sourceId: string;
  sourceOrg: string;
  targetId: string;
  targetOrg: string;
  objectType: ShareableObjectType;
  agreementId: string;
  createdAt: Date;
}

/**
 * Provenance Tracker Service
 */
export class ProvenanceTracker {
  private idMappings: Map<string, IdMapping> = new Map();
  private provenanceChain: Map<string, ProvenanceEntry[]> = new Map();

  /**
   * Create a share reference with provenance
   */
  createShareReference(
    sourceObjectId: string,
    sourceObjectType: ShareableObjectType,
    sourceOrgId: string,
    targetOrgId: string,
    agreementId: string,
    sharedBy: string
  ): SharedObjectRef {
    const shareRefId = uuidv4();

    // Create provenance entries
    const provenanceEntries = this.createProvenanceChain(
      sourceObjectId,
      sourceObjectType,
      sourceOrgId,
      targetOrgId,
      agreementId,
      sharedBy
    );

    const shareRef: SharedObjectRef = {
      id: shareRefId,
      sourceObjectId,
      sourceObjectType,
      sourceOrganizationId: sourceOrgId,
      targetOrganizationId: targetOrgId,
      agreementId,
      sharedAt: new Date(),
      sharedBy,
      provenanceChain: provenanceEntries.map((e) => e.id),
      status: 'pending',
    };

    logger.info(
      {
        shareRefId,
        sourceObjectId,
        targetOrgId,
        agreementId,
      },
      'Share reference created'
    );

    return shareRef;
  }

  /**
   * Create provenance chain for a share operation
   */
  private createProvenanceChain(
    objectId: string,
    objectType: ShareableObjectType,
    sourceOrg: string,
    targetOrg: string,
    agreementId: string,
    agent: string
  ): ProvenanceEntry[] {
    const entries: ProvenanceEntry[] = [];

    // Entry 1: Object selection
    const selectionEntry: ProvenanceEntry = {
      id: uuidv4(),
      entityId: objectId,
      activity: 'federation:object_selected',
      agent,
      timestamp: new Date(),
      attributes: {
        objectType,
        sourceOrg,
        targetOrg,
        agreementId,
      },
    };
    entries.push(selectionEntry);

    // Entry 2: Policy evaluation
    const policyEntry: ProvenanceEntry = {
      id: uuidv4(),
      entityId: objectId,
      activity: 'federation:policy_evaluated',
      agent: 'federation-service',
      timestamp: new Date(),
      attributes: {
        agreementId,
        result: 'allowed',
      },
      previousEntry: selectionEntry.id,
    };
    entries.push(policyEntry);

    // Entry 3: Redaction applied
    const redactionEntry: ProvenanceEntry = {
      id: uuidv4(),
      entityId: objectId,
      activity: 'federation:redaction_applied',
      agent: 'redaction-engine',
      timestamp: new Date(),
      attributes: {
        agreementId,
      },
      previousEntry: policyEntry.id,
    };
    entries.push(redactionEntry);

    // Entry 4: Share transmitted
    const transmitEntry: ProvenanceEntry = {
      id: uuidv4(),
      entityId: objectId,
      activity: 'federation:object_shared',
      agent,
      timestamp: new Date(),
      attributes: {
        sourceOrg,
        targetOrg,
        agreementId,
      },
      previousEntry: redactionEntry.id,
    };
    entries.push(transmitEntry);

    // Store in chain
    this.provenanceChain.set(objectId, entries);

    logger.info(
      {
        objectId,
        entryCount: entries.length,
      },
      'Provenance chain created'
    );

    return entries;
  }

  /**
   * Map source ID to target ID
   */
  createIdMapping(
    sourceId: string,
    sourceOrg: string,
    targetId: string,
    targetOrg: string,
    objectType: ShareableObjectType,
    agreementId: string
  ): IdMapping {
    const mappingKey = `${sourceOrg}:${sourceId}`;

    const mapping: IdMapping = {
      sourceId,
      sourceOrg,
      targetId,
      targetOrg,
      objectType,
      agreementId,
      createdAt: new Date(),
    };

    this.idMappings.set(mappingKey, mapping);

    logger.info(
      {
        sourceId,
        targetId,
        sourceOrg,
        targetOrg,
      },
      'ID mapping created'
    );

    return mapping;
  }

  /**
   * Resolve target ID from source ID
   */
  resolveTargetId(sourceId: string, sourceOrg: string): string | null {
    const mappingKey = `${sourceOrg}:${sourceId}`;
    const mapping = this.idMappings.get(mappingKey);
    return mapping ? mapping.targetId : null;
  }

  /**
   * Resolve source ID from target ID
   */
  resolveSourceId(targetId: string, targetOrg: string): string | null {
    // Reverse lookup (inefficient, but works for demo)
    for (const [, mapping] of this.idMappings.entries()) {
      if (mapping.targetId === targetId && mapping.targetOrg === targetOrg) {
        return mapping.sourceId;
      }
    }
    return null;
  }

  /**
   * Get provenance chain for an object
   */
  getProvenanceChain(objectId: string): ProvenanceEntry[] {
    return this.provenanceChain.get(objectId) || [];
  }

  /**
   * Append to provenance chain
   */
  appendProvenance(
    objectId: string,
    activity: string,
    agent: string,
    attributes: Record<string, unknown>
  ): ProvenanceEntry {
    const existingChain = this.provenanceChain.get(objectId) || [];
    const lastEntry = existingChain[existingChain.length - 1];

    const newEntry: ProvenanceEntry = {
      id: uuidv4(),
      entityId: objectId,
      activity,
      agent,
      timestamp: new Date(),
      attributes,
      previousEntry: lastEntry?.id,
    };

    existingChain.push(newEntry);
    this.provenanceChain.set(objectId, existingChain);

    logger.debug(
      {
        objectId,
        activity,
        entryId: newEntry.id,
      },
      'Provenance entry appended'
    );

    return newEntry;
  }

  /**
   * Verify provenance chain integrity
   */
  verifyChain(objectId: string): { valid: boolean; errors: string[] } {
    const chain = this.provenanceChain.get(objectId);
    if (!chain || chain.length === 0) {
      return { valid: false, errors: ['No provenance chain found'] };
    }

    const errors: string[] = [];

    // Check first entry has no previous
    if (chain[0].previousEntry !== undefined) {
      errors.push('First entry should not have previousEntry');
    }

    // Check chain links
    for (let i = 1; i < chain.length; i++) {
      const entry = chain[i];
      const expectedPrevious = chain[i - 1].id;

      if (entry.previousEntry !== expectedPrevious) {
        errors.push(
          `Entry ${i} has broken chain link (expected ${expectedPrevious}, got ${entry.previousEntry})`
        );
      }
    }

    // Check timestamps are monotonic
    for (let i = 1; i < chain.length; i++) {
      if (chain[i].timestamp < chain[i - 1].timestamp) {
        errors.push(`Entry ${i} has timestamp before previous entry`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Export provenance chain for external storage (e.g., prov-ledger)
   */
  exportChain(objectId: string): ProvenanceEntry[] {
    return this.getProvenanceChain(objectId);
  }

  /**
   * Import provenance chain from external source
   */
  importChain(objectId: string, chain: ProvenanceEntry[]): void {
    this.provenanceChain.set(objectId, chain);
    logger.info(
      {
        objectId,
        entryCount: chain.length,
      },
      'Provenance chain imported'
    );
  }

  /**
   * Clear all mappings and provenance (for testing)
   */
  clear(): void {
    this.idMappings.clear();
    this.provenanceChain.clear();
    logger.info('Provenance tracker cleared');
  }
}

export const provenanceTracker = new ProvenanceTracker();
