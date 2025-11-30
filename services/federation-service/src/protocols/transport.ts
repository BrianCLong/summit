/**
 * Federation Transport Layer
 *
 * Implements secure transport for federation with:
 * - JSON-over-HTTPS
 * - Message signing (JWT)
 * - Mutual TLS support
 */

import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import pino from 'pino';
import { SharePackage, FederationPartner } from '../models/types.js';

const logger = pino({ name: 'transport' });

/**
 * Signed message envelope
 */
export interface SignedMessage<T> {
  payload: T;
  signature: string;
  timestamp: Date;
  sender: string;
  nonce: string;
}

/**
 * Transport configuration
 */
export interface TransportConfig {
  privateKey: string; // PEM format RSA private key
  publicKey: string; // PEM format RSA public key
  certificatePath?: string; // For mTLS
  keyPath?: string; // For mTLS
  caPath?: string; // For mTLS
}

/**
 * Federation Transport Service
 */
export class FederationTransport {
  constructor(private config: TransportConfig) {}

  /**
   * Sign a message with private key
   */
  signMessage<T>(payload: T, senderId: string): SignedMessage<T> {
    const nonce = crypto.randomBytes(16).toString('hex');
    const timestamp = new Date();

    const message: SignedMessage<T> = {
      payload,
      signature: '',
      timestamp,
      sender: senderId,
      nonce,
    };

    // Create JWT signature
    const token = jwt.sign(
      {
        payload: JSON.stringify(payload),
        timestamp: timestamp.toISOString(),
        sender: senderId,
        nonce,
      },
      this.config.privateKey,
      {
        algorithm: 'RS256',
        expiresIn: '5m', // Signature valid for 5 minutes
      }
    );

    message.signature = token;

    logger.debug(
      {
        sender: senderId,
        nonce,
      },
      'Message signed'
    );

    return message;
  }

  /**
   * Verify message signature
   */
  verifyMessage<T>(
    message: SignedMessage<T>,
    partner: FederationPartner
  ): { valid: boolean; error?: string } {
    try {
      // Verify JWT
      const decoded = jwt.verify(message.signature, partner.publicKey, {
        algorithms: ['RS256'],
      }) as any;

      // Verify sender
      if (decoded.sender !== partner.id) {
        return {
          valid: false,
          error: 'Sender mismatch',
        };
      }

      // Verify payload integrity
      const expectedPayload = JSON.stringify(message.payload);
      if (decoded.payload !== expectedPayload) {
        return {
          valid: false,
          error: 'Payload tampering detected',
        };
      }

      // Verify timestamp (prevent replay attacks)
      const messageTime = new Date(decoded.timestamp);
      const now = new Date();
      const ageMinutes = (now.getTime() - messageTime.getTime()) / 1000 / 60;

      if (ageMinutes > 5) {
        return {
          valid: false,
          error: 'Message expired (older than 5 minutes)',
        };
      }

      if (ageMinutes < -1) {
        return {
          valid: false,
          error: 'Message timestamp in future',
        };
      }

      logger.debug(
        {
          sender: message.sender,
          nonce: message.nonce,
        },
        'Message signature verified'
      );

      return { valid: true };
    } catch (error) {
      logger.error(
        {
          error: error instanceof Error ? error.message : String(error),
        },
        'Signature verification failed'
      );
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Verification failed',
      };
    }
  }

  /**
   * Send share package to partner endpoint
   */
  async sendSharePackage(
    pkg: SharePackage,
    partner: FederationPartner,
    senderId: string
  ): Promise<{ success: boolean; error?: string }> {
    logger.info(
      {
        packageId: pkg.id,
        partnerId: partner.id,
        endpoint: partner.endpointUrl,
      },
      'Sending share package'
    );

    // Sign the package
    const signedMessage = this.signMessage(pkg, senderId);

    try {
      // Send via HTTPS POST
      const response = await fetch(partner.endpointUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Federation-Version': '1.0',
          'X-Sender-Id': senderId,
        },
        body: JSON.stringify(signedMessage),
        // In Node.js 18+, can use agent for mTLS:
        // agent: this.createMtlsAgent(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error(
          {
            status: response.status,
            error: errorText,
          },
          'Share package delivery failed'
        );
        return {
          success: false,
          error: `HTTP ${response.status}: ${errorText}`,
        };
      }

      const result = await response.json();

      logger.info(
        {
          packageId: pkg.id,
          partnerId: partner.id,
        },
        'Share package delivered successfully'
      );

      return { success: true };
    } catch (error) {
      logger.error(
        {
          error: error instanceof Error ? error.message : String(error),
        },
        'Failed to send share package'
      );
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Create mTLS agent for Node.js fetch
   * (In production, use https.Agent with cert/key/ca)
   */
  private createMtlsAgent(): any {
    // Placeholder - in production:
    // import https from 'https';
    // import fs from 'fs';
    // return new https.Agent({
    //   cert: fs.readFileSync(this.config.certificatePath!),
    //   key: fs.readFileSync(this.config.keyPath!),
    //   ca: fs.readFileSync(this.config.caPath!),
    //   rejectUnauthorized: true,
    // });
    return undefined;
  }

  /**
   * Hash package for integrity verification
   */
  hashPackage(pkg: SharePackage): string {
    const canonical = JSON.stringify(pkg, Object.keys(pkg).sort());
    return crypto.createHash('sha256').update(canonical).digest('hex');
  }

  /**
   * Verify package integrity
   */
  verifyPackageIntegrity(
    pkg: SharePackage,
    expectedHash: string
  ): boolean {
    const actualHash = this.hashPackage(pkg);
    return actualHash === expectedHash;
  }
}

/**
 * Generate RSA key pair for testing/development
 */
export function generateKeyPair(): {
  privateKey: string;
  publicKey: string;
} {
  const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem',
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem',
    },
  });

  return { privateKey, publicKey };
}
