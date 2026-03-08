"use strict";
// Conductor Audit Integrity Hash-Chain Verifier
// Provides cryptographic verification of audit trail integrity using hash chains
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditChainVerifier = exports.AuditChainVerifier = void 0;
exports.recordConductorAudit = recordConductorAudit;
exports.performScheduledIntegrityCheck = performScheduledIntegrityCheck;
const crypto_1 = require("crypto");
const fs_1 = require("fs");
const path_1 = require("path");
class AuditChainVerifier {
    chainPath;
    secretKey;
    hashAlgorithm;
    constructor(chainPath = './data/audit', secretKey = process.env.AUDIT_CHAIN_SECRET ||
        'default-secret-change-in-production', hashAlgorithm = 'sha256') {
        this.chainPath = chainPath;
        this.secretKey = secretKey;
        this.hashAlgorithm = hashAlgorithm;
    }
    /**
     * Add an audit record to the hash chain
     */
    addRecord(record) {
        const previousHash = this.getLastHash();
        const sequenceNumber = this.getNextSequenceNumber();
        // Create deterministic hash of the audit record
        const recordHash = this.hashAuditRecord(record);
        // Create chain link hash that includes previous hash
        const chainHash = this.createChainHash(recordHash, previousHash, sequenceNumber);
        const chainLink = {
            auditId: record.id,
            previousHash,
            currentHash: chainHash,
            timestamp: record.timestamp,
            sequenceNumber,
        };
        // Store both the audit record and chain link
        this.storeRecord(record, chainLink);
        return chainLink;
    }
    /**
     * Verify the integrity of the entire audit chain
     */
    async verifyChainIntegrity() {
        const records = this.loadAllRecords();
        const chains = this.loadAllChainLinks();
        if (records.length === 0) {
            return {
                isValid: true,
                totalRecords: 0,
                verifiedRecords: 0,
                brokenChains: 0,
                integrityPercentage: 100,
                verificationTimestamp: Date.now(),
            };
        }
        let verifiedRecords = 0;
        let brokenChains = 0;
        let firstCorruptedRecord;
        let lastVerifiedRecord;
        // Verify each record and its chain link
        for (let i = 0; i < records.length; i++) {
            const record = records[i];
            const chainLink = chains.find((c) => c.auditId === record.id);
            if (!chainLink) {
                brokenChains++;
                if (!firstCorruptedRecord)
                    firstCorruptedRecord = record.id;
                continue;
            }
            // Verify record hash
            const expectedRecordHash = this.hashAuditRecord(record);
            const previousHash = i === 0 ? 'genesis' : chains[i - 1]?.currentHash || 'genesis';
            const expectedChainHash = this.createChainHash(expectedRecordHash, previousHash, chainLink.sequenceNumber);
            if (chainLink.currentHash === expectedChainHash) {
                verifiedRecords++;
                lastVerifiedRecord = record.id;
            }
            else {
                brokenChains++;
                if (!firstCorruptedRecord)
                    firstCorruptedRecord = record.id;
            }
            // Verify chain continuity
            if (i > 0) {
                const previousLink = chains[i - 1];
                if (chainLink.previousHash !== previousLink?.currentHash) {
                    brokenChains++;
                    if (!firstCorruptedRecord)
                        firstCorruptedRecord = record.id;
                }
            }
        }
        const integrityPercentage = records.length > 0 ? (verifiedRecords / records.length) * 100 : 100;
        return {
            isValid: brokenChains === 0,
            totalRecords: records.length,
            verifiedRecords,
            brokenChains,
            firstCorruptedRecord,
            lastVerifiedRecord,
            integrityPercentage: Math.round(integrityPercentage * 100) / 100,
            verificationTimestamp: Date.now(),
        };
    }
    /**
     * Verify a specific audit record
     */
    verifyRecord(recordId) {
        const record = this.loadRecord(recordId);
        const chainLink = this.loadChainLink(recordId);
        if (!record) {
            return { isValid: false, reason: 'Record not found' };
        }
        if (!chainLink) {
            return { isValid: false, reason: 'Chain link not found' };
        }
        // Verify record hash
        const expectedRecordHash = this.hashAuditRecord(record);
        const expectedChainHash = this.createChainHash(expectedRecordHash, chainLink.previousHash, chainLink.sequenceNumber);
        if (chainLink.currentHash !== expectedChainHash) {
            return { isValid: false, reason: 'Hash mismatch' };
        }
        return { isValid: true };
    }
    /**
     * Generate integrity proof for a range of records
     */
    generateIntegrityProof(fromRecordId, toRecordId) {
        const records = this.loadRecordRange(fromRecordId, toRecordId);
        const chains = records.map((r) => this.loadChainLink(r.id)).filter(Boolean);
        // Create merkle-like proof structure
        const recordHashes = records.map((r) => this.hashAuditRecord(r));
        const chainHashes = chains.map((c) => c.currentHash);
        const proofData = {
            fromRecord: fromRecordId,
            toRecord: toRecordId,
            recordCount: records.length,
            recordHashes,
            chainHashes,
            timestamp: Date.now(),
        };
        const proof = this.createHmac(JSON.stringify(proofData));
        return {
            proof,
            records: records.map((r) => r.id),
            timestamp: proofData.timestamp,
        };
    }
    /**
     * Verify an integrity proof
     */
    verifyIntegrityProof(proof, fromRecordId, toRecordId) {
        const records = this.loadRecordRange(fromRecordId, toRecordId);
        const chains = records.map((r) => this.loadChainLink(r.id)).filter(Boolean);
        const recordHashes = records.map((r) => this.hashAuditRecord(r));
        const chainHashes = chains.map((c) => c.currentHash);
        const proofData = {
            fromRecord: fromRecordId,
            toRecord: toRecordId,
            recordCount: records.length,
            recordHashes,
            chainHashes,
            timestamp: Date.now(),
        };
        const expectedProof = this.createHmac(JSON.stringify(proofData));
        return proof === expectedProof;
    }
    /**
     * Export audit trail for compliance
     */
    exportAuditTrail(fromTimestamp, toTimestamp) {
        const allRecords = this.loadAllRecords();
        const filteredRecords = allRecords.filter((r) => r.timestamp >= fromTimestamp && r.timestamp <= toTimestamp);
        const integrityReport = {
            ...this.verifyChainIntegrity(),
            // Override with filtered data
            totalRecords: filteredRecords.length,
            verifiedRecords: filteredRecords.filter((r) => this.verifyRecord(r.id).isValid).length,
        };
        const exportData = {
            records: filteredRecords,
            integrityReport,
            exportTimestamp: Date.now(),
            exportHash: '',
        };
        // Create tamper-evident export hash
        exportData.exportHash = this.createHash(JSON.stringify({
            recordCount: filteredRecords.length,
            fromTimestamp,
            toTimestamp,
            integrityPercentage: integrityReport.integrityPercentage,
        }));
        return exportData;
    }
    // Private helper methods
    hashAuditRecord(record) {
        const hashData = {
            id: record.id,
            timestamp: record.timestamp,
            userId: record.userId,
            action: record.action,
            expert: record.expert || '',
            taskHash: record.taskHash,
            result: record.result,
            cost: record.cost || 0,
            latencyMs: record.latencyMs || 0,
        };
        return this.createHash(JSON.stringify(hashData));
    }
    createChainHash(recordHash, previousHash, sequenceNumber) {
        const chainData = {
            recordHash,
            previousHash,
            sequenceNumber,
            timestamp: Date.now(),
        };
        return this.createHmac(JSON.stringify(chainData));
    }
    createHash(data) {
        return (0, crypto_1.createHash)(this.hashAlgorithm).update(data).digest('hex');
    }
    createHmac(data) {
        return (0, crypto_1.createHmac)(this.hashAlgorithm, this.secretKey)
            .update(data)
            .digest('hex');
    }
    getLastHash() {
        const chains = this.loadAllChainLinks();
        if (chains.length === 0) {
            return 'genesis';
        }
        return chains[chains.length - 1].currentHash;
    }
    getNextSequenceNumber() {
        const chains = this.loadAllChainLinks();
        if (chains.length === 0) {
            return 1;
        }
        return Math.max(...chains.map((c) => c.sequenceNumber)) + 1;
    }
    storeRecord(record, chainLink) {
        // Ensure directory exists
        const fs = require('fs');
        if (!fs.existsSync(this.chainPath)) {
            fs.mkdirSync(this.chainPath, { recursive: true });
        }
        // Store record
        const recordPath = (0, path_1.join)(this.chainPath, `record-${record.id}.json`);
        (0, fs_1.writeFileSync)(recordPath, JSON.stringify(record, null, 2));
        // Store chain link
        const chainPath = (0, path_1.join)(this.chainPath, `chain-${record.id}.json`);
        (0, fs_1.writeFileSync)(chainPath, JSON.stringify(chainLink, null, 2));
        // Update index
        this.updateIndex(record, chainLink);
    }
    updateIndex(record, chainLink) {
        const indexPath = (0, path_1.join)(this.chainPath, 'index.json');
        let index = [];
        if ((0, fs_1.existsSync)(indexPath)) {
            try {
                index = JSON.parse((0, fs_1.readFileSync)(indexPath, 'utf8'));
            }
            catch (error) {
                console.warn('Failed to read audit index, creating new one');
            }
        }
        index.push({
            id: record.id,
            timestamp: record.timestamp,
            sequenceNumber: chainLink.sequenceNumber,
            hash: chainLink.currentHash,
        });
        // Sort by sequence number
        index.sort((a, b) => a.sequenceNumber - b.sequenceNumber);
        (0, fs_1.writeFileSync)(indexPath, JSON.stringify(index, null, 2));
    }
    loadRecord(recordId) {
        const recordPath = (0, path_1.join)(this.chainPath, `record-${recordId}.json`);
        if (!(0, fs_1.existsSync)(recordPath)) {
            return null;
        }
        try {
            return JSON.parse((0, fs_1.readFileSync)(recordPath, 'utf8'));
        }
        catch (error) {
            console.error(`Failed to load audit record ${recordId}:`, error);
            return null;
        }
    }
    loadChainLink(recordId) {
        const chainPath = (0, path_1.join)(this.chainPath, `chain-${recordId}.json`);
        if (!(0, fs_1.existsSync)(chainPath)) {
            return null;
        }
        try {
            return JSON.parse((0, fs_1.readFileSync)(chainPath, 'utf8'));
        }
        catch (error) {
            console.error(`Failed to load chain link ${recordId}:`, error);
            return null;
        }
    }
    loadAllRecords() {
        const indexPath = (0, path_1.join)(this.chainPath, 'index.json');
        if (!(0, fs_1.existsSync)(indexPath)) {
            return [];
        }
        try {
            const index = JSON.parse((0, fs_1.readFileSync)(indexPath, 'utf8'));
            return index
                .map((entry) => this.loadRecord(entry.id))
                .filter(Boolean);
        }
        catch (error) {
            console.error('Failed to load audit index:', error);
            return [];
        }
    }
    loadAllChainLinks() {
        const indexPath = (0, path_1.join)(this.chainPath, 'index.json');
        if (!(0, fs_1.existsSync)(indexPath)) {
            return [];
        }
        try {
            const index = JSON.parse((0, fs_1.readFileSync)(indexPath, 'utf8'));
            return index
                .map((entry) => this.loadChainLink(entry.id))
                .filter(Boolean);
        }
        catch (error) {
            console.error('Failed to load chain index:', error);
            return [];
        }
    }
    loadRecordRange(fromRecordId, toRecordId) {
        const allRecords = this.loadAllRecords();
        const fromIndex = allRecords.findIndex((r) => r.id === fromRecordId);
        const toIndex = allRecords.findIndex((r) => r.id === toRecordId);
        if (fromIndex === -1 || toIndex === -1) {
            return [];
        }
        return allRecords.slice(fromIndex, toIndex + 1);
    }
}
exports.AuditChainVerifier = AuditChainVerifier;
// Singleton instance for application use
exports.auditChainVerifier = new AuditChainVerifier(process.env.AUDIT_CHAIN_PATH || './data/audit', process.env.AUDIT_CHAIN_SECRET, process.env.AUDIT_HASH_ALGORITHM || 'sha256');
/**
 * Utility functions for conductor integration
 */
function recordConductorAudit(auditId, userId, action, taskHash, result, expert, cost, latencyMs, securityHash, metadata) {
    const record = {
        id: auditId,
        timestamp: Date.now(),
        userId,
        action,
        taskHash,
        result,
        expert,
        cost,
        latencyMs,
        securityHash,
        metadata,
    };
    return exports.auditChainVerifier.addRecord(record);
}
/**
 * Scheduled integrity verification
 */
async function performScheduledIntegrityCheck() {
    const report = await exports.auditChainVerifier.verifyChainIntegrity();
    // Log results
    if (report.isValid) {
        console.log('✅ Audit chain integrity verified:', {
            totalRecords: report.totalRecords,
            integrityPercentage: report.integrityPercentage,
        });
    }
    else {
        console.error('🚨 Audit chain integrity compromised:', {
            totalRecords: report.totalRecords,
            verifiedRecords: report.verifiedRecords,
            brokenChains: report.brokenChains,
            firstCorruptedRecord: report.firstCorruptedRecord,
            integrityPercentage: report.integrityPercentage,
        });
    }
    return report;
}
