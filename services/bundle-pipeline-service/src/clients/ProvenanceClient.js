"use strict";
// @ts-nocheck
/**
 * ProvenanceClient - Client for interacting with the Provenance Ledger service
 * Maintains chain-of-custody and audit trail for all bundle operations
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProvenanceClient = void 0;
const uuid_1 = require("uuid");
class ProvenanceClient {
    baseUrl;
    logger;
    chains = new Map();
    constructor(baseUrl, logger) {
        this.baseUrl = baseUrl;
        this.logger = logger.child({ client: 'ProvenanceClient' });
    }
    /**
     * Create a new provenance chain for an entity
     */
    async createChain(input) {
        const chainId = (0, uuid_1.v4)();
        const now = new Date().toISOString();
        const initialEntry = {
            id: (0, uuid_1.v4)(),
            chainId,
            sequence: 1,
            action: input.action,
            actor: input.actor,
            timestamp: now,
            contentHash: undefined,
            prevHash: 'GENESIS',
            entryHash: this.computeHash({
                chainId,
                sequence: 1,
                action: input.action,
                actor: input.actor,
                timestamp: now,
                prevHash: 'GENESIS',
            }),
            signature: '', // Would be signed in production
            metadata: input.metadata,
        };
        const chain = {
            id: chainId,
            entityType: input.entityType,
            entityId: input.entityId,
            caseId: input.caseId,
            createdAt: now,
            createdBy: input.actor,
            rootHash: initialEntry.entryHash,
            entries: [initialEntry],
        };
        // In production, this would call the prov-ledger service API
        // For local operation, we maintain in-memory state
        this.chains.set(chainId, chain);
        this.logger.info({ chainId, entityType: input.entityType, entityId: input.entityId }, 'Provenance chain created');
        // Also persist to remote service if available
        try {
            await this.persistChainToRemote(chain);
        }
        catch (err) {
            this.logger.warn({ err, chainId }, 'Failed to persist chain to remote, using local state');
        }
        return chainId;
    }
    /**
     * Append an entry to an existing provenance chain
     */
    async appendEntry(chainId, input) {
        const chain = await this.getChain(chainId);
        if (!chain) {
            throw new Error(`Provenance chain not found: ${chainId}`);
        }
        const sequence = chain.entries.length + 1;
        const prevHash = chain.entries[chain.entries.length - 1].entryHash;
        const now = new Date().toISOString();
        const entry = {
            id: (0, uuid_1.v4)(),
            chainId,
            sequence,
            action: input.action,
            actor: input.actor,
            timestamp: now,
            contentHash: input.contentHash,
            prevHash,
            entryHash: this.computeHash({
                chainId,
                sequence,
                action: input.action,
                actor: input.actor,
                timestamp: now,
                contentHash: input.contentHash,
                prevHash,
            }),
            signature: '', // Would be signed in production
            metadata: input.metadata,
        };
        chain.entries.push(entry);
        chain.rootHash = entry.entryHash;
        this.logger.debug({ chainId, sequence, action: input.action }, 'Provenance entry appended');
        // Persist to remote
        try {
            await this.persistEntryToRemote(chainId, entry);
        }
        catch (err) {
            this.logger.warn({ err, chainId }, 'Failed to persist entry to remote');
        }
        return entry;
    }
    /**
     * Get a provenance chain by ID
     */
    async getChain(chainId) {
        // Try local cache first
        if (this.chains.has(chainId)) {
            return this.chains.get(chainId) || null;
        }
        // Try remote service
        try {
            const response = await fetch(`${this.baseUrl}/chains/${chainId}`);
            if (response.ok) {
                const chain = await response.json();
                this.chains.set(chainId, chain);
                return chain;
            }
        }
        catch (err) {
            this.logger.warn({ err, chainId }, 'Failed to fetch chain from remote');
        }
        return null;
    }
    /**
     * Verify the integrity of a provenance chain
     */
    async verifyChain(chainId) {
        const chain = await this.getChain(chainId);
        if (!chain) {
            return {
                valid: false,
                errors: [`Chain not found: ${chainId}`],
                entryCount: 0,
                rootHash: '',
            };
        }
        const errors = [];
        let prevHash = 'GENESIS';
        for (let i = 0; i < chain.entries.length; i++) {
            const entry = chain.entries[i];
            // Verify sequence
            if (entry.sequence !== i + 1) {
                errors.push(`Sequence mismatch at position ${i}: expected ${i + 1}, got ${entry.sequence}`);
            }
            // Verify prevHash linkage
            if (entry.prevHash !== prevHash) {
                errors.push(`PrevHash mismatch at sequence ${entry.sequence}`);
            }
            // Verify entry hash
            const computedHash = this.computeHash({
                chainId,
                sequence: entry.sequence,
                action: entry.action,
                actor: entry.actor,
                timestamp: entry.timestamp,
                contentHash: entry.contentHash,
                prevHash: entry.prevHash,
            });
            if (computedHash !== entry.entryHash) {
                errors.push(`Entry hash mismatch at sequence ${entry.sequence}`);
            }
            prevHash = entry.entryHash;
        }
        // Verify root hash
        if (chain.entries.length > 0) {
            const lastEntry = chain.entries[chain.entries.length - 1];
            if (chain.rootHash !== lastEntry.entryHash) {
                errors.push('Root hash does not match last entry hash');
            }
        }
        return {
            valid: errors.length === 0,
            errors,
            entryCount: chain.entries.length,
            rootHash: chain.rootHash,
        };
    }
    /**
     * Get all entries for an entity
     */
    async getEntriesForEntity(entityType, entityId) {
        for (const chain of this.chains.values()) {
            if (chain.entityType === entityType && chain.entityId === entityId) {
                return chain.entries;
            }
        }
        // Try remote
        try {
            const response = await fetch(`${this.baseUrl}/entries?entityType=${entityType}&entityId=${entityId}`);
            if (response.ok) {
                return await response.json();
            }
        }
        catch (err) {
            this.logger.warn({ err, entityType, entityId }, 'Failed to fetch entries from remote');
        }
        return [];
    }
    /**
     * Export chain as verifiable manifest
     */
    async exportChainManifest(chainId) {
        const chain = await this.getChain(chainId);
        if (!chain) {
            return null;
        }
        const verification = await this.verifyChain(chainId);
        return {
            chain,
            verification,
            exportedAt: new Date().toISOString(),
        };
    }
    // ============================================================================
    // Private Methods
    // ============================================================================
    computeHash(data) {
        const crypto = require('crypto');
        const canonical = JSON.stringify(data, Object.keys(data).sort());
        return crypto.createHash('sha256').update(canonical).digest('hex');
    }
    async persistChainToRemote(chain) {
        const response = await fetch(`${this.baseUrl}/chains`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(chain),
        });
        if (!response.ok) {
            throw new Error(`Failed to persist chain: ${response.statusText}`);
        }
    }
    async persistEntryToRemote(chainId, entry) {
        const response = await fetch(`${this.baseUrl}/chains/${chainId}/entries`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(entry),
        });
        if (!response.ok) {
            throw new Error(`Failed to persist entry: ${response.statusText}`);
        }
    }
}
exports.ProvenanceClient = ProvenanceClient;
