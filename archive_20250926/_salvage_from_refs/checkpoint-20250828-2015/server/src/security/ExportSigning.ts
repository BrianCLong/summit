import { createSign, createVerify, createHash, randomBytes } from 'crypto';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import * as PDFDocument from 'pdfkit';
import * as archiver from 'archiver';
import { Readable } from 'stream';

interface ExportSignature {
  algorithm: 'RSA-SHA256' | 'ECDSA-SHA256';
  signature: string;
  publicKey: string;
  timestamp: string;
  signer: {
    userId: string;
    tenantId: string;
    name: string;
    email?: string;
  };
  content: {
    hash: string;
    hashAlgorithm: 'SHA-256';
    size: number;
    mimeType: string;
  };
  metadata: {
    exportId: string;
    investigationId?: string;
    caseId?: string;
    reasonForAccess: string;
    exportType: 'investigation' | 'case' | 'entities' | 'audit' | 'report';
    classification?: 'UNCLASSIFIED' | 'CONFIDENTIAL' | 'SECRET' | 'TOP_SECRET';
  };
  verification: {
    verificationUrl: string;
    chainOfCustody: Array<{
      timestamp: string;
      action: string;
      actor: string;
      hash: string;
    }>;
  };
}

interface SigningConfig {
  privateKeyPath: string;
  publicKeyPath: string;
  passphrase?: string;
  keyId: string;
  organization: string;
  baseUrl: string;
}

/**
 * Export Signing Service
 * Provides cryptographic signing for PDF/ZIP exports with embedded verification
 */
export class ExportSigningService {
  private config: SigningConfig;
  private privateKey: string;
  private publicKey: string;

  constructor(config: SigningConfig) {
    this.config = config;
    this.loadKeys();
  }

  /**
   * Load RSA key pair for signing
   */
  private loadKeys(): void {
    try {
      if (!existsSync(this.config.privateKeyPath) || !existsSync(this.config.publicKeyPath)) {
        throw new Error('Signing keys not found. Generate keys first.');
      }

      this.privateKey = readFileSync(this.config.privateKeyPath, 'utf8');
      this.publicKey = readFileSync(this.config.publicKeyPath, 'utf8');
      
      console.log(`Loaded signing keys for keyId: ${this.config.keyId}`);
    } catch (error) {
      console.error('Failed to load signing keys:', error);
      throw new Error('Export signing unavailable - keys not loaded');
    }
  }

  /**
   * Sign PDF export with embedded signature block
   */
  async signPDFExport(
    pdfBuffer: Buffer,
    exportMetadata: Partial<ExportSignature['metadata']>,
    signer: ExportSignature['signer'],
    reasonForAccess: string
  ): Promise<{
    signedPdf: Buffer;
    signature: ExportSignature;
    verificationToken: string;
  }> {
    // Calculate content hash
    const contentHash = createHash('sha256').update(pdfBuffer).digest('hex');
    
    // Create signature metadata
    const exportId = exportMetadata.exportId || this.generateExportId();
    const timestamp = new Date().toISOString();
    
    const signatureData: ExportSignature = {
      algorithm: 'RSA-SHA256',
      signature: '', // Will be filled below
      publicKey: this.publicKey,
      timestamp,
      signer,
      content: {
        hash: contentHash,
        hashAlgorithm: 'SHA-256',
        size: pdfBuffer.length,
        mimeType: 'application/pdf'
      },
      metadata: {
        exportId,
        reasonForAccess,
        exportType: 'report',
        ...exportMetadata
      },
      verification: {
        verificationUrl: `${this.config.baseUrl}/verify/${exportId}`,
        chainOfCustody: [{
          timestamp,
          action: 'export_created',
          actor: signer.userId,
          hash: contentHash
        }]
      }
    };

    // Sign the metadata + content hash
    const signaturePayload = JSON.stringify({
      contentHash,
      timestamp,
      signer: signer.userId,
      exportId,
      reasonForAccess
    });
    
    const sign = createSign('RSA-SHA256');
    sign.update(signaturePayload);
    signatureData.signature = sign.sign({
      key: this.privateKey,
      passphrase: this.config.passphrase
    }, 'base64');

    // Create signed PDF with embedded signature
    const signedPdf = await this.embedSignatureInPDF(pdfBuffer, signatureData);
    
    // Generate verification token
    const verificationToken = this.generateVerificationToken(signatureData);
    
    // Store signature for verification
    await this.storeSignature(exportId, signatureData, verificationToken);

    return {
      signedPdf,
      signature: signatureData,
      verificationToken
    };
  }

