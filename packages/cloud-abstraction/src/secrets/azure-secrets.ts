/**
 * Azure Key Vault Secrets Provider
 */

import { SecretClient } from '@azure/keyvault-secrets';
import { DefaultAzureCredential } from '@azure/identity';
import { ISecretsProvider } from './index';
import {
  CloudProvider,
  Secret,
  SecretCreateOptions,
  SecretUpdateOptions,
  SecretsError
} from '../types';

export class AzureSecretsProvider implements ISecretsProvider {
  readonly provider = CloudProvider.AZURE;
  private client: SecretClient;

  constructor(vaultUrl?: string) {
    const url = vaultUrl || process.env.AZURE_KEY_VAULT_URL!;
    const credential = new DefaultAzureCredential();
    this.client = new SecretClient(url, credential);
  }

  async get(name: string, version?: string): Promise<Secret> {
    try {
      const secret = await this.client.getSecret(name, { version });

      return {
        name: secret.name,
        value: secret.value!,
        version: secret.properties.version,
        createdAt: secret.properties.createdOn!,
        updatedAt: secret.properties.updatedOn!,
        tags: secret.properties.tags
      };
    } catch (error) {
      throw new SecretsError(
        `Failed to get secret from Azure Key Vault: ${name}`,
        this.provider,
        error as Error
      );
    }
  }

  async create(
    name: string,
    value: string,
    options?: SecretCreateOptions
  ): Promise<void> {
    try {
      await this.client.setSecret(name, value, {
        tags: options?.tags,
        contentType: 'text/plain'
      });
    } catch (error) {
      throw new SecretsError(
        `Failed to create secret in Azure Key Vault: ${name}`,
        this.provider,
        error as Error
      );
    }
  }

  async update(
    name: string,
    value: string,
    options?: SecretUpdateOptions
  ): Promise<void> {
    try {
      await this.client.setSecret(name, value, {
        tags: options?.tags
      });
    } catch (error) {
      throw new SecretsError(
        `Failed to update secret in Azure Key Vault: ${name}`,
        this.provider,
        error as Error
      );
    }
  }

  async delete(name: string): Promise<void> {
    try {
      const poller = await this.client.beginDeleteSecret(name);
      await poller.pollUntilDone();
    } catch (error) {
      throw new SecretsError(
        `Failed to delete secret from Azure Key Vault: ${name}`,
        this.provider,
        error as Error
      );
    }
  }

  async list(): Promise<string[]> {
    try {
      const secrets: string[] = [];

      for await (const secret of this.client.listPropertiesOfSecrets()) {
        secrets.push(secret.name);
      }

      return secrets;
    } catch (error) {
      throw new SecretsError(
        'Failed to list secrets from Azure Key Vault',
        this.provider,
        error as Error
      );
    }
  }

  async listVersions(name: string): Promise<string[]> {
    try {
      const versions: string[] = [];

      for await (const version of this.client.listPropertiesOfSecretVersions(
        name
      )) {
        if (version.version) {
          versions.push(version.version);
        }
      }

      return versions;
    } catch (error) {
      throw new SecretsError(
        `Failed to list secret versions from Azure Key Vault: ${name}`,
        this.provider,
        error as Error
      );
    }
  }

  async rotate(name: string): Promise<void> {
    // Azure Key Vault doesn't have built-in rotation
    // This would typically be handled by Azure Automation or custom logic
    throw new SecretsError(
      'Secret rotation must be configured via Azure Automation',
      this.provider
    );
  }
}
