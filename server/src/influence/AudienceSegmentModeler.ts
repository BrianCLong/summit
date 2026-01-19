import {
  Actor,
  SocialPost,
  AudienceSegmentGraph,
  AudienceSegment,
  AudienceTrustEdge,
  NarrativeUptakeMetric,
  NarrativeTechnique,
  ProtectiveNarrative,
  MessengerProfile,
  SegmentRiskProfile,
} from './types';

interface TrustRelationship {
  targetActorId: string;
  trustScore: number;
}

interface SegmentAccumulator {
  id: string;
  label: string;
  identityCluster: string;
  mediaDiet: Set<string>;
  priorBeliefs: Set<string>;
  cognitiveVulnerabilities: Map<string, number>;
  resilienceSignals: Map<string, number>;
  trustedMessengers: Map<string, number>;
  actorIds: Set<string>;
}

interface TrustEdgeAccumulator {
  trustScoreTotal: number;
  evidenceActorIds: Set<string>;
  count: number;
}

interface NarrativeUptakeAccumulator {
  exposureCount: number;
  engagementTotal: number;
  shareTotal: number;
  sentimentTotal: number;
  sentimentCount: number;
}

export class AudienceSegmentModeler {
  public buildAudienceSegmentGraph(
    actors: Actor[],
    posts: SocialPost[],
  ): AudienceSegmentGraph {
    const actorById = new Map(actors.map((actor) => [actor.id, actor]));
    const segmentAccumulators = new Map<string, SegmentAccumulator>();
    const actorToSegment = new Map<string, string>();

    for (const actor of actors) {
      const identityCluster =
        this.getStringValue(actor.metadata?.identityCluster) ?? 'unattributed';
      const mediaDiet = this.getStringArray(actor.metadata?.mediaDiet);
      const priorBeliefs = this.getStringArray(actor.metadata?.priorBeliefs);
      const vulnerabilities = this.getStringArray(
        actor.metadata?.cognitiveVulnerabilities,
      );
      const resilienceSignals = this.getStringArray(
        actor.metadata?.resilienceSignals,
      );
      const trustedMessengers = this.getStringArray(
        actor.metadata?.trustedMessengers,
      );

      const segmentKey = this.buildSegmentKey(
        identityCluster,
        mediaDiet,
        priorBeliefs,
      );
      const segmentId = this.hashKey(segmentKey);
      const label = `${identityCluster} / ${mediaDiet.join('+') || 'mixed'}`;

      if (!segmentAccumulators.has(segmentId)) {
        segmentAccumulators.set(segmentId, {
          id: segmentId,
          label,
          identityCluster,
          mediaDiet: new Set(),
          priorBeliefs: new Set(),
          cognitiveVulnerabilities: new Map(),
          resilienceSignals: new Map(),
          trustedMessengers: new Map(),
          actorIds: new Set(),
        });
      }

      const accumulator = segmentAccumulators.get(segmentId)!;
      mediaDiet.forEach((item) => accumulator.mediaDiet.add(item));
      priorBeliefs.forEach((item) => accumulator.priorBeliefs.add(item));
      vulnerabilities.forEach((item) =>
        accumulator.cognitiveVulnerabilities.set(
          item,
          (accumulator.cognitiveVulnerabilities.get(item) ?? 0) + 1,
        ),
      );
      resilienceSignals.forEach((item) =>
        accumulator.resilienceSignals.set(
          item,
          (accumulator.resilienceSignals.get(item) ?? 0) + 1,
        ),
      );
      trustedMessengers.forEach((item) =>
        accumulator.trustedMessengers.set(
          item,
          (accumulator.trustedMessengers.get(item) ?? 0) + 1,
        ),
      );
      accumulator.actorIds.add(actor.id);
      actorToSegment.set(actor.id, segmentId);
    }

    const narrativeUptakeBySegment = this.aggregateNarrativeUptake(
      posts,
      actorToSegment,
    );
    const trustEdges = this.aggregateTrustEdges(
      actors,
      actorToSegment,
      actorById,
    );

    const segments: AudienceSegment[] = Array.from(
      segmentAccumulators.values(),
    ).map((accumulator) => ({
      id: accumulator.id,
      label: accumulator.label,
      identityCluster: accumulator.identityCluster,
      mediaDiet: Array.from(accumulator.mediaDiet),
      priorBeliefs: Array.from(accumulator.priorBeliefs),
      cognitiveVulnerabilities: this.rankTopKeys(
        accumulator.cognitiveVulnerabilities,
      ),
      resilienceSignals: this.rankTopKeys(accumulator.resilienceSignals),
      trustedMessengers: this.rankTopKeys(accumulator.trustedMessengers),
      size: accumulator.actorIds.size,
      narrativeUptake: narrativeUptakeBySegment.get(accumulator.id) ?? [],
    }));

    return {
      segments,
      trustEdges,
    };
  }

