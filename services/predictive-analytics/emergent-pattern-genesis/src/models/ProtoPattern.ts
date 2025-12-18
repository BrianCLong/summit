/**
 * Proto-Pattern Model
 * Represents an emerging pattern that is not yet fully formed
 */

export interface WeakSignal {
  id: string;
  type: string;
  strength: number;
  location: Record<string, any>;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface ProtoPattern {
  id: string;
  patternId: string;
  confidence: number;
  completeness: number;
  detectedAt: Date;
  partialMotif: Record<string, any>;
  weakSignals: WeakSignal[];
  expectedPattern?: Record<string, any>;
  evolutionTrajectories?: any[];
  status: 'detected' | 'evolving' | 'mature' | 'dormant' | 'extinct';
  metadata?: Record<string, any>;
}

export class ProtoPatternModel implements ProtoPattern {
  id: string;
  patternId: string;
  confidence: number;
  completeness: number;
  detectedAt: Date;
  partialMotif: Record<string, any>;
  weakSignals: WeakSignal[];
  expectedPattern?: Record<string, any>;
  evolutionTrajectories?: any[];
  status: 'detected' | 'evolving' | 'mature' | 'dormant' | 'extinct';
  metadata?: Record<string, any>;

  constructor(data: Partial<ProtoPattern>) {
    this.id = data.id || this.generateId();
    this.patternId = data.patternId || 'unknown';
    this.confidence = data.confidence || 0;
    this.completeness = data.completeness || 0;
    this.detectedAt = data.detectedAt || new Date();
    this.partialMotif = data.partialMotif || {};
    this.weakSignals = data.weakSignals || [];
    this.expectedPattern = data.expectedPattern;
    this.evolutionTrajectories = data.evolutionTrajectories;
    this.status = data.status || 'detected';
    this.metadata = data.metadata;
  }

  private generateId(): string {
    return `proto_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }

  /**
   * Calculate structural completeness based on expected pattern
   */
  calculateCompleteness(expectedPattern?: Record<string, any>): number {
    if (!expectedPattern) {
      return this.completeness;
    }

    const expected = expectedPattern.features || {};
    const current = this.partialMotif.features || {};

    const expectedKeys = Object.keys(expected);
    const currentKeys = Object.keys(current);

    if (expectedKeys.length === 0) {
      return 0;
    }

    const matchedKeys = expectedKeys.filter((key) =>
      currentKeys.includes(key)
    );

    return matchedKeys.length / expectedKeys.length;
  }

  /**
   * Update confidence based on weak signals
   */
  updateConfidence(weights = { structural: 0.4, temporal: 0.3, precedent: 0.3 }): void {
    const structuralScore = this.completeness;
    const temporalScore = this.calculateTemporalConsistency();
    const precedentScore = this.calculateHistoricalPrecedent();

    this.confidence =
      weights.structural * structuralScore +
      weights.temporal * temporalScore +
      weights.precedent * precedentScore;
  }

  /**
   * Calculate temporal consistency of weak signals
   */
  private calculateTemporalConsistency(): number {
    if (this.weakSignals.length < 2) {
      return 0;
    }

    // Sort signals by timestamp
    const sorted = [...this.weakSignals].sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
    );

    // Calculate trend in signal strength
    let increasingCount = 0;
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i].strength >= sorted[i - 1].strength) {
        increasingCount++;
      }
    }

    return increasingCount / (sorted.length - 1);
  }

  /**
   * Calculate historical precedent score
   */
  private calculateHistoricalPrecedent(): number {
    // This would compare against historical pattern library
    // For now, return a default value
    return this.metadata?.precedentScore || 0.5;
  }

  /**
   * Add a weak signal
   */
  addWeakSignal(signal: WeakSignal): void {
    this.weakSignals.push(signal);
    this.updateConfidence();
  }

  /**
   * Check if proto-pattern is viable
   */
  isViable(threshold = 0.5): boolean {
    return this.confidence >= threshold && this.status !== 'extinct';
  }

  /**
   * Evolve status based on confidence and completeness
   */
  evolveStatus(): void {
    if (this.confidence < 0.3) {
      this.status = 'dormant';
    } else if (this.completeness >= 0.8) {
      this.status = 'mature';
    } else if (this.weakSignals.length > 0) {
      this.status = 'evolving';
    }

    // Check for extinction (no new signals in last 7 days)
    if (this.weakSignals.length > 0) {
      const lastSignalTime = Math.max(
        ...this.weakSignals.map((s) => s.timestamp.getTime())
      );
      const daysSinceLastSignal =
        (Date.now() - lastSignalTime) / (1000 * 60 * 60 * 24);
      if (daysSinceLastSignal > 7) {
        this.status = 'extinct';
      }
    }
  }

  /**
   * Export to JSON
   */
  toJSON(): ProtoPattern {
    return {
      id: this.id,
      patternId: this.patternId,
      confidence: this.confidence,
      completeness: this.completeness,
      detectedAt: this.detectedAt,
      partialMotif: this.partialMotif,
      weakSignals: this.weakSignals,
      expectedPattern: this.expectedPattern,
      evolutionTrajectories: this.evolutionTrajectories,
      status: this.status,
      metadata: this.metadata,
    };
  }
}
