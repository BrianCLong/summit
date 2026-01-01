import { AssembledContext, ContextSegment } from "../types";
import { PoisoningIndicator } from "../analysis/divergenceAnalysis";

export interface PoisoningResponse {
  suppressedSegmentIds: string[];
  quarantinedSegmentIds: string[];
  warnings: string[];
}

export class PoisoningResponder {
  suppress(context: AssembledContext, indicators: PoisoningIndicator[]): PoisoningResponse {
    const suspectIds = new Set(indicators.map((indicator) => indicator.mutatedSegmentId).filter(Boolean));
    const retainedSegments: ContextSegment[] = context.segments.filter(
      (segment) => !suspectIds.has(segment.metadata.id)
    );

    return {
      suppressedSegmentIds: Array.from(suspectIds) as string[],
      quarantinedSegmentIds: [],
      warnings: this.buildWarnings(context.segments.length, retainedSegments.length),
    };
  }

  quarantine(indicators: PoisoningIndicator[]): PoisoningResponse {
    return {
      suppressedSegmentIds: [],
      quarantinedSegmentIds: indicators
        .map((indicator) => indicator.mutatedSegmentId)
        .filter((id): id is string => Boolean(id)),
      warnings: indicators.map(
        (indicator) => `Segment ${indicator.mutatedSegmentId ?? "unknown"} quarantined due to divergence`
      ),
    };
  }

  private buildWarnings(originalCount: number, retainedCount: number): string[] {
    if (originalCount === retainedCount) return [];
    return [
      `Suppressed ${originalCount - retainedCount} segment(s) due to poisoning indicators; retained ${retainedCount}.`,
    ];
  }
}
