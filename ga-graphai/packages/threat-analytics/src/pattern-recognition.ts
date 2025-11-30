import type { BehaviorEvent, PatternMatch } from './types';

export interface PatternDefinition {
  name: string;
  weight: number;
  description: string;
  matcher: (events: BehaviorEvent[]) => boolean;
}

export class PatternRecognizer {
  private readonly definitions: PatternDefinition[];

  private readonly windows = new Map<string, BehaviorEvent[]>();

  constructor(definitions: PatternDefinition[]) {
    this.definitions = definitions;
  }

  observe(event: BehaviorEvent): PatternMatch[] {
    const window = this.windows.get(event.entityId) ?? [];
    window.push(event);
    const sorted = [...window].sort((a, b) => a.timestamp - b.timestamp);
    this.windows.set(event.entityId, sorted.slice(-25));

    const matches: PatternMatch[] = [];
    for (const definition of this.definitions) {
      if (definition.matcher(sorted)) {
        matches.push({
          entityId: event.entityId,
          pattern: definition.name,
          weight: definition.weight,
          evidence: [definition.description],
          window: [...sorted],
        });
      }
    }
    return matches;
  }
}

export function defaultPatterns(): PatternDefinition[] {
  return [
    {
      name: 'credential-stuffing',
      weight: 0.6,
      description: 'burst of failed authentications followed by success',
      matcher: (events) => {
        const failures = events.filter((e) => e.action === 'auth.fail');
        const successAfter = events.find((e) => e.action === 'auth.success');
        return failures.length >= 3 && !!successAfter;
      },
    },
    {
      name: 'lateral-movement',
      weight: 0.7,
      description: 'pivoting between hosts or sessions in short window',
      matcher: (events) => {
        const pivots = new Set(events.map((e) => e.context?.sessionId).filter(Boolean));
        return pivots.size >= 3;
      },
    },
    {
      name: 'data-exfiltration',
      weight: 0.8,
      description: 'sustained high-volume transfer actions',
      matcher: (events) => {
        const transfers = events.filter((e) => e.action === 'transfer.bytes');
        const volume = transfers.reduce((sum, e) => sum + (e.value ?? 0), 0);
        return transfers.length >= 2 && volume > 50_000;
      },
    },
  ];
}
