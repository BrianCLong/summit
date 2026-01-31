import axios from 'axios';
import { KeyProvider } from './keyProvider';

export class VaultKmsProvider implements KeyProvider {
  constructor(
    private vaultUrl: string,
    private token: string,
  ) {}
  async encrypt(
    tenantId: string,
    plaintext: Buffer,
    aad: Record<string, string>,
  ) {
    const path = `${this.vaultUrl}/v1/transit/encrypt/tenant-${tenantId}`;
    const res = await axios.post(
      path,
      {
        plaintext: plaintext.toString('base64'),
        context: Buffer.from(JSON.stringify(aad)).toString('base64'),
      },
      { headers: { 'X-Vault-Token': this.token } },
    );
    return {
      cipher: Buffer.from(res.data.data.ciphertext),
      meta: { v: res.data.data.key_version, aad },
    };
  }
  async decrypt(
    tenantId: string,
    cipher: Buffer,
    meta: any,
    aad: Record<string, string>,
  ) {
    const path = `${this.vaultUrl}/v1/transit/decrypt/tenant-${tenantId}`;
    const res = await axios.post(
      path,
      {
        ciphertext: cipher.toString(),
        context: Buffer.from(JSON.stringify(aad)).toString('base64'),
      },
      { headers: { 'X-Vault-Token': this.token } },
    );
    return Buffer.from(res.data.data.plaintext, 'base64');
  }
}
