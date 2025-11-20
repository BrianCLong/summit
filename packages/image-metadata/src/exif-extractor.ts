import { BaseExtractor, ExtractionResult, ExtractorConfig } from '@intelgraph/metadata-extractor';
import { EXIFMetadata, ImageAnalysis, ImageExtractionResult } from './types.js';

/**
 * Extractor for image EXIF metadata
 */
export class EXIFExtractor extends BaseExtractor {
  readonly name = 'exif-extractor';
  readonly supportedTypes = [
    'image/jpeg',
    'image/jpg',
    'image/tiff',
    'image/x-tiff',
  ];

  canExtract(file: string | Buffer, mimeType?: string): boolean {
    if (mimeType && this.supportedTypes.includes(mimeType)) {
      return true;
    }

    // Check magic bytes
    const buffer = Buffer.isBuffer(file) ? file : Buffer.from(file);
    const header = buffer.slice(0, 4).toString('hex');

    return (
      header.startsWith('ffd8ff') || // JPEG
      header.startsWith('49492a00') || // TIFF little-endian
      header.startsWith('4d4d002a') // TIFF big-endian
    );
  }

  protected async extractInternal(
    file: string | Buffer,
    config: ExtractorConfig
  ): Promise<Partial<ImageExtractionResult>> {
    const buffer = Buffer.isBuffer(file) ? file : Buffer.from(file);

    // Extract EXIF data
    const exifData = this.extractEXIF(buffer);

    // Perform image analysis
    const analysis = await this.analyzeImage(buffer, config);

    // Build geolocation if GPS data exists
    const geolocation =
      exifData.gpsLatitude && exifData.gpsLongitude
        ? {
            latitude: exifData.gpsLatitude,
            longitude: exifData.gpsLongitude,
            altitude: exifData.gpsAltitude,
            source: 'gps' as const,
          }
        : undefined;

    // Build device metadata
    const device = exifData.make || exifData.model
      ? {
          manufacturer: exifData.make,
          model: exifData.model,
          serialNumber: exifData.serialNumber,
        }
      : undefined;

    // Detect anomalies
    const anomalies: ExtractionResult['anomalies'] = [];

    if (analysis.hasBeenEdited) {
      anomalies.push({
        type: 'image_editing_detected',
        severity: 'medium',
        description: 'Image shows signs of editing or manipulation',
        evidence: { software: analysis.editingSoftwareDetected },
      });
    }

    if (analysis.steganographySuspicion && analysis.steganographySuspicion > 0.7) {
      anomalies.push({
        type: 'steganography_suspected',
        severity: 'high',
        description: 'Image may contain hidden data (steganography)',
        evidence: {
          confidence: analysis.steganographySuspicion,
          lsbAnomalies: analysis.lsbAnomalies,
        },
      });
    }

    return {
      base: {
        extractedAt: new Date(),
        extractorVersion: this.name,
        sourceType: 'image',
        confidence: 0.95,
      },
      temporal: {
        created: exifData.dateTimeOriginal,
        modified: exifData.modifyDate,
        timezone: exifData.offsetTimeOriginal,
      },
      attribution: {
        author: exifData.artist,
        softwareName: exifData.software,
      },
      geolocation,
      device,
      image: {
        exif: exifData,
        analysis,
      },
      anomalies: anomalies.length > 0 ? anomalies : undefined,
    };
  }

  private extractEXIF(buffer: Buffer): EXIFMetadata {
    // Simplified EXIF extraction
    // Production would use exif-parser or exifreader library
    const exif: EXIFMetadata = {};

    // Find EXIF data in JPEG
    if (buffer[0] === 0xff && buffer[1] === 0xd8) {
      // JPEG
      let offset = 2;
      while (offset < buffer.length - 1) {
        if (buffer[offset] === 0xff && buffer[offset + 1] === 0xe1) {
          // APP1 marker (EXIF)
          const exifData = this.parseEXIFData(buffer.slice(offset));
          return exifData;
        }
        offset++;
      }
    }

    return exif;
  }

  private parseEXIFData(buffer: Buffer): EXIFMetadata {
    // Simplified EXIF parsing
    // This is a placeholder - production would use a proper EXIF parser
    const exif: EXIFMetadata = {};

    try {
      // Check for EXIF header
      const exifHeader = buffer.slice(4, 10).toString('ascii');
      if (exifHeader !== 'Exif\x00\x00') {
        return exif;
      }

      // Determine byte order
      const tiffHeader = buffer.slice(10, 12);
      const littleEndian = tiffHeader[0] === 0x49 && tiffHeader[1] === 0x49;

      // This is highly simplified - real implementation would parse IFDs
      // For now, return empty metadata
      return exif;
    } catch (error) {
      return exif;
    }
  }

