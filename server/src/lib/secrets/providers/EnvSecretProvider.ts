import { SecretProvider } from '../types.js';

export class EnvSecretProvider implements SecretProvider {
  async initialize(): Promise<void> {
    // No-op for env vars
  }

  async getSecret(key: string): Promise<string | null> {
    return process.env[key] || null;
  }

  async setSecret(key: string, value: string): Promise<void> {
    process.env[key] = value;
  }

  async rotateSecret(key: string): Promise<string> {
    throw new Error('Rotation not supported for EnvSecretProvider');
  }
}
