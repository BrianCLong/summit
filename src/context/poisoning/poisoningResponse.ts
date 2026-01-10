import { AssembledContext, ContextSegment } from "../types";
import { PoisoningIndicator } from "../analysis/divergenceAnalysis";

export interface PoisoningResponse {
  suppressedSegmentIds: string[];
  quarantinedSegmentIds: string[];
  warnings: string[];
}

export interface PoisoningSuppressionResult extends PoisoningResponse {
  retainedContext: AssembledContext;
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

  suppressWithContext(
    context: AssembledContext,
    indicators: PoisoningIndicator[]
  ): PoisoningSuppressionResult {
    const response = this.suppress(context, indicators);
    return {
      ...response,
      retainedContext: {
        ...context,
        segments: context.segments.filter(
          (segment) => !response.suppressedSegmentIds.includes(segment.metadata.id)
        ),
      },
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
