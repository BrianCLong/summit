/**
 * AWS Secrets Manager Provider
 */

import {
  SecretsManagerClient,
  GetSecretValueCommand,
  CreateSecretCommand,
  UpdateSecretCommand,
  DeleteSecretCommand,
  ListSecretsCommand,
  ListSecretVersionIdsCommand,
  RotateSecretCommand
} from '@aws-sdk/client-secrets-manager';
import { ISecretsProvider } from './index';
import {
  CloudProvider,
  Secret,
  SecretCreateOptions,
  SecretUpdateOptions,
  SecretsError
} from '../types';

export class AWSSecretsProvider implements ISecretsProvider {
  readonly provider = CloudProvider.AWS;
  private client: SecretsManagerClient;

  constructor(region?: string) {
    this.client = new SecretsManagerClient({
      region: region || process.env.AWS_REGION || 'us-east-1'
    });
  }

  async get(name: string, version?: string): Promise<Secret> {
    try {
      const response = await this.client.send(
        new GetSecretValueCommand({
          SecretId: name,
          VersionId: version,
          VersionStage: version ? undefined : 'AWSCURRENT'
        })
      );

      return {
        name: response.Name!,
        value: response.SecretString!,
        version: response.VersionId,
        createdAt: response.CreatedDate!,
        updatedAt: response.CreatedDate!,
        tags: undefined
      };
    } catch (error) {
      throw new SecretsError(
        `Failed to get secret from AWS Secrets Manager: ${name}`,
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
      await this.client.send(
        new CreateSecretCommand({
          Name: name,
          SecretString: value,
          Description: options?.description,
          KmsKeyId: options?.kmsKeyId,
          Tags: options?.tags
            ? Object.entries(options.tags).map(([Key, Value]) => ({
                Key,
                Value
              }))
            : undefined
        })
      );
    } catch (error) {
      throw new SecretsError(
        `Failed to create secret in AWS Secrets Manager: ${name}`,
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
      await this.client.send(
        new UpdateSecretCommand({
          SecretId: name,
          SecretString: value,
          Description: options?.description
        })
      );
    } catch (error) {
      throw new SecretsError(
        `Failed to update secret in AWS Secrets Manager: ${name}`,
        this.provider,
        error as Error
      );
    }
  }

  async delete(name: string): Promise<void> {
    try {
      await this.client.send(
        new DeleteSecretCommand({
          SecretId: name,
          ForceDeleteWithoutRecovery: false,
          RecoveryWindowInDays: 7
        })
      );
    } catch (error) {
      throw new SecretsError(
        `Failed to delete secret from AWS Secrets Manager: ${name}`,
        this.provider,
        error as Error
      );
    }
  }

  async list(): Promise<string[]> {
    try {
      const secrets: string[] = [];
      let nextToken: string | undefined;

      do {
        const response = await this.client.send(
          new ListSecretsCommand({
            NextToken: nextToken
          })
        );

        secrets.push(...(response.SecretList?.map((s) => s.Name!) || []));
        nextToken = response.NextToken;
      } while (nextToken);

      return secrets;
    } catch (error) {
      throw new SecretsError(
        'Failed to list secrets from AWS Secrets Manager',
        this.provider,
        error as Error
      );
    }
  }

  async listVersions(name: string): Promise<string[]> {
    try {
      const response = await this.client.send(
        new ListSecretVersionIdsCommand({
          SecretId: name
        })
      );

      return response.Versions?.map((v) => v.VersionId!) || [];
    } catch (error) {
      throw new SecretsError(
        `Failed to list secret versions from AWS Secrets Manager: ${name}`,
        this.provider,
        error as Error
      );
    }
  }

  async rotate(name: string): Promise<void> {
    try {
      await this.client.send(
        new RotateSecretCommand({
          SecretId: name
        })
      );
    } catch (error) {
      throw new SecretsError(
        `Failed to rotate secret in AWS Secrets Manager: ${name}`,
        this.provider,
        error as Error
      );
    }
  }
}
