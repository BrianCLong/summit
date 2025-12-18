import { createSign, createPublicKey } from 'crypto';
import { cfg } from '../config';

/**
 * @class SigningService
 * @description Provides cryptographic signing for evidence packets.
 *
 * This service uses a private key from the application configuration to create
 * a digital signature for data, ensuring its integrity and authenticity.
 */
export class SigningService {
  private privateKey: string;
  private publicKey: string;

  constructor() {
    if (!cfg.SIGNING_PRIVATE_KEY) {
      throw new Error('SIGNING_PRIVATE_KEY is not configured. Cannot create signatures.');
    }
    this.privateKey = cfg.SIGNING_PRIVATE_KEY;

    // Derive and store the public key for verification purposes
    try {
      const publicKeyObject = createPublicKey(this.privateKey);
      this.publicKey = publicKeyObject.export({ type: 'spki', format: 'pem' }).toString();
    } catch (error) {
      throw new Error('Invalid SIGNING_PRIVATE_KEY. Please provide a valid PEM-formatted private key.');
    }
  }

  /**
   * Signs the given data using the configured private key.
   * @param data The data to sign (string or Buffer).
   * @returns The base64-encoded signature.
   */
  public sign(data: string | Buffer): string {
    const sign = createSign('SHA256');
    sign.update(data);
    sign.end();
    return sign.sign(this.privateKey, 'base64');
  }

  /**
   * Returns the public key corresponding to the private key.
   * @returns The public key in PEM format.
   */
  public getPublicKey(): string {
    return this.publicKey;
  }
}
