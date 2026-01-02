// NOTE: This is a mock implementation for development purposes.
import fs from 'fs/promises';
import path from 'path';

const secretsFilePath = path.join('/tmp', 'secrets.json');

async function readSecrets(): Promise<Record<string, Record<string, string>>> {
  try {
    const data = await fs.readFile(secretsFilePath, 'utf-8');
    return JSON.parse(data);
  } catch (error: any) {
    // If the file doesn't exist, return a default structure
    if (error.code === 'ENOENT') {
      return {
        TEST_SECRET: {
          v1: 'secret-value-1',
          v2: 'secret-value-2',
        },
      };
    }
    throw error;
  }
}

async function writeSecrets(secrets: Record<string, Record<string, string>>): Promise<void> {
  await fs.writeFile(secretsFilePath, JSON.stringify(secrets, null, 2));
}

export class SecretManager {
  async getSecret(secretName: string, version: string): Promise<string | undefined> {
    const secrets = await readSecrets();
    return secrets[secretName]?.[version];
  }

  async setSecret(secretName: string, version: string, value: string): Promise<void> {
    const secrets = await readSecrets();
    if (!secrets[secretName]) {
      secrets[secretName] = {};
    }
    secrets[secretName][version] = value;
    await writeSecrets(secrets);
  }
}
