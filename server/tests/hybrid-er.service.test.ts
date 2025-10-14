import { resolveEntities } from "../src/services/HybridEntityResolutionService";

describe("HybridEntityResolutionService", () => {
  it("returns deterministic results", async () => {
    const a = "Jon Smith";
    const b = "John Smith";
    const r1 = await resolveEntities(a, b);
    const r2 = await resolveEntities(a, b);
    expect(r1.score).toBeCloseTo(r2.score, 5);
    expect(r1.match).toBe(r2.match);
    expect(r1.explanation).toEqual(r2.explanation);
  });
});