  public scoreSegmentRisks(
    segments: AudienceSegment[],
    techniques: NarrativeTechnique[],
    protectiveNarratives: ProtectiveNarrative[],
    messengers: MessengerProfile[],
  ): SegmentRiskProfile[] {
    const profiles: SegmentRiskProfile[] = [];

    for (const segment of segments) {
      for (const technique of techniques) {
        const vulnerabilityScore = this.calculateVulnerabilityScore(
          segment,
          technique,
        );
        const resilienceScore = this.calculateResilienceScore(
          segment,
          technique,
          protectiveNarratives,
          messengers,
        );
        const recommendations = this.recommendResilienceAssets(
          segment,
          technique,
          protectiveNarratives,
          messengers,
        );

        profiles.push({
          segmentId: segment.id,
          techniqueId: technique.id,
          vulnerabilityScore,
          resilienceScore,
          recommendedProtectiveNarratives:
            recommendations.protectiveNarratives,
          recommendedMessengers: recommendations.messengers,
        });
      }
    }

    return profiles;
  }

  private aggregateNarrativeUptake(
    posts: SocialPost[],
    actorToSegment: Map<string, string>,
  ): Map<string, NarrativeUptakeMetric[]> {
    const uptakeBySegment = new Map<
      string,
      Map<string, NarrativeUptakeAccumulator>
    >();

    for (const post of posts) {
      const segmentId = actorToSegment.get(post.authorId);
      if (!segmentId) continue;

      const narrativeId =
        this.getStringValue(post.metadata?.narrativeId) ??
        this.getStringValue(post.metadata?.narrative) ??
        'unknown';

      if (!uptakeBySegment.has(segmentId)) {
        uptakeBySegment.set(segmentId, new Map());
      }

      const segmentMap = uptakeBySegment.get(segmentId)!;
      if (!segmentMap.has(narrativeId)) {
        segmentMap.set(narrativeId, {
          exposureCount: 0,
          engagementTotal: 0,
          shareTotal: 0,
          sentimentTotal: 0,
          sentimentCount: 0,
        });
      }

      const accumulator = segmentMap.get(narrativeId)!;
      accumulator.exposureCount += 1;
      accumulator.engagementTotal += this.getNumericValue(post.metadata?.likes);
      accumulator.engagementTotal += this.getNumericValue(post.metadata?.comments);
      accumulator.shareTotal += this.getNumericValue(post.metadata?.shares);
      const sentimentScore = this.getNumericValue(
        post.metadata?.sentimentScore,
      );
      if (sentimentScore > 0) {
        accumulator.sentimentTotal += sentimentScore;
        accumulator.sentimentCount += 1;
      }
    }

    const result = new Map<string, NarrativeUptakeMetric[]>();

    for (const [segmentId, narrativeMap] of uptakeBySegment.entries()) {
      const metrics = Array.from(narrativeMap.entries()).map(
        ([narrativeId, accumulator]) => ({
          narrativeId,
          exposureCount: accumulator.exposureCount,
          engagementRate:
            accumulator.exposureCount === 0
              ? 0
              : accumulator.engagementTotal / accumulator.exposureCount,
          shareRate:
            accumulator.exposureCount === 0
              ? 0
              : accumulator.shareTotal / accumulator.exposureCount,
          sentimentAverage:
            accumulator.sentimentCount === 0
              ? 0
              : accumulator.sentimentTotal / accumulator.sentimentCount,
        }),
      );

      result.set(segmentId, metrics);
    }

    return result;
  }

