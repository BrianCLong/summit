import { AssembledContext, ContextSegment } from "../types";
import { PoisoningIndicator } from "../analysis/divergenceAnalysis";

export interface PoisoningResponse {
  suppressedSegmentIds: string[];
  quarantinedSegmentIds: string[];
  rationale: Record<string, string>;
}

export class PoisoningResponder {
  constructor(private readonly quarantine: (segment: ContextSegment) => void = () => undefined) {}

  apply(context: AssembledContext, indicators: PoisoningIndicator[]): PoisoningResponse {
    const suppressedSegmentIds = new Set<string>();
    const quarantinedSegmentIds = new Set<string>();
    const rationale: Record<string, string> = {};

    indicators.forEach((indicator) => {
      suppressedSegmentIds.add(indicator.segmentId);
      rationale[indicator.segmentId] = `Divergence ${indicator.divergence.toFixed(2)} detected via ${indicator.modification}`;
    });

    indicators.forEach((indicator) => {
      const segment = context.segments.find((candidate) => candidate.metadata.id === indicator.segmentId);
      if (segment) {
        quarantinedSegmentIds.add(segment.metadata.id);
        this.quarantine(segment);
      }
    });

    return {
      suppressedSegmentIds: Array.from(suppressedSegmentIds),
      quarantinedSegmentIds: Array.from(quarantinedSegmentIds),
      rationale
    };
  }
}
