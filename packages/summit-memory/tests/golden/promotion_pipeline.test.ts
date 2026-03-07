import { describe, expect, it } from "vitest";
import { promote } from "../../src/promotion/promote.js";
import type { PromotionPolicy } from "../../src/types.js";
import { makeFixtureWriteSets } from "../../src/testUtils/fixtures.js";

describe("golden: promotion pipeline", () => {
  it("promotes eligible memory under policy thresholds", () => {
    const [, b] = makeFixtureWriteSets();

    const policy: PromotionPolicy = {
      minConfidence: 0.8,
      minProvenanceCount: 1,
      promotionTarget: "validated"
    };

    const promoted = promote(b, policy);
    expect(promoted.promotionState).toBe("validated");
  });
});