  private aggregateTrustEdges(
    actors: Actor[],
    actorToSegment: Map<string, string>,
    actorById: Map<string, Actor>,
  ): AudienceTrustEdge[] {
    const edgeMap = new Map<string, TrustEdgeAccumulator>();

    for (const actor of actors) {
      const sourceSegmentId = actorToSegment.get(actor.id);
      if (!sourceSegmentId) continue;
      const trustRelationships = this.getTrustRelationships(
        actor.metadata?.trustRelationships,
      );

      for (const relationship of trustRelationships) {
        const targetActor = actorById.get(relationship.targetActorId);
        if (!targetActor) continue;
        const targetSegmentId = actorToSegment.get(targetActor.id);
        if (!targetSegmentId) continue;

        const edgeKey = `${sourceSegmentId}->${targetSegmentId}`;
        if (!edgeMap.has(edgeKey)) {
          edgeMap.set(edgeKey, {
            trustScoreTotal: 0,
            evidenceActorIds: new Set(),
            count: 0,
          });
        }

        const accumulator = edgeMap.get(edgeKey)!;
        accumulator.trustScoreTotal += relationship.trustScore;
        accumulator.count += 1;
        accumulator.evidenceActorIds.add(actor.id);
      }
    }

    return Array.from(edgeMap.entries()).map(([key, accumulator]) => {
      const [sourceSegmentId, targetSegmentId] = key.split('->');
      return {
        sourceSegmentId,
        targetSegmentId,
        trustScore:
          accumulator.count === 0
            ? 0
            : accumulator.trustScoreTotal / accumulator.count,
        evidenceActorIds: Array.from(accumulator.evidenceActorIds),
      };
    });
  }

  private calculateVulnerabilityScore(
    segment: AudienceSegment,
    technique: NarrativeTechnique,
  ): number {
    const cognitiveMatch = this.overlapScore(
      segment.cognitiveVulnerabilities,
      technique.cognitiveBiases,
    );
    const channelMatch = this.overlapScore(
      segment.mediaDiet,
      technique.channelPreferences,
    );
    const uptakePressure = this.averageEngagement(segment.narrativeUptake);

    const score =
      technique.potency *
      (0.4 + 0.35 * cognitiveMatch + 0.2 * channelMatch + 0.05 * uptakePressure);

    return this.clamp(score, 0, 1);
  }

  private calculateResilienceScore(
    segment: AudienceSegment,
    technique: NarrativeTechnique,
    protectiveNarratives: ProtectiveNarrative[],
    messengers: MessengerProfile[],
  ): number {
    const matchingNarratives = this.matchProtectiveNarratives(
      segment,
      technique,
      protectiveNarratives,
    );
    const matchingMessengers = this.matchMessengers(segment, messengers);

    const narrativeBoost = this.clamp(
      matchingNarratives.length / Math.max(protectiveNarratives.length, 1),
      0,
      1,
    );
    const messengerBoost = this.clamp(
      matchingMessengers.reduce(
        (sum, messenger) => sum + messenger.credibilityScore,
        0,
      ) / Math.max(matchingMessengers.length, 1),
      0,
      1,
    );

    const resilienceSignalScore = this.clamp(
      segment.resilienceSignals.length / 5,
      0,
      1,
    );

    return this.clamp(
      0.2 + 0.4 * narrativeBoost + 0.3 * messengerBoost + 0.1 * resilienceSignalScore,
      0,
      1,
    );
  }

