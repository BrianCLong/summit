"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataLoaderRegistry = void 0;
const pino_1 = __importDefault(require("pino"));
const logger = (0, pino_1.default)({ name: 'DataLoaderRegistry' });
/**
 * Registry for managing DataLoader instances per request
 */
class DataLoaderRegistry {
    loaders = new Map();
    /**
     * Register a loader
     */
    register(name, loader) {
        this.loaders.set(name, loader);
        logger.debug({ name }, 'Loader registered');
    }
    /**
     * Get a loader by name
     */
    get(name) {
        return this.loaders.get(name);
    }
    /**
     * Get or create a loader
     */
    getOrCreate(name, factory) {
        if (!this.loaders.has(name)) {
            const loader = factory();
            this.register(name, loader);
        }
        return this.loaders.get(name);
    }
    /**
     * Clear all loaders (call this after each request)
     */
    clear() {
        for (const loader of this.loaders.values()) {
            loader.clearAll();
        }
        this.loaders.clear();
        logger.debug('All loaders cleared');
    }
    /**
     * Get cache hit statistics
     */
    getStats() {
        const stats = {};
        for (const [name, loader] of this.loaders.entries()) {
            // DataLoader doesn't expose internal stats, but we can track custom metrics
            stats[name] = {
                cacheSize: loader._promiseCache?.size || 0,
            };
        }
        return stats;
    }
    /**
     * Prime a loader's cache
     */
    prime(name, key, value) {
        const loader = this.loaders.get(name);
        if (loader) {
            loader.prime(key, value);
            logger.debug({ name, key }, 'Loader cache primed');
        }
    }
    /**
     * Clear specific loader's cache
     */
    clearLoader(name) {
        const loader = this.loaders.get(name);
        if (loader) {
            loader.clearAll();
            logger.debug({ name }, 'Loader cache cleared');
        }
    }
}
exports.DataLoaderRegistry = DataLoaderRegistry;
