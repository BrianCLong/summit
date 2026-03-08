"use strict";
// @ts-nocheck
/**
 * Replay Log Implementation
 *
 * Provides cryptographically signed, hash-chained replay logs for runbook executions.
 * Enables full audit trails and deterministic replay of runbook executions.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReplayLog = void 0;
const crypto_1 = require("crypto");
const uuid_1 = require("uuid");
const types_js_1 = require("./types.js");
/**
 * Replay Log Manager
 */
class ReplayLog {
    privateKey;
    publicKey;
    entries = [];
    currentHash;
    constructor(privateKey, publicKey) {
        this.privateKey = privateKey;
        this.publicKey = publicKey;
        // Initialize with genesis hash
        this.currentHash = (0, crypto_1.createHash)('sha256').update('GENESIS').digest('hex');
    }
    /**
     * Add a node start event
     */
    addNodeStart(nodeId) {
        this.addEntry(nodeId, 'node_start', {});
    }
    /**
     * Add a node complete event
     */
    addNodeComplete(nodeId, success, duration) {
        this.addEntry(nodeId, 'node_complete', { success, duration });
    }
    /**
     * Add a node error event
     */
    addNodeError(nodeId, error) {
        this.addEntry(nodeId, 'node_error', {
            success: false,
            error: error.message,
        });
    }
    /**
     * Add a gate check event
     */
    addGateCheck(nodeId, gateName, passed, reason) {
        this.addEntry(nodeId, 'gate_check', {
            gateResult: { passed, reason },
        });
    }
    /**
     * Add an evidence collected event
     */
    addEvidenceCollected(nodeId, evidence) {
        this.addEntry(nodeId, 'evidence_collected', {
            evidence,
        });
    }
    /**
     * Add a publication blocked event
     */
    addPublicationBlocked(nodeId, reason) {
        this.addEntry(nodeId, 'publication_blocked', {
            success: false,
            reason,
        });
    }
    /**
     * Add an entry to the replay log
     */
    addEntry(nodeId, eventType, data) {
        const entry = {
            id: (0, uuid_1.v4)(),
            timestamp: new Date(),
            nodeId,
            eventType,
            data,
            previousHash: this.currentHash,
        };
        // Compute hash
        const hash = (0, types_js_1.createReplayLogHash)(entry);
        // Sign if private key is available
        let signature;
        if (this.privateKey) {
            signature = this.signEntry(entry, hash);
        }
        const fullEntry = {
            ...entry,
            hash,
            signature,
        };
        this.entries.push(fullEntry);
        this.currentHash = hash;
    }
    /**
     * Sign an entry
     */
    signEntry(entry, hash) {
        if (!this.privateKey) {
            throw new Error('Private key not available for signing');
        }
        const signature = (0, crypto_1.sign)('sha256', Buffer.from(hash), {
            key: this.privateKey,
            padding: 1, // RSA_PKCS1_PADDING
        });
        return signature.toString('base64');
    }
    /**
     * Get all entries
     */
    getEntries() {
        return [...this.entries];
    }
    /**
     * Get the current hash (head of the chain)
     */
    getCurrentHash() {
        return this.currentHash;
    }
    /**
     * Verify the integrity of the entire replay log
     */
    verifyIntegrity(publicKey) {
        const keyToUse = publicKey || this.publicKey;
        let expectedHash = (0, crypto_1.createHash)('sha256').update('GENESIS').digest('hex');
        for (let i = 0; i < this.entries.length; i++) {
            const entry = this.entries[i];
            // Verify previous hash linkage
            if (entry.previousHash !== expectedHash) {
                return {
                    valid: false,
                    error: `Hash chain broken at entry ${i}: expected previousHash ${expectedHash}, got ${entry.previousHash}`,
                };
            }
            // Recompute hash
            const computedHash = (0, types_js_1.createReplayLogHash)(entry);
            if (entry.hash !== computedHash) {
                return {
                    valid: false,
                    error: `Hash mismatch at entry ${i}: expected ${computedHash}, got ${entry.hash}`,
                };
            }
            // Verify signature if available
            if (entry.signature && keyToUse) {
                try {
                    const valid = (0, crypto_1.verify)('sha256', Buffer.from(entry.hash), {
                        key: keyToUse,
                        padding: 1, // RSA_PKCS1_PADDING
                    }, Buffer.from(entry.signature, 'base64'));
                    if (!valid) {
                        return {
                            valid: false,
                            error: `Signature verification failed at entry ${i}`,
                        };
                    }
                }
                catch (err) {
                    return {
                        valid: false,
                        error: `Signature verification error at entry ${i}: ${err}`,
                    };
                }
            }
            expectedHash = entry.hash;
        }
        return { valid: true };
    }
    /**
     * Export the replay log as JSON
     */
    toJSON() {
        return JSON.stringify({
            entries: this.entries,
            currentHash: this.currentHash,
            publicKey: this.publicKey,
        }, null, 2);
    }
    /**
     * Import a replay log from JSON
     */
    static fromJSON(json) {
        const data = JSON.parse(json);
        const log = new ReplayLog(undefined, data.publicKey);
        log.entries = data.entries.map((e) => ({
            ...e,
            timestamp: new Date(e.timestamp),
        }));
        log.currentHash = data.currentHash;
        return log;
    }
    /**
     * Create a deterministic replay summary
     */
    getSummary() {
        const eventCounts = {};
        const nodes = new Set();
        let success = true;
        for (const entry of this.entries) {
            eventCounts[entry.eventType] = (eventCounts[entry.eventType] || 0) + 1;
            nodes.add(entry.nodeId);
            if (entry.eventType === 'node_error' || entry.eventType === 'publication_blocked') {
                success = false;
            }
        }
        const duration = this.entries.length > 0
            ? this.entries[this.entries.length - 1].timestamp.getTime() - this.entries[0].timestamp.getTime()
            : 0;
        return {
            totalEntries: this.entries.length,
            eventCounts,
            nodes: Array.from(nodes),
            duration,
            success,
        };
    }
}
exports.ReplayLog = ReplayLog;