  private recommendResilienceAssets(
    segment: AudienceSegment,
    technique: NarrativeTechnique,
    protectiveNarratives: ProtectiveNarrative[],
    messengers: MessengerProfile[],
  ): { protectiveNarratives: string[]; messengers: string[] } {
    const matchingNarratives = this.matchProtectiveNarratives(
      segment,
      technique,
      protectiveNarratives,
    );
    const matchingMessengers = this.matchMessengers(segment, messengers);

    return {
      protectiveNarratives: matchingNarratives.map((narrative) => narrative.id),
      messengers: matchingMessengers.map((messenger) => messenger.id),
    };
  }

  private matchProtectiveNarratives(
    segment: AudienceSegment,
    technique: NarrativeTechnique,
    protectiveNarratives: ProtectiveNarrative[],
  ): ProtectiveNarrative[] {
    return protectiveNarratives.filter((narrative) => {
      const techniqueMatch = narrative.targetTechniqueIds.includes(
        technique.id,
      );
      const themeMatch = this.overlapScore(
        segment.resilienceSignals,
        narrative.themes,
      );
      const beliefMatch = this.overlapScore(segment.priorBeliefs, narrative.themes);
      return techniqueMatch && (themeMatch > 0 || beliefMatch > 0);
    });
  }

  private matchMessengers(
    segment: AudienceSegment,
    messengers: MessengerProfile[],
  ): MessengerProfile[] {
    return messengers
      .filter(
        (messenger) =>
          segment.trustedMessengers.includes(messenger.id) ||
          this.overlapScore(segment.priorBeliefs, messenger.themes) > 0,
      )
      .sort((a, b) => b.credibilityScore - a.credibilityScore)
      .slice(0, 3);
  }

  private averageEngagement(uptake: NarrativeUptakeMetric[]): number {
    if (uptake.length === 0) return 0;
    const total = uptake.reduce((sum, metric) => sum + metric.engagementRate, 0);
    return total / uptake.length;
  }

  private buildSegmentKey(
    identityCluster: string,
    mediaDiet: string[],
    priorBeliefs: string[],
  ): string {
    return [
      identityCluster,
      this.sortAndJoin(mediaDiet),
      this.sortAndJoin(priorBeliefs),
    ].join('|');
  }

  private rankTopKeys(source: Map<string, number>): string[] {
    return Array.from(source.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([key]) => key);
  }

  private sortAndJoin(values: string[]): string {
    return values.slice().sort().join(',');
  }

  private getStringArray(value: unknown): string[] {
    if (!Array.isArray(value)) return [];
    return value.filter((item): item is string => typeof item === 'string');
  }

  private getStringValue(value: unknown): string | null {
    return typeof value === 'string' && value.trim().length > 0
      ? value.trim()
      : null;
  }

  private getNumericValue(value: unknown): number {
    return typeof value === 'number' && Number.isFinite(value) ? value : 0;
  }

  private getTrustRelationships(value: unknown): TrustRelationship[] {
    if (!Array.isArray(value)) return [];
    return value.filter((item): item is TrustRelationship => {
      if (!item || typeof item !== 'object') return false;
      const candidate = item as TrustRelationship;
      return (
        typeof candidate.targetActorId === 'string' &&
        typeof candidate.trustScore === 'number'
      );
    });
  }

  private overlapScore(source: string[], target: string[]): number {
    if (source.length === 0 || target.length === 0) return 0;
    const targetSet = new Set(target);
    const matches = source.filter((item) => targetSet.has(item)).length;
    return matches / Math.max(targetSet.size, 1);
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }

  private hashKey(value: string): string {
    let hash = 0;
    for (let i = 0; i < value.length; i += 1) {
      hash = (hash << 5) - hash + value.charCodeAt(i);
      hash |= 0;
    }
    return `SEG_${Math.abs(hash)}`;
  }
}
