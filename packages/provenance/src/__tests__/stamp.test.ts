import {
  buildEvidenceId,
  buildEvidenceStamp,
  fingerprintDeterminismInputs,
  parseStructuredEvidenceId,
} from "..";

describe("@intelgraph/provenance stamp helpers", () => {
  it("builds normalized structured evidence identifiers", () => {
    const evidenceId = buildEvidenceId({
      tenant: "acme",
      domain: "io",
      artifact: "schema_roundtrip",
      gitSha: "ABCDEF1234567890",
      runId: "9f2a1c0b",
      evidenceDate: "2026-02-11",
    });

    expect(evidenceId).toBe("EVID::acme::io::schema_roundtrip::2026-02-11::abcdef1::9f2a1c0b");
    expect(parseStructuredEvidenceId(evidenceId)).toEqual({
      tenant: "acme",
      domain: "io",
      artifact: "schema_roundtrip",
      date: "2026-02-11",
      gitSha7: "abcdef1",
      runId8: "9f2a1c0b",
    });
  });

  it("generates deterministic fingerprints from unordered inputs", () => {
    const a = fingerprintDeterminismInputs({
      zeta: "tail",
      alpha: "head",
      beta: 7,
    });
    const b = fingerprintDeterminismInputs({
      beta: 7,
      zeta: "tail",
      alpha: "head",
    });

    expect(a).toBe(b);
    expect(a).toHaveLength(64);
  });

  it("builds structured evidence stamps with normalized fields", () => {
    const stamp = buildEvidenceStamp({
      tenant: " Acme ",
      domain: "IO",
      artifact: " schema roundtrip ",
      gitSha: "123abcd",
      runId: "1234ABCD",
      evidenceDate: "2026-02-11",
      generatedAt: new Date("2026-02-11T00:00:00.000Z"),
      dependencyFingerprint: "deps-hash",
    });

    expect(stamp).toEqual({
      evidence_id: "EVID::acme::io::schema-roundtrip::2026-02-11::123abcd::1234abcd",
      generated_at: "2026-02-11T00:00:00.000Z",
      git_sha: "123abcd",
      tenant: "acme",
      domain: "io",
      artifact: "schema-roundtrip",
      run_id: "1234abcd",
      evidence_date: "2026-02-11",
      dependency_fingerprint: "deps-hash",
    });
  });

  it("retains legacy stamp mode for backwards compatibility", () => {
    const legacy = buildEvidenceStamp({
      family: "iops",
      slug: "schema roundtrip",
      gitSha: "abcdef1",
      generatedAt: new Date("2026-02-11T00:00:00.000Z"),
    });

    expect(legacy.evidence_id).toBe("EVID-IOPS-20260211-schema-roundtrip-abcdef1");
    expect(legacy.family).toBe("IOPS");
    expect(legacy.slug).toBe("schema-roundtrip");
  });
});
