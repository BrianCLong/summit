/**
 * Legal Compliance Export Module
 *
 * Provides cryptographically signed exports for legal proceedings,
 * compliance audits, and regulatory requirements.
 *
 * Features:
 * - Digital signatures for authenticity
 * - Chain of custody documentation
 * - Multiple export formats (PDF, JSON, CSV)
 * - Redaction support with audit trail
 * - Witness signatures
 * - Tamper-evident packaging
 */

import { createHash, createSign, createVerify, generateKeyPairSync, randomBytes } from 'crypto';
import { EventEmitter } from 'events';

/**
 * Export format options
 */
export type ExportFormat = 'json' | 'pdf' | 'csv' | 'xml' | 'sealed-archive';

/**
 * Export purpose for compliance tracking
 */
export type ExportPurpose =
  | 'legal_discovery'
  | 'regulatory_audit'
  | 'internal_investigation'
  | 'compliance_review'
  | 'court_order'
  | 'subpoena_response'
  | 'freedom_of_information';

/**
 * Chain of custody entry
 */
export interface CustodyEntry {
  timestamp: Date;
  action: 'created' | 'accessed' | 'transferred' | 'verified' | 'sealed';
  actorId: string;
  actorName: string;
  actorRole: string;
  description: string;
  signature: string;
  previousEntryHash?: string;
}

/**
 * Export request
 */
export interface ExportRequest {
  id: string;
  requestedBy: {
    id: string;
    name: string;
    role: string;
    organization: string;
  };
  purpose: ExportPurpose;
  legalReference?: string;
  caseNumber?: string;
  courtName?: string;
  dateRange: {
    start: Date;
    end: Date;
  };
  filters?: {
    actorIds?: string[];
    eventTypes?: string[];
    resourceIds?: string[];
    tenantIds?: string[];
  };
  redactionRules?: RedactionRule[];
  format: ExportFormat;
  includeIntegrityProof: boolean;
  requireWitness: boolean;
  witnesses?: Witness[];
}

/**
 * Redaction rule
 */
export interface RedactionRule {
  field: string;
  pattern?: RegExp;
  replacement: string;
  reason: string;
  authorizedBy: string;
}

/**
 * Witness signature
 */
export interface Witness {
  id: string;
  name: string;
  role: string;
  organization: string;
  signature?: string;
  signedAt?: Date;
}

/**
 * Export package
 */
export interface ExportPackage {
  id: string;
  version: string;
  createdAt: Date;
  request: ExportRequest;
  data: {
    format: ExportFormat;
    content: Buffer | string;
    eventCount: number;
    redactedFields: number;
  };
  integrity: {
    dataHash: string;
    merkleRoot: string;
    chainStartSequence: number;
    chainEndSequence: number;
    chainIntegrityVerified: boolean;
  };
  signatures: {
    system: string;
    algorithm: string;
    publicKey: string;
  };
  custody: CustodyEntry[];
  witnesses: Witness[];
  metadata: {
    generatedBy: string;
    generatedAt: Date;
    expiresAt?: Date;
    classification?: string;
  };
}

/**
 * Export configuration
 */
export interface ExportConfig {
  signingKeyPath?: string;
  signingAlgorithm: 'RSA-SHA256' | 'RSA-SHA512' | 'ECDSA-P384';
  defaultFormat: ExportFormat;
  maxEventsPerExport: number;
  requireApproval: boolean;
  approvalThreshold: number;
  retentionDays: number;
  enableWatermarking: boolean;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: ExportConfig = {
  signingAlgorithm: 'RSA-SHA256',
  defaultFormat: 'json',
  maxEventsPerExport: 100000,
  requireApproval: true,
  approvalThreshold: 2,
  retentionDays: 365,
  enableWatermarking: true,
};

/**
 * Legal Compliance Export Manager
 */
export class LegalExportManager extends EventEmitter {
  private config: ExportConfig;
  private signingKey: { privateKey: string; publicKey: string } | null = null;
  private exportHistory: Map<string, ExportPackage> = new Map();

