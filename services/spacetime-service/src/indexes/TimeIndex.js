"use strict";
/**
 * Time Index - Interval Tree Implementation
 *
 * Provides efficient temporal range queries using an augmented BST (interval tree).
 * Supports:
 * - Range scans: Find all intervals overlapping a time window
 * - Point queries: Find all intervals containing a timestamp
 * - Interval insertion/deletion
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TimeIndex = void 0;
exports.createTimeIndex = createTimeIndex;
const time_js_1 = require("../utils/time.js");
/**
 * Time Index using AVL Interval Tree
 */
class TimeIndex {
    root = null;
    size = 0;
    entriesById = new Map();
    entriesByEntity = new Map();
    /**
     * Get the number of entries in the index
     */
    get count() {
        return this.size;
    }
    /**
     * Insert an entry into the index
     */
    insert(entry) {
        if (this.entriesById.has(entry.id)) {
            // Update existing entry
            this.delete(entry.id);
        }
        this.root = this.insertNode(this.root, entry);
        this.size++;
        this.entriesById.set(entry.id, entry);
        if (!this.entriesByEntity.has(entry.entityId)) {
            this.entriesByEntity.set(entry.entityId, new Set());
        }
        this.entriesByEntity.get(entry.entityId).add(entry.id);
    }
    /**
     * Delete an entry by ID
     */
    delete(id) {
        const entry = this.entriesById.get(id);
        if (!entry) {
            return false;
        }
        this.root = this.deleteNode(this.root, entry);
        this.size--;
        this.entriesById.delete(id);
        this.entriesByEntity.get(entry.entityId)?.delete(id);
        return true;
    }
    /**
     * Find all entries overlapping a time window
     */
    findOverlapping(window) {
        const results = [];
        this.searchOverlapping(this.root, window, results);
        return results;
    }
    /**
     * Find all entries containing a specific timestamp
     */
    findAtTime(timestamp) {
        return this.findOverlapping({ start: timestamp, end: timestamp });
    }
    /**
     * Find all entries for a specific entity
     */
    findByEntity(entityId) {
        const entryIds = this.entriesByEntity.get(entityId);
        if (!entryIds) {
            return [];
        }
        return Array.from(entryIds)
            .map((id) => this.entriesById.get(id))
            .filter((entry) => entry !== undefined);
    }
    /**
     * Find all entries for a specific entity within a time window
     */
    findByEntityInWindow(entityId, window) {
        const entityEntries = this.findByEntity(entityId);
        return entityEntries.filter((entry) => (0, time_js_1.intervalsOverlap)({ start: entry.start, end: entry.end }, window));
    }
    /**
     * Find entries for multiple entities that overlap in time
     */
    findCoTemporalEntries(entityIds, window) {
        const result = new Map();
        for (const entityId of entityIds) {
            result.set(entityId, this.findByEntityInWindow(entityId, window));
        }
        return result;
    }
    /**
     * Get entry by ID
     */
    get(id) {
        return this.entriesById.get(id);
    }
    /**
     * Check if entry exists
     */
    has(id) {
        return this.entriesById.has(id);
    }
    /**
     * Get all entity IDs in the index
     */
    getEntityIds() {
        return Array.from(this.entriesByEntity.keys());
    }
    /**
     * Get time bounds of all entries
     */
    getTimeBounds() {
        if (this.size === 0) {
            return null;
        }
        let minStart = Infinity;
        let maxEnd = -Infinity;
        for (const entry of this.entriesById.values()) {
            minStart = Math.min(minStart, entry.start);
            maxEnd = Math.max(maxEnd, entry.end);
        }
        return { start: minStart, end: maxEnd };
    }
    /**
     * Clear all entries
     */
    clear() {
        this.root = null;
        this.size = 0;
        this.entriesById.clear();
        this.entriesByEntity.clear();
    }
    /**
     * Iterate over all entries
     */
    *entries() {
        yield* this.entriesById.values();
    }
    // =========================================================================
    // Private AVL Tree Operations
    // =========================================================================
    insertNode(node, entry) {
        if (!node) {
            return {
                entry,
                maxEnd: entry.end,
                left: null,
                right: null,
                height: 1,
            };
        }
        // Insert based on start time (use id as tiebreaker for stability)
        if (entry.start < node.entry.start ||
            (entry.start === node.entry.start && entry.id < node.entry.id)) {
            node.left = this.insertNode(node.left, entry);
        }
        else {
            node.right = this.insertNode(node.right, entry);
        }
        // Update maxEnd
        node.maxEnd = Math.max(node.entry.end, this.getMaxEnd(node.left), this.getMaxEnd(node.right));
        // Update height and balance
        return this.balance(node);
    }
    deleteNode(node, entry) {
        if (!node) {
            return null;
        }
        if (entry.id === node.entry.id) {
            // Found the node to delete
            if (!node.left && !node.right) {
                return null;
            }
            if (!node.left) {
                return node.right;
            }
            if (!node.right) {
                return node.left;
            }
            // Node has two children - find successor
            const successor = this.findMin(node.right);
            node.entry = successor.entry;
            node.right = this.deleteNode(node.right, successor.entry);
        }
        else if (entry.start < node.entry.start ||
            (entry.start === node.entry.start && entry.id < node.entry.id)) {
            node.left = this.deleteNode(node.left, entry);
        }
        else {
            node.right = this.deleteNode(node.right, entry);
        }
        // Update maxEnd
        node.maxEnd = Math.max(node.entry.end, this.getMaxEnd(node.left), this.getMaxEnd(node.right));
        return this.balance(node);
    }
    searchOverlapping(node, window, results) {
        if (!node) {
            return;
        }
        // Prune: if maxEnd in this subtree is before window start, skip
        if (node.maxEnd < window.start) {
            return;
        }
        // Search left subtree
        this.searchOverlapping(node.left, window, results);
        // Check current node
        if ((0, time_js_1.intervalsOverlap)({ start: node.entry.start, end: node.entry.end }, window)) {
            results.push(node.entry);
        }
        // Prune right: if node's start is after window end, skip right
        if (node.entry.start > window.end) {
            return;
        }
        // Search right subtree
        this.searchOverlapping(node.right, window, results);
    }
    findMin(node) {
        while (node.left) {
            node = node.left;
        }
        return node;
    }
    getMaxEnd(node) {
        return node ? node.maxEnd : -Infinity;
    }
    getHeight(node) {
        return node ? node.height : 0;
    }
    getBalance(node) {
        return node ? this.getHeight(node.left) - this.getHeight(node.right) : 0;
    }
    updateHeight(node) {
        node.height =
            1 + Math.max(this.getHeight(node.left), this.getHeight(node.right));
    }
    rotateRight(y) {
        const x = y.left;
        const T2 = x.right;
        x.right = y;
        y.left = T2;
        this.updateHeight(y);
        this.updateHeight(x);
        // Update maxEnd
        y.maxEnd = Math.max(y.entry.end, this.getMaxEnd(y.left), this.getMaxEnd(y.right));
        x.maxEnd = Math.max(x.entry.end, this.getMaxEnd(x.left), this.getMaxEnd(x.right));
        return x;
    }
    rotateLeft(x) {
        const y = x.right;
        const T2 = y.left;
        y.left = x;
        x.right = T2;
        this.updateHeight(x);
        this.updateHeight(y);
        // Update maxEnd
        x.maxEnd = Math.max(x.entry.end, this.getMaxEnd(x.left), this.getMaxEnd(x.right));
        y.maxEnd = Math.max(y.entry.end, this.getMaxEnd(y.left), this.getMaxEnd(y.right));
        return y;
    }
    balance(node) {
        this.updateHeight(node);
        const balance = this.getBalance(node);
        // Left heavy
        if (balance > 1) {
            if (this.getBalance(node.left) < 0) {
                node.left = this.rotateLeft(node.left);
            }
            return this.rotateRight(node);
        }
        // Right heavy
        if (balance < -1) {
            if (this.getBalance(node.right) > 0) {
                node.right = this.rotateRight(node.right);
            }
            return this.rotateLeft(node);
        }
        return node;
    }
}
exports.TimeIndex = TimeIndex;
/**
 * Factory function to create a time index
 */
function createTimeIndex() {
    return new TimeIndex();
}
