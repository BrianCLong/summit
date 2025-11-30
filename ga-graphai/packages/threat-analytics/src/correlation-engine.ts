import type {
  BehaviorInsight,
  BehaviorEvent,
  CorrelatedFinding,
  PatternMatch,
  ThreatIntelIndicator,
} from './types';

interface CorrelationInput {
  event: BehaviorEvent;
  behavior?: BehaviorInsight;
  patterns?: PatternMatch[];
  indicators?: ThreatIntelIndicator[];
}

export class CorrelationEngine {
  correlate(input: CorrelationInput): CorrelatedFinding | undefined {
    const { event, behavior, patterns = [], indicators = [] } = input;
    if (!behavior && patterns.length === 0 && indicators.length === 0) {
      return undefined;
    }

    const relatedEntities = new Set<string>();
    if (event.context?.sessionId) {
      relatedEntities.add(event.context.sessionId);
    }
    if (event.context?.ip) {
      relatedEntities.add(event.context.ip);
    }

    const strength = this.calculateStrength(behavior, patterns, indicators);
    return {
      entityId: event.entityId,
      indicators,
      relatedEntities: [...relatedEntities],
      strength,
      notes: this.buildNotes(behavior, patterns, indicators),
    } satisfies CorrelatedFinding;
  }

  private calculateStrength(
    behavior?: BehaviorInsight,
    patterns: PatternMatch[] = [],
    indicators: ThreatIntelIndicator[] = [],
  ): number {
    const behaviorScore = behavior?.score ?? 0;
    const patternScore = patterns.reduce((sum, pattern) => sum + pattern.weight, 0);
    const intelConfidence = indicators.reduce(
      (sum, indicator) => sum + indicator.confidence,
      0,
    );
    const normalizedIntel = intelConfidence / Math.max(indicators.length, 1);
    return Number(Math.min(behaviorScore + patternScore + normalizedIntel * 0.01, 1).toFixed(2));
  }

  private buildNotes(
    behavior?: BehaviorInsight,
    patterns: PatternMatch[] = [],
    indicators: ThreatIntelIndicator[] = [],
  ): string[] {
    const notes: string[] = [];
    if (behavior) {
      notes.push(...behavior.rationale);
    }
    for (const pattern of patterns) {
      notes.push(`pattern match: ${pattern.pattern}`);
    }
    for (const indicator of indicators) {
      notes.push(`intel hit: ${indicator.type}:${indicator.value} (${indicator.source})`);
    }
    return notes;
  }
}
