"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisStateManager = void 0;
const events_1 = require("events");
const logger_js_1 = __importDefault(require("../config/logger.js"));
const crypto = __importStar(require("crypto"));
const zlib = __importStar(require("zlib"));
const util_1 = require("util");
const logger = logger_js_1.default.child({ module: 'RedisStateManager' });
const compress = (0, util_1.promisify)(zlib.gzip);
const decompress = (0, util_1.promisify)(zlib.gunzip);
const encodeBuffer = (value, encoding) => Buffer.from(value).toString(encoding);
const randomHex = (size) => encodeBuffer(crypto.randomBytes(size), 'hex');
/**
 * RedisStateManager - State persistence with Merkle trees, encryption, and compression
 *
 * Key Features:
 * - Encrypted state storage with AES-256-GCM
 * - Gzip compression for space efficiency
 * - Merkle tree verification for integrity
 * - Automated state compaction and cleanup
 * - Multi-tenant isolation and tagging
 * - High-performance Redis integration
 * - Comprehensive state history and querying
 */
class RedisStateManager extends events_1.EventEmitter {
    config;
    encryptionKey;
    compactionTimer;
    // Mock Redis client - in real implementation, use actual Redis
    redisClient = {
        set: async (key, value, options) => {
            // Mock implementation
            this.mockStorage.set(key, value);
            if (options?.EX) {
                setTimeout(() => this.mockStorage.delete(key), options.EX * 1000);
            }
            return 'OK';
        },
        get: async (key) => this.mockStorage.get(key) || null,
        del: async (key) => {
            const existed = this.mockStorage.has(key);
            this.mockStorage.delete(key);
            return existed ? 1 : 0;
        },
        keys: async (pattern) => {
            const regex = new RegExp(pattern.replace(/\*/g, '.*'));
            return Array.from(this.mockStorage.keys()).filter((key) => regex.test(key));
        },
        exists: async (key) => (this.mockStorage.has(key) ? 1 : 0),
        ttl: async (key) => -1, // Mock: no expiration
        scan: async (cursor, options) => {
            const keys = Array.from(this.mockStorage.keys());
            return [0, keys]; // Mock scan result
        },
    };
    // Mock storage for development
    mockStorage = new Map();
    constructor(config) {
        super();
        this.config = {
            maxStateHistory: 100,
            compactionInterval: 60000, // 1 minute
            retentionDays: 30,
            ...config,
        };
        // Initialize encryption key
        this.encryptionKey = config.encryptionKey
            ? Buffer.from(config.encryptionKey, 'hex')
            : crypto.randomBytes(32);
        // Start compaction timer
        if (this.config.compactionInterval > 0) {
            this.compactionTimer = setInterval(() => this.performCompaction(), this.config.compactionInterval);
        }
        logger.info('RedisStateManager initialized', {
            keyPrefix: this.config.keyPrefix,
            encryptionEnabled: this.config.encryptionEnabled,
            compressionEnabled: this.config.compressionEnabled,
            merkleTreeEnabled: this.config.merkleTreeEnabled,
        });
    }
    /**
     * Save state with encryption, compression, and Merkle tree verification
     */
    async saveState(appId, tenantId, stateData, tags = []) {
        try {
            const id = this.generateStateId();
            const timestamp = new Date();
            // Serialize state data
            let serializedData = JSON.stringify(stateData);
            // Compress if enabled
            let compressed = false;
            if (this.config.compressionEnabled) {
                const compressedBuffer = await compress(Buffer.from(serializedData, 'utf8'));
                serializedData = encodeBuffer(compressedBuffer, 'base64');
                compressed = true;
            }
            // Encrypt if enabled
            let encrypted = false;
            if (this.config.encryptionEnabled) {
                serializedData = this.encrypt(serializedData);
                encrypted = true;
            }
            // Generate Merkle root
            let merkleRoot = '';
            if (this.config.merkleTreeEnabled) {
                merkleRoot = await this.generateMerkleRoot(stateData);
            }
            // Create state snapshot
            const snapshot = {
                id,
                appId,
                tenantId,
                timestamp,
                data: stateData,
                merkleRoot,
                encrypted,
                compressed,
                tags,
                metadata: {
                    size: serializedData.length,
                    originalSize: JSON.stringify(stateData).length,
                    compressionRatio: compressed
                        ? JSON.stringify(stateData).length / serializedData.length
                        : 1,
                },
            };
            // Store in Redis
            const redisKey = this.buildRedisKey(appId, tenantId, id);
            const redisValue = JSON.stringify({
                id,
                appId,
                tenantId,
                timestamp: timestamp.toISOString(),
                data: serializedData,
                merkleRoot,
                encrypted,
                compressed,
                tags,
                metadata: snapshot.metadata,
            });
            await this.redisClient.set(redisKey, redisValue);
            // Store index for querying
            await this.updateIndex(snapshot);
            // Emit save event
            this.emit('state_saved', {
                id,
                appId,
                tenantId,
                size: serializedData.length,
                compressed,
                encrypted,
            });
            logger.debug('State saved successfully', {
                id,
                appId,
                tenantId,
                size: serializedData.length,
                compressed,
                encrypted,
                merkleRoot: merkleRoot.slice(0, 16) + '...',
            });
            return snapshot;
        }
        catch (error) {
            logger.error('Failed to save state', { error, appId, tenantId });
            this.emit('save_error', { error, appId, tenantId });
            throw error;
        }
    }
    /**
     * Load state with decryption and decompression
     */
    async loadState(appId, tenantId, stateId) {
        try {
            let redisKey;
            if (stateId) {
                redisKey = this.buildRedisKey(appId, tenantId, stateId);
            }
            else {
                // Get latest state
                const latestId = await this.getLatestStateId(appId, tenantId);
                if (!latestId)
                    return null;
                redisKey = this.buildRedisKey(appId, tenantId, latestId);
            }
            const redisValue = await this.redisClient.get(redisKey);
            if (!redisValue)
                return null;
            const storedData = JSON.parse(redisValue);
            let data = storedData.data;
            // Decrypt if needed
            if (storedData.encrypted) {
                data = this.decrypt(data);
            }
            // Decompress if needed
            if (storedData.compressed) {
                const compressedBuffer = Buffer.from(data, 'base64');
                const decompressedBuffer = await decompress(compressedBuffer);
                data = encodeBuffer(decompressedBuffer, 'utf8');
            }
            // Parse final data
            const parsedData = JSON.parse(data);
            // Verify Merkle root if enabled
            if (this.config.merkleTreeEnabled && storedData.merkleRoot) {
                const computedRoot = await this.generateMerkleRoot(parsedData);
                if (computedRoot !== storedData.merkleRoot) {
                    logger.warn('Merkle root verification failed', {
                        appId,
                        tenantId,
                        stateId: storedData.id,
                        expected: storedData.merkleRoot,
                        computed: computedRoot,
                    });
                    this.emit('integrity_violation', {
                        appId,
                        tenantId,
                        stateId: storedData.id,
                        expected: storedData.merkleRoot,
                        computed: computedRoot,
                    });
                }
            }
            const snapshot = {
                id: storedData.id,
                appId: storedData.appId,
                tenantId: storedData.tenantId,
                timestamp: new Date(storedData.timestamp),
                data: parsedData,
                merkleRoot: storedData.merkleRoot,
                encrypted: storedData.encrypted,
                compressed: storedData.compressed,
                tags: storedData.tags,
                metadata: storedData.metadata,
            };
            this.emit('state_loaded', {
                id: snapshot.id,
                appId,
                tenantId,
                size: redisValue.length,
            });
            logger.debug('State loaded successfully', {
                id: snapshot.id,
                appId,
                tenantId,
                timestamp: snapshot.timestamp,
            });
            return snapshot;
        }
        catch (error) {
            logger.error('Failed to load state', { error, appId, tenantId, stateId });
            this.emit('load_error', { error, appId, tenantId, stateId });
            throw error;
        }
    }
    /**
     * Query states with filtering
     */
    async queryStates(query) {
        try {
            const pattern = this.buildQueryPattern(query);
            const keys = await this.redisClient.keys(pattern);
            const snapshots = [];
            for (const key of keys) {
                try {
                    const redisValue = await this.redisClient.get(key);
                    if (!redisValue)
                        continue;
                    const storedData = JSON.parse(redisValue);
                    // Apply filters
                    if (query.fromDate && new Date(storedData.timestamp) < query.fromDate)
                        continue;
                    if (query.toDate && new Date(storedData.timestamp) > query.toDate)
                        continue;
                    if (query.tags &&
                        !query.tags.every((tag) => storedData.tags.includes(tag)))
                        continue;
                    // Create lightweight snapshot (without loading full data)
                    const snapshot = {
                        id: storedData.id,
                        appId: storedData.appId,
                        tenantId: storedData.tenantId,
                        timestamp: new Date(storedData.timestamp),
                        data: null, // Don't load data for query results
                        merkleRoot: storedData.merkleRoot,
                        encrypted: storedData.encrypted,
                        compressed: storedData.compressed,
                        tags: storedData.tags,
                        metadata: storedData.metadata,
                    };
                    snapshots.push(snapshot);
                }
                catch (error) {
                    logger.warn('Failed to process state in query', { error, key });
                }
            }
            // Sort by timestamp (newest first)
            snapshots.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
            // Apply limit
            const results = query.limit ? snapshots.slice(0, query.limit) : snapshots;
            logger.debug('State query completed', {
                query,
                totalFound: snapshots.length,
                returned: results.length,
            });
            return results;
        }
        catch (error) {
            logger.error('State query failed', { error, query });
            throw error;
        }
    }
    /**
     * Delete state
     */
    async deleteState(appId, tenantId, stateId) {
        try {
            const redisKey = this.buildRedisKey(appId, tenantId, stateId);
            const result = await this.redisClient.del(redisKey);
            // Remove from index
            await this.removeFromIndex(appId, tenantId, stateId);
            const deleted = result > 0;
            if (deleted) {
                this.emit('state_deleted', { appId, tenantId, stateId });
                logger.debug('State deleted', { appId, tenantId, stateId });
            }
            return deleted;
        }
        catch (error) {
            logger.error('Failed to delete state', {
                error,
                appId,
                tenantId,
                stateId,
            });
            throw error;
        }
    }
    /**
     * Perform automated compaction
     */
    async performCompaction() {
        try {
            const startTime = Date.now();
            const beforeCount = await this.getStateCount();
            // Find old states to compact
            const cutoffDate = new Date(Date.now() - this.config.retentionDays * 24 * 60 * 60 * 1000);
            const oldStates = await this.queryStates({
                toDate: cutoffDate,
            });
            let removedCount = 0;
            let spaceSaved = 0;
            for (const state of oldStates) {
                try {
                    const redisKey = this.buildRedisKey(state.appId, state.tenantId, state.id);
                    const size = (await this.redisClient.get(redisKey))?.length || 0;
                    await this.deleteState(state.appId, state.tenantId, state.id);
                    removedCount++;
                    spaceSaved += size;
                }
                catch (error) {
                    logger.warn('Failed to delete old state during compaction', {
                        error,
                        stateId: state.id,
                    });
                }
            }
            const afterCount = beforeCount - removedCount;
            const duration = Date.now() - startTime;
            const result = {
                beforeCount,
                afterCount,
                spaceSaved,
                duration,
            };
            this.emit('compaction_completed', result);
            logger.info('State compaction completed', result);
            return result;
        }
        catch (error) {
            logger.error('State compaction failed', { error });
            this.emit('compaction_error', { error });
            throw error;
        }
    }
    /**
     * Get state statistics
     */
    async getStatistics() {
        try {
            const totalStates = await this.getStateCount();
            const totalSize = await this.getTotalSize();
            // Get statistics by tenant
            const tenantStats = await this.getTenantStatistics();
            // Get recent activity
            const recentStates = await this.queryStates({
                fromDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
                limit: 100,
            });
            return {
                totalStates,
                totalSize,
                tenantStats,
                recentActivity: {
                    statesCreated: recentStates.length,
                    avgSize: recentStates.length > 0
                        ? recentStates.reduce((sum, s) => sum + (s.metadata.size || 0), 0) / recentStates.length
                        : 0,
                },
                configuration: {
                    encryptionEnabled: this.config.encryptionEnabled,
                    compressionEnabled: this.config.compressionEnabled,
                    merkleTreeEnabled: this.config.merkleTreeEnabled,
                    maxStateHistory: this.config.maxStateHistory,
                    retentionDays: this.config.retentionDays,
                },
            };
        }
        catch (error) {
            logger.error('Failed to get statistics', { error });
            throw error;
        }
    }
    // Private helper methods
    generateStateId() {
        return `state_${Date.now()}_${randomHex(8)}`;
    }
    buildRedisKey(appId, tenantId, stateId) {
        return `${this.config.keyPrefix}:${tenantId}:${appId}:${stateId}`;
    }
    buildQueryPattern(query) {
        let pattern = this.config.keyPrefix;
        if (query.tenantId) {
            pattern += `:${query.tenantId}`;
        }
        else {
            pattern += ':*';
        }
        if (query.appId) {
            pattern += `:${query.appId}`;
        }
        else {
            pattern += ':*';
        }
        pattern += ':*'; // State ID
        return pattern;
    }
    encrypt(data) {
        try {
            const iv = crypto.randomBytes(16);
            const cipher = crypto.createCipher('aes-256-gcm', this.encryptionKey);
            cipher.setAAD(Buffer.from('state-data'));
            let encrypted = cipher.update(data, 'utf8', 'hex');
            encrypted += cipher.final('hex');
            const authTag = cipher.getAuthTag();
            return JSON.stringify({
                iv: encodeBuffer(iv, 'hex'),
                data: encrypted,
                authTag: encodeBuffer(authTag, 'hex'),
            });
        }
        catch (error) {
            logger.error('Encryption failed', { error });
            throw new Error('Failed to encrypt state data');
        }
    }
    decrypt(encryptedData) {
        try {
            const { iv, data, authTag } = JSON.parse(encryptedData);
            const decipher = crypto.createDecipher('aes-256-gcm', this.encryptionKey);
            decipher.setAAD(Buffer.from('state-data'));
            decipher.setAuthTag(Buffer.from(authTag, 'hex'));
            let decrypted = decipher.update(data, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            return decrypted;
        }
        catch (error) {
            logger.error('Decryption failed', { error });
            throw new Error('Failed to decrypt state data');
        }
    }
    async generateMerkleRoot(data) {
        try {
            // Simple Merkle root calculation for integrity verification
            const serialized = JSON.stringify(data, Object.keys(data).sort());
            const hash = crypto.createHash('sha256');
            hash.update(serialized);
            return hash.digest('hex');
        }
        catch (error) {
            logger.error('Merkle root generation failed', { error });
            return '';
        }
    }
    async updateIndex(snapshot) {
        // In a real implementation, this would update search indices
        // For now, we'll use a simple Redis-based index
        const indexKey = `${this.config.keyPrefix}:index:${snapshot.tenantId}:${snapshot.appId}`;
        const indexValue = JSON.stringify({
            stateId: snapshot.id,
            timestamp: snapshot.timestamp.toISOString(),
            tags: snapshot.tags,
        });
        // Store with expiration based on retention policy
        const ttl = this.config.retentionDays * 24 * 60 * 60;
        await this.redisClient.set(`${indexKey}:${snapshot.id}`, indexValue, {
            EX: ttl,
        });
    }
    async removeFromIndex(appId, tenantId, stateId) {
        const indexKey = `${this.config.keyPrefix}:index:${tenantId}:${appId}:${stateId}`;
        await this.redisClient.del(indexKey);
    }
    async getLatestStateId(appId, tenantId) {
        const pattern = `${this.config.keyPrefix}:index:${tenantId}:${appId}:*`;
        const keys = await this.redisClient.keys(pattern);
        if (keys.length === 0)
            return null;
        // Sort by timestamp to get latest
        const states = await Promise.all(keys.map(async (key) => {
            const value = await this.redisClient.get(key);
            return value ? JSON.parse(value) : null;
        }));
        const validStates = states.filter((s) => s !== null);
        if (validStates.length === 0)
            return null;
        validStates.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        return validStates[0].stateId;
    }
    async getStateCount() {
        const pattern = `${this.config.keyPrefix}:*:*:state_*`;
        const keys = await this.redisClient.keys(pattern);
        return keys.length;
    }
    async getTotalSize() {
        const pattern = `${this.config.keyPrefix}:*:*:state_*`;
        const keys = await this.redisClient.keys(pattern);
        let totalSize = 0;
        for (const key of keys) {
            const value = await this.redisClient.get(key);
            if (value) {
                totalSize += value.length;
            }
        }
        return totalSize;
    }
    async getTenantStatistics() {
        const pattern = `${this.config.keyPrefix}:*:*:state_*`;
        const keys = await this.redisClient.keys(pattern);
        const tenantStats = {};
        for (const key of keys) {
            const parts = key.split(':');
            if (parts.length >= 4) {
                const tenantId = parts[1];
                if (!tenantStats[tenantId]) {
                    tenantStats[tenantId] = { count: 0, size: 0 };
                }
                tenantStats[tenantId].count++;
                const value = await this.redisClient.get(key);
                if (value) {
                    tenantStats[tenantId].size += value.length;
                }
            }
        }
        return tenantStats;
    }
    /**
     * Cleanup and shutdown
     */
    async shutdown() {
        logger.info('Shutting down RedisStateManager');
        // Clear compaction timer
        if (this.compactionTimer) {
            clearInterval(this.compactionTimer);
            this.compactionTimer = undefined;
        }
        // Perform final compaction
        try {
            await this.performCompaction();
        }
        catch (error) {
            logger.warn('Final compaction failed during shutdown', { error });
        }
        this.removeAllListeners();
        logger.info('RedisStateManager shutdown complete');
    }
}
exports.RedisStateManager = RedisStateManager;
exports.default = RedisStateManager;
