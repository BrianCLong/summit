"use strict";
/**
 * Core Graph Database Types
 * Native property graph data model with temporal and hypergraph support
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SimpleLRUCache = exports.ConstraintViolationError = exports.TransactionError = exports.GraphDatabaseError = void 0;
exports.generateId = generateId;
// Simple ID generator (no external dependency)
function generateId() {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 11)}`;
}
// Error Types
class GraphDatabaseError extends Error {
    code;
    details;
    constructor(message, code, details) {
        super(message);
        this.name = 'GraphDatabaseError';
        this.code = code;
        this.details = details;
    }
}
exports.GraphDatabaseError = GraphDatabaseError;
class TransactionError extends GraphDatabaseError {
    constructor(message, details) {
        super(message, 'TRANSACTION_ERROR', details);
        this.name = 'TransactionError';
    }
}
exports.TransactionError = TransactionError;
class ConstraintViolationError extends GraphDatabaseError {
    constructor(message, details) {
        super(message, 'CONSTRAINT_VIOLATION', details);
        this.name = 'ConstraintViolationError';
    }
}
exports.ConstraintViolationError = ConstraintViolationError;
// Simple LRU Cache implementation (no external dependency)
class SimpleLRUCache {
    cache;
    maxSize;
    constructor(options) {
        this.cache = new Map();
        this.maxSize = options.max;
    }
    get(key) {
        const value = this.cache.get(key);
        if (value !== undefined) {
            // Move to end (most recently used)
            this.cache.delete(key);
            this.cache.set(key, value);
        }
        return value;
    }
    set(key, value) {
        if (this.cache.has(key)) {
            this.cache.delete(key);
        }
        else if (this.cache.size >= this.maxSize) {
            // Delete oldest (first) entry
            const firstKey = this.cache.keys().next().value;
            if (firstKey !== undefined) {
                this.cache.delete(firstKey);
            }
        }
        this.cache.set(key, value);
    }
    delete(key) {
        return this.cache.delete(key);
    }
    clear() {
        this.cache.clear();
    }
    get size() {
        return this.cache.size;
    }
}
exports.SimpleLRUCache = SimpleLRUCache;
