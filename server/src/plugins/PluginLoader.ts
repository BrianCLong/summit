/**
 * Plugin Loader
 *
 * Responsible for securely hydrating a Plugin instance from source code
 * using Node.js vm module for isolation.
 */

import vm from 'vm';
import { Plugin, PluginContext, PluginManifest } from './types/Plugin.js';
import logger from '../utils/logger.js';

export class PluginLoader {
  /**
   * Load a plugin from source code string.
   *
   * @param code The JavaScript source code of the plugin.
   * @param manifest The plugin manifest.
   * @returns A hydrated Plugin instance.
   */
  static load(code: string, manifest: PluginManifest): Plugin {
    try {
      // 1. Create a safe context
      const sandbox = {
        module: { exports: {} },
        exports: {},
        console: {
          log: (...args: any[]) => logger.info({ pluginId: manifest.id }, ...args),
          error: (...args: any[]) => logger.error({ pluginId: manifest.id }, ...args),
          warn: (...args: any[]) => logger.warn({ pluginId: manifest.id }, ...args),
        },
        // Safe globals
        setTimeout,
        clearTimeout,
        setInterval,
        clearInterval,
        Buffer,
        URL,
        JSON,
        Math,
        Date,
        Promise,
      };

      const context = vm.createContext(sandbox);

      // 2. Wrap code to ensure it executes and assigns to module.exports
      // We wrap in a function to isolate scope
      const wrappedCode = `(function(module, exports) {
        ${code}
      })(module, exports);`;

      // 3. Run code
      const script = new vm.Script(wrappedCode, {
        filename: `plugin-${manifest.id}.js`,
        timeout: 1000, // Compilation timeout
      });

      script.runInContext(context);

      // 4. Extract the exported object
      // @ts-ignore
      const exported = sandbox.module.exports;

      if (!exported || typeof exported !== 'object') {
        throw new Error('Plugin code must export an object');
      }

      // 5. Validate interface compliance
      if (typeof exported.execute !== 'function') {
        throw new Error('Plugin must implement execute() method');
      }

      // 6. Return the Plugin instance
      // We mix in the manifest
      return {
        manifest,
        initialize: exported.initialize || (async () => {}),
        execute: exported.execute,
        cleanup: exported.cleanup || (async () => {}),
        onEvent: exported.onEvent,
        validateConfig: exported.validateConfig,
        healthCheck: exported.healthCheck,
      };

    } catch (error) {
      logger.error({ error, pluginId: manifest.id }, 'Failed to load plugin code');
      throw new Error(`Failed to load plugin: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
