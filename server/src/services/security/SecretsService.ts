import { SecretManager } from '../../lib/secrets/SecretManager.js';

export class SecretsService {
  /**
   * Retrieves a secret by key.
   * @param key The logical name of the secret (e.g. "OPENAI_API_KEY")
   * @param purpose The purpose for accessing this secret (for audit logs)
   */
  static async getSecret(key: string, purpose: string = 'application_use'): Promise<string> {
    const manager = SecretManager.getInstance();
    return manager.getSecret(key, { requester: 'SecretsService', purpose });
  }

  /**
   * Rotates a secret if supported by the provider.
   */
  static async rotateSecret(key: string): Promise<void> {
    const manager = SecretManager.getInstance();
    return manager.rotateSecret(key);
  }
}
