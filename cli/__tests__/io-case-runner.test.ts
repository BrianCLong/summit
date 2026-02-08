import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import {
  readCaseSpec,
  deriveRunId8,
  buildEvidenceId,
  buildArtifacts,
  writeArtifacts,
  stableJson,
  type IOCaseSpec,
} from "../src/lib/io-case-runner.js";

describe("io-case-runner", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "io-case-runner-test-")));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it("parses and normalizes YAML case specs", () => {
    const casePath = path.join(tempDir, "sample.case.yaml");
    fs.writeFileSync(
      casePath,
      [
        "version: 1",
        "case_id: io-cib-demo",
        "hypothesis: coordinated amplification around claim X",
        "sources_allowed:",
        "  - telegram",
        "  - tiktok",
        "detectors:",
        "  - text_reuse",
        "  - temporal_synchrony",
        "thresholds:",
        "  confidence_min: 0.7",
      ].join("\n"),
      "utf8"
    );

    const spec = readCaseSpec(casePath);

    expect(spec.case_id).toBe("io-cib-demo");
    expect(spec.sources_allowed).toEqual(["telegram", "tiktok"]);
    expect(spec.detectors).toEqual(["temporal_synchrony", "text_reuse"]);
    expect(spec.thresholds).toEqual({ confidence_min: 0.7 });
  });

  it("derives deterministic run ids from case content", () => {
    const spec: IOCaseSpec = {
      version: 1,
      case_id: "io-run-id",
      hypothesis: "deterministic run id",
      sources_allowed: ["telegram"],
      detectors: ["temporal_synchrony"],
      thresholds: { confidence_min: 0.65 },
    };

    const runIdA = deriveRunId8(spec);
    const runIdB = deriveRunId8(spec);

    expect(runIdA).toMatch(/^[a-f0-9]{8}$/);
    expect(runIdA).toBe(runIdB);
  });

  it("builds Evidence IDs with required EVID pattern", () => {
    const evidenceId = buildEvidenceId({
      tenant: "acme",
      domain: "io",
      artifact: "cib_eval",
      date: "2026-02-11",
      gitsha7: "a1b2c3d",
      runid8: "9f2a1c0b",
    });

    expect(evidenceId).toBe("EVID::acme::io::cib_eval::2026-02-11::a1b2c3d::9f2a1c0b");
  });

  it("writes deterministic report, metrics, and stamp artifacts", () => {
    const caseSpec: IOCaseSpec = {
      version: 1,
      case_id: "io-determinism-case",
      hypothesis: "deterministic artifact generation",
      sources_allowed: ["telegram", "tiktok"],
      detectors: ["text_reuse", "temporal_synchrony"],
      thresholds: { confidence_min: 0.8 },
    };

    const artifactsA = buildArtifacts({
      caseSpec,
      casePath: "/tmp/io.case.yaml",
      tenant: "acme",
      domain: "io",
      artifact: "attrib_report",
      evidenceDate: "2026-02-11",
      gitsha7: "a1b2c3d",
      runid8: "9f2a1c0b",
      evidenceId: "EVID::acme::io::attrib_report::2026-02-11::a1b2c3d::9f2a1c0b",
    });

    const artifactsB = buildArtifacts({
      caseSpec,
      casePath: "/tmp/io.case.yaml",
      tenant: "acme",
      domain: "io",
      artifact: "attrib_report",
      evidenceDate: "2026-02-11",
      gitsha7: "a1b2c3d",
      runid8: "9f2a1c0b",
      evidenceId: "EVID::acme::io::attrib_report::2026-02-11::a1b2c3d::9f2a1c0b",
    });

    expect(stableJson(artifactsA.report)).toBe(stableJson(artifactsB.report));
    expect(stableJson(artifactsA.metrics)).toBe(stableJson(artifactsB.metrics));
    expect(stableJson(artifactsA.stamp)).toBe(stableJson(artifactsB.stamp));

    const outputDir = path.join(tempDir, "artifacts");
    const paths = writeArtifacts(outputDir, artifactsA);

    expect(fs.existsSync(paths.reportPath)).toBe(true);
    expect(fs.existsSync(paths.metricsPath)).toBe(true);
    expect(fs.existsSync(paths.stampPath)).toBe(true);

    const reportRaw = fs.readFileSync(paths.reportPath, "utf8");
    const metricsRaw = fs.readFileSync(paths.metricsPath, "utf8");
    const stampRaw = fs.readFileSync(paths.stampPath, "utf8");

    expect(reportRaw).toContain(
      '"evidence_id": "EVID::acme::io::attrib_report::2026-02-11::a1b2c3d::9f2a1c0b"'
    );
    expect(metricsRaw).toContain('"stable_hashing": true');
    expect(stampRaw).toContain('"code_hash": "a1b2c3d"');
  });
});
