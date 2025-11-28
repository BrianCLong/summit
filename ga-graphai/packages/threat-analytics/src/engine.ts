import { AlertManager } from './alert-manager';
import { BehavioralModel } from './behavioral-model';
import { CorrelationEngine } from './correlation-engine';
import { EntityResolver } from './entity-resolution';
import { PatternRecognizer, defaultPatterns } from './pattern-recognition';
import { DetectionRuleEngine } from './rule-engine';
import { ThreatScorer } from './threat-scoring';
import { TemporalAnalyzer } from './temporal-analysis';
import { TriageEngine } from './triage';
import type {
  BehaviorEvent,
  DetectionRule,
  ThreatAlert,
  ThreatAnalyticsOptions,
  ThreatIntelClient,
  ThreatIntelIndicator,
} from './types';

function matchIndicators(
  event: BehaviorEvent,
  indicators: ThreatIntelIndicator[],
): ThreatIntelIndicator[] {
  const matches: ThreatIntelIndicator[] = [];
  for (const indicator of indicators) {
    if (indicator.type === 'ip' && indicator.value === event.context?.ip) {
      matches.push(indicator);
    }
    if (indicator.type === 'user' && indicator.value === event.actor) {
      matches.push(indicator);
    }
    if (indicator.type === 'domain' && typeof event.attributes?.host === 'string') {
      if ((event.attributes.host as string).includes(indicator.value)) {
        matches.push(indicator);
      }
    }
    if (indicator.type === 'hash' && event.attributes?.hash === indicator.value) {
      matches.push(indicator);
    }
    if (indicator.type === 'uri' && typeof event.attributes?.uri === 'string') {
      if ((event.attributes.uri as string).includes(indicator.value)) {
        matches.push(indicator);
      }
    }
  }
  return matches;
}

export class ThreatAnalyticsEngine {
  private readonly behavior: BehavioralModel;

  private readonly patterns: PatternRecognizer;

  private readonly temporal = new TemporalAnalyzer();

  private readonly correlation = new CorrelationEngine();

  private readonly triage = new TriageEngine();

  private readonly alerts = new AlertManager();

  private readonly entities = new EntityResolver();

  private readonly rules: DetectionRuleEngine;

  private readonly scorer = new ThreatScorer();

  private readonly intelClients: ThreatIntelClient[] = [];

  private intelIndicators: ThreatIntelIndicator[] = [];

  private readonly intelOptions: Required<ThreatAnalyticsOptions['intel']>;

  constructor(options?: ThreatAnalyticsOptions) {
    this.behavior = new BehavioralModel(options?.behavior);
    this.patterns = new PatternRecognizer(options?.patternLibrary ?? defaultPatterns());
    this.rules = new DetectionRuleEngine(options?.rules ?? []);
    this.intelOptions = {
      minConfidence: options?.intel?.minConfidence ?? 0,
      now: options?.intel?.now ?? Date.now,
    } satisfies Required<ThreatAnalyticsOptions['intel']>;
  }

  registerIntelClient(client: ThreatIntelClient): void {
    this.intelClients.push(client);
  }

  registerRule(rule: DetectionRule): void {
    this.rules.register(rule);
  }

  registerEntity(profile: Parameters<EntityResolver['registerProfile']>[0]): void {
    this.entities.registerProfile(profile);
  }

  async syncIntel(): Promise<ThreatIntelIndicator[]> {
    const indicators: ThreatIntelIndicator[] = [];
    for (const client of this.intelClients) {
      const fetched = await client.fetchIndicators();
      indicators.push(...fetched);
    }

    const now = this.intelOptions.now();
    const byKey = new Map<string, ThreatIntelIndicator>();
    for (const indicator of indicators) {
      if (indicator.confidence < this.intelOptions.minConfidence) {
        continue;
      }
      if (indicator.validUntil) {
        const expires = Date.parse(indicator.validUntil);
        if (Number.isFinite(expires) && expires < now) {
          continue;
        }
      }

      const key = `${indicator.type}:${indicator.value}`;
      const existing = byKey.get(key);
      if (!existing) {
        byKey.set(key, indicator);
        continue;
      }

      if (indicator.confidence > existing.confidence) {
        byKey.set(key, indicator);
      } else if (indicator.confidence === existing.confidence) {
        const existingExpiry = existing.validUntil ? Date.parse(existing.validUntil) : undefined;
        const candidateExpiry = indicator.validUntil ? Date.parse(indicator.validUntil) : undefined;
        if (
          existingExpiry !== undefined && candidateExpiry !== undefined &&
          Number.isFinite(existingExpiry) &&
          Number.isFinite(candidateExpiry) &&
          candidateExpiry > existingExpiry
        ) {
          byKey.set(key, indicator);
        }
      }
    }

    this.intelIndicators = Array.from(byKey.values());
    return this.intelIndicators;
  }

  processEvent(event: BehaviorEvent): ThreatAlert[] {
    const resolved = this.entities.resolve(event);
    const behavior = this.behavior.analyze(resolved);
    const patternMatches = this.patterns.observe(resolved);
    const temporal = this.temporal.observe(resolved);
    const indicatorHits = matchIndicators(resolved, this.intelIndicators);
    const correlation = this.correlation.correlate({
      event: resolved,
      behavior: behavior ?? undefined,
      patterns: patternMatches,
      indicators: indicatorHits,
    });
    const ruleHits = this.rules.evaluate({
      event: resolved,
      behavior: behavior ?? undefined,
      patterns: patternMatches,
      temporal,
      indicators: indicatorHits,
    });
    const score = this.scorer.score(
      resolved.entityId,
      behavior ?? undefined,
      patternMatches,
      correlation,
      ruleHits.map((rule) => rule.id),
    );
    const triage = this.triage.plan(score);

    const alerts: ThreatAlert[] = [];
    if (behavior || patternMatches.length > 0 || ruleHits.length > 0 || indicatorHits.length > 0) {
      alerts.push(
        this.alerts.raise({
          entityId: resolved.entityId,
          title: 'Advanced threat detection alert',
          description: this.describeAlert(score, patternMatches, indicatorHits),
          severity: score.severity,
          score: score.score,
          indicators: indicatorHits,
          patternMatches,
          behavior: behavior ?? undefined,
          temporal,
          triage,
          ruleIds: ruleHits.map((rule) => rule.id),
        }),
      );
    }
    return alerts;
  }

  listAlerts(): ThreatAlert[] {
    return this.alerts.list();
  }

  private describeAlert(
    score: ReturnType<ThreatScorer['score']>,
    patterns: ReturnType<PatternRecognizer['observe']>,
    indicators: ThreatIntelIndicator[],
  ): string {
    const parts = [`composite threat score ${score.score.toFixed(2)} (${score.severity})`];
    if (patterns.length > 0) {
      parts.push(`patterns: ${patterns.map((p) => p.pattern).join(', ')}`);
    }
    if (indicators.length > 0) {
      parts.push(`intel hits: ${indicators.map((i) => `${i.type}:${i.value}`).join(', ')}`);
    }
    return parts.join(' | ');
  }
}
