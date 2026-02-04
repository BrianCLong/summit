import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";

describe("expectation-baselines manifest", () => {
  it("parses and includes required keys", () => {
    const manifestPath = path.join(
      "subsumption",
      "expectation-baselines",
      "manifest.yaml",
    );
    const raw = fs.readFileSync(manifestPath, "utf8");
    const doc = yaml.load(raw) as {
      item?: Record<string, unknown>;
      claims?: unknown[];
      prs?: unknown[];
      gates?: unknown[];
      evidence_ids?: unknown[];
      docs_targets?: unknown[];
      feature_flags?: unknown[];
      required_checks_discovery?: Record<string, unknown>;
      constraints?: Record<string, unknown>;
    };

    expect(doc.item).toBeDefined();
    expect(doc.item?.slug).toBe("expectation-baselines");
    expect(doc.item?.title).toBeDefined();
    expect(doc.item?.type).toBe("methodology");
    expect(doc.item?.date).toBeDefined();

    expect(Array.isArray(doc.claims)).toBe(true);
    expect(Array.isArray(doc.prs)).toBe(true);
    expect(Array.isArray(doc.gates)).toBe(true);
    expect(Array.isArray(doc.evidence_ids)).toBe(true);
    expect(Array.isArray(doc.docs_targets)).toBe(true);
    expect(Array.isArray(doc.feature_flags)).toBe(true);
    expect(doc.required_checks_discovery).toBeDefined();
    expect(doc.constraints).toBeDefined();
  });
});
