import {
  FreshnessRisk,
  KnowledgeSource,
  RouteDecision,
  RoutingConfig,
  RoutingError,
  RoutingQuery,
} from './types';

const riskRank: Record<FreshnessRisk, number> = {
  low: 0,
  medium: 1,
  high: 2,
};

const wildcardJurisdiction = '*';

const toTime = (value: Date | undefined): number | undefined =>
  value?.getTime();

const cloneSource = (source: KnowledgeSource): KnowledgeSource => ({
  ...source,
  knowledgeCutoff: new Date(source.knowledgeCutoff),
  validFrom: source.validFrom ? new Date(source.validFrom) : undefined,
  jurisdictions: [...source.jurisdictions],
  metadata: source.metadata ? { ...source.metadata } : undefined,
});

export class KnowledgeCutoffRouter {
  private readonly sources: KnowledgeSource[];

  constructor(private readonly config: RoutingConfig) {
    if (!config.sources?.length) {
      throw new RoutingError('KnowledgeCutoffRouter requires at least one source');
    }

    this.sources = config.sources
      .map((source) => ({
        ...cloneSource(source),
        jurisdictions: source.jurisdictions.length
          ? source.jurisdictions.map((j) => j.toUpperCase())
          : [wildcardJurisdiction],
      }))
      .sort((a, b) => {
        const cutoff = toTime(b.knowledgeCutoff)! - toTime(a.knowledgeCutoff)!;
        if (cutoff !== 0) {
          return cutoff;
        }
        const risk = riskRank[a.freshnessRisk] - riskRank[b.freshnessRisk];
        if (risk !== 0) {
          return risk;
        }
        if (a.type !== b.type) {
          return a.type === 'snapshot' ? -1 : 1;
        }
        return a.id.localeCompare(b.id);
      });
  }

  route(query: RoutingQuery): RouteDecision {
    if (!query.requestedDate) {
      throw new RoutingError('Routing query missing requestedDate');
    }

    const jurisdiction = this.resolveJurisdiction(query);
    const tolerance = query.riskTolerance ?? 'medium';
    const reasons: string[] = [];

    const candidates = this.sources.filter((source) => {
      if (!this.matchesJurisdiction(source, jurisdiction)) {
        return false;
      }

      const cutoffTime = toTime(source.knowledgeCutoff)!;
      const queryTime = toTime(query.requestedDate)!;
      if (cutoffTime > queryTime) {
        return false;
      }

      const validFrom = toTime(source.validFrom);
      if (typeof validFrom === 'number' && validFrom > queryTime) {
        return false;
      }

      return riskRank[source.freshnessRisk] <= riskRank[tolerance];
    });

    if (!candidates.length) {
      throw new RoutingError('No compatible knowledge source found', {
        jurisdiction,
        requestedDate: query.requestedDate.toISOString(),
        riskTolerance: tolerance,
      });
    }

    const best = [...candidates].sort((a, b) => {
      const cutoff = toTime(b.knowledgeCutoff)! - toTime(a.knowledgeCutoff)!;
      if (cutoff !== 0) {
        return cutoff;
      }
      const risk = riskRank[a.freshnessRisk] - riskRank[b.freshnessRisk];
      if (risk !== 0) {
        return risk;
      }
      if (a.type !== b.type) {
        return a.type === 'snapshot' ? -1 : 1;
      }
      return a.id.localeCompare(b.id);
    })[0];

    reasons.push(
      `selected highest allowable cutoff (${best.knowledgeCutoff.toISOString()}) for ${jurisdiction}`,
    );

    reasons.push(`freshness risk ${best.freshnessRisk} within tolerance ${tolerance}`);

    return {
      source: cloneSource(best),
      reasons,
    };
  }

  private resolveJurisdiction(query: RoutingQuery): string {
    const jurisdiction = query.jurisdiction ?? this.config.defaultJurisdiction;
    if (!jurisdiction) {
      throw new RoutingError('Routing query missing jurisdiction and no default provided');
    }
    return jurisdiction.toUpperCase();
  }

  private matchesJurisdiction(source: KnowledgeSource, jurisdiction: string): boolean {
    return (
      source.jurisdictions.includes(wildcardJurisdiction) ||
      source.jurisdictions.includes(jurisdiction)
    );
  }
}
