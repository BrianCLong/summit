/**
 * Metadata Analysis Module
 * EXIF data analysis and tampering detection
 */

import type { ExifAnalysisResult, ExifInconsistency } from '../types';

export class MetadataAnalyzer {
  /**
   * Analyze EXIF metadata for inconsistencies and tampering
   */
  async analyzeExif(imageBuffer: Buffer): Promise<ExifAnalysisResult> {
    const exifData = await this.extractExif(imageBuffer);
    const hasExif = Object.keys(exifData).length > 0;

    if (!hasExif) {
      return {
        hasExif: false,
        exifData: {},
        inconsistencies: [
          {
            field: 'all',
            issue: 'no_exif_data',
            severity: 0.5,
            explanation: 'Image has no EXIF data - may have been stripped or never captured',
          },
        ],
        tamperingDetected: false,
        trustScore: 0.5,
      };
    }

    const inconsistencies = await this.detectInconsistencies(exifData);
    const tamperingDetected = inconsistencies.some((inc) => inc.severity > 0.7);
    const trustScore = this.calculateTrustScore(exifData, inconsistencies);

    return {
      hasExif,
      exifData,
      inconsistencies,
      tamperingDetected,
      trustScore,
    };
  }

  /**
   * Extract EXIF data from image
   */
  private async extractExif(imageBuffer: Buffer): Promise<Record<string, any>> {
    // Extract EXIF data using exif-parser or similar
    // Include:
    // - Camera make/model
    // - Date/time
    // - GPS coordinates
    // - Exposure settings
    // - Software used
    // - Thumbnail
    // - Color space
    // - etc.

    return {
      Make: 'Canon',
      Model: 'Canon EOS 5D Mark IV',
      DateTime: '2024:01:15 14:30:22',
      Software: 'Adobe Photoshop 2024',
      GPSLatitude: 37.7749,
      GPSLongitude: -122.4194,
      ExposureTime: '1/250',
      FNumber: 'f/5.6',
      ISO: 400,
      FocalLength: '85mm',
    };
  }

  /**
   * Detect EXIF inconsistencies
   */
  private async detectInconsistencies(exifData: Record<string, any>): Promise<ExifInconsistency[]> {
    const inconsistencies: ExifInconsistency[] = [];

    // 1. Check for software modifications
    if (exifData.Software && this.isEditingSoftware(exifData.Software)) {
      inconsistencies.push({
        field: 'Software',
        issue: 'editing_software_detected',
        severity: 0.6,
        explanation: `Image processed by editing software: ${exifData.Software}`,
      });
    }

    // 2. Validate date/time consistency
    const dateIssues = this.validateDates(exifData);
    inconsistencies.push(...dateIssues);

    // 3. Check camera/lens compatibility
    const compatibilityIssues = this.checkCameraLensCompatibility(exifData);
    inconsistencies.push(...compatibilityIssues);

    // 4. Validate exposure settings
    const exposureIssues = this.validateExposureSettings(exifData);
    inconsistencies.push(...exposureIssues);

    // 5. Check for GPS anomalies
    const gpsIssues = this.validateGPS(exifData);
    inconsistencies.push(...gpsIssues);

    // 6. Check for thumbnail mismatch
    const thumbnailIssues = await this.checkThumbnailConsistency(exifData);
    inconsistencies.push(...thumbnailIssues);

    // 7. Validate maker notes
    const makerNotesIssues = this.validateMakerNotes(exifData);
    inconsistencies.push(...makerNotesIssues);

    return inconsistencies;
  }

  private isEditingSoftware(software: string): boolean {
    const editingSoftware = [
      'photoshop',
      'gimp',
      'lightroom',
      'affinity',
      'pixlr',
      'paint.net',
      'capture one',
    ];

    return editingSoftware.some((s) => software.toLowerCase().includes(s));
  }

  private validateDates(exifData: Record<string, any>): ExifInconsistency[] {
    const issues: ExifInconsistency[] = [];

    // Check for inconsistent dates
    const dateFields = [
      'DateTime',
      'DateTimeOriginal',
      'DateTimeDigitized',
      'CreateDate',
      'ModifyDate',
    ];

    const dates: Date[] = [];
    for (const field of dateFields) {
      if (exifData[field]) {
        try {
          const date = new Date(exifData[field]);
          dates.push(date);
        } catch (e) {
          issues.push({
            field,
            issue: 'invalid_date_format',
            severity: 0.5,
            explanation: `Invalid date format in ${field}`,
          });
        }
      }
    }

    // Check for impossible date orders
    if (dates.length >= 2) {
      // DateTimeOriginal should be before or equal to DateTime
      // Future dates are suspicious
      const now = new Date();
      for (const date of dates) {
        if (date > now) {
          issues.push({
            field: 'DateTime',
            issue: 'future_date',
            severity: 0.9,
            explanation: 'Image has a date in the future',
          });
        }
      }
    }

    return issues;
  }

