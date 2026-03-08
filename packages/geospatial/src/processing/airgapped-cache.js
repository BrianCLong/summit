"use strict";
// @ts-nocheck
/**
 * Air-Gapped Caching Layer
 * Optimized for denied/degraded network environments
 * Supports encrypted storage, priority-based eviction, and offline operation
 */
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AirgappedCache = void 0;
exports.createAirgappedCache = createAirgappedCache;
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const crypto = __importStar(require("crypto"));
const zlib = __importStar(require("zlib"));
const util_1 = require("util");
const events_1 = require("events");
const gzip = (0, util_1.promisify)(zlib.gzip);
const gunzip = (0, util_1.promisify)(zlib.gunzip);
/**
 * Air-Gapped Cache for satellite imagery and geospatial data
 * Designed for disconnected operation in denied environments
 */
class AirgappedCache extends events_1.EventEmitter {
    config;
    index;
    indexPath;
    initialized = false;
    writeLock = false;
    // Statistics
    hitCount = 0;
    missCount = 0;
    evictionCount = 0;
    constructor(config) {
        super();
        this.config = {
            ...config,
            compressionEnabled: config.compressionEnabled ?? true,
            evictionPolicy: config.evictionPolicy ?? 'lru',
            persistIndex: config.persistIndex ?? true,
            checksumValidation: config.checksumValidation ?? true,
        };
        this.indexPath = path.join(config.cacheDir, '.cache-index.json');
        this.index = {
            version: '1.0.0',
            entries: new Map(),
            totalSize: 0,
            lastCompaction: new Date(),
        };
    }
    /**
     * Initialize cache directory and load index
     */
    async initialize() {
        if (this.initialized)
            return;
        // Create cache directory
        await fs.mkdir(this.config.cacheDir, { recursive: true });
        // Create subdirectories for different data types
        const subdirs = ['raster', 'vector', 'metadata', 'model', 'tile'];
        await Promise.all(subdirs.map((dir) => fs.mkdir(path.join(this.config.cacheDir, dir), { recursive: true })));
        // Load existing index
        if (this.config.persistIndex) {
            await this.loadIndex();
        }
        // Validate existing entries
        await this.validateEntries();
        this.initialized = true;
    }
    /**
     * Store data in cache
     */
    async set(key, data, options) {
        await this.ensureInitialized();
        await this.acquireLock();
        try {
            // Serialize data
            let serialized;
            if (Buffer.isBuffer(data)) {
                serialized = data;
            }
            else if (typeof data === 'string') {
                serialized = Buffer.from(data, 'utf-8');
            }
            else {
                serialized = Buffer.from(JSON.stringify(data), 'utf-8');
            }
            // Compress if enabled
            let processedData = serialized;
            let compressed = false;
            if (this.config.compressionEnabled && serialized.length > 1024) {
                processedData = await gzip(serialized);
                compressed = true;
            }
            // Encrypt if key provided
            let encrypted = false;
            if (this.config.encryptionKey) {
                processedData = this.encrypt(processedData);
                encrypted = true;
            }
            // Calculate checksum
            const checksumMd5 = crypto
                .createHash('md5')
                .update(processedData)
                .digest('hex');
            // Ensure we have space
            const requiredSpace = processedData.length;
            await this.ensureSpace(requiredSpace);
            // Determine file path
            const fileName = this.keyToFileName(key);
            const filePath = path.join(this.config.cacheDir, options.dataType, fileName);
            // Write to disk
            await fs.writeFile(filePath, processedData);
            // Update index
            const metadata = {
                key,
                dataType: options.dataType,
                sizeBytes: processedData.length,
                createdAt: new Date(),
                expiresAt: options.ttlMs
                    ? new Date(Date.now() + options.ttlMs)
                    : this.config.defaultTtlMs
                        ? new Date(Date.now() + this.config.defaultTtlMs)
                        : undefined,
                accessCount: 0,
                lastAccessedAt: new Date(),
                priority: options.priority ?? 'normal',
                checksumMd5,
                compressed,
                encrypted,
                filePath,
            };
            // Remove old entry if exists
            const existing = this.index.entries.get(key);
            if (existing) {
                this.index.totalSize -= existing.sizeBytes;
                try {
                    await fs.unlink(existing.filePath);
                }
                catch {
                    // Ignore if file doesn't exist
                }
            }
            this.index.entries.set(key, metadata);
            this.index.totalSize += processedData.length;
            // Persist index
            if (this.config.persistIndex) {
                await this.saveIndex();
            }
        }
        finally {
            this.releaseLock();
        }
    }
    /**
     * Retrieve data from cache
     */
    async get(key) {
        await this.ensureInitialized();
        const metadata = this.index.entries.get(key);
        if (!metadata) {
            this.missCount++;
            this.emit('miss', key);
            return null;
        }
        // Check expiration
        if (metadata.expiresAt && new Date() > metadata.expiresAt) {
            await this.delete(key);
            this.missCount++;
            this.emit('miss', key);
            return null;
        }
        try {
            // Read from disk
            let data = await fs.readFile(metadata.filePath);
            // Validate checksum
            if (this.config.checksumValidation) {
                const checksum = crypto.createHash('md5').update(data).digest('hex');
                if (checksum !== metadata.checksumMd5) {
                    throw new Error('Checksum validation failed');
                }
            }
            // Decrypt if needed
            if (metadata.encrypted && this.config.encryptionKey) {
                data = this.decrypt(data);
            }
            // Decompress if needed
            if (metadata.compressed) {
                data = await gunzip(data);
            }
            // Update access stats
            metadata.accessCount++;
            metadata.lastAccessedAt = new Date();
            this.hitCount++;
            this.emit('hit', key, this.metadataToEntry(metadata, data));
            // Deserialize based on data type
            if (metadata.dataType === 'raster') {
                return data;
            }
            else if (metadata.dataType === 'metadata') {
                return JSON.parse(data.toString('utf-8'));
            }
            else {
                // Try JSON parse, fall back to string
                try {
                    return JSON.parse(data.toString('utf-8'));
                }
                catch {
                    return data.toString('utf-8');
                }
            }
        }
        catch (error) {
            this.emit('error', error);
            // Remove corrupted entry
            await this.delete(key);
            return null;
        }
    }
    /**
     * Check if key exists in cache
     */
    async has(key) {
        await this.ensureInitialized();
        const metadata = this.index.entries.get(key);
        if (!metadata)
            return false;
        // Check expiration
        if (metadata.expiresAt && new Date() > metadata.expiresAt) {
            await this.delete(key);
            return false;
        }
        return true;
    }
    /**
     * Delete entry from cache
     */
    async delete(key) {
        await this.ensureInitialized();
        const metadata = this.index.entries.get(key);
        if (!metadata)
            return false;
        try {
            await fs.unlink(metadata.filePath);
        }
        catch {
            // Ignore if file doesn't exist
        }
        this.index.entries.delete(key);
        this.index.totalSize -= metadata.sizeBytes;
        if (this.config.persistIndex) {
            await this.saveIndex();
        }
        return true;
    }
    /**
     * Store satellite scene metadata
     */
    async cacheScene(scene) {
        const key = `scene:${scene.id}`;
        await this.set(key, scene, {
            dataType: 'metadata',
            priority: 'high',
        });
    }
    /**
     * Get cached satellite scene
     */
    async getScene(sceneId) {
        const key = `scene:${sceneId}`;
        return this.get(key);
    }
    /**
     * Store raster tile
     */
    async cacheTile(sceneId, band, tile) {
        const key = `tile:${sceneId}:${band}:${tile.x}:${tile.y}:${tile.z}`;
        // Serialize tile data
        const tileData = {
            ...tile,
            data: Array.from(tile.data), // Convert typed array to regular array
        };
        await this.set(key, tileData, {
            dataType: 'tile',
            priority: 'normal',
        });
    }
    /**
     * Get cached raster tile
     */
    async getTile(sceneId, band, x, y, z) {
        const key = `tile:${sceneId}:${band}:${x}:${y}:${z}`;
        const cached = await this.get(key);
        if (!cached)
            return null;
        // Reconstruct typed array
        return {
            ...cached,
            data: new Float32Array(cached.data),
        };
    }
    /**
     * Store full raster band
     */
    async cacheRasterBand(sceneId, band, data) {
        const key = `raster:${sceneId}:${band}`;
        await this.set(key, data, {
            dataType: 'raster',
            priority: 'high',
        });
    }
    /**
     * Get cached raster band
     */
    async getRasterBand(sceneId, band) {
        const key = `raster:${sceneId}:${band}`;
        return this.get(key);
    }
    /**
     * Prefetch scenes for an area (for offline operation)
     */
    async prefetchArea(scenes, bands) {
        let cached = 0;
        let failed = 0;
        for (const scene of scenes) {
            try {
                await this.cacheScene(scene);
                cached++;
                // Note: Actual raster data would need to be fetched from source
                // This is a placeholder for the prefetch workflow
            }
            catch (error) {
                failed++;
                this.emit('error', error);
            }
        }
        return { cached, failed };
    }
    /**
     * Get cache statistics
     */
    getStats() {
        const entriesByType = {};
        const entriesByPriority = {};
        let oldestEntry;
        let newestEntry;
        for (const entry of this.index.entries.values()) {
            // By type
            entriesByType[entry.dataType] = (entriesByType[entry.dataType] ?? 0) + 1;
            // By priority
            entriesByPriority[entry.priority] =
                (entriesByPriority[entry.priority] ?? 0) + 1;
            // Track oldest/newest
            if (!oldestEntry || entry.createdAt < oldestEntry) {
                oldestEntry = entry.createdAt;
            }
            if (!newestEntry || entry.createdAt > newestEntry) {
                newestEntry = entry.createdAt;
            }
        }
        const totalAccesses = this.hitCount + this.missCount;
        return {
            totalEntries: this.index.entries.size,
            totalSizeBytes: this.index.totalSize,
            hitCount: this.hitCount,
            missCount: this.missCount,
            evictionCount: this.evictionCount,
            avgAccessTimeMs: totalAccesses > 0 ? 0 : 0, // Would need timing instrumentation
            oldestEntry,
            newestEntry,
            entriesByType,
            entriesByPriority,
        };
    }
    /**
     * Clear all cached data
     */
    async clear() {
        await this.ensureInitialized();
        await this.acquireLock();
        try {
            // Delete all files
            for (const entry of this.index.entries.values()) {
                try {
                    await fs.unlink(entry.filePath);
                }
                catch {
                    // Ignore
                }
            }
            // Reset index
            this.index.entries.clear();
            this.index.totalSize = 0;
            if (this.config.persistIndex) {
                await this.saveIndex();
            }
            // Reset stats
            this.hitCount = 0;
            this.missCount = 0;
            this.evictionCount = 0;
        }
        finally {
            this.releaseLock();
        }
    }
    /**
     * Compact cache - remove expired entries and optimize storage
     */
    async compact() {
        await this.ensureInitialized();
        await this.acquireLock();
        let removed = 0;
        let freedBytes = 0;
        try {
            const now = new Date();
            const toRemove = [];
            for (const [key, entry] of this.index.entries) {
                // Remove expired
                if (entry.expiresAt && entry.expiresAt < now) {
                    toRemove.push(key);
                    freedBytes += entry.sizeBytes;
                }
            }
            for (const key of toRemove) {
                await this.delete(key);
                removed++;
            }
            this.index.lastCompaction = now;
            if (this.config.persistIndex) {
                await this.saveIndex();
            }
            return { removed, freedBytes };
        }
        finally {
            this.releaseLock();
        }
    }
    /**
     * Export cache inventory for sync operations
     */
    async exportInventory() {
        await this.ensureInitialized();
        const entries = Array.from(this.index.entries.values()).map((e) => ({
            key: e.key,
            checksum: e.checksumMd5,
            size: e.sizeBytes,
            type: e.dataType,
        }));
        return {
            entries,
            totalSize: this.index.totalSize,
        };
    }
    /**
     * Import data from another cache (sync operation)
     */
    async importFrom(sourcePath, keys) {
        let imported = 0;
        let failed = 0;
        for (const key of keys) {
            try {
                // Read from source
                const fileName = this.keyToFileName(key);
                const sourceFile = path.join(sourcePath, fileName);
                const data = await fs.readFile(sourceFile);
                // Detect type from key
                let dataType = 'metadata';
                if (key.startsWith('raster:'))
                    dataType = 'raster';
                else if (key.startsWith('tile:'))
                    dataType = 'tile';
                else if (key.startsWith('vector:'))
                    dataType = 'vector';
                await this.set(key, data, { dataType });
                imported++;
            }
            catch (error) {
                failed++;
            }
        }
        this.emit('sync', imported, failed);
        return { imported, failed };
    }
    // Private methods
    async ensureInitialized() {
        if (!this.initialized) {
            await this.initialize();
        }
    }
    async acquireLock() {
        while (this.writeLock) {
            await new Promise((resolve) => setTimeout(resolve, 10));
        }
        this.writeLock = true;
    }
    releaseLock() {
        this.writeLock = false;
    }
    async loadIndex() {
        try {
            const data = await fs.readFile(this.indexPath, 'utf-8');
            const parsed = JSON.parse(data);
            this.index = {
                version: parsed.version,
                entries: new Map(parsed.entries.map((e) => [
                    e.key,
                    {
                        ...e,
                        createdAt: new Date(e.createdAt),
                        expiresAt: e.expiresAt ? new Date(e.expiresAt) : undefined,
                        lastAccessedAt: new Date(e.lastAccessedAt),
                    },
                ])),
                totalSize: parsed.totalSize,
                lastCompaction: new Date(parsed.lastCompaction),
            };
        }
        catch {
            // Index doesn't exist or is corrupted - start fresh
        }
    }
    async saveIndex() {
        const serializable = {
            version: this.index.version,
            entries: Array.from(this.index.entries.values()),
            totalSize: this.index.totalSize,
            lastCompaction: this.index.lastCompaction.toISOString(),
        };
        await fs.writeFile(this.indexPath, JSON.stringify(serializable, null, 2), 'utf-8');
    }
    async validateEntries() {
        const toRemove = [];
        for (const [key, entry] of this.index.entries) {
            try {
                await fs.access(entry.filePath);
            }
            catch {
                // File doesn't exist
                toRemove.push(key);
            }
        }
        for (const key of toRemove) {
            const entry = this.index.entries.get(key);
            if (entry) {
                this.index.totalSize -= entry.sizeBytes;
                this.index.entries.delete(key);
            }
        }
    }
    async ensureSpace(requiredBytes) {
        while (this.index.totalSize + requiredBytes > this.config.maxSizeBytes &&
            this.index.entries.size > 0) {
            const victimKey = this.selectEvictionVictim();
            if (!victimKey)
                break;
            const victim = this.index.entries.get(victimKey);
            if (victim) {
                this.emit('eviction', victimKey, this.metadataToEntry(victim));
                this.evictionCount++;
            }
            await this.delete(victimKey);
        }
    }
    selectEvictionVictim() {
        if (this.index.entries.size === 0)
            return null;
        const entries = Array.from(this.index.entries.entries());
        // Never evict critical priority
        const evictable = entries.filter(([_, e]) => e.priority !== 'critical');
        if (evictable.length === 0)
            return entries[0][0];
        switch (this.config.evictionPolicy) {
            case 'lru':
                // Least recently used
                evictable.sort((a, b) => a[1].lastAccessedAt.getTime() - b[1].lastAccessedAt.getTime());
                break;
            case 'lfu':
                // Least frequently used
                evictable.sort((a, b) => a[1].accessCount - b[1].accessCount);
                break;
            case 'priority':
                // Lowest priority first, then LRU within priority
                evictable.sort((a, b) => {
                    const priorityOrder = { low: 0, normal: 1, high: 2, critical: 3 };
                    const priorityDiff = priorityOrder[a[1].priority] - priorityOrder[b[1].priority];
                    if (priorityDiff !== 0)
                        return priorityDiff;
                    return (a[1].lastAccessedAt.getTime() - b[1].lastAccessedAt.getTime());
                });
                break;
            case 'fifo':
            default:
                // First in, first out
                evictable.sort((a, b) => a[1].createdAt.getTime() - b[1].createdAt.getTime());
                break;
        }
        return evictable[0][0];
    }
    keyToFileName(key) {
        // Create safe filename from key
        const hash = crypto.createHash('sha256').update(key).digest('hex');
        return `${hash.substring(0, 16)}.cache`;
    }
    encrypt(data) {
        if (!this.config.encryptionKey)
            return data;
        const iv = crypto.randomBytes(16);
        const key = Buffer.from(this.config.encryptionKey, 'hex');
        const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
        const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
        const authTag = cipher.getAuthTag();
        // Prepend IV and auth tag
        return Buffer.concat([iv, authTag, encrypted]);
    }
    decrypt(data) {
        if (!this.config.encryptionKey)
            return data;
        const iv = data.subarray(0, 16);
        const authTag = data.subarray(16, 32);
        const encrypted = data.subarray(32);
        const key = Buffer.from(this.config.encryptionKey, 'hex');
        const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
        decipher.setAuthTag(authTag);
        return Buffer.concat([decipher.update(encrypted), decipher.final()]);
    }
    metadataToEntry(metadata, data) {
        return {
            key: metadata.key,
            data: data ?? Buffer.alloc(0),
            dataType: metadata.dataType,
            sizeBytes: metadata.sizeBytes,
            createdAt: metadata.createdAt,
            expiresAt: metadata.expiresAt,
            accessCount: metadata.accessCount,
            lastAccessedAt: metadata.lastAccessedAt,
            priority: metadata.priority,
            checksumMd5: metadata.checksumMd5,
            compressed: metadata.compressed,
            encryption: metadata.encrypted
                ? { algorithm: 'aes-256-gcm', keyId: 'default' }
                : undefined,
        };
    }
}
exports.AirgappedCache = AirgappedCache;
/**
 * Factory for creating air-gapped cache instances
 */
function createAirgappedCache(config) {
    return new AirgappedCache(config);
}
