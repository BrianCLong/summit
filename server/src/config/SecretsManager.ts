export interface SecretsManager {
  getSecret(key: string): Promise<string | undefined>;
}

export class EnvSecretsManager implements SecretsManager {
  async getSecret(key: string): Promise<string | undefined> {
    return process.env[key];
  }
}

export class AWSSecretsManager implements SecretsManager {
  async getSecret(key: string): Promise<string | undefined> {
    // Stub for AWS Secrets Manager integration
    console.warn(`AWSSecretsManager not implemented. Returning env var for ${key}`);
    return process.env[key];
  }
}

export class VaultSecretsManager implements SecretsManager {
  async getSecret(key: string): Promise<string | undefined> {
    // Stub for Vault integration
    console.warn(`VaultSecretsManager not implemented. Returning env var for ${key}`);
    return process.env[key];
  }
}

// Factory to choose the secrets manager based on env
function createSecretsManager(): SecretsManager {
  const provider = process.env.SECRETS_PROVIDER || 'env';
  switch (provider) {
    case 'aws':
      return new AWSSecretsManager();
    case 'vault':
      return new VaultSecretsManager();
    default:
      return new EnvSecretsManager();
  }
}

export const secretsManager = createSecretsManager();