  /**
   * Sign ZIP export with signature manifest
   */
  async signZIPExport(
    zipBuffer: Buffer,
    exportMetadata: Partial<ExportSignature['metadata']>,
    signer: ExportSignature['signer'],
    reasonForAccess: string
  ): Promise<{
    signedZip: Buffer;
    signature: ExportSignature;
    verificationToken: string;
  }> {
    // Calculate content hash
    const contentHash = createHash('sha256').update(zipBuffer).digest('hex');
    
    // Create signature metadata
    const exportId = exportMetadata.exportId || this.generateExportId();
    const timestamp = new Date().toISOString();
    
    const signatureData: ExportSignature = {
      algorithm: 'RSA-SHA256',
      signature: '', // Will be filled below
      publicKey: this.publicKey,
      timestamp,
      signer,
      content: {
        hash: contentHash,
        hashAlgorithm: 'SHA-256',
        size: zipBuffer.length,
        mimeType: 'application/zip'
      },
      metadata: {
        exportId,
        reasonForAccess,
        exportType: 'investigation',
        ...exportMetadata
      },
      verification: {
        verificationUrl: `${this.config.baseUrl}/verify/${exportId}`,
        chainOfCustody: [{
          timestamp,
          action: 'export_created',
          actor: signer.userId,
          hash: contentHash
        }]
      }
    };

    // Sign the metadata + content hash
    const signaturePayload = JSON.stringify({
      contentHash,
      timestamp,
      signer: signer.userId,
      exportId,
      reasonForAccess
    });
    
    const sign = createSign('RSA-SHA256');
    sign.update(signaturePayload);
    signatureData.signature = sign.sign({
      key: this.privateKey,
      passphrase: this.config.passphrase
    }, 'base64');

    // Create signed ZIP with signature manifest
    const signedZip = await this.embedSignatureInZIP(zipBuffer, signatureData);
    
    // Generate verification token
    const verificationToken = this.generateVerificationToken(signatureData);
    
    // Store signature for verification
    await this.storeSignature(exportId, signatureData, verificationToken);

    return {
      signedZip,
      signature: signatureData,
      verificationToken
    };
  }

