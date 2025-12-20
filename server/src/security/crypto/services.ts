import crypto from 'node:crypto';
import fetch from 'node-fetch';
import { writeAudit } from '../../utils/audit.js';
import type { CryptoAuditEvent, JsonObject, KeyVersion } from './types.js';

/**
 * Interface for a Hardware Security Module (HSM) or equivalent service.
 * Handles signing operations and public key export.
 */
export interface HardwareSecurityModule {
  /**
   * Signs the data using the private key associated with the provided key version.
   * @param data - The data to sign.
   * @param key - The key version containing the signing material.
   * @returns The signature as a buffer.
   */
  sign(data: Buffer, key: KeyVersion): Promise<Buffer>;

  /**
   * Exports the public key for the given key version.
   * @param key - The key version.
   * @returns The public key in PEM format.
   */
  exportPublicKey(key: KeyVersion): Promise<string>;
}

/**
 * Software-based implementation of an HSM.
 * Performs cryptographic operations in-memory using Node.js crypto.
 */
export class SoftwareHSM implements HardwareSecurityModule {
  /**
   * Signs the data using the private key from the KeyVersion.
   * Supports RSA_SHA256, ECDSA_P256_SHA256, ECDSA_P384_SHA384, and EdDSA_ED25519.
   * @param data - The data to sign.
   * @param key - The key version containing the private key PEM.
   * @returns The signature buffer.
   */
  async sign(data: Buffer, key: KeyVersion): Promise<Buffer> {
    if (!key.privateKeyPem) {
      throw new Error(
        `Key ${key.id} version ${key.version} missing private key material`,
      );
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

  /**
   * Exports the public key in PEM format.
   * @param key - The key version.
   * @returns The public key PEM string.
   */
  async exportPublicKey(key: KeyVersion): Promise<string> {
    if (key.publicKeyPem) {
      return key.publicKeyPem;
    }
    if (!key.privateKeyPem) {
      throw new Error(
        `Key ${key.id} version ${key.version} missing material to derive public key`,
      );
    }
    const privateKey = crypto.createPrivateKey(key.privateKeyPem);
    const publicKey = crypto.createPublicKey(privateKey);
    return publicKey.export({ type: 'spki', format: 'pem' }).toString();
  }
}

/**
 * Interface for a timestamping service.
 * Provides tokens to prove the existence of data at a specific time.
 */
export interface TimestampingService {
  /**
   * Requests a timestamp token for the given payload.
   * @param payload - The data to timestamp.
   * @returns A base64 encoded timestamp token.
   */
  getTimestampToken(payload: Buffer): Promise<string>;

  /**
   * Verifies a timestamp token against the payload.
   * @param payload - The original data.
   * @param token - The timestamp token.
   * @returns True if valid.
   */
  verify?(payload: Buffer, token: string): Promise<boolean>;
}

export interface Rfc3161Options {
  apiKeyHeader?: string;
  apiKeyValue?: string;
  verifyEndpoint?: string;
}

/**
 * Implementation of a Timestamping Service compliant with RFC 3161.
 * Communicates with an external timestamping authority via HTTP.
 */
export class Rfc3161TimestampingService implements TimestampingService {
  constructor(
    private readonly endpoint: string,
    private readonly options: Rfc3161Options = {},
  ) {}

  /**
   * Fetches a timestamp token from the remote service.
   * @param payload - The data buffer.
   * @returns The timestamp token string.
   */
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
      throw new Error(
        `Timestamping service responded with ${response.status}: ${text}`,
      );
    }

    // Try to parse JSON { token }
    const contentType = response.headers.get('content-type') ?? '';
    if (contentType.includes('application/json')) {
      const body = (await response.json()) as { token?: string };
      if (!body.token) {
        throw new Error(
          'Timestamping service returned JSON without token field',
        );
      }
      return body.token;
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    return buffer.toString('base64');
  }

  /**
   * Verifies the timestamp token, optionally checking with the remote service.
   * @param payload - The data buffer.
   * @param token - The token string.
   * @returns Validation result boolean.
   */
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

    const body = (await response.json().catch(() => ({}))) as {
      valid?: boolean;
    };
    return body.valid === true;
  }
}

/**
 * Interface for logging cryptographic audit events.
 */
export interface AuditLogger {
  /**
   * Logs a cryptographic event.
   * @param event - The event details.
   */
  log(event: CryptoAuditEvent): Promise<void>;
}

/**
 * Audit logger implementation that writes to the database via the global audit utility.
 */
export class DatabaseAuditLogger implements AuditLogger {
  constructor(private readonly subsystem: string) {}

  /**
   * Logs a crypto audit event.
   * @param event - The event to log.
   */
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
