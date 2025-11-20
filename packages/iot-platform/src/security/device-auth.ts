/**
 * Device Authentication and Security
 * Handles device authentication, certificate management, and secure connectivity
 */

import { SignJWT, jwtVerify } from 'jose';
import { createHash, randomBytes } from 'crypto';
import pino from 'pino';
import { DeviceCredentials } from '../core/types.js';

const logger = pino({ name: 'device-auth' });

export interface DeviceRegistration {
  deviceId: string;
  clientId: string;
  publicKey?: string;
  certificateFingerprint?: string;
  apiKeyHash?: string;
  createdAt: Date;
  expiresAt?: Date;
  metadata?: Record<string, any>;
}

export interface TokenPayload {
  deviceId: string;
  clientId: string;
  scopes: string[];
  iat: number;
  exp: number;
}

export class DeviceAuthManager {
  private registrations = new Map<string, DeviceRegistration>();
  private jwtSecret: Uint8Array;

  constructor(jwtSecret?: string) {
    this.jwtSecret = new TextEncoder().encode(
      jwtSecret ?? process.env.JWT_SECRET ?? 'default-secret-change-in-production'
    );
  }

  /**
   * Register a new device with credentials
   */
  async registerDevice(
    deviceId: string,
    credentials: Partial<DeviceCredentials>,
    metadata?: Record<string, any>
  ): Promise<DeviceRegistration> {
    const clientId = credentials.clientId ?? `client-${deviceId}-${Date.now()}`;

    const registration: DeviceRegistration = {
      deviceId,
      clientId,
      createdAt: new Date(),
      metadata,
    };

    // Hash API key if provided
    if (credentials.apiKey) {
      registration.apiKeyHash = this.hashApiKey(credentials.apiKey);
    }

    // Store certificate fingerprint if provided
    if (credentials.certificate) {
      registration.certificateFingerprint = this.getCertificateFingerprint(credentials.certificate);
    }

    // Store public key if provided
    if (credentials.publicKey) {
      registration.publicKey = credentials.publicKey;
    }

    this.registrations.set(deviceId, registration);

    logger.info({ deviceId, clientId }, 'Device registered');

    return registration;
  }

  /**
   * Generate JWT token for device
   */
  async generateDeviceToken(
    deviceId: string,
    scopes: string[] = ['telemetry:publish', 'telemetry:subscribe'],
    expiresIn = '7d'
  ): Promise<string> {
    const registration = this.registrations.get(deviceId);
    if (!registration) {
      throw new Error(`Device ${deviceId} not registered`);
    }

    const token = await new SignJWT({
      deviceId,
      clientId: registration.clientId,
      scopes,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(expiresIn)
      .sign(this.jwtSecret);

    logger.info({ deviceId, scopes, expiresIn }, 'Generated device token');

    return token;
  }

  /**
   * Verify device JWT token
   */
  async verifyDeviceToken(token: string): Promise<TokenPayload> {
    try {
      const { payload } = await jwtVerify(token, this.jwtSecret);

      return {
        deviceId: payload.deviceId as string,
        clientId: payload.clientId as string,
        scopes: payload.scopes as string[],
        iat: payload.iat!,
        exp: payload.exp!,
      };
    } catch (error) {
      logger.error({ error }, 'Token verification failed');
      throw new Error('Invalid or expired token');
    }
  }

  /**
   * Authenticate device with API key
   */
  authenticateWithApiKey(deviceId: string, apiKey: string): boolean {
    const registration = this.registrations.get(deviceId);
    if (!registration || !registration.apiKeyHash) {
      return false;
    }

    const providedHash = this.hashApiKey(apiKey);
    const isValid = providedHash === registration.apiKeyHash;

    if (isValid) {
      logger.info({ deviceId }, 'Device authenticated with API key');
    } else {
      logger.warn({ deviceId }, 'API key authentication failed');
    }

    return isValid;
  }

  /**
   * Authenticate device with certificate
   */
  authenticateWithCertificate(deviceId: string, certificate: string): boolean {
    const registration = this.registrations.get(deviceId);
    if (!registration || !registration.certificateFingerprint) {
      return false;
    }

    const providedFingerprint = this.getCertificateFingerprint(certificate);
    const isValid = providedFingerprint === registration.certificateFingerprint;

    if (isValid) {
      logger.info({ deviceId }, 'Device authenticated with certificate');
    } else {
      logger.warn({ deviceId }, 'Certificate authentication failed');
    }

    return isValid;
  }

  /**
   * Generate API key for device
   */
  generateApiKey(): string {
    return randomBytes(32).toString('base64url');
  }

  /**
   * Revoke device registration
   */
  revokeDevice(deviceId: string): boolean {
    const deleted = this.registrations.delete(deviceId);
    if (deleted) {
      logger.info({ deviceId }, 'Device registration revoked');
    }
    return deleted;
  }

  /**
   * Check if device is registered
   */
  isDeviceRegistered(deviceId: string): boolean {
    return this.registrations.has(deviceId);
  }

  /**
   * Get device registration
   */
  getDeviceRegistration(deviceId: string): DeviceRegistration | undefined {
    return this.registrations.get(deviceId);
  }

  /**
   * List all registered devices
   */
  listDevices(): DeviceRegistration[] {
    return Array.from(this.registrations.values());
  }

  private hashApiKey(apiKey: string): string {
    return createHash('sha256').update(apiKey).digest('hex');
  }

  private getCertificateFingerprint(certificate: string): string {
    return createHash('sha256').update(certificate).digest('hex');
  }
}
