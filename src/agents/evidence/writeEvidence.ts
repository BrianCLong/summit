import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type { EvidenceIndex, EvidenceMetrics, EvidenceReport, EvidenceStamp } from "./types";

function ensureDir(path: string) {
  mkdirSync(path, { recursive: true });
}

export function writeJson(path: string, obj: unknown) {
  ensureDir(dirname(path));
  writeFileSync(path, JSON.stringify(obj, null, 2) + "\n", { encoding: "utf-8" });
}

export function writeEvidenceBundle(args: {
  baseDir: string; // typically repo root
  index: EvidenceIndex;
  report: EvidenceReport;
  metrics: EvidenceMetrics;
  stamp: EvidenceStamp; // timestamps allowed here only
}) {
  const { baseDir, index, report, metrics, stamp } = args;
  writeJson(`${baseDir}/evidence/index.json`, index);
  writeJson(`${baseDir}/evidence/report.json`, report);
  writeJson(`${baseDir}/evidence/metrics.json`, metrics);
  writeJson(`${baseDir}/evidence/stamp.json`, stamp);
}
