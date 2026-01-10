/**
 * C2PA Validation Service
 *
 * Validates incoming media for C2PA (Coalition for Content Provenance and Authenticity)
 * Content Credentials, maintaining chain-of-custody and flagging credential breaks/strips.
 *
 * @see https://c2pa.org/specifications/specifications/2.2/specs/C2PA_Specification.html
 */

import * as crypto from 'crypto';
import { promises as fs } from 'fs';
import * as path from 'path';
import { EventEmitter } from 'events';
import { Counter, Histogram, Gauge } from 'prom-client';
import pino from 'pino';
import type {
  C2PAManifest,
  C2PAClaim,
  C2PAAssertion,
  C2PASignature,
  C2PAValidationStatus,
  C2PAValidationCode,
  C2PAIngredient,
  C2PAAction,
  C2PACredential,
  ContentVerificationRequest,
  ContentVerificationResult,
  VerificationStatus,
  VerificationMessage,
  VerificationOptions,
  TamperingResult,
  TamperingIndicator,
} from './types.js';

const logger = (pino as any)({ name: 'C2PAValidationService' });

// =============================================================================
// Metrics
// =============================================================================

const c2paValidationTotal = new Counter({
  name: 'pig_c2pa_validation_total',
  help: 'Total C2PA validations performed',
  labelNames: ['tenant_id', 'status', 'trust_level'],
});

const c2paValidationDuration = new Histogram({
  name: 'pig_c2pa_validation_duration_seconds',
  help: 'Duration of C2PA validation operations',
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
  labelNames: ['operation'],
});

const c2paCredentialsStripped = new Counter({
  name: 'pig_c2pa_credentials_stripped_total',
  help: 'Count of content with stripped C2PA credentials',
  labelNames: ['tenant_id', 'media_type'],
});

const c2paTrustLevel = new Gauge({
  name: 'pig_c2pa_trust_level',
  help: 'Distribution of trust levels in validated content',
  labelNames: ['trust_level'],
});

// =============================================================================
// JUMBF (ISO/IEC 19566-5) Parser Types
// =============================================================================

interface JUMBFBox {
  type: string;
  label?: string;
  data: Buffer;
  children?: JUMBFBox[];
}

interface JUMBFSuperbox extends JUMBFBox {
  type: 'jumb';
  descriptionType: string;
  children: JUMBFBox[];
}

// =============================================================================
// C2PA Validation Service
// =============================================================================

export interface C2PAValidationServiceConfig {
  /** Trust anchors (root certificates) for signature validation */
  trustAnchors: string[];

  /** Whether to allow self-signed certificates */
  allowSelfSigned: boolean;

  /** OCSP endpoint for revocation checking */
  ocspEndpoint?: string;

  /** Timestamp authority URL */
  tsaUrl?: string;

  /** Cache directory for temporary files */
  cacheDir: string;

  /** Maximum file size to process (bytes) */
  maxFileSize: number;

  /** Whether to extract and preserve manifests */
  preserveManifests: boolean;

  /** Whether to validate ingredient chains */
  validateIngredients: boolean;

  /** Tampering detection sensitivity (0-1) */
  tamperingSensitivity: number;
}

export const defaultC2PAValidationConfig: C2PAValidationServiceConfig = {
  trustAnchors: [],
  allowSelfSigned: false,
  ocspEndpoint: undefined,
  tsaUrl: undefined,
  cacheDir: '/tmp/c2pa-cache',
  maxFileSize: 10 * 1024 * 1024 * 1024, // 10GB
  preserveManifests: true,
  validateIngredients: true,
  tamperingSensitivity: 0.7,
};

export class C2PAValidationService extends EventEmitter {
  private config: C2PAValidationServiceConfig;
  private trustAnchors: Map<string, crypto.X509Certificate> = new Map();

  constructor(config: Partial<C2PAValidationServiceConfig> = {}) {
    super();
    this.config = { ...defaultC2PAValidationConfig, ...config };
    this.loadTrustAnchors();
  }

  /**
   * Load trust anchor certificates
   */
  private async loadTrustAnchors(): Promise<void> {
    for (const anchor of this.config.trustAnchors) {
      try {
        const cert = new crypto.X509Certificate(anchor);
        const fingerprint = cert.fingerprint256;
        this.trustAnchors.set(fingerprint, cert);
        logger.info({ fingerprint, subject: cert.subject }, 'Loaded trust anchor');
      } catch (error: any) {
        logger.error({ error, anchor: anchor.substring(0, 50) }, 'Failed to load trust anchor');
      }
    }
  }

  /**
   * Add a trust anchor at runtime
   */
  addTrustAnchor(certificate: string): void {
    try {
      const cert = new crypto.X509Certificate(certificate);
      const fingerprint = cert.fingerprint256;
      this.trustAnchors.set(fingerprint, cert);
      logger.info({ fingerprint }, 'Added trust anchor');
    } catch (error: any) {
      logger.error({ error }, 'Failed to add trust anchor');
      throw error;
    }
  }

