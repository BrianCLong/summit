/**
 * Cloud-agnostic secrets management interface
 *
 * Placeholder for future implementation of Secrets Manager, Key Vault, Secret Manager abstractions
 */

import {
  CloudProvider,
  Secret,
  SecretCreateOptions,
  SecretUpdateOptions,
  SecretsError
} from './types.js';

export interface ISecretsProvider {
  readonly provider: CloudProvider;

  /**
   * Get secret value
   */
  getSecret(name: string, version?: string): Promise<Secret>;

  /**
   * Create secret
   */
  createSecret(
    name: string,
    value: string,
    options?: SecretCreateOptions
  ): Promise<string>;

  /**
   * Update secret value
   */
  updateSecret(
    name: string,
    value: string,
    options?: SecretUpdateOptions
  ): Promise<string>;

  /**
   * Delete secret
   */
  deleteSecret(name: string): Promise<void>;

  /**
   * List secrets
   */
  listSecrets(): Promise<Secret[]>;

  /**
   * Restore deleted secret
   */
  restoreSecret(name: string): Promise<void>;

  /**
   * Rotate secret
   */
  rotateSecret(name: string): Promise<string>;
}

// Re-export types for convenience
export type { Secret, SecretCreateOptions, SecretUpdateOptions, SecretsError };
