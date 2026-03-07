import { describe, expect, it } from "vitest";
import type { WriteSet } from "../materializers/materializeViews";
import { buildRejectionReport, formatRejectionReportMarkdown } from "../validation/rejectionReport";

const writeset: WriteSet = {
  writeset_id: "ws-001",
  record_time: "2026-03-06T00:00:00Z",
  writer: {
    actor_id: "agent-a",
    type: "agent",
    version: "1.0.0",
  },
  provenance: [],
  claims: [],
};

describe("rejectionReport", () => {
  it("builds a structured rejection report", () => {
    const report = buildRejectionReport({
      writesets: [writeset],
      schemaIssues: [
        {
          writeset_id: "ws-001",
          instancePath: "/claims/0/record_time",
          schemaPath: "#/properties/record_time/format",
          keyword: "format",
          message: "must match format date-time",
          params: {},
        },
      ],
      semanticIssues: [
        {
          code: "DUPLICATE_BATCH_SIGNATURE",
          severity: "error",
          writeset_id: "ws-001",
          message: "Duplicate batch signature",
        },
      ],
    });

    expect(report.accepted).toBe(false);
    expect(report.summary.error_count).toBe(2);
    expect(report.items).toHaveLength(2);
  });

  it("formats a markdown report", () => {
    const report = buildRejectionReport({
      writesets: [writeset],
      semanticIssues: [
        {
          code: "MISSING_PROVENANCE_REFERENCE",
          severity: "error",
          writeset_id: "ws-001",
          claim_id: "claim-001",
          message: "Claim references provenance not present in writeset: prov-404",
        },
      ],
    });

    const md = formatRejectionReportMarkdown(report);
    expect(md).toContain("WriteSet Validation Report");
    expect(md).toContain("MISSING_PROVENANCE_REFERENCE");
    expect(md).toContain("claim-001");
  });
});
