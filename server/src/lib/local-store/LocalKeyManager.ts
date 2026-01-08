import fs from 'fs/promises';
import path from 'path';
import { KeyProvider, Keyring, KeyringSchema } from './types.js';
import { CryptoUtils } from './CryptoUtils.js';

export class LocalKeyProvider implements KeyProvider {
  constructor(private storePath: string) {}

  private getTenantKeyDir(tenantId: string): string {
    return path.join(this.storePath, 'tenants', tenantId, 'keys');
  }

  private async loadKeyring(tenantId: string): Promise<Keyring> {
    const keyDir = this.getTenantKeyDir(tenantId);
    const keyringPath = path.join(keyDir, 'keyring.json');
    try {
      const content = await fs.readFile(keyringPath, 'utf-8');
      return KeyringSchema.parse(JSON.parse(content));
    } catch (err: any) {
      if (err.code === 'ENOENT') {
        throw new Error(`Keyring not found for tenant ${tenantId}`);
      }
      throw err;
    }
  }

  private async saveKeyring(tenantId: string, keyring: Keyring): Promise<void> {
    const keyDir = this.getTenantKeyDir(tenantId);
    await fs.mkdir(keyDir, { recursive: true });
    await fs.writeFile(
      path.join(keyDir, 'keyring.json'),
      JSON.stringify(keyring, null, 2),
      'utf-8'
    );
    // Also write active key ID for easy access/debugging
    await fs.writeFile(
      path.join(keyDir, 'active.key'),
      keyring.activeKeyId,
      'utf-8'
    );
  }

  async initTenant(tenantId: string): Promise<void> {
    const keyId = `k-${Date.now()}`;
    const key = CryptoUtils.generateKey();

    const keyring: Keyring = {
      activeKeyId: keyId,
      keys: {
        [keyId]: {
          created: new Date().toISOString(),
          material: key.toString('base64'),
          algorithm: 'aes-256-gcm',
        },
      },
    };

    await this.saveKeyring(tenantId, keyring);
  }

  async getActiveKey(tenantId: string): Promise<{ id: string; material: Buffer }> {
    const keyring = await this.loadKeyring(tenantId);
    const keyEntry = keyring.keys[keyring.activeKeyId];
    if (!keyEntry) {
      throw new Error(`Active key ${keyring.activeKeyId} not found in keyring`);
    }
    return {
      id: keyring.activeKeyId,
      material: Buffer.from(keyEntry.material, 'base64'),
    };
  }

  async getKey(tenantId: string, keyId: string): Promise<Buffer> {
    const keyring = await this.loadKeyring(tenantId);
    const keyEntry = keyring.keys[keyId];
    if (!keyEntry) {
      throw new Error(`Key ${keyId} not found in keyring`);
    }
    return Buffer.from(keyEntry.material, 'base64');
  }

  async rotateKey(tenantId: string): Promise<string> {
    const keyring = await this.loadKeyring(tenantId);
    const newKeyId = `k-${Date.now()}`;
    const newKey = CryptoUtils.generateKey();

    keyring.keys[newKeyId] = {
      created: new Date().toISOString(),
      material: newKey.toString('base64'),
      algorithm: 'aes-256-gcm',
    };
    keyring.activeKeyId = newKeyId;

    await this.saveKeyring(tenantId, keyring);
    return newKeyId;
  }
}
