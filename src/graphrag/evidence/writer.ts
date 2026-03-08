import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { buildEvidenceIndex } from "./index.js";
import type { EvidenceEntry, EvidenceWriterOptions } from "./types.js";

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
      a.localeCompare(b)
    );
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export async function writeEvidenceBundle(
  entries: EvidenceEntry[],
  options: EvidenceWriterOptions
): Promise<void> {
  await mkdir(options.baseDir, { recursive: true });

  const sortedEntries = [...entries].sort((a, b) =>
    a.report.evidence_id.localeCompare(b.report.evidence_id)
  );

  for (const entry of sortedEntries) {
    const evidenceDir = path.join(options.baseDir, entry.report.evidence_id);
    await mkdir(evidenceDir, { recursive: true });

    await writeFile(
      path.join(evidenceDir, "report.json"),
      `${stableStringify(entry.report)}\n`,
      "utf8"
    );
    await writeFile(
      path.join(evidenceDir, "metrics.json"),
      `${stableStringify(entry.metrics)}\n`,
      "utf8"
    );
    await writeFile(
      path.join(evidenceDir, "stamp.json"),
      `${stableStringify(entry.stamp)}\n`,
      "utf8"
    );
  }

  const index = buildEvidenceIndex(sortedEntries, options.version ?? "1.0.0");
  await writeFile(path.join(options.baseDir, "index.json"), `${stableStringify(index)}\n`, "utf8");
}

export { stableStringify };