  private async analyzeImage(buffer: Buffer, config: ExtractorConfig): Promise<ImageAnalysis> {
    const analysis: ImageAnalysis = {
      format: this.detectFormat(buffer),
      mimeType: this.getMimeType(buffer),
      width: 0,
      height: 0,
    };

    // Detect image dimensions (simplified)
    const dimensions = this.extractDimensions(buffer);
    if (dimensions) {
      analysis.width = dimensions.width;
      analysis.height = dimensions.height;
    }

    // Detect editing
    analysis.hasBeenEdited = this.detectEditing(buffer);

    // Steganography detection (if enabled)
    if (config.detectSteganography) {
      const stegoResult = this.detectSteganography(buffer);
      analysis.steganographySuspicion = stegoResult.suspicion;
      analysis.lsbAnomalies = stegoResult.lsbAnomalies;
      analysis.statisticalAnomalies = stegoResult.anomalies;
    }

    return analysis;
  }

  private detectFormat(buffer: Buffer): string {
    const header = buffer.slice(0, 4).toString('hex');
    if (header.startsWith('ffd8ff')) return 'JPEG';
    if (header.startsWith('89504e47')) return 'PNG';
    if (header.startsWith('47494638')) return 'GIF';
    if (header.startsWith('49492a00') || header.startsWith('4d4d002a')) return 'TIFF';
    return 'Unknown';
  }

  private getMimeType(buffer: Buffer): string {
    const header = buffer.slice(0, 4).toString('hex');
    if (header.startsWith('ffd8ff')) return 'image/jpeg';
    if (header.startsWith('89504e47')) return 'image/png';
    if (header.startsWith('47494638')) return 'image/gif';
    if (header.startsWith('49492a00') || header.startsWith('4d4d002a')) return 'image/tiff';
    return 'application/octet-stream';
  }

  private extractDimensions(buffer: Buffer): { width: number; height: number } | null {
    // Simplified dimension extraction for JPEG
    if (buffer[0] === 0xff && buffer[1] === 0xd8) {
      let offset = 2;
      while (offset < buffer.length - 8) {
        if (buffer[offset] === 0xff && (buffer[offset + 1] === 0xc0 || buffer[offset + 1] === 0xc2)) {
          // SOF0 or SOF2 marker
          const height = (buffer[offset + 5] << 8) | buffer[offset + 6];
          const width = (buffer[offset + 7] << 8) | buffer[offset + 8];
          return { width, height };
        }
        offset++;
      }
    }

    return null;
  }

  private detectEditing(buffer: Buffer): boolean {
    // Simple heuristics for detecting editing
    // Check for common editing software markers
    const content = buffer.toString('latin1');
    const editingSoftware = [
      'Adobe Photoshop',
      'GIMP',
      'Paint.NET',
      'Affinity Photo',
      'Pixelmator',
    ];

    return editingSoftware.some(software => content.includes(software));
  }

  private detectSteganography(buffer: Buffer): {
    suspicion: number;
    lsbAnomalies: boolean;
    anomalies: string[];
  } {
    const anomalies: string[] = [];
    let suspicion = 0;

    // LSB (Least Significant Bit) analysis
    const lsbAnomalies = this.detectLSBAnomalies(buffer);
    if (lsbAnomalies) {
      suspicion += 0.4;
      anomalies.push('LSB anomalies detected');
    }

    // Chi-square test for randomness
    const chiSquare = this.chiSquareTest(buffer);
    if (chiSquare > 100) {
      suspicion += 0.3;
      anomalies.push('Statistical randomness detected');
    }

    // File size analysis
    const expectedSize = this.estimateExpectedSize(buffer);
    const actualSize = buffer.length;
    if (actualSize > expectedSize * 1.1) {
      suspicion += 0.2;
      anomalies.push('File size larger than expected');
    }

    return {
      suspicion: Math.min(suspicion, 1),
      lsbAnomalies,
      anomalies,
    };
  }

  private detectLSBAnomalies(buffer: Buffer): boolean {
    // Simple LSB analysis - check if LSBs are too random
    let zeroes = 0;
    let ones = 0;

    for (let i = 0; i < Math.min(buffer.length, 10000); i++) {
      if (buffer[i] & 1) {
        ones++;
      } else {
        zeroes++;
      }
    }

    // If LSBs are perfectly balanced, it might indicate steganography
    const ratio = ones / (ones + zeroes);
    return Math.abs(ratio - 0.5) < 0.01;
  }

  private chiSquareTest(buffer: Buffer): number {
    // Simplified chi-square test
    const frequencies = new Array(256).fill(0);
    const sampleSize = Math.min(buffer.length, 10000);

    for (let i = 0; i < sampleSize; i++) {
      frequencies[buffer[i]]++;
    }

    const expected = sampleSize / 256;
    let chiSquare = 0;

    for (const freq of frequencies) {
      const diff = freq - expected;
      chiSquare += (diff * diff) / expected;
    }

    return chiSquare;
  }

  private estimateExpectedSize(buffer: Buffer): number {
    // Estimate expected file size based on dimensions and format
    const dimensions = this.extractDimensions(buffer);
    if (!dimensions) return buffer.length;

    const pixels = dimensions.width * dimensions.height;
    const format = this.detectFormat(buffer);

    // Rough estimates
    if (format === 'JPEG') {
      return pixels * 0.1; // ~10% of raw size
    } else if (format === 'PNG') {
      return pixels * 0.5; // ~50% of raw size
    }

    return buffer.length;
  }
}
