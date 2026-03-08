"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPluginRoutes = createPluginRoutes;
const express_1 = require("express");
const plugin_system_1 = require("@intelgraph/plugin-system");
function createPluginRoutes(registryService) {
    const router = (0, express_1.Router)();
    /**
     * Register a plugin
     */
    router.post('/', async (req, res, next) => {
        try {
            const { manifest, packageUrl } = req.body;
            // Validate manifest
            const validatedManifest = plugin_system_1.PluginManifestSchema.parse(manifest);
            await registryService.register(validatedManifest, packageUrl);
            res.status(201).json({
                success: true,
                message: 'Plugin registered successfully',
            });
        }
        catch (error) {
            next(error);
        }
    });
    /**
     * Get plugin by ID
     */
    router.get('/:pluginId', async (req, res, next) => {
        try {
            const { pluginId } = req.params;
            const { version } = req.query;
            const plugin = await registryService.getPlugin(pluginId, version);
            if (!plugin) {
                return res.status(404).json({ error: 'Plugin not found' });
            }
            res.json(plugin);
        }
        catch (error) {
            next(error);
        }
    });
    /**
     * List plugins
     */
    router.get('/', async (req, res, next) => {
        try {
            const { category, author, search, limit, offset } = req.query;
            const result = await registryService.listPlugins({
                category: category,
                author: author,
                search: search,
                limit: limit ? parseInt(limit) : 50,
                offset: offset ? parseInt(offset) : 0,
            });
            res.json(result);
        }
        catch (error) {
            next(error);
        }
    });
    /**
     * Get plugin versions
     */
    router.get('/:pluginId/versions', async (req, res, next) => {
        try {
            const { pluginId } = req.params;
            const versions = await registryService.getVersions(pluginId);
            res.json({ versions });
        }
        catch (error) {
            next(error);
        }
    });
    /**
     * Update plugin stats
     */
    router.patch('/:pluginId/stats', async (req, res, next) => {
        try {
            const { pluginId } = req.params;
            const stats = req.body;
            await registryService.updateStats(pluginId, stats);
            res.json({ success: true });
        }
        catch (error) {
            next(error);
        }
    });
    /**
     * Delete plugin
     */
    router.delete('/:pluginId', async (req, res, next) => {
        try {
            const { pluginId } = req.params;
            const { version } = req.query;
            await registryService.deletePlugin(pluginId, version);
            res.json({ success: true });
        }
        catch (error) {
            next(error);
        }
    });
    return router;
}
