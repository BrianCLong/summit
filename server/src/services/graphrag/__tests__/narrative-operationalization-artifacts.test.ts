import { readFileSync } from "node:fs";
import path from "node:path";

import {
  generateNarrativeOperationalizationArtifacts,
  stableStringify,
  type NarrativeOperationalizationInput,
} from "../narrative-operationalization-artifacts.js";

function loadFixture(): NarrativeOperationalizationInput {
  const fixturePath = path.join(__dirname, "fixtures", "narrative-operationalization.fixture.json");
  return JSON.parse(readFileSync(fixturePath, "utf8")) as NarrativeOperationalizationInput;
}

describe("narrative-operationalization-artifacts", () => {
  it("produces deterministic byte-stable metrics and stamp payload", () => {
    const fixture = loadFixture();
    const a = generateNarrativeOperationalizationArtifacts(fixture);
    const b = generateNarrativeOperationalizationArtifacts(fixture);

    expect(stableStringify(a.metrics)).toBe(stableStringify(b.metrics));
    expect(stableStringify(a.stamp)).toBe(stableStringify(b.stamp));

    expect(Object.keys(a.stamp).sort()).toEqual([
      "codeVersion",
      "inputsHash",
      "paramsHash",
      "schemaVersion",
    ]);
    expect(stableStringify(a.stamp)).not.toContain("timestamp");
  });

  it("emits required graph node collections", () => {
    const artifacts = generateNarrativeOperationalizationArtifacts(loadFixture());

    expect(artifacts.graphExport.narratives.length).toBeGreaterThan(0);
    expect(artifacts.graphExport.artifacts.length).toBeGreaterThan(0);
    expect(artifacts.graphExport.claims.length).toBeGreaterThan(0);
    expect(artifacts.graphExport.assumptions.length).toBeGreaterThan(0);
    expect(artifacts.graphExport.states.length).toBeGreaterThan(0);
    expect(artifacts.graphExport.governanceArtifacts.length).toBeGreaterThan(0);

    const metric = artifacts.metrics.debt[0];
    expect(metric.evidenceIds.length).toBeGreaterThan(0);
    expect(metric.derivationRecipeHash).toMatch(/^[a-f0-9]{16}$/);
  });
});