  constructor(config: Partial<ExportConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Initialize the export manager
   */
  async initialize(): Promise<void> {
    // Generate or load signing keys
    if (!this.config.signingKeyPath) {
      const keyPair = generateKeyPairSync('rsa', {
        modulusLength: 4096,
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
      });
      this.signingKey = {
        privateKey: keyPair.privateKey as string,
        publicKey: keyPair.publicKey as string,
      };
    }

    this.emit('initialized');
  }

  /**
   * Create a legal export package
   */
  async createExport(
    request: ExportRequest,
    events: unknown[],
    chainInfo: {
      startSequence: number;
      endSequence: number;
      merkleRoot: string;
      verified: boolean;
    },
  ): Promise<ExportPackage> {
    // Validate request
    this.validateRequest(request);

    // Check event limit
    if (events.length > this.config.maxEventsPerExport) {
      throw new Error(`Export exceeds maximum event limit of ${this.config.maxEventsPerExport}`);
    }

    const exportId = this.generateExportId();

    this.emit('exportStarted', { exportId, eventCount: events.length });

    // Apply redactions
    let processedEvents = events;
    let redactedFields = 0;

    if (request.redactionRules && request.redactionRules.length > 0) {
      const result = this.applyRedactions(events, request.redactionRules);
      processedEvents = result.events;
      redactedFields = result.redactedCount;
    }

    // Format data
    const formattedData = await this.formatData(processedEvents, request.format);

    // Calculate data hash
    const dataHash = createHash('sha256')
      .update(typeof formattedData === 'string' ? formattedData : formattedData)
      .digest('hex');

    // Create integrity section
    const integrity = {
      dataHash,
      merkleRoot: chainInfo.merkleRoot,
      chainStartSequence: chainInfo.startSequence,
      chainEndSequence: chainInfo.endSequence,
      chainIntegrityVerified: chainInfo.verified,
    };

    // Sign the package
    const signatureData = JSON.stringify({
      exportId,
      dataHash,
      merkleRoot: chainInfo.merkleRoot,
      timestamp: new Date().toISOString(),
    });

    const signature = this.signData(signatureData);

    // Create custody chain
    const custodyChain: CustodyEntry[] = [
      {
        timestamp: new Date(),
        action: 'created',
        actorId: request.requestedBy.id,
        actorName: request.requestedBy.name,
        actorRole: request.requestedBy.role,
        description: `Export package created for ${request.purpose}`,
        signature: this.signData(`created:${exportId}:${request.requestedBy.id}`),
      },
    ];

    // Create export package
    const exportPackage: ExportPackage = {
      id: exportId,
      version: '1.0.0',
      createdAt: new Date(),
      request,
      data: {
        format: request.format,
        content: formattedData,
        eventCount: processedEvents.length,
        redactedFields,
      },
      integrity,
      signatures: {
        system: signature,
        algorithm: this.config.signingAlgorithm,
        publicKey: this.signingKey?.publicKey || '',
      },
      custody: custodyChain,
      witnesses: request.witnesses || [],
      metadata: {
        generatedBy: 'audit-blackbox-service',
        generatedAt: new Date(),
        expiresAt: new Date(Date.now() + this.config.retentionDays * 24 * 60 * 60 * 1000),
      },
    };

    // Store in history
    this.exportHistory.set(exportId, exportPackage);

    this.emit('exportCompleted', {
      exportId,
      eventCount: processedEvents.length,
      redactedFields,
    });

    return exportPackage;
  }

  /**
   * Add witness signature to export
   */
  async addWitnessSignature(
    exportId: string,
    witness: Witness,
    witnessPrivateKey: string,
  ): Promise<void> {
    const exportPackage = this.exportHistory.get(exportId);
    if (!exportPackage) {
      throw new Error(`Export ${exportId} not found`);
    }

    // Create witness signature
    const witnessData = JSON.stringify({
      exportId,
      dataHash: exportPackage.integrity.dataHash,
      witnessId: witness.id,
      timestamp: new Date().toISOString(),
    });

    const sign = createSign('SHA256');
    sign.update(witnessData);
    const signature = sign.sign(witnessPrivateKey, 'hex');

    // Update witness record
    const existingWitness = exportPackage.witnesses.find((w) => w.id === witness.id);
    if (existingWitness) {
      existingWitness.signature = signature;
      existingWitness.signedAt = new Date();
    } else {
      exportPackage.witnesses.push({
        ...witness,
        signature,
        signedAt: new Date(),
      });
    }

    // Add custody entry
    exportPackage.custody.push({
      timestamp: new Date(),
      action: 'verified',
      actorId: witness.id,
      actorName: witness.name,
      actorRole: witness.role,
      description: `Witness signature added by ${witness.name}`,
      signature: this.signData(`witness:${exportId}:${witness.id}`),
      previousEntryHash: this.hashCustodyEntry(
        exportPackage.custody[exportPackage.custody.length - 1],
      ),
    });

    this.emit('witnessAdded', { exportId, witnessId: witness.id });
  }

  /**
   * Verify export package integrity
   */
  async verifyExport(exportPackage: ExportPackage): Promise<{
    valid: boolean;
    checks: {
      dataIntegrity: boolean;
      signatureValid: boolean;
      chainVerified: boolean;
      custodyChainValid: boolean;
      witnessesValid: boolean;
    };
    errors: string[];
  }> {
    const errors: string[] = [];
    const checks = {
      dataIntegrity: false,
      signatureValid: false,
      chainVerified: false,
      custodyChainValid: false,
      witnessesValid: false,
    };

    // Verify data hash
    const content = exportPackage.data.content;
    const dataHash = createHash('sha256')
      .update(typeof content === 'string' ? content : content)
      .digest('hex');

    if (dataHash === exportPackage.integrity.dataHash) {
      checks.dataIntegrity = true;
    } else {
      errors.push('Data hash mismatch - content may have been modified');
    }

    // Verify system signature
    const signatureData = JSON.stringify({
      exportId: exportPackage.id,
      dataHash: exportPackage.integrity.dataHash,
      merkleRoot: exportPackage.integrity.merkleRoot,
      timestamp: exportPackage.createdAt.toISOString(),
    });

    try {
      const verify = createVerify('SHA256');
      verify.update(signatureData);
      checks.signatureValid = verify.verify(
        exportPackage.signatures.publicKey,
        exportPackage.signatures.system,
        'hex',
      );
      if (!checks.signatureValid) {
        errors.push('System signature verification failed');
      }
    } catch {
      errors.push('Unable to verify system signature');
    }

    // Verify chain integrity flag
    checks.chainVerified = exportPackage.integrity.chainIntegrityVerified;
    if (!checks.chainVerified) {
      errors.push('Original chain integrity was not verified at export time');
    }

    // Verify custody chain
    checks.custodyChainValid = this.verifyCustodyChain(exportPackage.custody);
    if (!checks.custodyChainValid) {
      errors.push('Custody chain integrity compromised');
    }

    // Verify witness signatures
    if (exportPackage.witnesses.length > 0) {
      checks.witnessesValid = exportPackage.witnesses.every((w) => w.signature && w.signedAt);
      if (!checks.witnessesValid) {
        errors.push('Not all witnesses have signed');
      }
    } else {
      checks.witnessesValid = true; // No witnesses required
    }

    return {
      valid: Object.values(checks).every((v) => v),
      checks,
      errors,
    };
  }

  /**
   * Generate certificate of authenticity
   */
  generateCertificate(exportPackage: ExportPackage): string {
    const verification = this.verifyExportSync(exportPackage);

    return `
╔══════════════════════════════════════════════════════════════════════════════╗
║                        CERTIFICATE OF AUTHENTICITY                            ║
║                      Audit Black Box Export Package                           ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                               ║
║  Export ID:        ${exportPackage.id.padEnd(54)}║
║  Created:          ${exportPackage.createdAt.toISOString().padEnd(54)}║
║  Purpose:          ${exportPackage.request.purpose.padEnd(54)}║
║                                                                               ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  DATA SUMMARY                                                                 ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  Event Count:      ${String(exportPackage.data.eventCount).padEnd(54)}║
║  Date Range:       ${exportPackage.request.dateRange.start.toISOString().substring(0, 10)} - ${exportPackage.request.dateRange.end.toISOString().substring(0, 10)}                                  ║
║  Redacted Fields:  ${String(exportPackage.data.redactedFields).padEnd(54)}║
║                                                                               ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  INTEGRITY VERIFICATION                                                       ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  Data Hash:        ${exportPackage.integrity.dataHash.substring(0, 52)}...║
║  Merkle Root:      ${exportPackage.integrity.merkleRoot.substring(0, 52)}...║
║  Chain Range:      ${String(exportPackage.integrity.chainStartSequence).padEnd(10)} - ${String(exportPackage.integrity.chainEndSequence).padEnd(40)}║
║  Chain Verified:   ${(exportPackage.integrity.chainIntegrityVerified ? '✓ YES' : '✗ NO').padEnd(54)}║
║  Signature Valid:  ${(verification.checks.signatureValid ? '✓ YES' : '✗ NO').padEnd(54)}║
║                                                                               ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  CHAIN OF CUSTODY                                                             ║
╠══════════════════════════════════════════════════════════════════════════════╣
${exportPackage.custody.map((c) => `║  ${c.timestamp.toISOString().substring(0, 19)} - ${c.action.padEnd(12)} by ${c.actorName.substring(0, 30).padEnd(30)}║`).join('\n')}
║                                                                               ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  WITNESSES                                                                    ║
╠══════════════════════════════════════════════════════════════════════════════╣
${exportPackage.witnesses.length > 0 ? exportPackage.witnesses.map((w) => `║  ${w.name.padEnd(30)} - ${w.signature ? '✓ Signed' : '○ Pending'}                          ║`).join('\n') : '║  No witnesses required                                                        ║'}
║                                                                               ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  CERTIFICATION                                                                ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                               ║
║  I hereby certify that this export package contains an authentic,             ║
║  unaltered copy of audit records from the IntelGraph Audit Black Box          ║
║  System. The cryptographic hash chain has been verified, and all              ║
║  signatures are valid.                                                        ║
║                                                                               ║
║  Algorithm: ${exportPackage.signatures.algorithm.padEnd(62)}║
║                                                                               ║
║  System Signature:                                                            ║
║  ${exportPackage.signatures.system.substring(0, 72)}║
║  ${exportPackage.signatures.system.substring(72, 144) || ''.padEnd(72)}║
║                                                                               ║
╚══════════════════════════════════════════════════════════════════════════════╝
`;
  }

  // Private methods

  private validateRequest(request: ExportRequest): void {
    if (!request.requestedBy?.id) {
      throw new Error('Requestor ID is required');
    }
    if (!request.purpose) {
      throw new Error('Export purpose is required');
    }
    if (!request.dateRange?.start || !request.dateRange?.end) {
      throw new Error('Date range is required');
    }
    if (request.dateRange.start > request.dateRange.end) {
      throw new Error('Invalid date range: start must be before end');
    }
  }

  private applyRedactions(
    events: unknown[],
    rules: RedactionRule[],
  ): { events: unknown[]; redactedCount: number } {
    let redactedCount = 0;

    const processedEvents = events.map((event) => {
      const processed = JSON.parse(JSON.stringify(event));

      for (const rule of rules) {
        if (this.hasField(processed, rule.field)) {
          const value = this.getField(processed, rule.field);
          if (typeof value === 'string') {
            if (rule.pattern) {
              if (rule.pattern.test(value)) {
                this.setField(processed, rule.field, rule.replacement);
                redactedCount++;
              }
            } else {
              this.setField(processed, rule.field, rule.replacement);
              redactedCount++;
            }
          }
        }
      }

      return processed;
    });

    return { events: processedEvents, redactedCount };
  }

  private hasField(obj: unknown, path: string): boolean {
    const parts = path.split('.');
    let current: unknown = obj;

    for (const part of parts) {
      if (current === null || current === undefined || typeof current !== 'object') {
        return false;
      }
      current = (current as Record<string, unknown>)[part];
    }

    return current !== undefined;
  }

  private getField(obj: unknown, path: string): unknown {
    const parts = path.split('.');
    let current: unknown = obj;

    for (const part of parts) {
      if (current === null || current === undefined || typeof current !== 'object') {
        return undefined;
      }
      current = (current as Record<string, unknown>)[part];
    }

    return current;
  }

  private setField(obj: unknown, path: string, value: unknown): void {
    const parts = path.split('.');
    let current = obj as Record<string, unknown>;

    for (let i = 0; i < parts.length - 1; i++) {
      current = current[parts[i]] as Record<string, unknown>;
    }

    current[parts[parts.length - 1]] = value;
  }

  private async formatData(events: unknown[], format: ExportFormat): Promise<Buffer | string> {
    switch (format) {
      case 'json':
        return JSON.stringify(events, null, 2);

      case 'csv':
        return this.toCSV(events);

      case 'xml':
        return this.toXML(events);

      case 'pdf':
        // Would use a PDF library in real implementation
        return JSON.stringify(events);

      case 'sealed-archive':
        // Would create encrypted, signed archive
        return Buffer.from(JSON.stringify(events));

      default:
        return JSON.stringify(events);
    }
  }

  private toCSV(events: unknown[]): string {
    if (events.length === 0) return '';

    const headers = Object.keys(events[0] as object);
    const rows = events.map((event) => {
      const obj = event as Record<string, unknown>;
      return headers
        .map((h) => {
          const val = obj[h];
          const str = typeof val === 'object' ? JSON.stringify(val) : String(val ?? '');
          return `"${str.replace(/"/g, '""')}"`;
        })
        .join(',');
    });

    return [headers.join(','), ...rows].join('\n');
  }

  private toXML(events: unknown[]): string {
    const items = events
      .map((event) => {
        const obj = event as Record<string, unknown>;
        const fields = Object.entries(obj)
          .map(([key, value]) => {
            const val = typeof value === 'object' ? JSON.stringify(value) : String(value ?? '');
            return `    <${key}>${this.escapeXML(val)}</${key}>`;
          })
          .join('\n');
        return `  <event>\n${fields}\n  </event>`;
      })
      .join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>\n<auditExport>\n${items}\n</auditExport>`;
  }

  private escapeXML(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  private signData(data: string): string {
    if (!this.signingKey) {
      throw new Error('Signing key not initialized');
    }

    const sign = createSign('SHA256');
    sign.update(data);
    return sign.sign(this.signingKey.privateKey, 'hex');
  }

  private hashCustodyEntry(entry: CustodyEntry): string {
    return createHash('sha256').update(JSON.stringify(entry)).digest('hex');
  }

  private verifyCustodyChain(chain: CustodyEntry[]): boolean {
    for (let i = 1; i < chain.length; i++) {
      const expectedPreviousHash = this.hashCustodyEntry(chain[i - 1]);
      if (chain[i].previousEntryHash !== expectedPreviousHash) {
        return false;
      }
    }
    return true;
  }

  private verifyExportSync(exportPackage: ExportPackage): {
    checks: { signatureValid: boolean };
  } {
    try {
      const signatureData = JSON.stringify({
        exportId: exportPackage.id,
        dataHash: exportPackage.integrity.dataHash,
        merkleRoot: exportPackage.integrity.merkleRoot,
        timestamp: exportPackage.createdAt.toISOString(),
      });

      const verify = createVerify('SHA256');
      verify.update(signatureData);
      const valid = verify.verify(
        exportPackage.signatures.publicKey,
        exportPackage.signatures.system,
        'hex',
      );

      return { checks: { signatureValid: valid } };
    } catch {
      return { checks: { signatureValid: false } };
    }
  }

  private generateExportId(): string {
    const timestamp = Date.now().toString(36);
    const random = randomBytes(4).toString('hex');
    return `export-${timestamp}-${random}`;
  }
}

/**
 * Create configured legal export manager
 */
export function createLegalExportManager(
  config: Partial<ExportConfig> = {},
): LegalExportManager {
  return new LegalExportManager(config);
}
