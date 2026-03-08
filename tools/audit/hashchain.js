"use strict";
/**
 * Tamper-Evident Audit Log with Hash Chain
 * Sprint 27D: Append-only audit trail with cryptographic integrity
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditHashChain = void 0;
const crypto_1 = __importDefault(require("crypto"));
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
class AuditHashChain {
    logPath;
    checkpointPath;
    privateKey;
    currentSequence = 0;
    lastHash = '0000000000000000000000000000000000000000000000000000000000000000';
    constructor(logPath, privateKey) {
        this.logPath = logPath;
        this.checkpointPath = logPath.replace('.log', '.checkpoints');
        this.privateKey = privateKey;
        this.ensureLogDirectory();
    }
    /**
     * Append audit event to hash chain
     */
    async appendEvent(event) {
        // Ensure event has required fields
        if (!event.id) {
            event.id = crypto_1.default.randomUUID();
        }
        if (!event.timestamp) {
            event.timestamp = new Date().toISOString();
        }
        // Calculate event hash
        const eventData = JSON.stringify(event, Object.keys(event).sort());
        const eventHash = crypto_1.default
            .createHash('sha256')
            .update(eventData)
            .digest('hex');
        // Create hash chain entry
        const entry = {
            sequence: ++this.currentSequence,
            timestamp: event.timestamp,
            eventHash,
            previousHash: this.lastHash,
            chainHash: this.calculateChainHash(eventHash, this.lastHash, this.currentSequence),
        };
        // Sign entry if private key available
        if (this.privateKey) {
            entry.signature = this.signEntry(entry);
        }
        // Update last hash for next entry
        this.lastHash = entry.chainHash;
        // Append to log file
        await this.writeLogEntry(event, entry);
        // Create checkpoint every 1000 entries
        if (this.currentSequence % 1000 === 0) {
            await this.createCheckpoint();
        }
        return entry;
    }
    /**
     * Verify hash chain integrity
     */
    async verifyChain(startSequence = 1, endSequence) {
        const errors = [];
        let verifiedEntries = 0;
        let expectedPreviousHash = startSequence === 1
            ? '0000000000000000000000000000000000000000000000000000000000000000'
            : await this.getHashAtSequence(startSequence - 1);
        const entries = await this.readLogEntries(startSequence, endSequence);
        for (const { event, chainEntry } of entries) {
            // Verify event hash
            const eventData = JSON.stringify(event, Object.keys(event).sort());
            const calculatedEventHash = crypto_1.default
                .createHash('sha256')
                .update(eventData)
                .digest('hex');
            if (calculatedEventHash !== chainEntry.eventHash) {
                errors.push(`Sequence ${chainEntry.sequence}: Event hash mismatch`);
                continue;
            }
            // Verify previous hash linkage
            if (chainEntry.previousHash !== expectedPreviousHash) {
                errors.push(`Sequence ${chainEntry.sequence}: Previous hash mismatch`);
                continue;
            }
            // Verify chain hash
            const calculatedChainHash = this.calculateChainHash(chainEntry.eventHash, chainEntry.previousHash, chainEntry.sequence);
            if (calculatedChainHash !== chainEntry.chainHash) {
                errors.push(`Sequence ${chainEntry.sequence}: Chain hash mismatch`);
                continue;
            }
            // Verify signature if present
            if (chainEntry.signature && this.privateKey) {
                if (!this.verifySignature(chainEntry)) {
                    errors.push(`Sequence ${chainEntry.sequence}: Invalid signature`);
                    continue;
                }
            }
            verifiedEntries++;
            expectedPreviousHash = chainEntry.chainHash;
        }
        return {
            valid: errors.length === 0,
            errors,
            verifiedEntries,
        };
    }
    /**
     * Create merkle root checkpoint
     */
    async createCheckpoint() {
        const recentEntries = await this.readLogEntries(Math.max(1, this.currentSequence - 999), this.currentSequence);
        // Calculate merkle root
        const hashes = recentEntries.map((entry) => entry.chainEntry.chainHash);
        const merkleRoot = this.calculateMerkleRoot(hashes);
        const checkpoint = {
            sequence: this.currentSequence,
            timestamp: new Date().toISOString(),
            eventCount: recentEntries.length,
            merkleRoot,
            signature: '',
        };
        // Sign checkpoint
        if (this.privateKey) {
            const checkpointData = JSON.stringify({
                sequence: checkpoint.sequence,
                timestamp: checkpoint.timestamp,
                eventCount: checkpoint.eventCount,
                merkleRoot: checkpoint.merkleRoot,
            });
            checkpoint.signature = crypto_1.default
                .sign('sha256', Buffer.from(checkpointData), this.privateKey)
                .toString('hex');
        }
        // Save checkpoint
        await this.writeCheckpoint(checkpoint);
        return checkpoint;
    }
    /**
     * Time source validation
     */
    static async validateTimeSource() {
        const systemTime = new Date();
        try {
            // Simple NTP check (in production, use proper NTP client)
            const ntpResponse = await fetch('http://worldtimeapi.org/api/timezone/UTC');
            const ntpData = await ntpResponse.json();
            const ntpTime = new Date(ntpData.utc_datetime);
            const skew = Math.abs(systemTime.getTime() - ntpTime.getTime());
            const maxSkew = 30000; // 30 seconds tolerance
            return {
                valid: skew <= maxSkew,
                skew,
                ntpTime,
                systemTime,
            };
        }
        catch (error) {
            console.warn('NTP validation failed:', error.message);
            return {
                valid: false,
                skew: -1,
                systemTime,
            };
        }
    }
    calculateChainHash(eventHash, previousHash, sequence) {
        const data = `${eventHash}:${previousHash}:${sequence}`;
        return crypto_1.default.createHash('sha256').update(data).digest('hex');
    }
    signEntry(entry) {
        if (!this.privateKey)
            return '';
        const entryData = JSON.stringify({
            sequence: entry.sequence,
            timestamp: entry.timestamp,
            eventHash: entry.eventHash,
            previousHash: entry.previousHash,
            chainHash: entry.chainHash,
        });
        return crypto_1.default
            .sign('sha256', Buffer.from(entryData), this.privateKey)
            .toString('hex');
    }
    verifySignature(entry) {
        if (!entry.signature || !this.privateKey)
            return false;
        const entryData = JSON.stringify({
            sequence: entry.sequence,
            timestamp: entry.timestamp,
            eventHash: entry.eventHash,
            previousHash: entry.previousHash,
            chainHash: entry.chainHash,
        });
        try {
            return crypto_1.default.verify('sha256', Buffer.from(entryData), this.privateKey, Buffer.from(entry.signature, 'hex'));
        }
        catch {
            return false;
        }
    }
    calculateMerkleRoot(hashes) {
        if (hashes.length === 0)
            return '';
        if (hashes.length === 1)
            return hashes[0];
        const nextLevel = [];
        for (let i = 0; i < hashes.length; i += 2) {
            const left = hashes[i];
            const right = hashes[i + 1] || left; // Duplicate if odd number
            const combined = crypto_1.default
                .createHash('sha256')
                .update(left + right)
                .digest('hex');
            nextLevel.push(combined);
        }
        return this.calculateMerkleRoot(nextLevel);
    }
    async ensureLogDirectory() {
        const dir = path_1.default.dirname(this.logPath);
        try {
            await promises_1.default.mkdir(dir, { recursive: true });
        }
        catch (error) {
            // Directory might already exist
        }
    }
    async writeLogEntry(event, chainEntry) {
        const logLine = JSON.stringify({
            event,
            chainEntry,
            timestamp: new Date().toISOString(),
        }) + '\n';
        await promises_1.default.appendFile(this.logPath, logLine);
    }
    async writeCheckpoint(checkpoint) {
        const checkpointLine = JSON.stringify(checkpoint) + '\n';
        await promises_1.default.appendFile(this.checkpointPath, checkpointLine);
    }
    async readLogEntries(startSequence, endSequence) {
        try {
            const content = await promises_1.default.readFile(this.logPath, 'utf-8');
            const lines = content
                .trim()
                .split('\n')
                .filter((line) => line);
            const entries = [];
            for (const line of lines) {
                try {
                    const parsed = JSON.parse(line);
                    if (parsed.chainEntry.sequence >= startSequence &&
                        (!endSequence || parsed.chainEntry.sequence <= endSequence)) {
                        entries.push(parsed);
                    }
                }
                catch {
                    // Skip malformed lines
                }
            }
            return entries;
        }
        catch {
            return [];
        }
    }
    async getHashAtSequence(sequence) {
        const entries = await this.readLogEntries(sequence, sequence);
        return entries[0]?.chainEntry.chainHash || this.lastHash;
    }
}
exports.AuditHashChain = AuditHashChain;
