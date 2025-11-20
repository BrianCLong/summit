import { BaseExtractor, ExtractionResult, ExtractorConfig } from '@intelgraph/metadata-extractor';
import { ArchiveMetadata, DocumentExtractionResult } from './types.js';
import JSZip from 'jszip';
import crypto from 'crypto';

/**
 * Extractor for archive files (.zip, .rar, .7z, etc.)
 */
export class ArchiveExtractor extends BaseExtractor {
  readonly name = 'archive-extractor';
  readonly supportedTypes = [
    'application/zip',
    'application/x-zip-compressed',
    'application/x-rar-compressed',
    'application/x-7z-compressed',
    'application/x-tar',
    'application/gzip',
    'application/x-bzip2',
  ];

  canExtract(file: string | Buffer, mimeType?: string): boolean {
    if (mimeType && this.supportedTypes.includes(mimeType)) {
      return true;
    }

    // Check magic bytes
    const buffer = Buffer.isBuffer(file) ? file : Buffer.from(file);
    const header = buffer.slice(0, 4).toString('hex');

    // ZIP: 504B0304, RAR: 52617221, 7z: 377ABCAF, GZIP: 1F8B
    return (
      header === '504b0304' || // ZIP
      header.startsWith('52617221') || // RAR
      header === '377abcaf' || // 7z
      header.startsWith('1f8b') // GZIP
    );
  }

  protected async extractInternal(
    file: string | Buffer,
    config: ExtractorConfig
  ): Promise<Partial<DocumentExtractionResult>> {
    const buffer = Buffer.isBuffer(file) ? file : Buffer.from(file);

    // Detect archive type
    const archiveType = this.detectArchiveType(buffer);

    if (archiveType === 'zip') {
      return this.extractZipMetadata(buffer, config);
    }

    // For other archive types, return basic metadata
    return this.extractBasicArchiveMetadata(buffer, archiveType);
  }

  private detectArchiveType(buffer: Buffer): ArchiveMetadata['type'] {
    const header = buffer.slice(0, 4).toString('hex');

    if (header === '504b0304') return 'zip';
    if (header.startsWith('52617221')) return 'rar';
    if (header === '377abcaf') return '7z';
    if (header.startsWith('1f8b')) return 'gzip';
    if (header.startsWith('425a68')) return 'bzip2';

    return 'zip'; // default
  }

  private async extractZipMetadata(
    buffer: Buffer,
    config: ExtractorConfig
  ): Promise<Partial<DocumentExtractionResult>> {
    const zip = await JSZip.loadAsync(buffer);

    const files: ArchiveMetadata['files'] = [];
    let totalSize = 0;
    let totalCompressedSize = 0;
    let hasEncrypted = false;

    for (const [path, file] of Object.entries(zip.files)) {
      if (file.dir) continue;

      const metadata = file as any;
      const size = metadata._data?.uncompressedSize || 0;
      const compressedSize = metadata._data?.compressedSize || 0;

      totalSize += size;
      totalCompressedSize += compressedSize;

      // Check if file is encrypted
      const encrypted = !!(metadata._data?.generalPurposeBitFlag & 0x0001);
      if (encrypted) hasEncrypted = true;

      files.push({
        path,
        size,
        compressedSize,
        crc32: metadata.crc32 ? metadata.crc32.toString(16) : undefined,
        modified: file.date,
        encrypted,
      });
    }

    const compressionRatio = totalSize > 0 ? totalCompressedSize / totalSize : undefined;

    const archiveMetadata: ArchiveMetadata = {
      type: 'zip',
      encrypted: hasEncrypted,
      compressed: true,
      compressionMethod: 'deflate',
      compressionRatio,
      files,
      totalSize,
      totalCompressedSize,
      comment: (zip as any).comment || undefined,
    };

    // Detect suspicious patterns
    const anomalies: ExtractionResult['anomalies'] = [];

    // Check for zip bombs (high compression ratio)
    if (compressionRatio && compressionRatio < 0.01 && totalSize > 10 * 1024 * 1024) {
      anomalies.push({
        type: 'zip_bomb_detected',
        severity: 'critical',
        description: 'Extremely high compression ratio detected - possible zip bomb',
        evidence: { compressionRatio, totalSize, totalCompressedSize },
      });
    }

    // Check for path traversal
    const pathTraversal = files.some(f => f.path.includes('..'));
    if (pathTraversal) {
      anomalies.push({
        type: 'path_traversal_detected',
        severity: 'high',
        description: 'Archive contains path traversal sequences',
        evidence: { files: files.filter(f => f.path.includes('..')).map(f => f.path) },
      });
    }

    // Find oldest and newest files for temporal metadata
    const dates = files
      .map(f => f.modified)
      .filter((d): d is Date => d !== undefined);

    const created = dates.length > 0 ? new Date(Math.min(...dates.map(d => d.getTime()))) : undefined;
    const modified = dates.length > 0 ? new Date(Math.max(...dates.map(d => d.getTime()))) : undefined;

    return {
      base: {
        extractedAt: new Date(),
        extractorVersion: this.name,
        sourceType: 'archive',
        confidence: 1.0,
      },
      temporal: {
        created,
        modified,
      },
      document: {
        archive: archiveMetadata,
      },
      anomalies: anomalies.length > 0 ? anomalies : undefined,
    };
  }

  private async extractBasicArchiveMetadata(
    buffer: Buffer,
    type: ArchiveMetadata['type']
  ): Promise<Partial<DocumentExtractionResult>> {
    const archiveMetadata: ArchiveMetadata = {
      type,
      encrypted: false,
      compressed: true,
      files: [],
      totalSize: buffer.length,
      totalCompressedSize: buffer.length,
    };

    return {
      base: {
        extractedAt: new Date(),
        extractorVersion: this.name,
        sourceType: 'archive',
        confidence: 0.5,
      },
      document: {
        archive: archiveMetadata,
      },
    };
  }
}
