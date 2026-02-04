import { selectSimpleFirst, ModelCandidate } from "../src/simple_first_ai";

describe("Simple-First AI Policy", () => {
  const candidates: ModelCandidate[] = [
    { name: "complex-fast", ops_complexity: "high", latency_p95_ms: 50 },
    { name: "simple-slow", ops_complexity: "low", latency_p95_ms: 200 },
    { name: "simple-fast", ops_complexity: "low", latency_p95_ms: 100 },
    { name: "med-fast", ops_complexity: "med", latency_p95_ms: 80 },
  ];

  test("returns null when feature flag is off", () => {
    process.env.FF_SIMPLE_FIRST_AI = "0";
    expect(selectSimpleFirst(candidates)).toBeNull();
  });

  test("selects simple-fast over simple-slow and others when flag is on", () => {
    process.env.FF_SIMPLE_FIRST_AI = "1";
    const selected = selectSimpleFirst(candidates);
    expect(selected?.name).toBe("simple-fast");
  });

  test("returns null for empty candidates", () => {
    process.env.FF_SIMPLE_FIRST_AI = "1";
    expect(selectSimpleFirst([])).toBeNull();
  });
});
