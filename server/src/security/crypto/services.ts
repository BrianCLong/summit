import crypto from 'node:crypto';
import fetch from 'node-fetch';
import { writeAudit } from '../../utils/audit.js';
import type { CryptoAuditEvent, JsonObject, KeyVersion } from './types.js';

export interface HardwareSecurityModule {
  sign(data: Buffer, key: KeyVersion): Promise<Buffer>;
  exportPublicKey(key: KeyVersion): Promise<string>;
}

export class SoftwareHSM implements HardwareSecurityModule {
  async sign(data: Buffer, key: KeyVersion): Promise<Buffer> {
    if (!key.privateKeyPem) {
      throw new Error(`Key ${key.id} version ${key.version} missing private key material`);
    }

    switch (key.algorithm) {
      case 'RSA_SHA256': {
        const signer = crypto.createSign('RSA-SHA256');
        signer.update(data);
        signer.end();
        return signer.sign(key.privateKeyPem);
      }
      case 'ECDSA_P256_SHA256': {
        const signer = crypto.createSign('SHA256');
        signer.update(data);
        signer.end();
        return signer.sign({
          key: key.privateKeyPem,
          dsaEncoding: 'ieee-p1363',
        });
      }
      case 'ECDSA_P384_SHA384': {
        const signer = crypto.createSign('SHA384');
        signer.update(data);
        signer.end();
        return signer.sign({
          key: key.privateKeyPem,
          dsaEncoding: 'ieee-p1363',
        });
      }
      case 'EdDSA_ED25519': {
        return crypto.sign(null, data, key.privateKeyPem);
      }
      default:
        throw new Error(`Unsupported algorithm ${(key as any).algorithm}`);
    }
  }

  async exportPublicKey(key: KeyVersion): Promise<string> {
    if (key.publicKeyPem) {
      return key.publicKeyPem;
    }
    if (!key.privateKeyPem) {
      throw new Error(`Key ${key.id} version ${key.version} missing material to derive public key`);
    }
    const privateKey = crypto.createPrivateKey(key.privateKeyPem);
    const publicKey = crypto.createPublicKey(privateKey);
    return publicKey.export({ type: 'spki', format: 'pem' }).toString();
  }
}

export interface TimestampingService {
  getTimestampToken(payload: Buffer): Promise<string>;
  verify?(payload: Buffer, token: string): Promise<boolean>;
}

export interface Rfc3161Options {
  apiKeyHeader?: string;
  apiKeyValue?: string;
  verifyEndpoint?: string;
}

export class Rfc3161TimestampingService implements TimestampingService {
  constructor(private readonly endpoint: string, private readonly options: Rfc3161Options = {}) {}

  async getTimestampToken(payload: Buffer): Promise<string> {
    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/octet-stream',
        ...(this.options.apiKeyHeader && this.options.apiKeyValue
          ? { [this.options.apiKeyHeader]: this.options.apiKeyValue }
          : {}),
      },
      body: payload,
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Timestamping service responded with ${response.status}: ${text}`);
    }

    // Try to parse JSON { token }
    const contentType = response.headers.get('content-type') ?? '';
    if (contentType.includes('application/json')) {
      const body = (await response.json()) as { token?: string };
      if (!body.token) {
        throw new Error('Timestamping service returned JSON without token field');
      }
      return body.token;
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    return buffer.toString('base64');
  }

  async verify(payload: Buffer, token: string): Promise<boolean> {
    if (!this.options.verifyEndpoint) {
      // Best-effort validation by ensuring token decodes
      try {
        Buffer.from(token, 'base64');
        return true;
      } catch (error) {
        return false;
      }
    }

    const response = await fetch(this.options.verifyEndpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(this.options.apiKeyHeader && this.options.apiKeyValue
          ? { [this.options.apiKeyHeader]: this.options.apiKeyValue }
          : {}),
      },
      body: JSON.stringify({ token, payload: payload.toString('base64') }),
    });

    if (!response.ok) {
      return false;
    }

    const body = (await response.json().catch(() => ({}))) as { valid?: boolean };
    return body.valid === true;
  }
}

export interface AuditLogger {
  log(event: CryptoAuditEvent): Promise<void>;
}

export class DatabaseAuditLogger implements AuditLogger {
  constructor(private readonly subsystem: string) {}

  async log(event: CryptoAuditEvent): Promise<void> {
    try {
      const resourceId = `${event.keyId}:${event.keyVersion ?? 'unknown'}`;
      const details: JsonObject = {
        subsystem: this.subsystem,
        algorithm: event.algorithm ?? null,
        success: event.success,
        reason: event.reason ?? null,
        metadata: event.metadata ?? null,
      };
      await writeAudit({
        action: `crypto.${event.action}`,
        resourceType: 'crypto-key',
        resourceId,
        details,
      });
    } catch (error) {
      // Auditing must never throw in hot paths
      console.warn('Failed to write crypto audit log', error);
    }
  }
}
