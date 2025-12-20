/**
 * Compression Manager for Summit Data Warehouse
 *
 * Manages multiple compression algorithms:
 * - LZ4: Fast compression/decompression
 * - ZSTD: Best compression ratio
 * - SNAPPY: Balanced performance
 * - GZIP: Standard compression
 *
 * Automatically selects optimal algorithm based on data characteristics
 */

import { promisify } from 'util';
import * as zlib from 'zlib';

export enum CompressionType {
  NONE = 'NONE',
  LZ4 = 'LZ4',
  ZSTD = 'ZSTD',
  SNAPPY = 'SNAPPY',
  GZIP = 'GZIP',
}

export interface CompressionStats {
  type: CompressionType;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  compressionTimeMs: number;
  decompressionTimeMs?: number;
}

export class CompressionManager {
  private gzipCompress = promisify(zlib.gzip);
  private gzipDecompress = promisify(zlib.gunzip);
  private deflateCompress = promisify(zlib.deflate);
  private deflateDecompress = promisify(zlib.inflate);

  /**
   * Compress data with specified algorithm
   */
  async compress(
    data: Buffer | string,
    type: CompressionType = CompressionType.ZSTD,
  ): Promise<Buffer> {
    const buffer = typeof data === 'string' ? Buffer.from(data) : data;

    switch (type) {
      case CompressionType.LZ4:
        return this.compressLZ4(buffer);

      case CompressionType.ZSTD:
        return this.compressZSTD(buffer);

      case CompressionType.SNAPPY:
        return this.compressSnappy(buffer);

      case CompressionType.GZIP:
        return this.compressGzip(buffer);

      case CompressionType.NONE:
        return buffer;

      default:
        throw new Error(`Unsupported compression type: ${type}`);
    }
  }

  /**
   * Decompress data
   */
  async decompress(data: Buffer, type: CompressionType): Promise<Buffer> {
    switch (type) {
      case CompressionType.LZ4:
        return this.decompressLZ4(data);

      case CompressionType.ZSTD:
        return this.decompressZSTD(data);

      case CompressionType.SNAPPY:
        return this.decompressSnappy(data);

      case CompressionType.GZIP:
        return this.decompressGzip(data);

      case CompressionType.NONE:
        return data;

      default:
        throw new Error(`Unsupported compression type: ${type}`);
    }
  }

  /**
   * Benchmark compression algorithms and select best
   */
  async selectBestCompression(
    data: Buffer,
    priority: 'ratio' | 'speed' | 'balanced' = 'balanced',
  ): Promise<{ type: CompressionType; stats: CompressionStats }> {
    const algorithms: CompressionType[] = [
      CompressionType.LZ4,
      CompressionType.ZSTD,
      CompressionType.SNAPPY,
      CompressionType.GZIP,
    ];

    const results = await Promise.all(
      algorithms.map(async (type) => {
        const start = Date.now();
        const compressed = await this.compress(data, type);
        const compressionTime = Date.now() - start;

        const decompressStart = Date.now();
        await this.decompress(compressed, type);
        const decompressionTime = Date.now() - decompressStart;

        const stats: CompressionStats = {
          type,
          originalSize: data.length,
          compressedSize: compressed.length,
          compressionRatio: data.length / compressed.length,
          compressionTimeMs: compressionTime,
          decompressionTimeMs: decompressionTime,
        };

        return { type, stats };
      }),
    );

    // Select based on priority
    let best = results[0];

    if (priority === 'ratio') {
      best = results.reduce((prev, curr) =>
        curr.stats.compressionRatio > prev.stats.compressionRatio ? curr : prev,
      );
    } else if (priority === 'speed') {
      best = results.reduce((prev, curr) =>
        (curr.stats.compressionTimeMs + (curr.stats.decompressionTimeMs || 0)) <
        (prev.stats.compressionTimeMs + (prev.stats.decompressionTimeMs || 0))
          ? curr
          : prev,
      );
    } else {
      // Balanced: ratio * speed score
      best = results.reduce((prev, curr) => {
        const currScore =
          curr.stats.compressionRatio /
          Math.log(
            curr.stats.compressionTimeMs + (curr.stats.decompressionTimeMs || 0) + 1,
          );
        const prevScore =
          prev.stats.compressionRatio /
          Math.log(
            prev.stats.compressionTimeMs + (prev.stats.decompressionTimeMs || 0) + 1,
          );
        return currScore > prevScore ? curr : prev;
      });
    }

    return best;
  }

