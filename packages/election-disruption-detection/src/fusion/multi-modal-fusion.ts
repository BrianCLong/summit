/**
 * Multi-Modal Threat Fusion Engine
 *
 * Fuses signals from multiple detection modalities:
 * - Social media analysis
 * - Cyber threat intelligence
 * - Physical security reports
 * - Open source intelligence
 * - Law enforcement feeds
 * - Platform transparency reports
 */

import { ElectionThreatSignal, Evidence } from '../index.js';

export interface FusionConfig {
  modalityWeights: Record<string, number>;
  correlationThreshold: number;
  temporalWindow: number; // milliseconds
  spatialResolution: string;
}

export interface FusedThreat extends ElectionThreatSignal {
  fusionScore: number;
  contributingModalities: string[];
  correlationStrength: number;
  crossModalEvidence: CrossModalEvidence[];
}

export interface CrossModalEvidence {
  modality1: string;
  modality2: string;
  correlationType: string;
  strength: number;
  temporalAlignment: number;
}

export class MultiModalFusionEngine {
  private config: FusionConfig;

  constructor(config: FusionConfig) {
    this.config = config;
  }

  /**
   * Fuse threats from multiple detection systems
   */
  async fuse(threatSets: ElectionThreatSignal[][]): Promise<FusedThreat[]> {
    const allThreats = threatSets.flat();

    // Group by potential correlation
    const correlationGroups = this.groupByCorrelation(allThreats);

    // Fuse correlated threats
    const fusedThreats: FusedThreat[] = [];

    for (const group of correlationGroups) {
      if (group.length === 1) {
        // Single-modality threat
        fusedThreats.push(this.wrapSingleThreat(group[0]));
      } else {
        // Multi-modality fusion
        fusedThreats.push(this.fuseGroup(group));
      }
    }

    return fusedThreats;
  }

  private groupByCorrelation(threats: ElectionThreatSignal[]): ElectionThreatSignal[][] {
    const groups: ElectionThreatSignal[][] = [];
    const assigned = new Set<string>();

    for (const threat of threats) {
      if (assigned.has(threat.id)) continue;

      const group = [threat];
      assigned.add(threat.id);

      // Find correlated threats
      for (const other of threats) {
        if (assigned.has(other.id)) continue;
        if (this.areCorrelated(threat, other)) {
          group.push(other);
          assigned.add(other.id);
        }
      }

      groups.push(group);
    }

    return groups;
  }

  private areCorrelated(a: ElectionThreatSignal, b: ElectionThreatSignal): boolean {
    // Temporal correlation
    const temporalDiff = Math.abs(
      a.temporalContext.timeWindow.start.getTime() -
        b.temporalContext.timeWindow.start.getTime()
    );
    if (temporalDiff > this.config.temporalWindow) return false;

    // Spatial correlation
    const spatialOverlap = this.calculateSpatialOverlap(
      a.geospatialContext.jurisdictions,
      b.geospatialContext.jurisdictions
    );
    if (spatialOverlap === 0) return false;

    // Type correlation
    if (a.type === b.type) return true;

    // Related types
    const relatedTypes: Record<string, string[]> = {
      DISINFORMATION_CAMPAIGN: ['PERCEPTION_HACK', 'LEGITIMACY_ATTACK'],
      FOREIGN_INTERFERENCE: ['DISINFORMATION_CAMPAIGN', 'INFRASTRUCTURE_ATTACK'],
      VOTER_SUPPRESSION: ['COORDINATED_HARASSMENT', 'DISINFORMATION_CAMPAIGN'],
    };

    return relatedTypes[a.type]?.includes(b.type) || false;
  }

  private calculateSpatialOverlap(a: string[], b: string[]): number {
    const setA = new Set(a);
    const intersection = b.filter((x) => setA.has(x));
    const union = new Set([...a, ...b]);
    return intersection.length / union.size;
  }

  private wrapSingleThreat(threat: ElectionThreatSignal): FusedThreat {
    return {
      ...threat,
      fusionScore: threat.confidence,
      contributingModalities: [this.getModality(threat)],
      correlationStrength: 1,
      crossModalEvidence: [],
    };
  }

