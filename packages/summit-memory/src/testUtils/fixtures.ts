import { buildWriteSet } from "../ingest/buildWriteSet.js";
import { normalizeEvent } from "../ingest/normalizeEvent.js";
import type { WriteSet } from "../types.js";

export function makeFixtureWriteSets(): WriteSet[] {
  const a = buildWriteSet(
    normalizeEvent({
      entityId: "entity:alpha",
      body: "Alpha located in Paris",
      eventTime: "2026-01-01T00:00:00.000Z",
      ingestTime: "2026-01-01T01:00:00.000Z",
      confidence: 0.8,
      provenanceRefs: [{ sourceId: "src1", sourceType: "report" }]
    }),
    {
      graphIntents: ["BG"],
      claimRefs: ["claim:1"]
    }
  );

  const b = buildWriteSet(
    normalizeEvent({
      entityId: "entity:alpha",
      body: "Alpha located in Berlin",
      eventTime: "2026-01-02T00:00:00.000Z",
      ingestTime: "2026-01-02T01:00:00.000Z",
      confidence: 0.9,
      provenanceRefs: [{ sourceId: "src2", sourceType: "report" }]
    }),
    {
      graphIntents: ["BG", "RG"],
      claimRefs: ["claim:2"],
      supersedes: [a.writeSetId]
    }
  );

  const c = buildWriteSet(
    normalizeEvent({
      entityId: "entity:alpha",
      body: "Alpha located in Madrid",
      eventTime: "2026-01-02T00:30:00.000Z",
      ingestTime: "2026-01-02T02:00:00.000Z",
      confidence: 0.4,
      provenanceRefs: [{ sourceId: "src3", sourceType: "social" }]
    }),
    {
      graphIntents: ["BG", "NG"],
      claimRefs: ["claim:3"],
      conflictsWith: [b.writeSetId]
    }
  );

  return [a, b, c];
}
