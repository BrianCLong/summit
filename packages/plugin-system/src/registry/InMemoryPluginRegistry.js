"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InMemoryPluginRegistry = void 0;
/**
 * In-memory plugin registry (for development/testing)
 * Production would use persistent storage
 */
class InMemoryPluginRegistry {
    plugins = new Map();
    /**
     * Register a plugin
     */
    async register(plugin) {
        const { id } = plugin.manifest;
        if (this.plugins.has(id)) {
            throw new Error(`Plugin ${id} is already registered`);
        }
        this.plugins.set(id, plugin);
    }
    /**
     * Unregister a plugin
     */
    async unregister(pluginId) {
        if (!this.plugins.has(pluginId)) {
            throw new Error(`Plugin ${pluginId} is not registered`);
        }
        this.plugins.delete(pluginId);
    }
    /**
     * Get plugin metadata
     */
    async get(pluginId) {
        return this.plugins.get(pluginId) || null;
    }
    /**
     * List plugins with optional filtering
     */
    async list(filter) {
        let plugins = Array.from(this.plugins.values());
        if (filter?.category) {
            plugins = plugins.filter(p => p.manifest.category === filter.category);
        }
        if (filter?.state) {
            plugins = plugins.filter(p => p.state === filter.state);
        }
        if (filter?.author) {
            plugins = plugins.filter(p => p.manifest.author.name === filter.author);
        }
        if (filter?.minRating !== undefined) {
            plugins = plugins.filter(p => p.stats.rating >= filter.minRating);
        }
        return plugins;
    }
    /**
     * Update plugin metadata
     */
    async update(pluginId, updates) {
        const plugin = this.plugins.get(pluginId);
        if (!plugin) {
            throw new Error(`Plugin ${pluginId} not found`);
        }
        const updated = {
            ...plugin,
            ...updates,
            updatedAt: new Date(),
        };
        this.plugins.set(pluginId, updated);
    }
    /**
     * Search plugins
     */
    async search(query) {
        const lowerQuery = query.toLowerCase();
        return Array.from(this.plugins.values()).filter(plugin => {
            const { manifest } = plugin;
            return (manifest.name.toLowerCase().includes(lowerQuery) ||
                manifest.description.toLowerCase().includes(lowerQuery) ||
                manifest.id.toLowerCase().includes(lowerQuery) ||
                manifest.author.name.toLowerCase().includes(lowerQuery));
        });
    }
}
exports.InMemoryPluginRegistry = InMemoryPluginRegistry;
