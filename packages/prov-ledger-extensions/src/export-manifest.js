"use strict";
/**
 * Export Manifest Generation
 *
 * Creates verifiable export packages with hash trees and chain-of-custody evidence.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChainOfCustodyManager = exports.ExportManifestVerifier = exports.ExportManifestBuilder = void 0;
const crypto_1 = require("crypto");
// -----------------------------------------------------------------------------
// Manifest Builder
// -----------------------------------------------------------------------------
class ExportManifestBuilder {
    entityHashes = [];
    relationshipHashes = [];
    entityTypes = new Set();
    minDate = null;
    maxDate = null;
    /**
     * Add an entity to the manifest
     */
    addEntity(entity) {
        const hash = this.hashEntity(entity);
        this.entityHashes.push(hash);
        this.entityTypes.add(entity.type);
        this.updateDateRange(entity.createdAt);
    }
    /**
     * Add a relationship to the manifest
     */
    addRelationship(relationship) {
        const hash = this.hashRelationship(relationship);
        this.relationshipHashes.push(hash);
    }
    /**
     * Build the export manifest
     */
    build(options) {
        const allLeaves = [...this.entityHashes, ...this.relationshipHashes];
        const hashTree = this.buildMerkleTree(allLeaves);
        const exportId = this.generateId();
        const manifest = {
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
    hashEntity(entity) {
        const data = JSON.stringify({
            id: entity.id,
            type: entity.type,
            props: entity.props,
        });
        return (0, crypto_1.createHash)('sha256').update(data).digest('hex');
    }
    /**
     * Hash a relationship
     */
    hashRelationship(rel) {
        const data = JSON.stringify({
            id: rel.id,
            from: rel.from,
            to: rel.to,
            type: rel.type,
        });
        return (0, crypto_1.createHash)('sha256').update(data).digest('hex');
    }
    /**
     * Build Merkle tree from leaf hashes
     */
    buildMerkleTree(leaves) {
        if (leaves.length === 0) {
            return {
                rootHash: (0, crypto_1.createHash)('sha256').update('empty').digest('hex'),
                depth: 0,
                leaves: [],
                algorithm: 'sha256',
            };
        }
        let currentLevel = [...leaves];
        let depth = 0;
        while (currentLevel.length > 1) {
            const nextLevel = [];
            for (let i = 0; i < currentLevel.length; i += 2) {
                const left = currentLevel[i];
                const right = currentLevel[i + 1] || left; // Duplicate last if odd
                const combined = (0, crypto_1.createHash)('sha256')
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
    updateDateRange(date) {
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
    generateId() {
        return `exp_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 9)}`;
    }
}
exports.ExportManifestBuilder = ExportManifestBuilder;
// -----------------------------------------------------------------------------
// Manifest Verification
// -----------------------------------------------------------------------------
class ExportManifestVerifier {
    /**
     * Verify manifest integrity
     */
    verifyIntegrity(manifest, data) {
        const errors = [];
        const warnings = [];
        // Verify entity count
        if (data.entities.length !== manifest.contents.entityCount) {
            errors.push(`Entity count mismatch: expected ${manifest.contents.entityCount}, got ${data.entities.length}`);
        }
        // Verify relationship count
        if (data.relationships.length !== manifest.contents.relationshipCount) {
            errors.push(`Relationship count mismatch: expected ${manifest.contents.relationshipCount}, got ${data.relationships.length}`);
        }
        // Recompute leaf hashes
        const entityHashes = data.entities.map((e) => (0, crypto_1.createHash)('sha256')
            .update(JSON.stringify({ id: e.id, type: e.type, props: e.props }))
            .digest('hex'));
        const relHashes = data.relationships.map((r) => (0, crypto_1.createHash)('sha256')
            .update(JSON.stringify({ id: r.id, from: r.from, to: r.to, type: r.type }))
            .digest('hex'));
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
    verifySignature(manifest, publicKey) {
        // In production, use crypto.verify with the actual signature
        // This is a placeholder
        return manifest.signatures.length > 0;
    }
    /**
     * Compute Merkle root from leaves
     */
    computeMerkleRoot(leaves) {
        if (leaves.length === 0) {
            return (0, crypto_1.createHash)('sha256').update('empty').digest('hex');
        }
        let currentLevel = [...leaves];
        while (currentLevel.length > 1) {
            const nextLevel = [];
            for (let i = 0; i < currentLevel.length; i += 2) {
                const left = currentLevel[i];
                const right = currentLevel[i + 1] || left;
                nextLevel.push((0, crypto_1.createHash)('sha256').update(left + right).digest('hex'));
            }
            currentLevel = nextLevel;
        }
        return currentLevel[0];
    }
}
exports.ExportManifestVerifier = ExportManifestVerifier;
// -----------------------------------------------------------------------------
// Chain of Custody
// -----------------------------------------------------------------------------
class ChainOfCustodyManager {
    /**
     * Record access event
     */
    recordAccess(manifest, actor, details) {
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
    recordTransfer(manifest, fromActor, toActor, details) {
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
    revoke(manifest, actor, reason) {
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
    generateId() {
        return `coc_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 9)}`;
    }
}
exports.ChainOfCustodyManager = ChainOfCustodyManager;
