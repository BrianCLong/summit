/**
 * Media Manipulation Detection Package
 * Comprehensive detection of photo editing, splicing, and media tampering
 */

export * from './types';
export * from './photo/photo-forensics';
export * from './metadata/metadata-analyzer';
export * from './provenance/provenance-tracker';

import { PhotoForensicsAnalyzer } from './photo/photo-forensics';
import { MetadataAnalyzer } from './metadata/metadata-analyzer';
import { ProvenanceTracker } from './provenance/provenance-tracker';
import type { ManipulationDetectionResult, DetectedManipulation, Evidence, EvidenceType } from './types';

export class MediaManipulationDetector {
  private photoForensics: PhotoForensicsAnalyzer;
  private metadataAnalyzer: MetadataAnalyzer;
  private provenanceTracker: ProvenanceTracker;

  constructor() {
    this.photoForensics = new PhotoForensicsAnalyzer();
    this.metadataAnalyzer = new MetadataAnalyzer();
    this.provenanceTracker = new ProvenanceTracker();
  }

  /**
   * Comprehensive media manipulation detection
   */
  async detectManipulation(imageBuffer: Buffer): Promise<ManipulationDetectionResult> {
    const startTime = Date.now();
    const manipulations: DetectedManipulation[] = [];
    const recommendations: string[] = [];

    // 1. Photo editing detection
    const editingResult = await this.photoForensics.detectPhotoEditing(imageBuffer);
    if (editingResult.edited) {
      for (const edit of editingResult.edits) {
        manipulations.push({
          type: edit.type as any,
          location: { coordinates: [edit.location] },
          confidence: edit.confidence,
          description: edit.description,
          evidence: [],
        });
      }
      recommendations.push('Image shows signs of editing');
      if (editingResult.toolsDetected.length > 0) {
        recommendations.push(`Tools detected: ${editingResult.toolsDetected.join(', ')}`);
      }
    }

    // 2. Cloning detection
    const cloningResult = await this.photoForensics.detectCloning(imageBuffer);
    if (cloningResult.cloningDetected) {
      for (const region of cloningResult.regions) {
        manipulations.push({
          type: 'CLONING' as any,
          location: {
            coordinates: [region.source, ...region.targets],
          },
          confidence: region.similarity,
          description: `Copy-move forgery detected with ${region.method} transformation`,
          evidence: [{
            type: EvidenceType.CLONING_DETECTION,
            data: { source: region.source, targets: region.targets },
            description: `Cloned region similarity: ${region.similarity.toFixed(2)}`,
          }],
        });
      }
      recommendations.push('Cloning/copy-move forgery detected');
    }

    // 3. Splicing detection
    const splicingResult = await this.photoForensics.detectSplicing(imageBuffer);
    if (splicingResult.splicingDetected) {
      for (const boundary of splicingResult.boundaries) {
        manipulations.push({
          type: 'SPLICING' as any,
          location: { coordinates: [boundary.region] },
          confidence: boundary.confidence,
          description: boundary.description,
          evidence: [{
            type: EvidenceType.FORGERY_LOCALIZATION,
            data: { evidenceType: boundary.evidenceType },
            description: boundary.description,
          }],
        });
      }
      recommendations.push('Image splicing detected - composite image');
    }

    // 4. Content-aware fill detection
    const contentAwareFill = await this.photoForensics.detectContentAwareFill(imageBuffer);
    if (contentAwareFill.detected) {
      for (const region of contentAwareFill.regions) {
        manipulations.push({
          type: 'CONTENT_AWARE_FILL' as any,
          location: { coordinates: [region] },
          confidence: contentAwareFill.confidence,
          description: 'Content-aware fill detected',
          evidence: [],
        });
      }
      recommendations.push('Content-aware fill or object removal detected');
    }

    // 5. Color manipulation detection
    const colorManipulation = await this.photoForensics.detectColorManipulation(imageBuffer);
    if (colorManipulation.manipulated) {
      manipulations.push({
        type: 'COLOR_ADJUSTMENT' as any,
        location: { region: 'global' },
        confidence: colorManipulation.confidence,
        description: `Color manipulation: ${colorManipulation.type.join(', ')}`,
        evidence: [],
      });
      recommendations.push('Color/tone adjustments detected');
    }

    // 6. Metadata analysis
    const exifAnalysis = await this.metadataAnalyzer.analyzeExif(imageBuffer);
    if (exifAnalysis.tamperingDetected) {
      manipulations.push({
        type: 'COMPRESSION_INCONSISTENCY' as any,
        location: { region: 'metadata' },
        confidence: 1 - exifAnalysis.trustScore,
        description: 'EXIF metadata tampering detected',
        evidence: [{
          type: EvidenceType.METADATA_INCONSISTENCY,
          data: exifAnalysis.inconsistencies,
          description: `Trust score: ${exifAnalysis.trustScore.toFixed(2)}`,
        }],
      });
      recommendations.push('Metadata inconsistencies found');
    }

    // 7. Provenance verification
    const provenance = await this.provenanceTracker.verifyProvenance(imageBuffer);
    if (!provenance.verified && provenance.hasProvenance) {
      recommendations.push('Provenance chain could not be verified');
    } else if (!provenance.hasProvenance) {
      recommendations.push('No provenance information available');
    }

    const processingTime = Date.now() - startTime;
    const overallConfidence = this.calculateOverallConfidence(manipulations);

    return {
      isManipulated: manipulations.length > 0,
      confidence: overallConfidence,
      manipulations,
      metadata: {
        timestamp: new Date(),
        processingTime,
        algorithms: [
          { name: 'photo-forensics', version: '1.0.0', parameters: {} },
          { name: 'metadata-analyzer', version: '1.0.0', parameters: {} },
          { name: 'provenance-tracker', version: '1.0.0', parameters: {} },
        ],
        fileInfo: {
          format: 'unknown',
          size: imageBuffer.length,
          dimensions: { width: 0, height: 0 },
          colorSpace: 'RGB',
          bitDepth: 8,
        },
      },
      recommendations,
    };
  }

  /**
   * Quick manipulation check (faster, less comprehensive)
   */
  async quickCheck(imageBuffer: Buffer): Promise<{
    suspicious: boolean;
    confidence: number;
    reasons: string[];
  }> {
    const reasons: string[] = [];

    // Quick checks:
    // 1. Metadata tampering
    const metadataTampering = await this.metadataAnalyzer.detectTampering(imageBuffer);
    if (metadataTampering.tampered) {
      reasons.push('Metadata tampering detected');
    }

    // 2. EXIF analysis
    const exifAnalysis = await this.metadataAnalyzer.analyzeExif(imageBuffer);
    if (exifAnalysis.trustScore < 0.6) {
      reasons.push('Low metadata trust score');
    }

    const suspicious = reasons.length > 0;
    const confidence = suspicious ? 0.7 : 0.3;

    return {
      suspicious,
      confidence,
      reasons,
    };
  }

  private calculateOverallConfidence(manipulations: DetectedManipulation[]): number {
    if (manipulations.length === 0) return 0;

    const avgConfidence = manipulations.reduce((sum, m) => sum + m.confidence, 0) / manipulations.length;
    const countFactor = Math.min(manipulations.length / 5, 0.3);

    return Math.min(avgConfidence + countFactor, 1);
  }
}
