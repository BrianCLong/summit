import type { ThreatAlert, ThreatIntelIndicator, ThreatSeverity } from './types';

interface AlertInput {
  entityId: string;
  title: string;
  description: string;
  severity: ThreatSeverity;
  score: number;
  indicators: ThreatIntelIndicator[];
  patternMatches: ThreatAlert['patternMatches'];
  behavior?: ThreatAlert['behavior'];
  temporal?: ThreatAlert['temporal'];
  triage: ThreatAlert['triage'];
  ruleIds?: string[];
}

export class AlertManager {
  private readonly activeAlerts = new Map<string, ThreatAlert>();

  raise(input: AlertInput): ThreatAlert {
    const dedupeKey = `${input.entityId}:${input.title}`;
    const existing = this.activeAlerts.get(dedupeKey);
    const createdAt = existing?.createdAt ?? new Date().toISOString();
    const severity = this.escalateSeverity(existing?.severity, input.severity);
    const score = Math.max(existing?.score ?? 0, input.score);
    const mergedIndicators = this.mergeIndicators(existing?.indicators ?? [], input.indicators);

    const alert: ThreatAlert = {
      id: existing?.id ?? dedupeKey,
      entityId: input.entityId,
      title: input.title,
      description: input.description,
      severity,
      score,
      indicators: mergedIndicators,
      patternMatches: input.patternMatches,
      behavior: input.behavior,
      temporal: input.temporal,
      triage: input.triage,
      createdAt,
      ruleIds: input.ruleIds,
    };
    this.activeAlerts.set(dedupeKey, alert);
    return alert;
  }

  list(): ThreatAlert[] {
    return Array.from(this.activeAlerts.values());
  }

  private escalateSeverity(current: ThreatSeverity | undefined, incoming: ThreatSeverity): ThreatSeverity {
    const order: ThreatSeverity[] = ['info', 'low', 'medium', 'high', 'critical'];
    if (!current) return incoming;
    return order[Math.max(order.indexOf(current), order.indexOf(incoming))];
  }

  private mergeIndicators(
    existing: ThreatIntelIndicator[],
    incoming: ThreatIntelIndicator[],
  ): ThreatIntelIndicator[] {
    const combined = [...existing];
    for (const indicator of incoming) {
      if (!combined.find((item) => item.value === indicator.value && item.type === indicator.type)) {
        combined.push(indicator);
      }
    }
    return combined;
  }
}
