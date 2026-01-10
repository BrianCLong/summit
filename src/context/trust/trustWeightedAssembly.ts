import {
  AssembledContext,
  ContextSegment,
  ContextValidationResult,
  InvariantViolation,
} from "../types";

export interface TrustWeightedContextAssemblerConfig {
  maxSegments?: number;
  minTrustWeight?: number;
  enforceInvariants?: boolean;
}

export interface TrustWeightedAssemblyReport {
  context: AssembledContext;
  violations: InvariantViolation[];
  droppedSegmentIds: string[];
}

export class TrustWeightedContextAssembler {
  constructor(private readonly defaultMaxSegments: number = 50) {}

  assemble(
    segments: ContextSegment[],
    config: TrustWeightedContextAssemblerConfig = {}
  ): AssembledContext {
    return this.assembleWithReport(segments, config).context;
  }

  assembleWithReport(
    segments: ContextSegment[],
    config: TrustWeightedContextAssemblerConfig = {}
  ): TrustWeightedAssemblyReport {
    const maxSegments = config.maxSegments ?? this.defaultMaxSegments;
    const minTrustWeight = config.minTrustWeight ?? 0;
    const enforceInvariants = config.enforceInvariants ?? false;

    const { violations, invalidSegmentIds } = this.validateSegments(segments);
    const byTrust = segments.filter((segment) => segment.trustWeight.value >= minTrustWeight);
    const filtered = enforceInvariants
      ? byTrust.filter((segment) => !invalidSegmentIds.has(segment.metadata.id))
      : byTrust;

    const sorted = this.sortSegments(filtered).slice(0, maxSegments);
    const droppedSegmentIds = segments
      .filter((segment) => !sorted.includes(segment))
      .map((segment) => segment.metadata.id);

    return {
      context: {
        id: this.buildContextId(sorted),
        segments: sorted,
        encoded: this.encode(sorted),
      },
      violations,
      droppedSegmentIds,
    };
  }

  encode(segments: ContextSegment[]): unknown {
    return segments.map((segment) => ({
      id: segment.metadata.id,
      source: segment.metadata.source,
      content: segment.content,
      weight: segment.trustWeight.value,
      labels: segment.metadata.labels,
    }));
  }

  validateSegments(segments: ContextSegment[]): ContextValidationResult & { invalidSegmentIds: Set<string> } {
    const violations: InvariantViolation[] = [];
    const invalidSegmentIds = new Set<string>();

    segments.forEach((segment) => {
      segment.invariants.forEach((invariant) => {
        if (!invariant.validate(segment.content)) {
          violations.push({
            segmentId: segment.metadata.id,
            invariantId: invariant.id,
            description: invariant.description,
          });
          invalidSegmentIds.add(segment.metadata.id);
        }
      });
    });

    return {
      isValid: violations.length === 0,
      violations,
      invalidSegmentIds,
    };
  }

  private sortSegments(segments: ContextSegment[]): ContextSegment[] {
    return [...segments].sort((a, b) => {
      const weightDelta = b.trustWeight.value - a.trustWeight.value;
      if (weightDelta !== 0) return weightDelta;
      const timeDelta = a.metadata.createdAt.getTime() - b.metadata.createdAt.getTime();
      if (timeDelta !== 0) return timeDelta;
      return a.metadata.id.localeCompare(b.metadata.id);
    });
  }

  private buildContextId(segments: ContextSegment[]): string {
    const signature = segments
      .map((segment) => `${segment.metadata.id}:${segment.trustWeight.value}`)
      .join("|");
    return `assembled-${segments.length}-${signature}`;
  }
}
