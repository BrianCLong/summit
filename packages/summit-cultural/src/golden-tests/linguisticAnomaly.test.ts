import { describe, expect, it } from "vitest";
import { computeLinguisticAnomaly } from "../linguisticAnomaly.js";

describe("computeLinguisticAnomaly", () => {
  it("raises anomaly when translation artifacts and propaganda phrases are high", () => {
    const result = computeLinguisticAnomaly({
      id: "lf1",
      narrativeId: "n1",
      expectedLanguage: "en",
      detectedLanguage: "en",
      dialectFitScore: 0.3,
      idiomFitScore: 0.2,
      syntaxNaturalnessScore: 0.4,
      translationArtifactScore: 0.8,
      propagandaPhraseScore: 0.9
    });

    expect(result.anomalyScore).toBeGreaterThan(0.6);
    expect(result.reasons.length).toBeGreaterThan(0);
  });
});
