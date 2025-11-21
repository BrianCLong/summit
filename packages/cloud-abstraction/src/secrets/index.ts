/**
 * Cloud-agnostic secrets management interface
 */

import {
  CloudProvider,
  Secret,
  SecretCreateOptions,
  SecretUpdateOptions,
  SecretsError
} from '../types';

export interface ISecretsProvider {
  readonly provider: CloudProvider;

  /**
   * Get a secret value
   */
  get(name: string, version?: string): Promise<Secret>;

  /**
   * Create a new secret
   */
  create(
    name: string,
    value: string,
    options?: SecretCreateOptions
  ): Promise<void>;

  /**
   * Update a secret value (creates new version)
   */
  update(
    name: string,
    value: string,
    options?: SecretUpdateOptions
  ): Promise<void>;

  /**
   * Delete a secret
   */
  delete(name: string): Promise<void>;

  /**
   * List all secrets
   */
  list(): Promise<string[]>;

  /**
   * Get secret versions
   */
  listVersions(name: string): Promise<string[]>;

  /**
   * Rotate a secret
   */
  rotate(name: string): Promise<void>;
}

export { AWSSecretsProvider } from './aws-secrets';
export { AzureSecretsProvider } from './azure-secrets';
export { GCPSecretsProvider } from './gcp-secrets';
