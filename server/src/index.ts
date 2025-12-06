import { bootstrapSecrets } from './bootstrap-secrets.js';
import { logger } from './config/logger.js';

(async () => {
  try {
    // 1. Load Secrets (Environment or Vault)
    await bootstrapSecrets();

    // 2. Start Server
    logger.info('Secrets loaded. Starting server...');
    await import('./server_entry.js');
  } catch (err) {
    logger.error(`Fatal error during startup: ${err}`);
    process.exit(1);
  }
})();
