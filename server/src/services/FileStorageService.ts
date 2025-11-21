import { createWriteStream, createReadStream, promises as fs } from 'fs';
import { pipeline } from 'stream/promises';
import { createHash, randomUUID } from 'crypto';
import * as path from 'path';
import type { Readable } from 'stream';
import pino from 'pino';

const logger = pino({ name: 'FileStorageService' });

export interface StorageConfig {
  basePath: string;
  maxFileSize: number;
  allowedMimeTypes: string[];
  enableDeduplication: boolean;
  retentionDays?: number;
}

export interface StoredFile {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  sha256: string;
  storagePath: string;
  uploadedAt: Date;
  uploadedBy?: string;
  metadata?: Record<string, unknown>;
}

export interface UploadOptions {
  filename: string;
  mimeType: string;
  uploadedBy?: string;
  metadata?: Record<string, unknown>;
  investigationId?: string;
  entityId?: string;
}

const DEFAULT_CONFIG: StorageConfig = {
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

export class FileStorageService {
  private config: StorageConfig;
  private initialized: boolean = false;

  constructor(config: Partial<StorageConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  private async ensureInitialized(): Promise<void> {
    if (this.initialized) return;

    await fs.mkdir(this.config.basePath, { recursive: true });
    await fs.mkdir(path.join(this.config.basePath, 'temp'), { recursive: true });
    await fs.mkdir(path.join(this.config.basePath, 'files'), { recursive: true });

    this.initialized = true;
    logger.info(`FileStorageService initialized at ${this.config.basePath}`);
  }

  private isAllowedMimeType(mimeType: string): boolean {
    return this.config.allowedMimeTypes.some((allowed) => {
      if (allowed.endsWith('/*')) {
        return mimeType.startsWith(allowed.slice(0, -1));
      }
      return mimeType === allowed;
    });
  }

  async upload(stream: Readable, options: UploadOptions): Promise<StoredFile> {
    await this.ensureInitialized();

    if (!this.isAllowedMimeType(options.mimeType)) {
      throw new Error(`MIME type ${options.mimeType} is not allowed`);
    }

    const fileId = randomUUID();
    const ext = path.extname(options.filename) || '';
    const tempPath = path.join(this.config.basePath, 'temp', `${fileId}${ext}`);

    const hash = createHash('sha256');
    let size = 0;

    try {
      const writeStream = createWriteStream(tempPath);

      await (pipeline as any)(
        stream,
        async function* (source: AsyncIterable<Buffer>) {
          for await (const chunk of source) {
            hash.update(chunk);
            size += chunk.length;
            yield chunk;
          }
        },
        writeStream,
      );

      if (size > this.config.maxFileSize) {
        await fs.unlink(tempPath);
        throw new Error(`File size ${size} exceeds maximum ${this.config.maxFileSize}`);
      }

      const sha256 = hash.digest('hex');
      let finalPath: string;

      if (this.config.enableDeduplication) {
        // Store by content hash for deduplication
        finalPath = path.join(this.config.basePath, 'files', sha256.substring(0, 2), sha256);
        await fs.mkdir(path.dirname(finalPath), { recursive: true });

        // Check if file already exists
        try {
          await fs.access(finalPath);
          await fs.unlink(tempPath); // Delete duplicate temp file
          logger.info(`Deduplicated file: ${sha256}`);
        } catch {
          await fs.rename(tempPath, finalPath);
        }
      } else {
        finalPath = path.join(this.config.basePath, 'files', `${fileId}${ext}`);
        await fs.rename(tempPath, finalPath);
      }

      const storedFile: StoredFile = {
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
      return storedFile;
    } catch (error) {
      // Cleanup on error
      try {
        await fs.unlink(tempPath);
      } catch {
        // Ignore cleanup errors
      }
      throw error;
    }
  }

  async getFile(fileId: string): Promise<{ stream: Readable; metadata: StoredFile } | null> {
    await this.ensureInitialized();

    // Search for file by ID or hash
    const filesDir = path.join(this.config.basePath, 'files');

    try {
      // Direct file path
      const directPath = path.join(filesDir, fileId);
      await fs.access(directPath);

      const stats = await fs.stat(directPath);
      const stream = createReadStream(directPath);

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
    } catch {
      // Try hash-based path
      for (const prefix of await this.getHashPrefixes()) {
        const hashPath = path.join(filesDir, prefix, fileId);
        try {
          await fs.access(hashPath);
          const stats = await fs.stat(hashPath);
          const stream = createReadStream(hashPath);

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
        } catch {
          continue;
        }
      }
    }

    return null;
  }

  private async getHashPrefixes(): Promise<string[]> {
    const filesDir = path.join(this.config.basePath, 'files');
    try {
      const entries = await fs.readdir(filesDir);
      return entries.filter((e) => e.length === 2);
    } catch {
      return [];
    }
  }

  async delete(fileId: string): Promise<boolean> {
    await this.ensureInitialized();

    const result = await this.getFile(fileId);
    if (!result) return false;

    try {
      await fs.unlink(result.metadata.storagePath);
      logger.info(`Deleted file: ${fileId}`);
      return true;
    } catch (error) {
      logger.error(`Failed to delete file ${fileId}:`, error);
      return false;
    }
  }

  async verifyIntegrity(fileId: string, expectedHash: string): Promise<boolean> {
    const result = await this.getFile(fileId);
    if (!result) return false;

    const hash = createHash('sha256');
    for await (const chunk of result.stream) {
      hash.update(chunk);
    }

    return hash.digest('hex') === expectedHash;
  }

  async getStorageStats(): Promise<{
    totalFiles: number;
    totalSize: number;
    oldestFile?: Date;
    newestFile?: Date;
  }> {
    await this.ensureInitialized();

    const filesDir = path.join(this.config.basePath, 'files');
    let totalFiles = 0;
    let totalSize = 0;
    let oldestFile: Date | undefined;
    let newestFile: Date | undefined;

    const walkDir = async (dir: string) => {
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            await walkDir(fullPath);
          } else if (entry.isFile()) {
            totalFiles++;
            const stats = await fs.stat(fullPath);
            totalSize += stats.size;

            if (!oldestFile || stats.birthtime < oldestFile) {
              oldestFile = stats.birthtime;
            }
            if (!newestFile || stats.birthtime > newestFile) {
              newestFile = stats.birthtime;
            }
          }
        }
      } catch {
        // Directory doesn't exist yet
      }
    };

    await walkDir(filesDir);

    return { totalFiles, totalSize, oldestFile, newestFile };
  }
}

// Singleton instance
export const fileStorageService = new FileStorageService();
