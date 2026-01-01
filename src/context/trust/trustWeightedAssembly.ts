import { AssembledContext, ContextSegment } from "../types";

export interface TrustWeightedContextAssemblerConfig {
  maxSegments?: number;
  minTrustWeight?: number;
}

export class TrustWeightedContextAssembler {
  constructor(private readonly defaultMaxSegments: number = 50) {}

  assemble(
    segments: ContextSegment[],
    config: TrustWeightedContextAssemblerConfig = {}
  ): AssembledContext {
    const maxSegments = config.maxSegments ?? this.defaultMaxSegments;
    const minTrustWeight = config.minTrustWeight ?? 0;

    const filtered = segments
      .filter((segment) => segment.trustWeight.value >= minTrustWeight)
      .sort((a, b) => b.trustWeight.value - a.trustWeight.value)
      .slice(0, maxSegments);

    return {
      id: `assembled-${Date.now()}`,
      segments: filtered,
      encoded: this.encode(filtered),
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
}
