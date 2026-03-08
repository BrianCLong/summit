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
exports.fileStorageService = exports.FileStorageService = void 0;
const fs_1 = require("fs");
const promises_1 = require("stream/promises");
const crypto_1 = require("crypto");
const path = __importStar(require("path"));
const pino_1 = __importDefault(require("pino"));
const emitter_js_1 = require("../metering/emitter.js");
const logger = pino_1.default({ name: 'FileStorageService' });
const DEFAULT_CONFIG = {
    basePath: process.env.FILE_STORAGE_PATH || '/tmp/intelgraph/storage',
    maxFileSize: 10 * 1024 * 1024 * 1024, // 10GB
    allowedMimeTypes: [
        'image/*',
        'video/*',
        'audio/*',
        'text/*',
        'application/pdf',
        'application/json',
        'application/xml',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ],
    enableDeduplication: true,
};
class FileStorageService {
    config;
    initialized = false;
    constructor(config = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
    }
    async ensureInitialized() {
        if (this.initialized)
            return;
        await fs_1.promises.mkdir(this.config.basePath, { recursive: true });
        await fs_1.promises.mkdir(path.join(this.config.basePath, 'temp'), { recursive: true });
        await fs_1.promises.mkdir(path.join(this.config.basePath, 'files'), { recursive: true });
        this.initialized = true;
        logger.info(`FileStorageService initialized at ${this.config.basePath}`);
    }
    isAllowedMimeType(mimeType) {
        return this.config.allowedMimeTypes.some((allowed) => {
            if (allowed.endsWith('/*')) {
                return mimeType.startsWith(allowed.slice(0, -1));
            }
            return mimeType === allowed;
        });
    }
    async upload(stream, options) {
        await this.ensureInitialized();
        if (!this.isAllowedMimeType(options.mimeType)) {
            throw new Error(`MIME type ${options.mimeType} is not allowed`);
        }
        const fileId = (0, crypto_1.randomUUID)();
        const ext = path.extname(options.filename) || '';
        const tempPath = path.join(this.config.basePath, 'temp', `${fileId}${ext}`);
        const hash = (0, crypto_1.createHash)('sha256');
        let size = 0;
        try {
            const writeStream = (0, fs_1.createWriteStream)(tempPath);
            await promises_1.pipeline(stream, async function* (source) {
                for await (const chunk of source) {
                    hash.update(chunk);
                    size += chunk.length;
                    yield chunk;
                }
            }, writeStream);
            if (size > this.config.maxFileSize) {
                await fs_1.promises.unlink(tempPath);
                throw new Error(`File size ${size} exceeds maximum ${this.config.maxFileSize}`);
            }
            const sha256 = hash.digest('hex');
            let finalPath;
            if (this.config.enableDeduplication) {
                // Store by content hash for deduplication
                finalPath = path.join(this.config.basePath, 'files', sha256.substring(0, 2), sha256);
                await fs_1.promises.mkdir(path.dirname(finalPath), { recursive: true });
                // Check if file already exists
                try {
                    await fs_1.promises.access(finalPath);
                    await fs_1.promises.unlink(tempPath); // Delete duplicate temp file
                    logger.info(`Deduplicated file: ${sha256}`);
                }
                catch {
                    await fs_1.promises.rename(tempPath, finalPath);
                }
            }
            else {
                finalPath = path.join(this.config.basePath, 'files', `${fileId}${ext}`);
                await fs_1.promises.rename(tempPath, finalPath);
            }
            const storedFile = {
                id: fileId,
                filename: `${fileId}${ext}`,
                originalName: options.filename,
                mimeType: options.mimeType,
                size,
                sha256,
                storagePath: finalPath,
                uploadedAt: new Date(),
                uploadedBy: options.uploadedBy,
                metadata: {
                    ...options.metadata,
                    investigationId: options.investigationId,
                    entityId: options.entityId,
                },
            };
            logger.info(`Stored file: ${storedFile.filename}, size: ${size}, hash: ${sha256.substring(0, 8)}...`);
            try {
                await emitter_js_1.meteringEmitter.emitStorageEstimate({
                    tenantId: options.metadata?.tenantId || 'default_tenant',
                    bytes: size,
                    source: 'file-storage-service',
                    correlationId: sha256,
                    idempotencyKey: sha256,
                    metadata: {
                        uploadedBy: options.uploadedBy,
                        mimeType: options.mimeType,
                    },
                });
            }
            catch (meterError) {
                logger.warn({ meterError, sha256 }, 'Failed to emit storage meter event');
            }
            return storedFile;
        }
        catch (error) {
            // Cleanup on error
            try {
                await fs_1.promises.unlink(tempPath);
            }
            catch {
                // Ignore cleanup errors
            }
            throw error;
        }
    }
    async getFile(fileId) {
        await this.ensureInitialized();
        // Search for file by ID or hash
        const filesDir = path.join(this.config.basePath, 'files');
        try {
            // Direct file path
            const directPath = path.join(filesDir, fileId);
            await fs_1.promises.access(directPath);
            const stats = await fs_1.promises.stat(directPath);
            const stream = (0, fs_1.createReadStream)(directPath);
            return {
                stream,
                metadata: {
                    id: fileId,
                    filename: path.basename(directPath),
                    originalName: path.basename(directPath),
                    mimeType: 'application/octet-stream',
                    size: stats.size,
                    sha256: fileId,
                    storagePath: directPath,
                    uploadedAt: stats.birthtime,
                },
            };
        }
        catch {
            // Try hash-based path
            for (const prefix of await this.getHashPrefixes()) {
                const hashPath = path.join(filesDir, prefix, fileId);
                try {
                    await fs_1.promises.access(hashPath);
                    const stats = await fs_1.promises.stat(hashPath);
                    const stream = (0, fs_1.createReadStream)(hashPath);
                    return {
                        stream,
                        metadata: {
                            id: fileId,
                            filename: fileId,
                            originalName: fileId,
                            mimeType: 'application/octet-stream',
                            size: stats.size,
                            sha256: fileId,
                            storagePath: hashPath,
                            uploadedAt: stats.birthtime,
                        },
                    };
                }
                catch {
                    continue;
                }
            }
        }
        return null;
    }
    async getHashPrefixes() {
        const filesDir = path.join(this.config.basePath, 'files');
        try {
            const entries = await fs_1.promises.readdir(filesDir);
            return entries.filter((e) => e.length === 2);
        }
        catch {
            return [];
        }
    }
    async delete(fileId) {
        await this.ensureInitialized();
        const result = await this.getFile(fileId);
        if (!result)
            return false;
        try {
            await fs_1.promises.unlink(result.metadata.storagePath);
            logger.info(`Deleted file: ${fileId}`);
            return true;
        }
        catch (error) {
            logger.error(`Failed to delete file ${fileId}:`, error);
            return false;
        }
    }
    async verifyIntegrity(fileId, expectedHash) {
        const result = await this.getFile(fileId);
        if (!result)
            return false;
        const hash = (0, crypto_1.createHash)('sha256');
        for await (const chunk of result.stream) {
            hash.update(chunk);
        }
        return hash.digest('hex') === expectedHash;
    }
    async getStorageStats() {
        await this.ensureInitialized();
        const filesDir = path.join(this.config.basePath, 'files');
        let totalFiles = 0;
        let totalSize = 0;
        let oldestFile;
        let newestFile;
        const walkDir = async (dir) => {
            try {
                const entries = await fs_1.promises.readdir(dir, { withFileTypes: true });
                for (const entry of entries) {
                    const fullPath = path.join(dir, entry.name);
                    if (entry.isDirectory()) {
                        await walkDir(fullPath);
                    }
                    else if (entry.isFile()) {
                        totalFiles++;
                        const stats = await fs_1.promises.stat(fullPath);
                        totalSize += stats.size;
                        if (!oldestFile || stats.birthtime < oldestFile) {
                            oldestFile = stats.birthtime;
                        }
                        if (!newestFile || stats.birthtime > newestFile) {
                            newestFile = stats.birthtime;
                        }
                    }
                }
            }
            catch {
                // Directory doesn't exist yet
            }
        };
        await walkDir(filesDir);
        return { totalFiles, totalSize, oldestFile, newestFile };
    }
}
exports.FileStorageService = FileStorageService;
// Singleton instance
exports.fileStorageService = new FileStorageService();
