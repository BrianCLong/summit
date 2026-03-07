import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { EvidenceBundle } from "./types.js";

export async function writeEvidenceBundle(
  bundle: EvidenceBundle,
  outputRoot = "artifacts/evidence"
): Promise<string> {
  const evidenceDir = path.join(outputRoot, bundle.evidenceId);
  await mkdir(evidenceDir, { recursive: true });

  await writeFile(
    path.join(evidenceDir, "report.json"),
    JSON.stringify(bundle.report, null, 2) + "\n"
  );
  await writeFile(
    path.join(evidenceDir, "metrics.json"),
    JSON.stringify(bundle.metrics, null, 2) + "\n"
  );
  await writeFile(
    path.join(evidenceDir, "stamp.json"),
    JSON.stringify(bundle.stamp, null, 2) + "\n"
  );

  return evidenceDir;
}
