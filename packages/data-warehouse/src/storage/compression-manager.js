"use strict";
// @ts-nocheck
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
exports.CompressionManager = exports.CompressionType = void 0;
const util_1 = require("util");
const zlib = __importStar(require("zlib"));
var CompressionType;
(function (CompressionType) {
    CompressionType["NONE"] = "NONE";
    CompressionType["LZ4"] = "LZ4";
    CompressionType["ZSTD"] = "ZSTD";
    CompressionType["SNAPPY"] = "SNAPPY";
    CompressionType["GZIP"] = "GZIP";
})(CompressionType || (exports.CompressionType = CompressionType = {}));
class CompressionManager {
    gzipCompress = (0, util_1.promisify)(zlib.gzip);
    gzipDecompress = (0, util_1.promisify)(zlib.gunzip);
    deflateCompress = (0, util_1.promisify)(zlib.deflate);
    deflateDecompress = (0, util_1.promisify)(zlib.inflate);
    /**
     * Compress data with specified algorithm
     */
    async compress(data, type = CompressionType.ZSTD) {
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
    async decompress(data, type) {
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
    async selectBestCompression(data, priority = 'balanced') {
        const algorithms = [
            CompressionType.LZ4,
            CompressionType.ZSTD,
            CompressionType.SNAPPY,
            CompressionType.GZIP,
        ];
        const results = await Promise.all(algorithms.map(async (type) => {
            const start = Date.now();
            const compressed = await this.compress(data, type);
            const compressionTime = Date.now() - start;
            const decompressStart = Date.now();
            await this.decompress(compressed, type);
            const decompressionTime = Date.now() - decompressStart;
            const stats = {
                type,
                originalSize: data.length,
                compressedSize: compressed.length,
                compressionRatio: data.length / compressed.length,
                compressionTimeMs: compressionTime,
                decompressionTimeMs: decompressionTime,
            };
            return { type, stats };
        }));
        // Select based on priority
        let best = results[0];
        if (priority === 'ratio') {
            best = results.reduce((prev, curr) => curr.stats.compressionRatio > prev.stats.compressionRatio ? curr : prev);
        }
        else if (priority === 'speed') {
            best = results.reduce((prev, curr) => (curr.stats.compressionTimeMs + (curr.stats.decompressionTimeMs || 0)) <
                (prev.stats.compressionTimeMs + (prev.stats.decompressionTimeMs || 0))
                ? curr
                : prev);
        }
        else {
            // Balanced: ratio * speed score
            best = results.reduce((prev, curr) => {
                const currScore = curr.stats.compressionRatio /
                    Math.log(curr.stats.compressionTimeMs + (curr.stats.decompressionTimeMs || 0) + 1);
                const prevScore = prev.stats.compressionRatio /
                    Math.log(prev.stats.compressionTimeMs + (prev.stats.decompressionTimeMs || 0) + 1);
                return currScore > prevScore ? curr : prev;
            });
        }
        return best;
    }
    // LZ4 Compression (Fast)
    async compressLZ4(buffer) {
        // Simulated LZ4 - in production, use native lz4 library
        // For now, use deflate as a fast alternative
        return this.deflateCompress(buffer, { level: 1 });
    }
    async decompressLZ4(buffer) {
        return this.deflateDecompress(buffer);
    }
    // ZSTD Compression (Best Ratio)
    async compressZSTD(buffer) {
        // Simulated ZSTD - in production, use native zstd library
        // For now, use gzip with max compression
        return this.gzipCompress(buffer, { level: 9 });
    }
    async decompressZSTD(buffer) {
        return this.gzipDecompress(buffer);
    }
    // Snappy Compression (Balanced)
    async compressSnappy(buffer) {
        // Simulated Snappy - in production, use native snappy library
        // For now, use deflate with medium compression
        return this.deflateCompress(buffer, { level: 6 });
    }
    async decompressSnappy(buffer) {
        return this.deflateDecompress(buffer);
    }
    // GZIP Compression
    async compressGzip(buffer) {
        return this.gzipCompress(buffer);
    }
    async decompressGzip(buffer) {
        return this.gzipDecompress(buffer);
    }
    /**
     * Estimate compression ratio without actually compressing
     */
    estimateCompressionRatio(data, type) {
        const sampleSize = Math.min(data.length, 10000);
        const sample = data.slice(0, sampleSize);
        // Count unique bytes for entropy estimation
        const frequencies = new Map();
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
    getCompressionInfo(type) {
        const info = {
            [CompressionType.LZ4]: {
                name: 'LZ4',
                speed: 'fast',
                ratio: 'medium',
                cpuUsage: 'low',
            },
            [CompressionType.ZSTD]: {
                name: 'ZSTD',
                speed: 'medium',
                ratio: 'high',
                cpuUsage: 'high',
            },
            [CompressionType.SNAPPY]: {
                name: 'Snappy',
                speed: 'fast',
                ratio: 'medium',
                cpuUsage: 'medium',
            },
            [CompressionType.GZIP]: {
                name: 'GZIP',
                speed: 'slow',
                ratio: 'high',
                cpuUsage: 'high',
            },
            [CompressionType.NONE]: {
                name: 'None',
                speed: 'fast',
                ratio: 'low',
                cpuUsage: 'low',
            },
        };
        return info[type];
    }
}
exports.CompressionManager = CompressionManager;
