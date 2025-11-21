/**
 * Server Integration
 *
 * Example of how to integrate the extension system into a server application.
 */

import * as path from 'path';
import { ExtensionManager } from './manager.js';
import type { ExtensionAPI } from './types.js';

/**
 * Initialize the extension system for a server application
 */
export async function initializeExtensions(options: {
  extensionDirs?: string[];
  api?: Partial<ExtensionAPI>;
}): Promise<ExtensionManager> {
  const manager = new ExtensionManager({
    extensionDirs: options.extensionDirs || [
      path.join(process.cwd(), 'extensions'),
      path.join(process.cwd(), 'extensions/examples'),
    ],
    api: options.api,
    enablePolicy: process.env.OPA_URL !== undefined,
    opaUrl: process.env.OPA_URL,
  });

  await manager.initialize();

  return manager;
}

/**
 * Example: Integrate with Express server
 */
export function setupExtensionRoutes(app: any, manager: ExtensionManager) {
  // List extensions
  app.get('/api/extensions', (req: any, res: any) => {
    const registry = manager.getRegistry();
    const extensions = registry.getAll().map((ext) => ({
      name: ext.manifest.name,
      displayName: ext.manifest.displayName,
      version: ext.manifest.version,
      description: ext.manifest.description,
      type: ext.manifest.type,
      capabilities: ext.manifest.capabilities,
      loaded: ext.loaded,
      enabled: ext.enabled,
    }));
    res.json(extensions);
  });

  // Get extension details
  app.get('/api/extensions/:name', (req: any, res: any) => {
    const registry = manager.getRegistry();
    const ext = registry.get(req.params.name);
    if (!ext) {
      return res.status(404).json({ error: 'Extension not found' });
    }
    res.json({
      manifest: ext.manifest,
      loaded: ext.loaded,
      enabled: ext.enabled,
      error: ext.error,
    });
  });

  // Execute copilot tool
  app.post('/api/extensions/copilot/tools/:name', async (req: any, res: any) => {
    try {
      const result = await manager.copilot.executeTool(req.params.name, req.body);
      res.json({ result });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
    }
  });

  // Execute UI command
  app.post('/api/extensions/ui/commands/:id', async (req: any, res: any) => {
    try {
      const result = await manager.commandPalette.executeCommand(req.params.id);
      res.json({ result });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
    }
  });

  // Get UI widgets
  app.get('/api/extensions/ui/widgets', (req: any, res: any) => {
    const widgets = manager.commandPalette.getWidgets();
    res.json(widgets);
  });

  // Reload extensions
  app.post('/api/extensions/reload', async (req: any, res: any) => {
    try {
      await manager.reload();
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
    }
  });

  // Extension statistics
  app.get('/api/extensions/stats', (req: any, res: any) => {
    const stats = manager.getStats();
    res.json(stats);
  });
}