  // LZ4 Compression (Fast)
  private async compressLZ4(buffer: Buffer): Promise<Buffer> {
    // Simulated LZ4 - in production, use native lz4 library
    // For now, use deflate as a fast alternative
    return this.deflateCompress(buffer, { level: 1 });
  }

  private async decompressLZ4(buffer: Buffer): Promise<Buffer> {
    return this.deflateDecompress(buffer);
  }

  // ZSTD Compression (Best Ratio)
  private async compressZSTD(buffer: Buffer): Promise<Buffer> {
    // Simulated ZSTD - in production, use native zstd library
    // For now, use gzip with max compression
    return this.gzipCompress(buffer, { level: 9 });
  }

  private async decompressZSTD(buffer: Buffer): Promise<Buffer> {
    return this.gzipDecompress(buffer);
  }

  // Snappy Compression (Balanced)
  private async compressSnappy(buffer: Buffer): Promise<Buffer> {
    // Simulated Snappy - in production, use native snappy library
    // For now, use deflate with medium compression
    return this.deflateCompress(buffer, { level: 6 });
  }

  private async decompressSnappy(buffer: Buffer): Promise<Buffer> {
    return this.deflateDecompress(buffer);
  }

  // GZIP Compression
  private async compressGzip(buffer: Buffer): Promise<Buffer> {
    return this.gzipCompress(buffer);
  }

  private async decompressGzip(buffer: Buffer): Promise<Buffer> {
    return this.gzipDecompress(buffer);
  }

  /**
   * Estimate compression ratio without actually compressing
   */
  estimateCompressionRatio(
    data: Buffer,
    type: CompressionType,
  ): number {
    const sampleSize = Math.min(data.length, 10000);
    const sample = data.slice(0, sampleSize);

    // Count unique bytes for entropy estimation
    const frequencies = new Map<number, number>();
    for (let i = 0; i < sample.length; i++) {
      const byte = sample[i];
      frequencies.set(byte, (frequencies.get(byte) || 0) + 1);
    }

    // Calculate Shannon entropy
    let entropy = 0;
    for (const count of frequencies.values()) {
      const probability = count / sample.length;
      entropy -= probability * Math.log2(probability);
    }

    // Estimate compression ratio based on entropy and algorithm
    const maxEntropy = 8; // Maximum entropy for 8-bit bytes
    const entropyRatio = entropy / maxEntropy;

    const algorithmFactors = {
      [CompressionType.LZ4]: 0.5,
      [CompressionType.ZSTD]: 0.7,
      [CompressionType.SNAPPY]: 0.6,
      [CompressionType.GZIP]: 0.65,
      [CompressionType.NONE]: 0,
    };

    const factor = algorithmFactors[type] || 0.5;
    const estimatedRatio = 1 / (1 - factor * (1 - entropyRatio));

    return Math.max(1, estimatedRatio);
  }

  /**
   * Get compression statistics
   */
  getCompressionInfo(type: CompressionType): {
    name: string;
    speed: 'fast' | 'medium' | 'slow';
    ratio: 'low' | 'medium' | 'high';
    cpuUsage: 'low' | 'medium' | 'high';
  } {
    const info = {
      [CompressionType.LZ4]: {
        name: 'LZ4',
        speed: 'fast' as const,
        ratio: 'medium' as const,
        cpuUsage: 'low' as const,
      },
      [CompressionType.ZSTD]: {
        name: 'ZSTD',
        speed: 'medium' as const,
        ratio: 'high' as const,
        cpuUsage: 'high' as const,
      },
      [CompressionType.SNAPPY]: {
        name: 'Snappy',
        speed: 'fast' as const,
        ratio: 'medium' as const,
        cpuUsage: 'medium' as const,
      },
      [CompressionType.GZIP]: {
        name: 'GZIP',
        speed: 'slow' as const,
        ratio: 'high' as const,
        cpuUsage: 'high' as const,
      },
      [CompressionType.NONE]: {
        name: 'None',
        speed: 'fast' as const,
        ratio: 'low' as const,
        cpuUsage: 'low' as const,
      },
    };

    return info[type];
  }
}
