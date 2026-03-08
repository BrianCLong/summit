import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { writeEvidenceBundle } from "../../../src/graphrag/evidence/writer.js";
import type { EvidenceEntry } from "../../../src/graphrag/evidence/types.js";

describe("writeEvidenceBundle", () => {
  const entries: EvidenceEntry[] = [
    {
      report: {
        evidence_id: "EVD-cogops-feb2026-PROV-001",
        classification: "INTERNAL",
        summary: "provenance output",
      },
      metrics: { evidence_id: "EVD-cogops-feb2026-PROV-001", metrics: { records: 5 } },
      stamp: { evidence_id: "EVD-cogops-feb2026-PROV-001", generated_at: "2026-02-01T00:00:00Z" },
    },
    {
      report: {
        evidence_id: "EVD-cogops-feb2026-MODEL-001",
        classification: "INTERNAL",
        summary: "model output",
      },
      metrics: { evidence_id: "EVD-cogops-feb2026-MODEL-001", metrics: { entities: 3 } },
      stamp: { evidence_id: "EVD-cogops-feb2026-MODEL-001", generated_at: "2026-02-01T00:00:00Z" },
    },
  ];

  it("writes lexicographically sorted index entries", async () => {
    const tmpDir = await mkdtemp(path.join(os.tmpdir(), "evidence-"));
    try {
      await writeEvidenceBundle(entries, { baseDir: tmpDir });
      const indexRaw = await readFile(path.join(tmpDir, "index.json"), "utf8");
      const index = JSON.parse(indexRaw) as { items: Array<{ evidence_id: string }> };
      expect(index.items.map((item) => item.evidence_id)).toEqual([
        "EVD-cogops-feb2026-MODEL-001",
        "EVD-cogops-feb2026-PROV-001",
      ]);
    } finally {
      await rm(tmpDir, { recursive: true, force: true });
    }
  });

  it("keeps timestamps confined to stamp.json content", async () => {
    const tmpDir = await mkdtemp(path.join(os.tmpdir(), "evidence-"));
    try {
      await writeEvidenceBundle(entries, { baseDir: tmpDir });
      const reportRaw = await readFile(
        path.join(tmpDir, "EVD-cogops-feb2026-MODEL-001", "report.json"),
        "utf8"
      );
      const metricsRaw = await readFile(
        path.join(tmpDir, "EVD-cogops-feb2026-MODEL-001", "metrics.json"),
        "utf8"
      );
      expect(reportRaw.includes("generated_at")).toBe(false);
      expect(metricsRaw.includes("generated_at")).toBe(false);
    } finally {
      await rm(tmpDir, { recursive: true, force: true });
    }
  });
});
