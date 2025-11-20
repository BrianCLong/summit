/**
 * PKI (Public Key Infrastructure) Manager
 */

import { ec as EC } from 'elliptic';
import * as forge from 'node-forge';
import { Logger } from 'pino';
import { v4 as uuidv4 } from 'uuid';

const ec = new EC('secp256k1');

export interface KeyPair {
  publicKey: string;
  privateKey: string;
  algorithm: 'ECDSA' | 'RSA' | 'EdDSA';
}

export interface Certificate {
  id: string;
  subject: string;
  issuer: string;
  publicKey: string;
  serialNumber: string;
  validFrom: number;
  validTo: number;
  signature: string;
  revoked: boolean;
}

export interface DigitalSignature {
  signature: string;
  publicKey: string;
  algorithm: string;
  timestamp: number;
}

export class PKIManager {
  private logger: Logger;
  private certificates: Map<string, Certificate> = new Map();
  private revokedCerts: Set<string> = new Set();

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Generate ECDSA key pair
   */
  generateECDSAKeyPair(): KeyPair {
    const keyPair = ec.genKeyPair();

    return {
      publicKey: keyPair.getPublic('hex'),
      privateKey: keyPair.getPrivate('hex'),
      algorithm: 'ECDSA',
    };
  }

  /**
   * Generate RSA key pair
   */
  generateRSAKeyPair(bits: number = 2048): KeyPair {
    const keypair = forge.pki.rsa.generateKeyPair({ bits });

    return {
      publicKey: forge.pki.publicKeyToPem(keypair.publicKey),
      privateKey: forge.pki.privateKeyToPem(keypair.privateKey),
      algorithm: 'RSA',
    };
  }

  /**
   * Sign data with ECDSA
   */
  signECDSA(data: string, privateKeyHex: string): string {
    const key = ec.keyFromPrivate(privateKeyHex, 'hex');
    const hash = forge.md.sha256.create().update(data).digest().toHex();
    const signature = key.sign(hash);

    return signature.toDER('hex');
  }

  /**
   * Verify ECDSA signature
   */
  verifyECDSA(data: string, signature: string, publicKeyHex: string): boolean {
    try {
      const key = ec.keyFromPublic(publicKeyHex, 'hex');
      const hash = forge.md.sha256.create().update(data).digest().toHex();

      return key.verify(hash, signature);
    } catch (error) {
      return false;
    }
  }

  /**
   * Sign data with RSA
   */
  signRSA(data: string, privateKeyPem: string): string {
    const privateKey = forge.pki.privateKeyFromPem(privateKeyPem);
    const md = forge.md.sha256.create();
    md.update(data, 'utf8');

    const signature = privateKey.sign(md);
    return forge.util.encode64(signature);
  }

  /**
   * Verify RSA signature
   */
  verifyRSA(data: string, signature: string, publicKeyPem: string): boolean {
    try {
      const publicKey = forge.pki.publicKeyFromPem(publicKeyPem);
      const md = forge.md.sha256.create();
      md.update(data, 'utf8');

      const decodedSignature = forge.util.decode64(signature);
      return publicKey.verify(md.digest().bytes(), decodedSignature);
    } catch (error) {
      return false;
    }
  }

  /**
   * Issue certificate
   */
  issueCertificate(
    subject: string,
    issuer: string,
    publicKey: string,
    validityDays: number = 365,
    issuerPrivateKey?: string
  ): Certificate {
    const cert: Certificate = {
      id: uuidv4(),
      subject,
      issuer,
      publicKey,
      serialNumber: Date.now().toString(),
      validFrom: Date.now(),
      validTo: Date.now() + validityDays * 24 * 60 * 60 * 1000,
      signature: '',
      revoked: false,
    };

    // Sign certificate
    if (issuerPrivateKey) {
      const certData = JSON.stringify({
        subject: cert.subject,
        issuer: cert.issuer,
        publicKey: cert.publicKey,
        serialNumber: cert.serialNumber,
        validFrom: cert.validFrom,
        validTo: cert.validTo,
      });

      cert.signature = this.signECDSA(certData, issuerPrivateKey);
    }

    this.certificates.set(cert.id, cert);

    this.logger.info(
      { certId: cert.id, subject, issuer },
      'Certificate issued'
    );

    return cert;
  }

  /**
   * Revoke certificate
   */
  revokeCertificate(certId: string, reason: string): void {
    const cert = this.certificates.get(certId);
    if (!cert) {
      throw new Error('Certificate not found');
    }

    cert.revoked = true;
    this.revokedCerts.add(certId);

    this.logger.info(
      { certId, reason },
      'Certificate revoked'
    );
  }

  /**
   * Verify certificate
   */
  verifyCertificate(certId: string): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];
    const cert = this.certificates.get(certId);

    if (!cert) {
      return { valid: false, errors: ['Certificate not found'] };
    }

    // Check revocation
    if (cert.revoked) {
      errors.push('Certificate has been revoked');
    }

    // Check expiration
    const now = Date.now();
    if (now < cert.validFrom) {
      errors.push('Certificate not yet valid');
    }
    if (now > cert.validTo) {
      errors.push('Certificate has expired');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get certificate
   */
  getCertificate(certId: string): Certificate | undefined {
    return this.certificates.get(certId);
  }

  /**
   * Check if certificate is revoked
   */
  isCertificateRevoked(certId: string): boolean {
    return this.revokedCerts.has(certId);
  }

  /**
   * Multi-signature support
   */
  createMultiSignature(
    data: string,
    privateKeys: string[],
    threshold: number
  ): {
    signatures: string[];
    threshold: number;
    publicKeys: string[];
  } {
    if (privateKeys.length < threshold) {
      throw new Error('Insufficient private keys for threshold');
    }

    const signatures: string[] = [];
    const publicKeys: string[] = [];

    for (const privateKey of privateKeys) {
      const signature = this.signECDSA(data, privateKey);
      signatures.push(signature);

      const key = ec.keyFromPrivate(privateKey, 'hex');
      publicKeys.push(key.getPublic('hex'));
    }

    return {
      signatures,
      threshold,
      publicKeys,
    };
  }

  /**
   * Verify multi-signature
   */
  verifyMultiSignature(
    data: string,
    signatures: string[],
    publicKeys: string[],
    threshold: number
  ): boolean {
    let validSignatures = 0;

    for (let i = 0; i < signatures.length; i++) {
      if (this.verifyECDSA(data, signatures[i], publicKeys[i])) {
        validSignatures++;
      }
    }

    return validSignatures >= threshold;
  }
}
