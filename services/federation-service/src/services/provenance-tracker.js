"use strict";
/**
 * Provenance Tracker
 *
 * Preserves provenance chain and manages ID mapping for federated objects.
 * Integrates with prov-ledger service for chain-of-custody.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.provenanceTracker = exports.ProvenanceTracker = void 0;
const uuid_1 = require("uuid");
const pino_1 = __importDefault(require("pino"));
const logger = (0, pino_1.default)({ name: 'provenance-tracker' });
/**
 * Provenance Tracker Service
 */
class ProvenanceTracker {
    idMappings = new Map();
    provenanceChain = new Map();
    /**
     * Create a share reference with provenance
     */
    createShareReference(sourceObjectId, sourceObjectType, sourceOrgId, targetOrgId, agreementId, sharedBy) {
        const shareRefId = (0, uuid_1.v4)();
        // Create provenance entries
        const provenanceEntries = this.createProvenanceChain(sourceObjectId, sourceObjectType, sourceOrgId, targetOrgId, agreementId, sharedBy);
        const shareRef = {
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
        logger.info({
            shareRefId,
            sourceObjectId,
            targetOrgId,
            agreementId,
        }, 'Share reference created');
        return shareRef;
    }
    /**
     * Create provenance chain for a share operation
     */
    createProvenanceChain(objectId, objectType, sourceOrg, targetOrg, agreementId, agent) {
        const entries = [];
        // Entry 1: Object selection
        const selectionEntry = {
            id: (0, uuid_1.v4)(),
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
        const policyEntry = {
            id: (0, uuid_1.v4)(),
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
        const redactionEntry = {
            id: (0, uuid_1.v4)(),
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
        const transmitEntry = {
            id: (0, uuid_1.v4)(),
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
        logger.info({
            objectId,
            entryCount: entries.length,
        }, 'Provenance chain created');
        return entries;
    }
    /**
     * Map source ID to target ID
     */
    createIdMapping(sourceId, sourceOrg, targetId, targetOrg, objectType, agreementId) {
        const mappingKey = `${sourceOrg}:${sourceId}`;
        const mapping = {
            sourceId,
            sourceOrg,
            targetId,
            targetOrg,
            objectType,
            agreementId,
            createdAt: new Date(),
        };
        this.idMappings.set(mappingKey, mapping);
        logger.info({
            sourceId,
            targetId,
            sourceOrg,
            targetOrg,
        }, 'ID mapping created');
        return mapping;
    }
    /**
     * Resolve target ID from source ID
     */
    resolveTargetId(sourceId, sourceOrg) {
        const mappingKey = `${sourceOrg}:${sourceId}`;
        const mapping = this.idMappings.get(mappingKey);
        return mapping ? mapping.targetId : null;
    }
    /**
     * Resolve source ID from target ID
     */
    resolveSourceId(targetId, targetOrg) {
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
    getProvenanceChain(objectId) {
        return this.provenanceChain.get(objectId) || [];
    }
    /**
     * Append to provenance chain
     */
    appendProvenance(objectId, activity, agent, attributes) {
        const existingChain = this.provenanceChain.get(objectId) || [];
        const lastEntry = existingChain[existingChain.length - 1];
        const newEntry = {
            id: (0, uuid_1.v4)(),
            entityId: objectId,
            activity,
            agent,
            timestamp: new Date(),
            attributes,
            previousEntry: lastEntry?.id,
        };
        existingChain.push(newEntry);
        this.provenanceChain.set(objectId, existingChain);
        logger.debug({
            objectId,
            activity,
            entryId: newEntry.id,
        }, 'Provenance entry appended');
        return newEntry;
    }
    /**
     * Verify provenance chain integrity
     */
    verifyChain(objectId) {
        const chain = this.provenanceChain.get(objectId);
        if (!chain || chain.length === 0) {
            return { valid: false, errors: ['No provenance chain found'] };
        }
        const errors = [];
        // Check first entry has no previous
        if (chain[0].previousEntry !== undefined) {
            errors.push('First entry should not have previousEntry');
        }
        // Check chain links
        for (let i = 1; i < chain.length; i++) {
            const entry = chain[i];
            const expectedPrevious = chain[i - 1].id;
            if (entry.previousEntry !== expectedPrevious) {
                errors.push(`Entry ${i} has broken chain link (expected ${expectedPrevious}, got ${entry.previousEntry})`);
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
    exportChain(objectId) {
        return this.getProvenanceChain(objectId);
    }
    /**
     * Import provenance chain from external source
     */
    importChain(objectId, chain) {
        this.provenanceChain.set(objectId, chain);
        logger.info({
            objectId,
            entryCount: chain.length,
        }, 'Provenance chain imported');
    }
    /**
     * Clear all mappings and provenance (for testing)
     */
    clear() {
        this.idMappings.clear();
        this.provenanceChain.clear();
        logger.info('Provenance tracker cleared');
    }
}
exports.ProvenanceTracker = ProvenanceTracker;
exports.provenanceTracker = new ProvenanceTracker();
