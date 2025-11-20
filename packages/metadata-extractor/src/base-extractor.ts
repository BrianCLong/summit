import { IMetadataExtractor, ExtractionResult, ExtractorConfig } from './types.js';
import crypto from 'crypto';

/**
 * Base extractor class with common functionality
 */
export abstract class BaseExtractor implements IMetadataExtractor {
  abstract readonly name: string;
  abstract readonly supportedTypes: string[];

  abstract canExtract(file: string | Buffer, mimeType?: string): boolean;
  protected abstract extractInternal(file: string | Buffer, config: ExtractorConfig): Promise<Partial<ExtractionResult>>;

  async extract(file: string | Buffer, config?: Partial<ExtractorConfig>): Promise<ExtractionResult> {
    const fullConfig: ExtractorConfig = {
      deepScan: false,
      extractDeleted: false,
      extractHidden: true,
      extractEmbedded: true,
      detectSteganography: false,
      detectTampering: true,
      generateHashes: true,
      enrichFromExternal: false,
      maxFileSize: 100 * 1024 * 1024,
      timeout: 30000,
      ...config,
    };

    // Set timeout
    const extractPromise = this.extractInternal(file, fullConfig);
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Extraction timeout')), fullConfig.timeout)
    );

    const result = await Promise.race([extractPromise, timeoutPromise]);

    // Add base metadata
    const id = this.generateId(file);

    return {
      id,
      base: {
        extractedAt: new Date(),
        extractorVersion: this.name,
        sourceType: this.name,
        confidence: 1.0,
      },
      hash: fullConfig.generateHashes ? await this.generateHashes(file) : undefined,
      ...result,
    };
  }

  protected generateId(file: string | Buffer): string {
    const hash = crypto.createHash('sha256');
    if (Buffer.isBuffer(file)) {
      hash.update(file);
    } else {
      hash.update(file);
    }
    return hash.digest('hex').substring(0, 16);
  }

  protected async generateHashes(file: string | Buffer): Promise<ExtractionResult['hash']> {
    const buffer = Buffer.isBuffer(file) ? file : Buffer.from(file);

    return {
      md5: crypto.createHash('md5').update(buffer).digest('hex'),
      sha1: crypto.createHash('sha1').update(buffer).digest('hex'),
      sha256: crypto.createHash('sha256').update(buffer).digest('hex'),
      sha512: crypto.createHash('sha512').update(buffer).digest('hex'),
      fileSize: buffer.length,
    };
  }

  protected detectTampering(metadata: any): ExtractionResult['anomalies'] {
    const anomalies: ExtractionResult['anomalies'] = [];

    // Check for timestamp inconsistencies
    if (metadata.temporal) {
      const { created, modified, accessed } = metadata.temporal;
      if (created && modified && modified < created) {
        anomalies.push({
          type: 'temporal_anomaly',
          severity: 'high',
          description: 'Modified date is before creation date',
          evidence: { created, modified },
        });
      }
      if (accessed && created && accessed < created) {
        anomalies.push({
          type: 'temporal_anomaly',
          severity: 'medium',
          description: 'Access date is before creation date',
          evidence: { created, accessed },
        });
      }
    }

    return anomalies.length > 0 ? anomalies : undefined;
  }
}

/**
 * Registry for managing extractors
 */
export class ExtractorRegistry {
  private extractors: Map<string, IMetadataExtractor> = new Map();

  register(extractor: IMetadataExtractor): void {
    this.extractors.set(extractor.name, extractor);
  }

  unregister(name: string): void {
    this.extractors.delete(name);
  }

  getExtractor(name: string): IMetadataExtractor | undefined {
    return this.extractors.get(name);
  }

  findExtractor(file: string | Buffer, mimeType?: string): IMetadataExtractor | undefined {
    for (const extractor of this.extractors.values()) {
      if (extractor.canExtract(file, mimeType)) {
        return extractor;
      }
    }
    return undefined;
  }

  getAllExtractors(): IMetadataExtractor[] {
    return Array.from(this.extractors.values());
  }

  async extractAll(file: string | Buffer, mimeType?: string, config?: Partial<ExtractorConfig>): Promise<ExtractionResult[]> {
    const results: ExtractionResult[] = [];

    for (const extractor of this.extractors.values()) {
      if (extractor.canExtract(file, mimeType)) {
        try {
          const result = await extractor.extract(file, config);
          results.push(result);
        } catch (error) {
          console.error(`Extractor ${extractor.name} failed:`, error);
        }
      }
    }

    return results;
  }
}

export const globalRegistry = new ExtractorRegistry();
