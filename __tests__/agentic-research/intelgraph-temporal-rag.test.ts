import { detectTemporalIntent } from "../../agentic-research/intelgraph-temporal-rag/src/temporalIntent";
import { fuseTemporal, TemporalDoc } from "../../agentic-research/intelgraph-temporal-rag/src/temporalRerank";

test("detects temporal intent correctly", () => {
  expect(detectTemporalIntent("what is happening right now").cls).toBe("REAL_TIME");
  expect(detectTemporalIntent("events in 2024").cls).toBe("HISTORICAL");
  expect(detectTemporalIntent("history of rome").cls).toBe("STATIC");
});

test("fuses scores with recency", () => {
  const now = new Date("2026-02-07T12:00:00Z");
  const docs: TemporalDoc[] = [
    { id: "old", text: "x", publishedAt: "2020-01-01T00:00:00Z", simScore: 0.9 },
    { id: "new", text: "y", publishedAt: "2026-02-06T12:00:00Z", simScore: 0.8 },
  ];

  // Alpha 0.5 means equal weight. New doc should win because recency is ~1 vs ~0.
  const fused = fuseTemporal(docs, now, 0.5);
  expect(fused[0].id).toBe("new");
});
