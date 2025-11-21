/**
 * GCP Secret Manager Provider
 */

import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
import { ISecretsProvider } from './index';
import {
  CloudProvider,
  Secret,
  SecretCreateOptions,
  SecretUpdateOptions,
  SecretsError
} from '../types';

export class GCPSecretsProvider implements ISecretsProvider {
  readonly provider = CloudProvider.GCP;
  private client: SecretManagerServiceClient;
  private projectId: string;

  constructor(projectId?: string, keyFilename?: string) {
    this.client = new SecretManagerServiceClient({
      keyFilename: keyFilename || process.env.GCP_KEY_FILENAME
    });
    this.projectId = projectId || process.env.GCP_PROJECT_ID!;
  }

  async get(name: string, version?: string): Promise<Secret> {
    try {
      const secretVersion = version || 'latest';
      const secretPath = `projects/${this.projectId}/secrets/${name}/versions/${secretVersion}`;

      const [response] = await this.client.accessSecretVersion({
        name: secretPath
      });

      const value = response.payload?.data?.toString() || '';

      // Get secret metadata
      const [secret] = await this.client.getSecret({
        name: `projects/${this.projectId}/secrets/${name}`
      });

      return {
        name,
        value,
        version: secretVersion,
        createdAt: new Date(secret.createTime?.seconds as number * 1000),
        updatedAt: new Date(),
        tags: secret.labels
      };
    } catch (error) {
      throw new SecretsError(
        `Failed to get secret from GCP Secret Manager: ${name}`,
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
      // Create the secret
      await this.client.createSecret({
        parent: `projects/${this.projectId}`,
        secretId: name,
        secret: {
          replication: {
            automatic: {}
          },
          labels: options?.tags
        }
      });

      // Add the first version
      await this.client.addSecretVersion({
        parent: `projects/${this.projectId}/secrets/${name}`,
        payload: {
          data: Buffer.from(value)
        }
      });
    } catch (error) {
      throw new SecretsError(
        `Failed to create secret in GCP Secret Manager: ${name}`,
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
      // Add a new version
      await this.client.addSecretVersion({
        parent: `projects/${this.projectId}/secrets/${name}`,
        payload: {
          data: Buffer.from(value)
        }
      });

      // Update labels if provided
      if (options?.tags) {
        await this.client.updateSecret({
          secret: {
            name: `projects/${this.projectId}/secrets/${name}`,
            labels: options.tags
          },
          updateMask: {
            paths: ['labels']
          }
        });
      }
    } catch (error) {
      throw new SecretsError(
        `Failed to update secret in GCP Secret Manager: ${name}`,
        this.provider,
        error as Error
      );
    }
  }

  async delete(name: string): Promise<void> {
    try {
      await this.client.deleteSecret({
        name: `projects/${this.projectId}/secrets/${name}`
      });
    } catch (error) {
      throw new SecretsError(
        `Failed to delete secret from GCP Secret Manager: ${name}`,
        this.provider,
        error as Error
      );
    }
  }

  async list(): Promise<string[]> {
    try {
      const secrets: string[] = [];

      const [response] = await this.client.listSecrets({
        parent: `projects/${this.projectId}`
      });

      for (const secret of response) {
        const name = secret.name?.split('/').pop();
        if (name) {
          secrets.push(name);
        }
      }

      return secrets;
    } catch (error) {
      throw new SecretsError(
        'Failed to list secrets from GCP Secret Manager',
        this.provider,
        error as Error
      );
    }
  }

  async listVersions(name: string): Promise<string[]> {
    try {
      const versions: string[] = [];

      const [response] = await this.client.listSecretVersions({
        parent: `projects/${this.projectId}/secrets/${name}`
      });

      for (const version of response) {
        const versionNumber = version.name?.split('/').pop();
        if (versionNumber) {
          versions.push(versionNumber);
        }
      }

      return versions;
    } catch (error) {
      throw new SecretsError(
        `Failed to list secret versions from GCP Secret Manager: ${name}`,
        this.provider,
        error as Error
      );
    }
  }

  async rotate(name: string): Promise<void> {
    // GCP Secret Manager supports rotation via Cloud Functions
    // This would trigger the rotation function
    throw new SecretsError(
      'Secret rotation should be configured via Cloud Functions',
      this.provider
    );
  }
}
