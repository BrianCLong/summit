import { describe, expect, it } from "vitest";
import { AuditorPortal, ControlCrosswalk } from "../src/audit-readiness.js";

describe("ControlCrosswalk", () => {
  it("maps controls across frameworks and deduplicates evidence", () => {
    const crosswalk = new ControlCrosswalk(() => new Date("2026-01-01T00:00:00Z"));
    crosswalk.registerCanonical({ id: "AUTH-1", title: "Strong authentication" });
    crosswalk.registerCanonical({ id: "LOG-1", title: "Comprehensive logging" });

    crosswalk.linkFrameworkControl("AUTH-1", {
      framework: "soc2",
      controlId: "CC1.1",
      title: "Logical access controls",
      description: "SOC 2 CC series",
    });
    crosswalk.linkFrameworkControl("AUTH-1", {
      framework: "iso27001",
      controlId: "A.5.15",
      title: "Access control policy",
    });
    crosswalk.linkFrameworkControl("AUTH-1", {
      framework: "gdpr",
      controlId: "32",
      title: "Security of processing",
    });
    crosswalk.linkFrameworkControl("LOG-1", {
      framework: "hipaa",
      controlId: "164.312(b)",
      title: "Audit controls",
    });

    crosswalk.attachEvidence("AUTH-1", {
      id: "evidence-policy",
      type: "policy",
      title: "IAM policy",
      uri: "s3://evidence/policies/iam.pdf",
      collectedAt: "2026-01-01T00:00:00Z",
      checksum: "abc",
    });
    crosswalk.attachEvidence("AUTH-1", {
      id: "evidence-policy",
      type: "policy",
      title: "IAM policy duplicate write",
      uri: "s3://evidence/policies/iam.pdf",
      collectedAt: "2026-01-02T00:00:00Z",
    });
    crosswalk.attachEvidence("LOG-1", {
      id: "evidence-logs",
      type: "log",
      title: "Audit log export",
      uri: "s3://evidence/logs/export.json",
      collectedAt: "2026-01-03T00:00:00Z",
    });

    const bundle = crosswalk.bundleForFrameworks(["gdpr", "hipaa", "iso27001", "soc2"]);

    expect(bundle.generatedAt).toBe("2026-01-01T00:00:00.000Z");
    expect(bundle.frameworks).toEqual(["gdpr", "hipaa", "iso27001", "soc2"]);
    expect(bundle.controls).toHaveLength(2);
    expect(bundle.coverage.frameworkMappings).toBe(4);
    expect(bundle.coverage.evidence).toBe(2);

    const accessControl = bundle.controls.find((item) => item.canonicalId === "AUTH-1");
    expect(accessControl?.frameworks.map((f) => f.framework).sort()).toEqual(["iso27001", "soc2"]);
    expect(accessControl?.evidence).toHaveLength(1);

    const logging = bundle.controls.find((item) => item.canonicalId === "LOG-1");
    expect(logging?.frameworks[0].framework).toBe("hipaa");
  });
});

describe("AuditorPortal", () => {
  it("issues read-only tickets and restricts framework access", () => {
    const crosswalk = new ControlCrosswalk(() => new Date("2026-01-04T00:00:00Z"));
    crosswalk.registerCanonical({ id: "EVID-1", title: "Evidence bundle" });
    crosswalk.linkFrameworkControl("EVID-1", {
      framework: "soc2",
      controlId: "CC4.2",
      title: "Change management",
    });
    crosswalk.attachEvidence("EVID-1", {
      id: "attestation",
      type: "attestation",
      title: "Quarterly control attestation",
      uri: "s3://evidence/attestations/q1.json",
      collectedAt: "2026-01-04T00:00:00Z",
    });

    const portal = new AuditorPortal({
      crosswalk,
      tokenSecret: "read-only",
      now: () => new Date("2026-01-04T00:00:00Z"),
    });
    const token = portal.issueReadOnlyToken("auditor-1", ["soc2"]);

    const bundle = portal.fetchEvidenceBundle(token, "soc2");
    expect(bundle.readOnly).toBe(true);
    expect(bundle.controls).toHaveLength(1);

    expect(() => portal.fetchEvidenceBundle(token, "hipaa")).toThrow(/does not permit frameworks/i);
  });
});
