import { describe, expect, it } from "vitest";

import { buildDriftReport } from "../src/drift/detector.js";
import { generateChangelogEntry, validateVersioningChange } from "../src/versioning/governance.js";
import { LaneManager } from "../src/lanes/manager.js";
import { evaluateDrill, runSyntheticChecks } from "../src/dr/drill.js";
import { computeScorecard } from "../src/reliability/scorecard.js";

import fs from "node:fs";
import path from "node:path";

const lanesDir = path.resolve(__dirname, "../tests/fixtures/lanes");
fs.mkdirSync(`${lanesDir}/acme`, { recursive: true });
fs.writeFileSync(
  `${lanesDir}/acme/config.json`,
  JSON.stringify({
    canary: { weight: 10 },
    rollback: { strategy: "auto" },
    features: { search_v1: true },
  })
);

describe("Operational controls", () => {
  it("detects drift and classifies severity", () => {
    const report = buildDriftReport({
      desired: { replicas: 3, securityGroup: "sg-1" },
      runtime: { replicas: 2, securityGroup: "sg-2", extra: true },
    });
    expect(report.alert).toBe(true);
    expect(report.summary.critical.length).toBe(1);
  });

  it("enforces versioning governance for breaking changes", () => {
    const previous = { version: "v1", paths: { "/v1/resource": { get: {} } } };
    const next = { version: "v1", paths: { "/v1/resource": {} } };
    const validation = validateVersioningChange({ previous, next });
    expect(validation.breaking).toBe(true);
    const changelog = generateChangelogEntry({ previous, next: { ...next, version: "v2" } });
    expect(changelog.breaking).toBe(true);
  });

  it("blocks unsafe lane overrides and audits promotions", () => {
    const manager = new LaneManager({ basePath: lanesDir, auditLog: [] });
    const promotion = manager.promote("acme", "1.2.3");
    expect(manager.auditLog).toHaveLength(1);
    expect(promotion.canary.weight).toBe(10);
  });

  it("evaluates DR drills against tier targets", () => {
    const targets = {
      tier0: { rpoMinutes: 5, rtoMinutes: 30 },
      tier1: { rpoMinutes: 15, rtoMinutes: 60 },
      tier2: { rpoMinutes: 60, rtoMinutes: 240 },
    };
    const result = evaluateDrill({
      tier: "tier0",
      start: new Date("2025-09-01T00:00:00Z"),
      finish: new Date("2025-09-01T00:25:00Z"),
      targets,
    });
    expect(result.metRto).toBe(true);
    expect(runSyntheticChecks([() => true, () => true])).toBe(true);
  });

  it("generates reliability scorecards with actions", () => {
    const rubric = {
      tier0: { weights: { slo: 0.5, mttr: 0.3, change: 0.2 }, targets: { mttrHours: 1 } },
      tier1: { weights: { slo: 0.4, mttr: 0.4, change: 0.2 }, targets: { mttrHours: 2 } },
    };
    const scorecards = computeScorecard(
      [
        { name: "search", tier: "tier0", sloBurnRate: 1.5, mttrHours: 0.5, changeFailRate: 0.1 },
        { name: "ui", tier: "tier1", sloBurnRate: 0.5, mttrHours: 3, changeFailRate: 0.2 },
      ],
      rubric
    );
    expect(scorecards[0].actions).toContain("freeze releases");
    expect(scorecards[1].actions).toContain("mandate canary");
  });
});
