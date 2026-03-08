"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmbeddingCache = void 0;
class EmbeddingCache {
    mem = new Map();
    get(key) { return this.mem.get(key); }
    put(key, vec) { this.mem.set(key, vec); }
}
exports.EmbeddingCache = EmbeddingCache;
