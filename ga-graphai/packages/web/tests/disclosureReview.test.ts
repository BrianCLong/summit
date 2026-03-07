import { describe, expect, it } from "vitest";
import { buildDisclosureReview, diffArtifacts } from "../src/disclosure-review.js";

describe("disclosure review", () => {
  it("summarizes artifacts and redactions", () => {
    const review = buildDisclosureReview(
      {
        documents: [{ id: "doc-1", path: "doc.txt" }],
        disclosure: {
          audience: { policyId: "aud:public" },
          license: { id: "CC-BY-4.0" },
          redactions: [{ field: "email" }, { field: "phone" }],
        },
      },
      2_000_000
    );
    expect(review.artifacts).toHaveLength(1);
    expect(review.redactionCount).toBe(2);
    expect(review.licenseId).toBe("CC-BY-4.0");
    expect(review.estimatedSizeMb).toBeGreaterThan(0);

    const diff = diffArtifacts([], review.artifacts);
    expect(diff.added).toHaveLength(1);
  });
});
