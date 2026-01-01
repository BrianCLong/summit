import { AssembledContext, ContextSegment } from "../types";

export class TrustWeightedContextAssembler {
  constructor(private readonly maxSegments: number = 50) {}

  assemble(id: string, segments: ContextSegment[]): AssembledContext {
    const normalized = [...segments].sort((a, b) => b.trustWeight.value - a.trustWeight.value);
    const selected = normalized.slice(0, this.maxSegments);
    const encoded = selected.map((segment) => ({
      id: segment.metadata.id,
      source: segment.metadata.source,
      content: segment.content,
      trustWeight: segment.trustWeight.value
    }));
    return {
      id,
      segments: selected,
      encoded
    };
  }
}
