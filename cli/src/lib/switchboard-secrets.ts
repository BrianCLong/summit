/**
 * Switchboard Local Secrets Vault
 */

import Conf from 'conf';
import os from 'os';
import crypto from 'crypto';

export interface SecretScope {
  tenantId?: string;
  serverId?: string;
  toolId?: string;
  purpose?: string;
}

export class SwitchboardSecrets {
  private store: Conf<Record<string, string>>;

  constructor() {
    // Derive a semi-stable per-user encryption key
    const userSeed = os.userInfo().username || os.hostname() || 'switchboard-default';
    const encryptionKey = crypto
      .createHash('sha256')
      .update(`switchboard-v1-${userSeed}`)
      .digest('hex');

    this.store = new Conf({
      projectName: 'switchboard-secrets-v1',
      encryptionKey,
    });
  }

  /**
   * Set a secret value.
   */
  setSecret(key: string, value: string): void {
    this.store.set(key, value);
  }

  /**
   * Get a secret value by its exact key.
   */
  getSecret(key: string): string | undefined {
    return this.store.get(key);
  }

  /**
   * Retrieve a secret with hierarchical scope matching.
   * Priority: most specific to least specific.
   */
  getScopedSecret(scope: SecretScope, key: string): string | undefined {
    const { tenantId, serverId, toolId, purpose } = scope;

    // Candidates from most specific to least specific
    const candidates = [
      [tenantId, serverId, toolId, purpose, key],
      [tenantId, serverId, toolId, key],
      [tenantId, serverId, key],
      [tenantId, key],
      [key],
    ].map(parts => parts.filter(Boolean).join(':'));

    for (const candidate of candidates) {
      const val = this.getSecret(candidate);
      if (val) return val;
    }

    return undefined;
  }

  /**
   * List all secret keys (masked).
   */
  listSecrets(): string[] {
    return Object.keys(this.store.store);
  }

  /**
   * Delete a secret.
   */
  deleteSecret(key: string): void {
    this.store.delete(key);
  }
}

export const secretsVault = new SwitchboardSecrets();
