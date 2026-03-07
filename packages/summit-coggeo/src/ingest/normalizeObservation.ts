import crypto from "node:crypto";

export interface RawObservationInput {
  ts: string;
  source: string;
  content: string;
  url?: string | null;
  author?: string | null;
  lang?: string | null;
  geo?: { h3?: string; country?: string | null; region?: string | null } | null;
}

export interface Observation {
  id: string;
  ts: string;
  source: string;
  author: string | null;
  url: string | null;
  lang: string | null;
  content: string;
  geo: { h3?: string; country?: string | null; region?: string | null } | null;
  provenance: {
    collector: string;
    hash: string;
    confidence: number;
    model?: string | null;
    prompt_id?: string | null;
  };
}

export function normalizeObservation(
  input: RawObservationInput,
  collector = "summit-coggeo",
): Observation {
  const hash = crypto.createHash("sha256").update(input.source + "|" + (input.url ?? "") + "|" + input.content).digest("hex");
  const id = `obs:${hash.slice(0, 24)}`;

  return {
    id,
    ts: input.ts,
    source: input.source,
    author: input.author ?? null,
    url: input.url ?? null,
    lang: input.lang ?? null,
    content: input.content,
    geo: input.geo ?? null,
    provenance: { collector, hash, confidence: 1 },
  };
}
