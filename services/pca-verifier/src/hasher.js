"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProvenanceHasher = void 0;
const crypto_1 = __importDefault(require("crypto"));
/**
 * Cryptographic hash utilities for provenance tracking
 */
class ProvenanceHasher {
    algorithm;
    constructor(algorithm = 'sha256') {
        this.algorithm = algorithm;
    }
    /**
     * Hash arbitrary data deterministically
     */
    hash(data) {
        const normalized = this.normalize(data);
        const serialized = JSON.stringify(normalized);
        return crypto_1.default.createHash(this.algorithm).update(serialized).digest('hex');
    }
    /**
     * Build a Merkle tree hash from array of hashes
     */
    merkleRoot(hashes) {
        if (hashes.length === 0)
            return this.hash('');
        if (hashes.length === 1)
            return hashes[0];
        const tree = [...hashes];
        while (tree.length > 1) {
            const nextLevel = [];
            for (let i = 0; i < tree.length; i += 2) {
                const left = tree[i];
                const right = i + 1 < tree.length ? tree[i + 1] : left;
                const combined = this.hash({ left, right });
                nextLevel.push(combined);
            }
            tree.splice(0, tree.length, ...nextLevel);
        }
        return tree[0];
    }
    /**
     * Hash transform with inputs/outputs/params
     */
    hashTransform(transformId, transformType, version, params, inputHash) {
        return this.hash({
            transformId,
            transformType,
            version,
            params: this.normalize(params),
            inputHash,
        });
    }
    /**
     * Normalize data for deterministic hashing
     * Sorts object keys, handles special types
     */
    normalize(data) {
        if (data === null || data === undefined)
            return null;
        if (typeof data === 'number' || typeof data === 'boolean' || typeof data === 'string') {
            return data;
        }
        if (Array.isArray(data)) {
            return data.map((item) => this.normalize(item));
        }
        if (typeof data === 'object') {
            const sorted = {};
            Object.keys(data)
                .sort()
                .forEach((key) => {
                sorted[key] = this.normalize(data[key]);
            });
            return sorted;
        }
        return String(data);
    }
    /**
     * Verify hash equality with optional tolerance for floating point
     */
    verifyHash(expected, actual, data, tolerance) {
        if (expected === actual)
            return true;
        // If tolerance specified and data is numeric array, check approximate equality
        if (tolerance !== undefined && Array.isArray(data)) {
            const recomputed = this.hashWithTolerance(data, tolerance);
            return expected === recomputed;
        }
        return false;
    }
    /**
     * Hash numeric data with tolerance (rounds to significant figures)
     */
    hashWithTolerance(data, tolerance) {
        const rounded = data.map((item) => {
            if (typeof item === 'number') {
                return Number(item.toFixed(Math.abs(Math.log10(tolerance))));
            }
            return item;
        });
        return this.hash(rounded);
    }
}
exports.ProvenanceHasher = ProvenanceHasher;
