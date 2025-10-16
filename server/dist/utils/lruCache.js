class LRUCache {
    cache;
    capacity;
    constructor(capacity) {
        this.cache = new Map();
        this.capacity = capacity;
    }
    get(key) {
        if (!this.cache.has(key)) {
            return undefined;
        }
        const value = this.cache.get(key);
        // Move the accessed item to the end to mark it as most recently used
        this.cache.delete(key);
        this.cache.set(key, value);
        return value;
    }
    put(key, value) {
        if (this.cache.has(key)) {
            this.cache.delete(key);
        }
        else if (this.cache.size >= this.capacity) {
            // Remove the least recently used item (first item in Map)
            this.cache.delete(this.cache.keys().next().value);
        }
        this.cache.set(key, value);
    }
    size() {
        return this.cache.size;
    }
    clear() {
        this.cache.clear();
    }
}
export default LRUCache;
//# sourceMappingURL=lruCache.js.map