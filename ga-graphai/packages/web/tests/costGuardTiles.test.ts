import { describe, expect, it } from "vitest";
import { buildCostGuardTiles } from "../src/cost-guard-tiles.js";

describe("cost guard tiles", () => {
  it("builds p95 and kill tiles", () => {
    const tiles = buildCostGuardTiles({
      p95LatencyMs: 1400,
      killCount: 2,
      killReasons: { "cartesian-product": 2 },
      sloTargetMs: 1200,
    });
    expect(tiles).toHaveLength(2);
    expect(tiles[0].status).toBe("warn");
    expect(tiles[1].hint).toContain("cartesian-product");
  });
});