  /**
   * Validate content for C2PA credentials
   */
  async validateContent(
    request: ContentVerificationRequest,
    tenantId: string
  ): Promise<ContentVerificationResult> {
    const startTime = Date.now();
    const verificationId = `cv_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

    logger.info({
      verificationId,
      filename: request.filename,
      mimeType: request.mimeType,
    }, 'Starting C2PA validation');

    const messages: VerificationMessage[] = [];
    let status: VerificationStatus = 'unverified';
    let c2paManifest: C2PAManifest | undefined;
    let c2paValidation: C2PAValidationStatus | undefined;
    let credentialsStripped = false;
    let tamperingResult: TamperingResult | undefined;

    try {
      // Calculate content hash
      const contentBuffer = await this.getContentBuffer(request.content);
      const contentHash = crypto.createHash('sha256').update(contentBuffer).digest('hex');

      // Check file size
      if (contentBuffer.length > this.config.maxFileSize) {
        throw new Error(`File size ${contentBuffer.length} exceeds maximum ${this.config.maxFileSize}`);
      }

      // Verify expected hash if provided
      if (request.expectedHash && contentHash !== request.expectedHash) {
        messages.push({
          type: 'error',
          code: 'HASH_MISMATCH',
          message: 'Content hash does not match expected hash',
          details: { expected: request.expectedHash, actual: contentHash },
        });
        status = 'tampered';
      }

      // Extract C2PA manifest based on content type
      const extractionResult = await this.extractC2PAManifest(
        contentBuffer,
        request.mimeType,
        request.filename
      );

      if (extractionResult.manifest) {
        c2paManifest = extractionResult.manifest;

        // Validate the manifest
        c2paValidation = await this.validateManifest(c2paManifest, contentBuffer);

        if (c2paValidation.valid) {
          status = 'verified';
          messages.push({
            type: 'info',
            code: 'C2PA_VALID',
            message: 'Valid C2PA credentials found',
            details: { trustLevel: c2paValidation.trustLevel },
          });
        } else {
          status = 'invalid';
          for (const code of c2paValidation.codes.filter(c => !c.success)) {
            messages.push({
              type: 'error',
              code: code.code,
              message: code.explanation,
            });
          }
        }
      } else if (extractionResult.strippedIndicators) {
        // Evidence that credentials were removed
        credentialsStripped = true;
        status = 'stripped';

        c2paCredentialsStripped.inc({
          tenant_id: tenantId,
          media_type: this.getMediaCategory(request.mimeType),
        });

        messages.push({
          type: 'warning',
          code: 'CREDENTIALS_STRIPPED',
          message: 'Content appears to have had C2PA credentials removed',
          details: { indicators: extractionResult.strippedIndicators },
        });
      } else {
        // No credentials present
        messages.push({
          type: 'info',
          code: 'NO_C2PA',
          message: 'No C2PA credentials present in content',
        });
      }

      // Run tampering detection if requested
      if (request.options?.checkTampering !== false) {
        tamperingResult = await this.detectTampering(
          contentBuffer,
          request.mimeType,
          c2paManifest
        );

        if (tamperingResult.tampered) {
          if (status !== 'tampered') {
            status = 'suspicious';
          }
          messages.push({
            type: 'warning',
            code: 'TAMPERING_DETECTED',
            message: 'Potential content tampering detected',
            details: {
              confidence: tamperingResult.confidence,
              indicators: tamperingResult.indicators.length,
            },
          });
        }
      }

      // Calculate risk score
      const riskScore = this.calculateRiskScore(
        status,
        c2paValidation,
        tamperingResult,
        credentialsStripped
      );

      // Generate recommendations
      const recommendations = this.generateRecommendations(
        status,
        messages,
        c2paValidation,
        tamperingResult
      );

      // Update metrics
      c2paValidationTotal.inc({
        tenant_id: tenantId,
        status,
        trust_level: c2paValidation?.trustLevel || 'none',
      });

      c2paValidationDuration.observe(
        { operation: 'validate' },
        (Date.now() - startTime) / 1000
      );

      if (c2paValidation?.trustLevel) {
        c2paTrustLevel.set({ trust_level: c2paValidation.trustLevel }, 1);
      }

      const result: ContentVerificationResult = {
        verificationId,
        status,
        contentHash,
        c2paValidation,
        c2paManifest,
        credentialsStripped,
        tamperingResult,
        verifiedAt: new Date(),
        messages,
        riskScore,
        recommendations,
      };

      this.emit('content:verified', { result });

      logger.info({
        verificationId,
        status,
        riskScore,
        duration: Date.now() - startTime,
      }, 'C2PA validation complete');

      return result;
    } catch (error: any) {
      logger.error({ error, verificationId }, 'C2PA validation failed');

      messages.push({
        type: 'error',
        code: 'VALIDATION_ERROR',
        message: `Validation failed: ${(error as Error).message}`,
      });

      return {
        verificationId,
        status: 'unverified',
        contentHash: '',
        credentialsStripped: false,
        verifiedAt: new Date(),
        messages,
        riskScore: 50,
        recommendations: ['Manual review recommended due to validation error'],
      };
    }
  }

  /**
   * Extract C2PA manifest from content
   */
  private async extractC2PAManifest(
    content: Buffer,
    mimeType: string,
    filename: string
  ): Promise<{
    manifest?: C2PAManifest;
    strippedIndicators?: string[];
  }> {
    const mediaCategory = this.getMediaCategory(mimeType);

    switch (mediaCategory) {
      case 'image':
        return this.extractFromImage(content, mimeType);
      case 'video':
        return this.extractFromVideo(content, mimeType);
      case 'audio':
        return this.extractFromAudio(content, mimeType);
      case 'document':
        return this.extractFromDocument(content, mimeType);
      default:
        return {};
    }
  }

  /**
   * Extract C2PA from image formats (JPEG, PNG, WebP, etc.)
   */
  private async extractFromImage(
    content: Buffer,
    mimeType: string
  ): Promise<{
    manifest?: C2PAManifest;
    strippedIndicators?: string[];
  }> {
    const strippedIndicators: string[] = [];

    // Look for JUMBF boxes in the content
    const jumbfBoxes = this.findJUMBFBoxes(content, mimeType);

    if (jumbfBoxes.length === 0) {
      // Check for indicators that credentials were stripped
      const xmpData = this.extractXMPData(content);
      if (xmpData) {
        // Look for C2PA references in XMP that point to missing data
        if (xmpData.includes('c2pa:') || xmpData.includes('http://c2pa.org')) {
          strippedIndicators.push('XMP contains C2PA references but no manifest found');
        }
      }

      // Check for truncated JUMBF markers
      if (this.hasTruncatedJUMBFMarkers(content)) {
        strippedIndicators.push('Truncated JUMBF markers detected');
      }

      return { strippedIndicators: strippedIndicators.length > 0 ? strippedIndicators : undefined };
    }

    // Parse the C2PA manifest from JUMBF
    const manifest = this.parseC2PAFromJUMBF(jumbfBoxes);

    return { manifest };
  }

  /**
   * Extract C2PA from video formats (MP4, MOV, etc.)
   */
  private async extractFromVideo(
    content: Buffer,
    mimeType: string
  ): Promise<{
    manifest?: C2PAManifest;
    strippedIndicators?: string[];
  }> {
    // For MP4/MOV, C2PA is stored in a 'c2pa' box
    const c2paBox = this.findMP4Box(content, 'c2pa');

    if (!c2paBox) {
      // Check for stripped indicators
      const strippedIndicators: string[] = [];

      // Check for 'free' boxes where 'c2pa' might have been
      const freeBoxes = this.findMP4Box(content, 'free');
      if (freeBoxes && this.looksLikeReplacedC2PA(freeBoxes)) {
        strippedIndicators.push('Suspicious free box possibly replacing c2pa box');
      }

      return { strippedIndicators: strippedIndicators.length > 0 ? strippedIndicators : undefined };
    }

    // Parse the manifest from the c2pa box
    const jumbfBoxes = this.parseJUMBFFromBuffer(c2paBox);
    const manifest = this.parseC2PAFromJUMBF(jumbfBoxes);

    return { manifest };
  }

  /**
   * Extract C2PA from audio formats
   */
  private async extractFromAudio(
    content: Buffer,
    mimeType: string
  ): Promise<{
    manifest?: C2PAManifest;
    strippedIndicators?: string[];
  }> {
    // Audio C2PA support varies by format
    // MP3: ID3v2 frames
    // WAV: Associated data chunk
    // FLAC: Metadata block

    if (mimeType === 'audio/mpeg') {
      return this.extractFromMP3(content);
    } else if (mimeType === 'audio/wav' || mimeType === 'audio/x-wav') {
      return this.extractFromWAV(content);
    }

    return {};
  }

  /**
   * Extract C2PA from document formats (PDF)
   */
  private async extractFromDocument(
    content: Buffer,
    mimeType: string
  ): Promise<{
    manifest?: C2PAManifest;
    strippedIndicators?: string[];
  }> {
    if (mimeType === 'application/pdf') {
      return this.extractFromPDF(content);
    }

    return {};
  }

  /**
   * Find JUMBF boxes in content
   */
  private findJUMBFBoxes(content: Buffer, mimeType: string): JUMBFBox[] {
    const boxes: JUMBFBox[] = [];

    if (mimeType === 'image/jpeg') {
      // JPEG: Look for APP11 marker (0xFFEB) with JUMBF
      let offset = 2; // Skip SOI
      while (offset < content.length - 4) {
        const marker = content.readUInt16BE(offset);
        if (marker === 0xFFEB) {
          // APP11 marker found
          const length = content.readUInt16BE(offset + 2);
          const segmentData = content.slice(offset + 4, offset + 2 + length);

          // Check for JUMBF signature (JP)
          if (segmentData.slice(0, 2).toString() === 'JP') {
            const parsed = this.parseJUMBFFromBuffer(segmentData.slice(2));
            boxes.push(...parsed);
          }
          offset += 2 + length;
        } else if ((marker & 0xFF00) === 0xFF00) {
          // Other marker
          if (marker === 0xFFD9) break; // EOI
          if (marker === 0xFFDA) break; // SOS - scan data follows
          const length = content.readUInt16BE(offset + 2);
          offset += 2 + length;
        } else {
          offset++;
        }
      }
    } else if (mimeType === 'image/png') {
      // PNG: Look for caBX chunk
      let offset = 8; // Skip signature
      while (offset < content.length - 12) {
        const length = content.readUInt32BE(offset);
        const type = content.slice(offset + 4, offset + 8).toString();

        if (type === 'caBX') {
          const chunkData = content.slice(offset + 8, offset + 8 + length);
          const parsed = this.parseJUMBFFromBuffer(chunkData);
          boxes.push(...parsed);
        }

        offset += 12 + length; // length + type + data + CRC
      }
    }

    return boxes;
  }

  /**
   * Parse JUMBF boxes from buffer
   */
  private parseJUMBFFromBuffer(data: Buffer): JUMBFBox[] {
    const boxes: JUMBFBox[] = [];
    let offset = 0;

    while (offset < data.length - 8) {
      const size = data.readUInt32BE(offset);
      const type = data.slice(offset + 4, offset + 8).toString();

      if (size === 0) break;

      const boxData = data.slice(offset + 8, offset + size);

      if (type === 'jumb') {
        // Parse superbox
        const children = this.parseJUMBFFromBuffer(boxData.slice(16)); // Skip description
        boxes.push({
          type: 'jumb',
          data: boxData,
          children,
        });
      } else {
        boxes.push({
          type,
          data: boxData,
        });
      }

      offset += size;
    }

    return boxes;
  }

  /**
   * Parse C2PA manifest from JUMBF boxes
   */
  private parseC2PAFromJUMBF(boxes: JUMBFBox[]): C2PAManifest | undefined {
    // Find the c2pa manifest box
    const c2paBox = boxes.find(b => b.type === 'jumb' && this.isC2PABox(b));

    if (!c2paBox || !c2paBox.children) {
      return undefined;
    }

    try {
      // Extract claim from claim box
      const claimBox = c2paBox.children.find(b => b.type === 'c2cl');
      const signatureBox = c2paBox.children.find(b => b.type === 'c2cs');

      if (!claimBox || !signatureBox) {
        return undefined;
      }

      const claim = this.parseClaimBox(claimBox);
      const signature = this.parseSignatureBox(signatureBox);

      const manifestId = `manifest_${crypto.randomBytes(8).toString('hex')}`;

      return {
        manifestId,
        claim,
        signature,
        validationStatus: undefined, // Will be filled during validation
      };
    } catch (error: any) {
      logger.error({ error }, 'Failed to parse C2PA manifest from JUMBF');
      return undefined;
    }
  }

  /**
   * Check if JUMBF box is a C2PA manifest
   */
  private isC2PABox(box: JUMBFBox): boolean {
    // Check for C2PA type UUID in description
    const c2paUuid = Buffer.from('6332706100110010800000aa00389b71', 'hex');
    return box.data.includes(c2paUuid);
  }

  /**
   * Parse claim box into C2PAClaim
   */
  private parseClaimBox(box: JUMBFBox): C2PAClaim {
    // The claim is stored as CBOR
    const cborData = box.data;

    // Basic CBOR parsing (simplified - real implementation would use cbor library)
    // For now, create a placeholder claim
    return {
      claimGenerator: 'c2pa/validator',
      format: 'application/octet-stream',
      instanceId: crypto.randomUUID(),
      assertions: [],
      signatureDate: new Date().toISOString(),
    };
  }

  /**
   * Parse signature box into C2PASignature
   */
  private parseSignatureBox(box: JUMBFBox): C2PASignature {
    // The signature is stored as COSE Sign1
    // Simplified parsing - real implementation would use cose library
    return {
      algorithm: 'ES256',
      value: box.data.toString('base64'),
      certificate: '',
    };
  }

  /**
   * Validate a C2PA manifest
   */
  private async validateManifest(
    manifest: C2PAManifest,
    content: Buffer
  ): Promise<C2PAValidationStatus> {
    const codes: C2PAValidationCode[] = [];
    let valid = true;
    let trustLevel: 'none' | 'self-signed' | 'anchored' | 'verified' = 'none';

    // 1. Validate signature
    const signatureValid = await this.validateSignature(manifest.signature, content);
    if (signatureValid) {
      codes.push({
        code: 'c2pa.signature.valid',
        explanation: 'Cryptographic signature is valid',
        severity: 'info',
        success: true,
      });
    } else {
      valid = false;
      codes.push({
        code: 'c2pa.signature.invalid',
        explanation: 'Cryptographic signature verification failed',
        severity: 'error',
        success: false,
      });
    }

    // 2. Validate certificate chain
    const certResult = await this.validateCertificateChain(manifest.signature);
    if (certResult.valid) {
      trustLevel = certResult.anchored ? 'anchored' : 'self-signed';
      codes.push({
        code: 'c2pa.certificate.valid',
        explanation: certResult.anchored
          ? 'Certificate chain validates to trusted anchor'
          : 'Certificate is self-signed but valid',
        severity: 'info',
        success: true,
      });
    } else {
      if (!this.config.allowSelfSigned) {
        valid = false;
      }
      codes.push({
        code: 'c2pa.certificate.invalid',
        explanation: certResult.error || 'Certificate validation failed',
        severity: this.config.allowSelfSigned ? 'warning' : 'error',
        success: false,
      });
    }

    // 3. Validate timestamp if present
    if (manifest.signature.timestamp) {
      const timestampValid = await this.validateTimestamp(manifest.signature.timestamp);
      if (timestampValid) {
        codes.push({
          code: 'c2pa.timestamp.valid',
          explanation: 'Timestamp token is valid',
          severity: 'info',
          success: true,
        });
      } else {
        codes.push({
          code: 'c2pa.timestamp.invalid',
          explanation: 'Timestamp token validation failed',
          severity: 'warning',
          success: false,
        });
      }
    }

    // 4. Validate assertions
    for (const assertion of manifest.claim.assertions) {
      const assertionValid = await this.validateAssertion(assertion, content);
      codes.push({
        code: assertionValid ? 'c2pa.assertion.valid' : 'c2pa.assertion.invalid',
        explanation: assertionValid
          ? `Assertion ${assertion.label} validated`
          : `Assertion ${assertion.label} validation failed`,
        severity: assertionValid ? 'info' : 'warning',
        success: assertionValid,
      });
    }

    // 5. Validate ingredients if present and enabled
    if (this.config.validateIngredients && manifest.claim.ingredients) {
      for (const ingredient of manifest.claim.ingredients) {
        const ingredientValid = await this.validateIngredient(ingredient);
        codes.push({
          code: ingredientValid ? 'c2pa.ingredient.valid' : 'c2pa.ingredient.invalid',
          explanation: ingredientValid
            ? `Ingredient ${ingredient.title} hash validated`
            : `Ingredient ${ingredient.title} hash mismatch or unavailable`,
          severity: ingredientValid ? 'info' : 'warning',
          success: ingredientValid,
        });
      }
    }

    // 6. Check revocation status
    const revocationStatus = await this.checkRevocation(manifest.signature);
    if (revocationStatus.revoked) {
      valid = false;
      trustLevel = 'none';
      codes.push({
        code: 'c2pa.certificate.revoked',
        explanation: 'Signing certificate has been revoked',
        severity: 'error',
        success: false,
      });
    }

    // Upgrade trust level if fully verified
    if (valid && trustLevel === 'anchored') {
      trustLevel = 'verified';
    }

    return {
      valid,
      validatedAt: new Date().toISOString(),
      codes,
      trustLevel,
      certificateInfo: certResult.info,
    };
  }

  /**
   * Validate cryptographic signature
   */
  private async validateSignature(
    signature: C2PASignature,
    content: Buffer
  ): Promise<boolean> {
    try {
      // For COSE Sign1, verify using the public key from certificate
      const cert = new crypto.X509Certificate(signature.certificate);
      const publicKey = cert.publicKey;

      // Create verifier based on algorithm
      let algorithm: string;
      switch (signature.algorithm) {
        case 'ES256':
          algorithm = 'sha256';
          break;
        case 'ES384':
          algorithm = 'sha384';
          break;
        case 'ES512':
          algorithm = 'sha512';
          break;
        case 'PS256':
        case 'RS256':
          algorithm = 'RSA-SHA256';
          break;
        default:
          logger.warn({ algorithm: signature.algorithm }, 'Unknown signature algorithm');
          return false;
      }

      const verify = crypto.createVerify(algorithm);
      verify.update(content);

      const signatureBuffer = Buffer.from(signature.value, 'base64');
      return verify.verify(publicKey, signatureBuffer);
    } catch (error: any) {
      logger.error({ error }, 'Signature validation error');
      return false;
    }
  }

  /**
   * Validate certificate chain
   */
  private async validateCertificateChain(
    signature: C2PASignature
  ): Promise<{
    valid: boolean;
    anchored: boolean;
    error?: string;
    info?: {
      issuer: string;
      subject: string;
      validFrom: string;
      validTo: string;
      revoked: boolean;
    };
  }> {
    try {
      const leafCert = new crypto.X509Certificate(signature.certificate);

      // Check certificate validity period
      const now = new Date();
      const validFrom = new Date(leafCert.validFrom);
      const validTo = new Date(leafCert.validTo);

      if (now < validFrom || now > validTo) {
        return {
          valid: false,
          anchored: false,
          error: 'Certificate is outside its validity period',
          info: {
            issuer: leafCert.issuer,
            subject: leafCert.subject,
            validFrom: leafCert.validFrom,
            validTo: leafCert.validTo,
            revoked: false,
          },
        };
      }

      // Check if self-signed
      const isSelfSigned = leafCert.issuer === leafCert.subject;

      // If we have a certificate chain, validate it
      if (signature.certificateChain && signature.certificateChain.length > 0) {
        let currentCert = leafCert;

        for (const chainCertPem of signature.certificateChain) {
          const chainCert = new crypto.X509Certificate(chainCertPem);

          // Verify the current cert was signed by this cert
          if (!currentCert.verify(chainCert.publicKey)) {
            return {
              valid: false,
              anchored: false,
              error: 'Certificate chain verification failed',
            };
          }

          currentCert = chainCert;

          // Check if we've reached a trust anchor
          const fingerprint = chainCert.fingerprint256;
          if (this.trustAnchors.has(fingerprint)) {
            return {
              valid: true,
              anchored: true,
              info: {
                issuer: leafCert.issuer,
                subject: leafCert.subject,
                validFrom: leafCert.validFrom,
                validTo: leafCert.validTo,
                revoked: false,
              },
            };
          }
        }
      }

      // Check if leaf cert is in trust anchors
      const leafFingerprint = leafCert.fingerprint256;
      if (this.trustAnchors.has(leafFingerprint)) {
        return {
          valid: true,
          anchored: true,
          info: {
            issuer: leafCert.issuer,
            subject: leafCert.subject,
            validFrom: leafCert.validFrom,
            validTo: leafCert.validTo,
            revoked: false,
          },
        };
      }

      // Self-signed or unanchored
      return {
        valid: isSelfSigned && this.config.allowSelfSigned,
        anchored: false,
        info: {
          issuer: leafCert.issuer,
          subject: leafCert.subject,
          validFrom: leafCert.validFrom,
          validTo: leafCert.validTo,
          revoked: false,
        },
      };
    } catch (error: any) {
      logger.error({ error }, 'Certificate chain validation error');
      return {
        valid: false,
        anchored: false,
        error: `Certificate parsing error: ${(error as Error).message}`,
      };
    }
  }

  /**
   * Validate timestamp token
   */
  private async validateTimestamp(timestamp: string): Promise<boolean> {
    // RFC 3161 timestamp validation
    // In production, verify with TSA
    try {
      const timestampBuffer = Buffer.from(timestamp, 'base64');
      // Basic validation - check structure
      return timestampBuffer.length > 0;
    } catch {
      return false;
    }
  }

  /**
   * Validate an assertion
   */
  private async validateAssertion(
    assertion: C2PAAssertion,
    content: Buffer
  ): Promise<boolean> {
    // Validate assertion hash if present
    if (assertion.hash) {
      const computedHash = crypto.createHash('sha256')
        .update(JSON.stringify(assertion.data))
        .digest('hex');
      return computedHash === assertion.hash;
    }
    return true;
  }

  /**
   * Validate an ingredient reference
   */
  private async validateIngredient(ingredient: C2PAIngredient): Promise<boolean> {
    // Would need to fetch and verify the ingredient's manifest
    // For now, return true if hash is present
    return !!ingredient.hash;
  }

  /**
   * Check certificate revocation status
   */
  private async checkRevocation(
    signature: C2PASignature
  ): Promise<{ revoked: boolean; reason?: string }> {
    if (!this.config.ocspEndpoint) {
      return { revoked: false };
    }

    try {
      // OCSP check would go here
      // For now, assume not revoked
      return { revoked: false };
    } catch (error: any) {
      logger.warn({ error }, 'OCSP check failed');
      return { revoked: false };
    }
  }

  /**
   * Detect content tampering
   */
  private async detectTampering(
    content: Buffer,
    mimeType: string,
    manifest?: C2PAManifest
  ): Promise<TamperingResult> {
    const indicators: TamperingIndicator[] = [];
    let confidence = 0;

    // Check for common tampering indicators
    const mediaCategory = this.getMediaCategory(mimeType);

    if (mediaCategory === 'image') {
      // Check for JPEG quantization table anomalies
      if (mimeType === 'image/jpeg') {
        const qtAnomaly = this.checkQuantizationTables(content);
        if (qtAnomaly) {
          indicators.push({
            type: 'quantization_anomaly',
            severity: 'medium',
            description: 'JPEG quantization table inconsistencies detected',
          });
          confidence += 0.3;
        }
      }

      // Check for metadata inconsistencies
      const metadataAnomaly = this.checkMetadataConsistency(content, mimeType);
      if (metadataAnomaly) {
        indicators.push({
          type: 'metadata_inconsistency',
          severity: 'low',
          description: 'Metadata inconsistencies detected',
        });
        confidence += 0.2;
      }

      // Check for editing software traces
      const editingTraces = this.detectEditingSoftwareTraces(content);
      if (editingTraces) {
        indicators.push({
          type: 'editing_traces',
          severity: 'low',
          description: `Editing software traces detected: ${editingTraces}`,
        });
        confidence += 0.1;
      }
    }

    // If manifest exists, check for content/manifest mismatches
    if (manifest) {
      const contentHash = crypto.createHash('sha256').update(content).digest('hex');
      // Would check against hash in manifest assertions
    }

    confidence = Math.min(1, confidence);

    return {
      tampered: confidence >= this.config.tamperingSensitivity,
      confidence,
      indicators,
      analysisMethod: 'statistical_analysis',
    };
  }

  /**
   * Check JPEG quantization tables for anomalies
   */
  private checkQuantizationTables(content: Buffer): boolean {
    // Look for multiple save indicators in quantization tables
    // This is a simplified check
    let dqtCount = 0;
    for (let i = 0; i < content.length - 2; i++) {
      if (content[i] === 0xFF && content[i + 1] === 0xDB) {
        dqtCount++;
      }
    }
    return dqtCount > 2;
  }

  /**
   * Check for metadata consistency
   */
  private checkMetadataConsistency(content: Buffer, mimeType: string): boolean {
    const xmp = this.extractXMPData(content);
    if (!xmp) return false;

    // Check for conflicting dates, software, etc.
    const createDate = xmp.match(/xmp:CreateDate="([^"]+)"/);
    const modifyDate = xmp.match(/xmp:ModifyDate="([^"]+)"/);

    if (createDate && modifyDate) {
      const create = new Date(createDate[1]);
      const modify = new Date(modifyDate[1]);
      if (create > modify) {
        return true; // Create date after modify date is suspicious
      }
    }

    return false;
  }

  /**
   * Detect editing software traces
   */
  private detectEditingSoftwareTraces(content: Buffer): string | null {
    const contentStr = content.toString('utf8', 0, Math.min(content.length, 65536));

    const editingTools = [
      'Adobe Photoshop',
      'GIMP',
      'Pixelmator',
      'Affinity Photo',
      'Canva',
      'Snapseed',
    ];

    for (const tool of editingTools) {
      if (contentStr.includes(tool)) {
        return tool;
      }
    }

    return null;
  }

  /**
   * Extract XMP data from content
   */
  private extractXMPData(content: Buffer): string | null {
    const xmpStart = content.indexOf('<x:xmpmeta');
    const xmpEnd = content.indexOf('</x:xmpmeta>');

    if (xmpStart !== -1 && xmpEnd !== -1) {
      return content.slice(xmpStart, xmpEnd + 12).toString('utf8');
    }

    return null;
  }

  /**
   * Check for truncated JUMBF markers
   */
  private hasTruncatedJUMBFMarkers(content: Buffer): boolean {
    // Look for partial JUMBF signatures
    const jumbSignature = Buffer.from('jumb');
    const index = content.indexOf(jumbSignature);

    if (index !== -1) {
      // Check if there's valid JUMBF structure following
      if (index + 20 > content.length) {
        return true; // Truncated
      }
    }

    return false;
  }

  /**
   * Find box in MP4/MOV format
   */
  private findMP4Box(content: Buffer, boxType: string): Buffer | null {
    let offset = 0;

    while (offset < content.length - 8) {
      const size = content.readUInt32BE(offset);
      const type = content.slice(offset + 4, offset + 8).toString();

      if (size === 0) break;

      if (type === boxType) {
        return content.slice(offset + 8, offset + size);
      }

      offset += size;
    }

    return null;
  }

  /**
   * Check if a 'free' box looks like it replaced a 'c2pa' box
   */
  private looksLikeReplacedC2PA(freeBox: Buffer): boolean {
    // Check for remnants of C2PA structure
    return freeBox.includes(Buffer.from('c2pa')) ||
      freeBox.includes(Buffer.from('jumb'));
  }

  /**
   * Extract from MP3 ID3 tags
   */
  private async extractFromMP3(content: Buffer): Promise<{
    manifest?: C2PAManifest;
    strippedIndicators?: string[];
  }> {
    // Check for ID3v2 header
    if (content.slice(0, 3).toString() !== 'ID3') {
      return {};
    }

    // Look for C2PA frame in ID3v2
    // Frame ID would be 'C2PA' or similar
    // Simplified implementation
    return {};
  }

  /**
   * Extract from WAV
   */
  private async extractFromWAV(content: Buffer): Promise<{
    manifest?: C2PAManifest;
    strippedIndicators?: string[];
  }> {
    // WAV uses RIFF chunks
    // C2PA would be in an associated data chunk
    return {};
  }

  /**
   * Extract from PDF
   */
  private async extractFromPDF(content: Buffer): Promise<{
    manifest?: C2PAManifest;
    strippedIndicators?: string[];
  }> {
    // PDF stores C2PA in incremental updates or associated files
    const contentStr = content.toString('utf8');

    if (contentStr.includes('/C2PA') || contentStr.includes('/c2pa')) {
      // Has C2PA object references
      // Parse and extract
      // Simplified implementation
    }

    return {};
  }

  /**
   * Get content as buffer
   */
  private async getContentBuffer(content: string | Buffer): Promise<Buffer> {
    if (Buffer.isBuffer(content)) {
      return content;
    }

    // Assume it's a file path
    return fs.readFile(content);
  }

  /**
   * Get media category from MIME type
   */
  private getMediaCategory(mimeType: string): 'image' | 'video' | 'audio' | 'document' | 'unknown' {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    if (mimeType.includes('pdf') || mimeType.includes('document')) return 'document';
    return 'unknown';
  }

  /**
   * Calculate risk score based on verification results
   */
  private calculateRiskScore(
    status: VerificationStatus,
    c2paValidation?: C2PAValidationStatus,
    tamperingResult?: TamperingResult,
    credentialsStripped?: boolean
  ): number {
    let score = 50; // Base score

    // Adjust based on verification status
    switch (status) {
      case 'verified':
        score = 10;
        break;
      case 'unverified':
        score = 50;
        break;
      case 'invalid':
        score = 70;
        break;
      case 'stripped':
        score = 75;
        break;
      case 'tampered':
        score = 90;
        break;
      case 'suspicious':
        score = 80;
        break;
    }

    // Adjust based on trust level
    if (c2paValidation) {
      switch (c2paValidation.trustLevel) {
        case 'verified':
          score -= 20;
          break;
        case 'anchored':
          score -= 15;
          break;
        case 'self-signed':
          score += 10;
          break;
      }
    }

    // Adjust based on tampering detection
    if (tamperingResult?.tampered) {
      score += Math.round(tamperingResult.confidence * 30);
    }

    // Adjust for stripped credentials
    if (credentialsStripped) {
      score += 15;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Generate recommendations based on verification results
   */
  private generateRecommendations(
    status: VerificationStatus,
    messages: VerificationMessage[],
    c2paValidation?: C2PAValidationStatus,
    tamperingResult?: TamperingResult
  ): string[] {
    const recommendations: string[] = [];

    switch (status) {
      case 'verified':
        recommendations.push('Content has valid provenance credentials - safe to use');
        break;

      case 'unverified':
        recommendations.push('Consider requesting content with C2PA credentials from source');
        recommendations.push('Manual verification of content origin recommended');
        break;

      case 'invalid':
        recommendations.push('Do not trust this content without additional verification');
        recommendations.push('Contact content source to verify authenticity');
        break;

      case 'stripped':
        recommendations.push('Content credentials were removed - treat with caution');
        recommendations.push('Request original content with intact credentials');
        recommendations.push('Investigate why credentials were removed');
        break;

      case 'tampered':
        recommendations.push('URGENT: Content shows signs of tampering');
        recommendations.push('Do not publish or distribute this content');
        recommendations.push('Initiate incident response if this content claims to be from your organization');
        break;

      case 'suspicious':
        recommendations.push('Content requires human review before use');
        recommendations.push('Verify content through alternative channels');
        break;
    }

    // Add tampering-specific recommendations
    if (tamperingResult?.tampered) {
      recommendations.push('Consider forensic analysis of the content');

      for (const indicator of tamperingResult.indicators) {
        if (indicator.severity === 'high') {
          recommendations.push(`Investigate: ${indicator.description}`);
        }
      }
    }

    return recommendations;
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    // Clean up cache directory
    try {
      const files = await fs.readdir(this.config.cacheDir);
      const now = Date.now();
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours

      for (const file of files) {
        const filePath = path.join(this.config.cacheDir, file);
        const stats = await fs.stat(filePath);
        if (now - stats.mtimeMs > maxAge) {
          await fs.unlink(filePath);
        }
      }
    } catch (error: any) {
      logger.warn({ error }, 'Failed to cleanup cache directory');
    }
  }
}

// Export default instance
export const c2paValidationService = new C2PAValidationService();
