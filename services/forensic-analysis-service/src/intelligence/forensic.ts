import { ExtractionResult, AnalysisReport } from '@intelgraph/metadata-extractor';
import crypto from 'crypto';

export interface Relationship {
  source: string;
  target: string;
  type: string;
  confidence: number;
  evidence: string;
}

/**
 * Forensic intelligence generator
 */
export class ForensicIntelligence {
  /**
   * Generate comprehensive forensic intelligence report
   */
  async generateReport(results: ExtractionResult[], options?: any): Promise<AnalysisReport> {
    const insights = this.generateInsights(results);
    const relationships = await this.detectRelationships(results);
    const timeline = this.buildTimeline(results);
    const attributions = options?.attributions || [];

    return {
      id: this.generateId(),
      createdAt: new Date(),
      artifacts: results.length,
      insights,
      timeline,
      relationships,
      attributions,
    };
  }

  /**
   * Detect relationships between artifacts
   */
  async detectRelationships(results: ExtractionResult[]): Promise<Relationship[]> {
    const relationships: Relationship[] = [];

    // Detect temporal relationships
    for (let i = 0; i < results.length; i++) {
      for (let j = i + 1; j < results.length; j++) {
        const rel = this.detectTemporalRelationship(results[i], results[j]);
        if (rel) {
          relationships.push(rel);
        }
      }
    }

    // Detect attribution relationships
    for (let i = 0; i < results.length; i++) {
      for (let j = i + 1; j < results.length; j++) {
        const rel = this.detectAttributionRelationship(results[i], results[j]);
        if (rel) {
          relationships.push(rel);
        }
      }
    }

    // Detect device relationships
    for (let i = 0; i < results.length; i++) {
      for (let j = i + 1; j < results.length; j++) {
        const rel = this.detectDeviceRelationship(results[i], results[j]);
        if (rel) {
          relationships.push(rel);
        }
      }
    }

    return relationships;
  }

  private generateInsights(results: ExtractionResult[]): AnalysisReport['insights'] {
    const insights: AnalysisReport['insights'] = [];

    // Detect common authors
    const authors = new Map<string, string[]>();
    for (const result of results) {
      if (result.attribution?.author) {
        if (!authors.has(result.attribution.author)) {
          authors.set(result.attribution.author, []);
        }
        authors.get(result.attribution.author)!.push(result.id);
      }
    }

    for (const [author, artifactIds] of authors) {
      if (artifactIds.length > 1) {
        insights.push({
          type: 'common_author',
          confidence: 0.9,
          description: `Author "${author}" appears in ${artifactIds.length} artifacts`,
          evidence: artifactIds,
          severity: 'info',
        });
      }
    }

    // Detect anomalies
    const allAnomalies = results.flatMap(r => r.anomalies || []);
    if (allAnomalies.length > 0) {
      insights.push({
        type: 'anomalies_detected',
        confidence: 0.95,
        description: `${allAnomalies.length} anomalies detected across artifacts`,
        evidence: results.filter(r => r.anomalies && r.anomalies.length > 0).map(r => r.id),
        severity: 'high',
      });
    }

    // Detect encryption usage
    const encrypted = results.filter(r => {
      const doc = (r as any).document;
      const comm = (r as any).communication;
      return doc?.pdf?.encrypted || doc?.archive?.encrypted || comm?.messaging?.isEncrypted;
    });

    if (encrypted.length > 0) {
      insights.push({
        type: 'encryption_detected',
        confidence: 1.0,
        description: `${encrypted.length} encrypted artifacts detected`,
        evidence: encrypted.map(r => r.id),
        severity: 'medium',
      });
    }

    return insights;
  }

  private detectTemporalRelationship(a: ExtractionResult, b: ExtractionResult): Relationship | null {
    const aTime = a.temporal?.created || a.temporal?.modified;
    const bTime = b.temporal?.created || b.temporal?.modified;

    if (!aTime || !bTime) return null;

    const timeDiff = Math.abs(aTime.getTime() - bTime.getTime());

    // If created within 1 minute
    if (timeDiff < 60000) {
      return {
        source: a.id,
        target: b.id,
        type: 'temporal_proximity',
        confidence: 0.8,
        evidence: `Created within ${timeDiff}ms of each other`,
      };
    }

    return null;
  }

  private detectAttributionRelationship(a: ExtractionResult, b: ExtractionResult): Relationship | null {
    if (a.attribution?.author && a.attribution.author === b.attribution?.author) {
      return {
        source: a.id,
        target: b.id,
        type: 'common_author',
        confidence: 0.95,
        evidence: `Both created by ${a.attribution.author}`,
      };
    }

    if (a.attribution?.softwareName && a.attribution.softwareName === b.attribution?.softwareName) {
      return {
        source: a.id,
        target: b.id,
        type: 'common_software',
        confidence: 0.7,
        evidence: `Both created with ${a.attribution.softwareName}`,
      };
    }

    return null;
  }

  private detectDeviceRelationship(a: ExtractionResult, b: ExtractionResult): Relationship | null {
    if (a.device?.serialNumber && a.device.serialNumber === b.device?.serialNumber) {
      return {
        source: a.id,
        target: b.id,
        type: 'same_device',
        confidence: 0.99,
        evidence: `Same device serial number: ${a.device.serialNumber}`,
      };
    }

    return null;
  }

  private buildTimeline(results: ExtractionResult[]): AnalysisReport['timeline'] {
    const events: AnalysisReport['timeline'] = [];

    for (const result of results) {
      if (result.temporal?.created) {
        events.push({
          timestamp: result.temporal.created,
          artifactId: result.id,
          event: 'created',
          source: result.base.sourceType,
        });
      }

      if (result.temporal?.modified) {
        events.push({
          timestamp: result.temporal.modified,
          artifactId: result.id,
          event: 'modified',
          source: result.base.sourceType,
        });
      }
    }

    return events.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  private generateId(): string {
    return crypto.randomBytes(16).toString('hex');
  }
}
