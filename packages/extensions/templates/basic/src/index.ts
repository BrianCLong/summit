/**
 * My Extension
 *
 * TODO: Add extension description
 */

import type { ExtensionContext, ExtensionActivation } from '@summit/extensions';

/**
 * Extension activation function
 *
 * This function is called when the extension is loaded.
 * Use the context to access the Summit API, storage, and logging.
 */
export async function activate(context: ExtensionContext): Promise<ExtensionActivation> {
  const { logger, config, api, extensionPath, storagePath } = context;

  // Log activation
  logger.info('Extension activating...');
  logger.debug('Extension path:', extensionPath);
  logger.debug('Storage path:', storagePath);
  logger.debug('Config:', config);

  // TODO: Initialize your extension here
  // Example: Set up event listeners, load data, register handlers, etc.

  // Return activation result
  return {
    // Cleanup function (optional)
    dispose: async () => {
      logger.info('Extension deactivating...');
      // TODO: Clean up resources (close connections, stop timers, etc.)
    },

    // Public API (optional)
    exports: {
      // TODO: Export functions/objects that other extensions can use
      hello: () => 'Hello from my extension!',
    },
  };
}
