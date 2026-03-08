import type { Observation } from "../api/types";

export function normalizeObservation(input: Observation): Observation {
  return {
    ...input,
    content: input.content.trim(),
    source: input.source.trim().toLowerCase(),
  };
}