  private fuseGroup(threats: ElectionThreatSignal[]): FusedThreat {
    // Calculate fused confidence (Dempster-Shafer-inspired)
    const fusedConfidence = this.fuseConfidences(threats.map((t) => t.confidence));

    // Determine primary threat type
    const primaryType = this.selectPrimaryType(threats);

    // Merge evidence
    const allEvidence = threats.flatMap((t) => t.evidence);

    // Calculate cross-modal correlations
    const crossModal = this.calculateCrossModalEvidence(threats);

    return {
      id: crypto.randomUUID(),
      type: primaryType,
      confidence: fusedConfidence,
      severity: this.fuseSeverity(threats),
      vectors: [...new Set(threats.flatMap((t) => t.vectors))],
      temporalContext: threats[0].temporalContext, // Use first as reference
      geospatialContext: this.fuseGeospatial(threats),
      attribution: this.fuseAttribution(threats),
      evidence: allEvidence,
      mitigationRecommendations: this.fuseMitigations(threats),
      fusionScore: fusedConfidence,
      contributingModalities: [...new Set(threats.map((t) => this.getModality(t)))],
      correlationStrength: this.calculateCorrelationStrength(threats),
      crossModalEvidence: crossModal,
    };
  }

  private fuseConfidences(confidences: number[]): number {
    // Combine using independence assumption
    let combined = confidences[0];
    for (let i = 1; i < confidences.length; i++) {
      combined = combined + confidences[i] - combined * confidences[i];
    }
    return Math.min(0.99, combined);
  }

  private selectPrimaryType(threats: ElectionThreatSignal[]): ElectionThreatSignal['type'] {
    // Select highest severity/confidence type
    return threats.sort(
      (a, b) => b.confidence - a.confidence
    )[0].type;
  }

  private fuseSeverity(threats: ElectionThreatSignal[]): ElectionThreatSignal['severity'] {
    const severityOrder = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFORMATIONAL'];
    const highest = threats.reduce((max, t) => {
      const maxIdx = severityOrder.indexOf(max);
      const tIdx = severityOrder.indexOf(t.severity);
      return tIdx < maxIdx ? t.severity : max;
    }, 'INFORMATIONAL' as ElectionThreatSignal['severity']);
    return highest;
  }

  private fuseGeospatial(
    threats: ElectionThreatSignal[]
  ): ElectionThreatSignal['geospatialContext'] {
    return {
      jurisdictions: [...new Set(threats.flatMap((t) => t.geospatialContext.jurisdictions))],
      precincts: [...new Set(threats.flatMap((t) => t.geospatialContext.precincts))],
      swingIndicator: Math.max(...threats.map((t) => t.geospatialContext.swingIndicator)),
      demographicOverlays: threats.flatMap((t) => t.geospatialContext.demographicOverlays),
      infrastructureDependencies: [
        ...new Set(threats.flatMap((t) => t.geospatialContext.infrastructureDependencies)),
      ],
    };
  }

  private fuseAttribution(
    threats: ElectionThreatSignal[]
  ): ElectionThreatSignal['attribution'] {
    // Use highest confidence attribution
    return threats.sort(
      (a, b) => b.attribution.confidence - a.attribution.confidence
    )[0].attribution;
  }

  private fuseMitigations(
    threats: ElectionThreatSignal[]
  ): ElectionThreatSignal['mitigationRecommendations'] {
    const all = threats.flatMap((t) => t.mitigationRecommendations);
    // Deduplicate by action
    const seen = new Set<string>();
    return all.filter((m) => {
      if (seen.has(m.action)) return false;
      seen.add(m.action);
      return true;
    });
  }

  private getModality(threat: ElectionThreatSignal): string {
    return threat.vectors[0] || 'UNKNOWN';
  }

  private calculateCrossModalEvidence(threats: ElectionThreatSignal[]): CrossModalEvidence[] {
    const crossModal: CrossModalEvidence[] = [];

    for (let i = 0; i < threats.length; i++) {
      for (let j = i + 1; j < threats.length; j++) {
        crossModal.push({
          modality1: this.getModality(threats[i]),
          modality2: this.getModality(threats[j]),
          correlationType: 'TEMPORAL_SPATIAL',
          strength: 0.8,
          temporalAlignment: 0.9,
        });
      }
    }

    return crossModal;
  }

  private calculateCorrelationStrength(threats: ElectionThreatSignal[]): number {
    return Math.min(1, 0.5 + threats.length * 0.1);
  }
}