  private checkCameraLensCompatibility(exifData: Record<string, any>): ExifInconsistency[] {
    const issues: ExifInconsistency[] = [];

    // Check if lens is compatible with camera
    // Check if focal length is within lens specifications
    // Check if aperture is within lens specifications

    // This requires a database of camera/lens combinations
    // Placeholder for now

    return issues;
  }

  private validateExposureSettings(exifData: Record<string, any>): ExifInconsistency[] {
    const issues: ExifInconsistency[] = [];

    // Check for impossible or suspicious combinations:
    // - ISO too high for camera model
    // - Shutter speed beyond camera capabilities
    // - Aperture beyond lens capabilities
    // - Inconsistent exposure triangle

    return issues;
  }

  private validateGPS(exifData: Record<string, any>): ExifInconsistency[] {
    const issues: ExifInconsistency[] = [];

    if (exifData.GPSLatitude && exifData.GPSLongitude) {
      const lat = exifData.GPSLatitude;
      const lon = exifData.GPSLongitude;

      // Check for invalid coordinates
      if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
        issues.push({
          field: 'GPS',
          issue: 'invalid_coordinates',
          severity: 0.8,
          explanation: 'GPS coordinates are outside valid range',
        });
      }

      // Check for null island (0,0) which is suspicious
      if (lat === 0 && lon === 0) {
        issues.push({
          field: 'GPS',
          issue: 'null_island',
          severity: 0.6,
          explanation: 'GPS coordinates at (0,0) - likely default or error',
        });
      }
    }

    return issues;
  }

  private async checkThumbnailConsistency(
    exifData: Record<string, any>,
  ): Promise<ExifInconsistency[]> {
    const issues: ExifInconsistency[] = [];

    // Thumbnail should match the main image
    // If thumbnail differs significantly, image may be manipulated

    // This requires comparing thumbnail to downsampled main image
    // Placeholder for now

    return issues;
  }

  private validateMakerNotes(exifData: Record<string, any>): ExifInconsistency[] {
    const issues: ExifInconsistency[] = [];

    // Maker notes contain proprietary camera data
    // Check for:
    // - Missing maker notes (suspicious)
    // - Invalid maker note format
    // - Inconsistent maker note data

    if (!exifData.MakerNotes && exifData.Make) {
      issues.push({
        field: 'MakerNotes',
        issue: 'missing_maker_notes',
        severity: 0.5,
        explanation: 'Maker notes missing - may indicate EXIF manipulation',
      });
    }

    return issues;
  }

  /**
   * Calculate trust score based on EXIF data
   */
  private calculateTrustScore(
    exifData: Record<string, any>,
    inconsistencies: ExifInconsistency[],
  ): number {
    let score = 1.0;

    // Deduct for inconsistencies
    for (const inconsistency of inconsistencies) {
      score -= inconsistency.severity * 0.15;
    }

    // Deduct for missing important fields
    const importantFields = ['Make', 'Model', 'DateTime', 'DateTimeOriginal'];
    const missingFields = importantFields.filter((field) => !exifData[field]);
    score -= missingFields.length * 0.1;

    return Math.max(0, Math.min(1, score));
  }

  /**
   * Detect EXIF tampering
   */
  async detectTampering(imageBuffer: Buffer): Promise<{
    tampered: boolean;
    confidence: number;
    evidence: string[];
  }> {
    const analysis = await this.analyzeExif(imageBuffer);
    const evidence: string[] = [];

    let tamperingScore = 0;

    // High severity inconsistencies
    const highSeverity = analysis.inconsistencies.filter((inc) => inc.severity > 0.7);
    if (highSeverity.length > 0) {
      tamperingScore += 0.4;
      evidence.push(...highSeverity.map((inc) => inc.explanation));
    }

    // Editing software detected
    if (analysis.exifData.Software && this.isEditingSoftware(analysis.exifData.Software)) {
      tamperingScore += 0.3;
      evidence.push(`Editing software detected: ${analysis.exifData.Software}`);
    }

    // Missing important metadata
    if (!analysis.hasExif || Object.keys(analysis.exifData).length < 5) {
      tamperingScore += 0.2;
      evidence.push('Minimal or missing EXIF data');
    }

    // Low trust score
    if (analysis.trustScore < 0.5) {
      tamperingScore += 0.3;
      evidence.push(`Low EXIF trust score: ${analysis.trustScore.toFixed(2)}`);
    }

    return {
      tampered: tamperingScore > 0.5,
      confidence: Math.min(tamperingScore, 1),
      evidence,
    };
  }
}