  /**
   * Verify signed export
   */
  async verifyExport(
    exportBuffer: Buffer,
    verificationToken?: string
  ): Promise<{
    valid: boolean;
    signature?: ExportSignature;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Extract signature from export
      const signature = await this.extractSignature(exportBuffer);
      if (!signature) {
        errors.push('No signature found in export');
        return { valid: false, errors, warnings };
      }

      // Verify signature cryptographically
      const signaturePayload = JSON.stringify({
        contentHash: signature.content.hash,
        timestamp: signature.timestamp,
        signer: signature.signer.userId,
        exportId: signature.metadata.exportId,
        reasonForAccess: signature.metadata.reasonForAccess
      });

      const verify = createVerify('RSA-SHA256');
      verify.update(signaturePayload);
      const signatureValid = verify.verify(signature.publicKey, signature.signature, 'base64');

      if (!signatureValid) {
        errors.push('Cryptographic signature verification failed');
      }

      // Verify content hash
      const actualHash = createHash('sha256').update(exportBuffer).digest('hex');
      if (actualHash !== signature.content.hash) {
        errors.push('Content hash mismatch - file may have been modified');
      }

      // Verify timestamp (not too old or in future)
      const signatureTime = new Date(signature.timestamp);
      const now = new Date();
      const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      
      if (signatureTime > now) {
        warnings.push('Signature timestamp is in the future');
      }
      
      if (signatureTime < oneYearAgo) {
        warnings.push('Signature is older than one year');
      }

      // Verify against stored signature if token provided
      if (verificationToken) {
        const storedSignature = await this.retrieveStoredSignature(signature.metadata.exportId, verificationToken);
        if (!storedSignature) {
          warnings.push('Signature not found in verification database');
        } else if (JSON.stringify(storedSignature) !== JSON.stringify(signature)) {
          errors.push('Signature does not match stored verification record');
        }
      }

      return {
        valid: errors.length === 0,
        signature,
        errors,
        warnings
      };

    } catch (error) {
      errors.push(`Verification error: ${error.message}`);
      return { valid: false, errors, warnings };
    }
  }

  /**
   * Embed signature block in PDF
   */
  private async embedSignatureInPDF(
    pdfBuffer: Buffer, 
    signature: ExportSignature
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        // Create new PDF with signature page
        const doc = new PDFDocument({ margin: 50 });
        const buffers: Buffer[] = [];
        
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
          resolve(Buffer.concat(buffers));
        });

        // Add signature page at the end
        doc.addPage();
        doc.fontSize(16).font('Helvetica-Bold');
        doc.text('🔒 CRYPTOGRAPHIC SIGNATURE', 50, 50);
        
        doc.moveDown(2);
        doc.fontSize(12).font('Helvetica');
        
        // Export information
        doc.text(`Export ID: ${signature.metadata.exportId}`);
        doc.text(`Timestamp: ${signature.timestamp}`);
        doc.text(`Signer: ${signature.signer.name} (${signature.signer.userId})`);
        doc.text(`Organization: ${this.config.organization}`);
        doc.text(`Reason: ${signature.metadata.reasonForAccess}`);
        
        doc.moveDown();
        
        // Content verification
        doc.text('Content Verification:');
        doc.fontSize(10).font('Courier');
        doc.text(`SHA-256: ${signature.content.hash}`);
        doc.text(`Size: ${signature.content.size} bytes`);
        doc.text(`Type: ${signature.content.mimeType}`);
        
        doc.moveDown();
        doc.fontSize(12).font('Helvetica');
        
        // Verification instructions
        doc.text('Verification:');
        doc.fontSize(10);
        doc.text(`Visit: ${signature.verification.verificationUrl}`);
        doc.text(`Or verify locally using IntelGraph CLI tools`);
        
        doc.moveDown();
        
        // Signature block
        doc.fontSize(8).font('Courier');
        doc.text('Digital Signature (RSA-SHA256):');
        
        // Break signature into lines for readability
        const signatureLines = signature.signature.match(/.{1,80}/g) || [];
        signatureLines.forEach(line => {
          doc.text(line);
        });

        // Add original PDF pages
        // Note: In a real implementation, you'd use a PDF library that can merge pages
        // For now, we'll add a note about the original content
        doc.addPage();
        doc.fontSize(12).font('Helvetica');
        doc.text('Original Export Content Follows');
        doc.text('(In production, original PDF pages would be embedded here)');
        
        doc.end();

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Embed signature manifest in ZIP
   */
  private async embedSignatureInZIP(
    zipBuffer: Buffer, 
    signature: ExportSignature
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const output = new Readable({ read() {} });
      const archive = archiver('zip', { zlib: { level: 9 } });
      const buffers: Buffer[] = [];

      output.on('data', (chunk) => buffers.push(chunk));
      output.on('end', () => resolve(Buffer.concat(buffers)));
      
      archive.on('error', reject);
      archive.pipe(output);

      // Add original ZIP content
      archive.append(zipBuffer, { name: 'original_export.zip' });
      
      // Add signature manifest
      const manifest = {
        version: '1.0',
        signature,
        verification_instructions: {
          cli: 'intelgraph verify-export <file>',
          web: signature.verification.verificationUrl,
          api: `${this.config.baseUrl}/api/verify/${signature.metadata.exportId}`
        },
        public_key: signature.publicKey,
        created_by: 'IntelGraph Export Signing Service'
      };
      
      archive.append(
        JSON.stringify(manifest, null, 2), 
        { name: 'SIGNATURE_MANIFEST.json' }
      );
      
      // Add human-readable verification file
      const readmeContent = `
CRYPTOGRAPHICALLY SIGNED EXPORT

Export ID: ${signature.metadata.exportId}
Timestamp: ${signature.timestamp}
Signer: ${signature.signer.name} (${signature.signer.userId})
Organization: ${this.config.organization}
Reason: ${signature.metadata.reasonForAccess}

CONTENT VERIFICATION:
SHA-256: ${signature.content.hash}
Size: ${signature.content.size} bytes
Type: ${signature.content.mimeType}

VERIFICATION:
Visit: ${signature.verification.verificationUrl}
Or use: intelgraph verify-export <this-file>

This export has been cryptographically signed to ensure integrity
and authenticity. Any modification to the contents will invalidate
the signature.

CHAIN OF CUSTODY:
${signature.verification.chainOfCustody.map(entry => 
  `${entry.timestamp} - ${entry.action} by ${entry.actor} (${entry.hash.substring(0, 8)}...)`
).join('\n')}
`.trim();

      archive.append(readmeContent, { name: 'README_SIGNATURE.txt' });
      
      archive.finalize();
    });
  }

  /**
   * Extract signature from signed export
   */
  private async extractSignature(exportBuffer: Buffer): Promise<ExportSignature | null> {
    const bufferStr = exportBuffer.toString('utf8');
    
    // Try to find signature in various formats
    // For PDF: Look for signature page content
    if (bufferStr.includes('CRYPTOGRAPHIC SIGNATURE')) {
      // Extract signature from PDF (simplified - would need proper PDF parsing)
      const match = bufferStr.match(/Export ID: ([^\n]+)/);
      if (match) {
        // In production, properly parse PDF and extract signature
        // For now, return null to indicate signature extraction not implemented
        return null;
      }
    }
    
    // For ZIP: Look for signature manifest
    if (bufferStr.includes('SIGNATURE_MANIFEST.json')) {
      try {
        // Extract manifest from ZIP (simplified - would need proper ZIP parsing)
        const manifestMatch = bufferStr.match(/{"version":"1\.0","signature":{.*?}}/);
        if (manifestMatch) {
          const manifest = JSON.parse(manifestMatch[0]);
          return manifest.signature;
        }
      } catch (error) {
        console.error('Failed to extract signature from ZIP:', error);
      }
    }
    
    return null;
  }

  /**
   * Generate unique export ID
   */
  private generateExportId(): string {
    const timestamp = Date.now();
    const random = randomBytes(8).toString('hex');
    return `export_${timestamp}_${random}`;
  }

  /**
   * Generate verification token
   */
  private generateVerificationToken(signature: ExportSignature): string {
    const payload = `${signature.metadata.exportId}-${signature.timestamp}-${signature.content.hash}`;
    return createHash('sha256').update(payload).digest('hex').substring(0, 32);
  }

  /**
   * Store signature for verification (in production: use secure database)
   */
  private async storeSignature(
    exportId: string, 
    signature: ExportSignature, 
    verificationToken: string
  ): Promise<void> {
    // In production, store in secure database with proper indexing
    // For now, store in file system (not recommended for production)
    const storePath = join(process.env.SIGNATURE_STORE || '/tmp/signatures', `${exportId}.json`);
    
    const record = {
      exportId,
      signature,
      verificationToken,
      createdAt: new Date().toISOString(),
      accessed: []
    };
    
    try {
      writeFileSync(storePath, JSON.stringify(record, null, 2));
      console.log(`Stored signature for export ${exportId}`);
    } catch (error) {
      console.error(`Failed to store signature for ${exportId}:`, error);
    }
  }

  /**
   * Retrieve stored signature for verification
   */
  private async retrieveStoredSignature(
    exportId: string, 
    verificationToken: string
  ): Promise<ExportSignature | null> {
    try {
      const storePath = join(process.env.SIGNATURE_STORE || '/tmp/signatures', `${exportId}.json`);
      
      if (!existsSync(storePath)) {
        return null;
      }
      
      const record = JSON.parse(readFileSync(storePath, 'utf8'));
      
      if (record.verificationToken !== verificationToken) {
        console.warn(`Invalid verification token for export ${exportId}`);
        return null;
      }
      
      // Log access
      record.accessed.push(new Date().toISOString());
      writeFileSync(storePath, JSON.stringify(record, null, 2));
      
      return record.signature;
      
    } catch (error) {
      console.error(`Failed to retrieve signature for ${exportId}:`, error);
      return null;
    }
  }

  /**
   * Generate RSA key pair for signing (utility method)
   */
  static generateKeyPair(keySize = 2048): {
    privateKey: string;
    publicKey: string;
  } {
    const { generateKeyPairSync } = require('crypto');
    
    const { privateKey, publicKey } = generateKeyPairSync('rsa', {
      modulusLength: keySize,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem'
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem'
      }
    });

    return { privateKey, publicKey };
  }
}

export { ExportSigningService, ExportSignature, SigningConfig };