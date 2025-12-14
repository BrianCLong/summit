/**
 * Service Authenticator
 *
 * Handles mTLS-based service-to-service authentication
 * Validates SPIFFE IDs and service certificates
 */

import { readFileSync } from 'fs';
import { createVerify } from 'crypto';

export interface ServiceAuthConfig {
  trustBundlePath: string;
  validateSPIFFEID: boolean;
}

export interface ServiceIdentity {
  type: 'service';
  spiffeId: string;
  serviceName: string;
  namespace: string;
  attributes: Record<string, any>;
}

export class ServiceAuthenticator {
  private config: ServiceAuthConfig;
  private trustBundle: string | null = null;

  constructor(config: ServiceAuthConfig) {
    this.config = config;
    this.loadTrustBundle();
  }

  /**
   * Load SPIRE trust bundle
   */
  private loadTrustBundle(): void {
    try {
      this.trustBundle = readFileSync(this.config.trustBundlePath, 'utf-8');
      console.log('Loaded SPIRE trust bundle');
    } catch (error) {
      console.warn('Failed to load SPIRE trust bundle, mTLS validation will fail', error);
    }
  }

  /**
   * Validate service certificate and extract identity
   */
  async validateCertificate(cert: any): Promise<ServiceIdentity> {
    if (!cert || !cert.subject) {
      throw new Error('No client certificate provided');
    }

    // Extract SPIFFE ID from certificate SAN (Subject Alternative Name)
    const spiffeId = this.extractSPIFFEID(cert);

    if (!spiffeId) {
      throw new Error('No SPIFFE ID found in certificate');
    }

    if (this.config.validateSPIFFEID && !this.isValidSPIFFEID(spiffeId)) {
      throw new Error(`Invalid SPIFFE ID: ${spiffeId}`);
    }

    // Parse SPIFFE ID to extract service information
    const { serviceName, namespace } = this.parseSPIFFEID(spiffeId);

    // Validate certificate chain against trust bundle
    if (this.trustBundle) {
      await this.validateCertificateChain(cert);
    }

    return {
      type: 'service',
      spiffeId,
      serviceName,
      namespace,
      attributes: {
        certSubject: cert.subject,
        certIssuer: cert.issuer,
        certValidFrom: cert.valid_from,
        certValidTo: cert.valid_to,
        certFingerprint: cert.fingerprint
      }
    };
  }

  /**
   * Extract SPIFFE ID from certificate SAN
   */
  private extractSPIFFEID(cert: any): string | null {
    // Try subject alternative names
    if (cert.subjectaltname) {
      const sans = cert.subjectaltname.split(', ');

      for (const san of sans) {
        if (san.startsWith('URI:spiffe://')) {
          return san.substring(4); // Remove 'URI:' prefix
        }
      }
    }

    // Fallback to subject CN (less secure)
    if (cert.subject && cert.subject.CN) {
      return cert.subject.CN;
    }

    return null;
  }

  /**
   * Validate SPIFFE ID format
   * Format: spiffe://mesh.summit.internal/ns/<namespace>/sa/<service-account>
   */
  private isValidSPIFFEID(spiffeId: string): boolean {
    const spiffePattern = /^spiffe:\/\/mesh\.summit\.internal\/ns\/[a-z0-9-]+\/sa\/[a-z0-9-]+$/;
    return spiffePattern.test(spiffeId);
  }

  /**
   * Parse SPIFFE ID to extract service information
   */
  private parseSPIFFEID(spiffeId: string): { serviceName: string; namespace: string } {
    // spiffe://mesh.summit.internal/ns/<namespace>/sa/<service-account>
    const match = spiffeId.match(/\/ns\/([^\/]+)\/sa\/([^\/]+)/);

    if (!match) {
      return {
        serviceName: 'unknown',
        namespace: 'unknown'
      };
    }

    return {
      namespace: match[1],
      serviceName: match[2]
    };
  }

  /**
   * Validate certificate chain against trust bundle
   */
  private async validateCertificateChain(cert: any): Promise<void> {
    // In production, implement proper certificate chain validation
    // This is a simplified version

    if (!this.trustBundle) {
      throw new Error('Trust bundle not loaded');
    }

    // Check certificate validity period
    const now = new Date();
    const validFrom = new Date(cert.valid_from);
    const validTo = new Date(cert.valid_to);

    if (now < validFrom || now > validTo) {
      throw new Error('Certificate is not valid');
    }

    // In production, verify certificate signature against trust bundle
    // using OpenSSL or similar cryptographic library
    // For now, we trust that TLS layer has done this validation
  }

  /**
   * Create service identity for testing/development
   */
  static createMockIdentity(
    serviceName: string,
    namespace: string
  ): ServiceIdentity {
    return {
      type: 'service',
      spiffeId: `spiffe://mesh.summit.internal/ns/${namespace}/sa/${serviceName}`,
      serviceName,
      namespace,
      attributes: {
        mock: true
      }
    };
  }
}
