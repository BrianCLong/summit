import { SecretConfig, SecretProvider } from './types.js';
import { EnvSecretProvider } from './providers/EnvSecretProvider.js';
import { VaultSecretProvider } from './providers/VaultSecretProvider.js';
import { logger } from '../../config/logger.js';
import { writeAudit } from '../../utils/audit.js';

export class SecretManager {
  private static instance: SecretManager;
  private provider: SecretProvider;

  private constructor(config: SecretConfig) {
    if (config.provider === 'vault' && config.vaultUrl && config.vaultToken) {
      this.provider = new VaultSecretProvider(config.vaultUrl, config.vaultToken);
    } else {
      if (config.provider === 'vault') {
        logger.warn('Vault configured but missing URL/Token, falling back to Env');
      }
      this.provider = new EnvSecretProvider();
    }
  }

  public static async initialize(config?: SecretConfig): Promise<void> {
    if (!SecretManager.instance) {
      // Default to env if not configured
      const finalConfig: SecretConfig = config || {
        provider: (process.env.SECRET_PROVIDER as 'vault' | 'env') || 'env',
        vaultUrl: process.env.VAULT_ADDR,
        vaultToken: process.env.VAULT_TOKEN,
      };

      SecretManager.instance = new SecretManager(finalConfig);
      await SecretManager.instance.provider.initialize();
      logger.info(`SecretManager initialized with provider: ${finalConfig.provider}`);
    }
  }

  public static getInstance(): SecretManager {
    if (!SecretManager.instance) {
      throw new Error('SecretManager not initialized. Call initialize() first.');
    }
    return SecretManager.instance;
  }

  async getSecret(key: string, context: { requester: string; purpose?: string }): Promise<string> {
    const start = Date.now();
    const value = await this.provider.getSecret(key);

    // Audit Log
    try {
        await writeAudit({
            action: 'ACCESS_SECRET',
            resourceType: 'secret',
            resourceId: key,
            details: {
                requester: context.requester,
                purpose: context.purpose,
                success: !!value,
                durationMs: Date.now() - start
            },
            actorRole: 'system' // or passed in context
        });
    } catch (err) {
        // Don't fail secret retrieval if audit fails, but log error
        logger.error(`Failed to audit secret access for ${key}: ${err}`);
    }

    if (!value) {
      throw new Error(`Secret ${key} not found`);
    }

    return value;
  }

  /**
   * Loads critical secrets into process.env to support legacy code.
   * This is a bridge method.
   */
  async loadSecretsToEnv(keys: string[]): Promise<void> {
    for (const key of keys) {
      const value = await this.provider.getSecret(key);
      if (value) {
        process.env[key] = value;
      }
    }
  }

  async rotateSecret(key: string): Promise<void> {
    const newValue = await this.provider.rotateSecret(key);
    // If we are syncing to env
    process.env[key] = newValue;

    await writeAudit({
        action: 'ROTATE_SECRET',
        resourceType: 'secret',
        resourceId: key,
        details: {
            timestamp: new Date().toISOString()
        }
    });
  }
}
