import { Router } from 'express';
import { PluginRegistryService } from '../PluginRegistryService.js';
import { PluginManifestSchema } from '@summit/plugin-system';

export function createPluginRoutes(registryService: PluginRegistryService): Router {
  const router = Router();

  /**
   * Register a plugin
   */
  router.post('/', async (req, res, next) => {
    try {
      const { manifest, packageUrl } = req.body;

      // Validate manifest
      const validatedManifest = PluginManifestSchema.parse(manifest);

      await registryService.register(validatedManifest, packageUrl);

      res.status(201).json({
        success: true,
        message: 'Plugin registered successfully',
      });
    } catch (error) {
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

      const plugin = await registryService.getPlugin(
        pluginId,
        version as string | undefined
      );

      if (!plugin) {
        return res.status(404).json({ error: 'Plugin not found' });
      }

      res.json(plugin);
    } catch (error) {
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
        category: category as string | undefined,
        author: author as string | undefined,
        search: search as string | undefined,
        limit: limit ? parseInt(limit as string) : 50,
        offset: offset ? parseInt(offset as string) : 0,
      });

      res.json(result);
    } catch (error) {
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
    } catch (error) {
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
    } catch (error) {
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

      await registryService.deletePlugin(pluginId, version as string | undefined);

      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
