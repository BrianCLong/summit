import { describe, expect, it } from "vitest";
import { scoreNarrativeCompatibility } from "../narrativeCompatibility.js";
import type { NarrativeSignal, PopulationGroup } from "../types.js";

describe("scoreNarrativeCompatibility", () => {
  it("scores higher when values and history align", () => {
    const population: PopulationGroup = {
      id: "p1",
      name: "Industrial workers",
      regionId: "r1",
      h3Cells: ["abc"],
      languages: ["de"],
      mediaConsumption: ["regional-news", "youtube"],
      historicalMemories: ["energy-shock"],
      valueSignals: ["economic-security", "order"],
      economicProfile: "industrial labor"
    };

    const narrative: NarrativeSignal = {
      id: "n1",
      title: "Energy shock narrative",
      summary: "Test",
      themes: ["economy", "energy"],
      frameTags: ["regional-news"],
      language: "de",
      moralEmphasis: ["economic-security"],
      identityAppeals: ["de"],
      historicalReferences: ["energy-shock"],
      observedAt: new Date().toISOString()
    };

    const result = scoreNarrativeCompatibility({ population, narrative });
    expect(result.finalScore).toBeGreaterThan(0.5);
  });
});
