/**
 * Mutual TLS (mTLS) Validator
 *
 * Validates client certificates for mutual authentication
 */

import { createLogger } from '../utils/logger.js';
import type { TLSSocket } from 'tls';

const logger = createLogger('mtls-validator');

export interface MTLSConfig {
  enabled: boolean;
  requireClientCert: boolean;
  ca?: Buffer[];
  allowedCNs?: string[];
  allowedOrganizations?: string[];
}

export interface ClientCertificate {
  subject: {
    CN?: string;
    O?: string;
    OU?: string;
    C?: string;
  };
  issuer: {
    CN?: string;
    O?: string;
  };
  validFrom: string;
  validTo: string;
  fingerprint: string;
  serialNumber: string;
}

export class MTLSValidator {
  private config: MTLSConfig;
  private trustedFingerprints = new Set<string>();

  constructor(config: MTLSConfig) {
    this.config = config;
  }

  validateClientCertificate(socket: TLSSocket): ClientCertificate | null {
    if (!this.config.enabled) {
      return null;
    }

    const cert = socket.getPeerCertificate();

    if (!cert || !Object.keys(cert).length) {
      if (this.config.requireClientCert) {
        logger.error('Client certificate required but not provided');
        throw new Error('Client certificate required');
      }
      return null;
    }

    // Extract certificate information
    const clientCert: ClientCertificate = {
      subject: cert.subject,
      issuer: cert.issuer,
      validFrom: cert.valid_from,
      validTo: cert.valid_to,
      fingerprint: cert.fingerprint,
      serialNumber: cert.serialNumber,
    };

    // Validate certificate
    this.validateCertificate(clientCert);

    logger.info('Client certificate validated', {
      cn: clientCert.subject.CN,
      fingerprint: clientCert.fingerprint,
    });

    return clientCert;
  }

  private validateCertificate(cert: ClientCertificate): void {
    // Check if certificate is expired
    const now = new Date();
    const validFrom = new Date(cert.validFrom);
    const validTo = new Date(cert.validTo);

    if (now < validFrom || now > validTo) {
      throw new Error('Client certificate expired or not yet valid');
    }

    // Check allowed CNs
    if (this.config.allowedCNs && this.config.allowedCNs.length > 0) {
      if (!cert.subject.CN || !this.config.allowedCNs.includes(cert.subject.CN)) {
        throw new Error('Client certificate CN not allowed');
      }
    }

    // Check allowed organizations
    if (this.config.allowedOrganizations && this.config.allowedOrganizations.length > 0) {
      if (!cert.subject.O || !this.config.allowedOrganizations.includes(cert.subject.O)) {
        throw new Error('Client certificate organization not allowed');
      }
    }

    // Check trusted fingerprints
    if (this.trustedFingerprints.size > 0) {
      if (!this.trustedFingerprints.has(cert.fingerprint)) {
        throw new Error('Client certificate fingerprint not trusted');
      }
    }
  }

  addTrustedFingerprint(fingerprint: string): void {
    this.trustedFingerprints.add(fingerprint);
    logger.info('Trusted fingerprint added', { fingerprint });
  }

  removeTrustedFingerprint(fingerprint: string): void {
    this.trustedFingerprints.delete(fingerprint);
    logger.info('Trusted fingerprint removed', { fingerprint });
  }

  getTrustedFingerprints(): string[] {
    return Array.from(this.trustedFingerprints);
  }
}
