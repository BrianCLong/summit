import type {
  AttributionBundle,
  AttributionHighlightSpan,
} from '../../common-types/src/index.js';

export interface HighlightAnnotation {
  readonly sourceId: string;
  readonly label: string;
  readonly score: number;
  readonly spans: readonly AttributionHighlightSpan[];
}

export interface HighlightSegment {
  readonly start: number;
  readonly end: number;
  readonly text: string;
  readonly sourceIds: readonly string[];
  readonly score: number;
}

export function getHighImpactSources(
  bundle: AttributionBundle,
  threshold = 0.25,
): readonly HighlightAnnotation[] {
  return bundle.sources
    .filter((source) => source.score >= threshold)
    .map((source) => ({
      sourceId: source.id,
      label: source.label,
      score: source.score,
      spans: source.highlightSpans,
    }))
    .sort((a, b) => (b.score === a.score ? a.sourceId.localeCompare(b.sourceId) : b.score - a.score));
}

export function buildHighlightedSegments(
  bundle: AttributionBundle,
  threshold = 0.25,
): readonly HighlightSegment[] {
  const highImpact = getHighImpactSources(bundle, threshold);
  const fullLength = bundle.outputText.length;
  if (highImpact.length === 0) {
    return [
      {
        start: 0,
        end: fullLength,
        text: bundle.outputText,
        sourceIds: [],
        score: 0,
      },
    ];
  }

  const boundaries = new Set<number>([0, fullLength]);
  highImpact.forEach((annotation) => {
    annotation.spans.forEach((span) => {
      boundaries.add(Math.max(0, Math.min(fullLength, span.start)));
      boundaries.add(Math.max(0, Math.min(fullLength, span.end)));
    });
  });
  const sorted = Array.from(boundaries).sort((a, b) => a - b);
  const segments: HighlightSegment[] = [];
  for (let index = 0; index < sorted.length - 1; index += 1) {
    const start = sorted[index];
    const end = sorted[index + 1];
    if (end <= start) {
      continue;
    }
    const text = bundle.outputText.slice(start, end);
    const covering = highImpact.filter((annotation) =>
      annotation.spans.some((span) => span.start <= start && span.end >= end),
    );
    const score = covering.reduce((acc, annotation) => Math.max(acc, annotation.score), 0);
    segments.push({
      start,
      end,
      text,
      sourceIds: covering.map((annotation) => annotation.sourceId),
      score,
    });
  }
  return segments;
}

export const pcarUi = {
  getHighImpactSources,
  buildHighlightedSegments,
};
