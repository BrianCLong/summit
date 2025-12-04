export interface SecretProvider {
  /**
   * Initialize the provider (e.g., connect to Vault)
   */
  initialize(): Promise<void>;

  /**
   * Get a secret by key
   */
  getSecret(key: string): Promise<string | null>;

  /**
   * Set a secret (for rotation or setup)
   */
  setSecret(key: string, value: string): Promise<void>;

  /**
   * Rotate a secret
   */
  rotateSecret(key: string): Promise<string>;
}

export interface SecretConfig {
  provider: 'env' | 'vault' | 'aws';
  vaultUrl?: string;
  vaultToken?: string;
  awsRegion?: string;
}
