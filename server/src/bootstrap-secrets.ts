import { SecretManager } from './lib/secrets/SecretManager.js';
import { logger } from './config/logger.js';

/**
 * Bootstraps the application secrets.
 * Must be called before any configuration is loaded.
 */
export async function bootstrapSecrets() {
  try {
    logger.info('Bootstrapping secrets...');

    await SecretManager.initialize({
      provider: process.env.VAULT_ADDR ? 'vault' : 'env',
      vaultUrl: process.env.VAULT_ADDR,
      vaultToken: process.env.VAULT_TOKEN,
    });

    const manager = SecretManager.getInstance();

    // List of secrets to load into env for compatibility
    const secretsToLoad = [
      'DATABASE_URL',
      'NEO4J_PASSWORD',
      'REDIS_PASSWORD',
      'JWT_SECRET',
      'JWT_REFRESH_SECRET',
      'OPENAI_API_KEY',
      'ANTHROPIC_API_KEY'
    ];

    await manager.loadSecretsToEnv(secretsToLoad);

    logger.info('Secrets bootstrapped successfully.');
  } catch (error) {
    logger.error(`Failed to bootstrap secrets: ${error}`);
    process.exit(1);
  }
}
