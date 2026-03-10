import { describe, expect, it } from "vitest";
import { buildDiffusionMap } from "../diffusionEngine.js";
import type { NarrativeSignal, PopulationGroup } from "../types.js";

describe("buildDiffusionMap", () => {
  it("returns a point for each population", () => {
    const narrative: NarrativeSignal = {
      id: "n1",
      title: "Test narrative",
      summary: "Test summary",
      themes: ["economy"],
      frameTags: ["youtube"],
      language: "de",
      observedAt: new Date().toISOString()
    };

    const populations: PopulationGroup[] = [
      {
        id: "p1",
        name: "Pop 1",
        regionId: "r1",
        h3Cells: ["a"],
        languages: ["de"],
        mediaConsumption: ["youtube"],
        valueSignals: ["economic-security"]
      },
      {
        id: "p2",
        name: "Pop 2",
        regionId: "r2",
        h3Cells: ["b"],
        languages: ["fr"],
        mediaConsumption: ["local-tv"],
        valueSignals: ["stability"]
      }
    ];

    const map = buildDiffusionMap({ narrative, populations });
    expect(map.points).toHaveLength(2);
    expect(map.narrativeId).toBe("n1");
  });
});
