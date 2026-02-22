import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";
import YAML from "yaml";

export interface IOCaseSpec {
  version: number;
  case_id: string;
  hypothesis: string;
  sources_allowed: string[];
  detectors: string[];
  thresholds?: Record<string, number>;
  export_formats?: string[];
  dataset_hash?: string;
  model_hash?: string;
}

export interface EvidenceIdParts {
  tenant: string;
  domain: string;
  artifact: string;
  date: string;
  gitsha7: string;
  runid8: string;
}

export interface IOCaseArtifacts {
  report: Record<string, unknown>;
  metrics: Record<string, unknown>;
  stamp: Record<string, unknown>;
}

const SEGMENT_PATTERN = /^[a-z0-9][a-z0-9_-]*$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const GITSHA7_PATTERN = /^[a-f0-9]{7}$/;
const RUNID8_PATTERN = /^[a-f0-9]{8}$/;

function assertString(value: unknown, name: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${name} must be a non-empty string`);
  }
  return value.trim();
}

function assertStringArray(value: unknown, name: string): string[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`${name} must be a non-empty array`);
  }

  const parsed = value.map((item, index) => {
    if (typeof item !== "string" || item.trim() === "") {
      throw new Error(`${name}[${index}] must be a non-empty string`);
    }
    return item.trim();
  });

  return [...new Set(parsed)].sort();
}

function assertThresholds(value: unknown): Record<string, number> | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("thresholds must be an object with numeric values");
  }

  const thresholds: Record<string, number> = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (typeof raw !== "number" || Number.isNaN(raw)) {
      throw new Error(`thresholds.${key} must be a number`);
    }
    thresholds[key] = raw;
  }

  return sortObjectKeys(thresholds) as Record<string, number>;
}

function assertVersion(value: unknown): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    throw new Error("version must be a positive integer");
  }
  return value;
}

function normalizeCaseSpec(input: Record<string, unknown>): IOCaseSpec {
  return {
    version: assertVersion(input.version),
    case_id: assertString(input.case_id, "case_id"),
    hypothesis: assertString(input.hypothesis, "hypothesis"),
    sources_allowed: assertStringArray(input.sources_allowed, "sources_allowed"),
    detectors: assertStringArray(input.detectors, "detectors"),
    thresholds: assertThresholds(input.thresholds),
    export_formats: input.export_formats
      ? assertStringArray(input.export_formats, "export_formats")
      : undefined,
    dataset_hash: input.dataset_hash ? assertString(input.dataset_hash, "dataset_hash") : undefined,
    model_hash: input.model_hash ? assertString(input.model_hash, "model_hash") : undefined,
  };
}

export function readCaseSpec(casePath: string): IOCaseSpec {
  const resolved = path.resolve(casePath);
  const raw = fs.readFileSync(resolved, "utf8");
  const ext = path.extname(resolved).toLowerCase();

  let parsed: unknown;
  if (ext === ".json") {
    parsed = JSON.parse(raw);
  } else if (ext === ".yaml" || ext === ".yml") {
    parsed = YAML.parse(raw);
  } else {
    throw new Error(`Unsupported case file extension: ${ext}`);
  }

  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("case file must contain an object at root");
  }

  return normalizeCaseSpec(parsed as Record<string, unknown>);
}

function sortObjectKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortObjectKeys);
  }
  if (value !== null && typeof value === "object") {
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      sorted[key] = sortObjectKeys((value as Record<string, unknown>)[key]);
    }
    return sorted;
  }
  return value;
}

export function stableJson(value: unknown): string {
  return JSON.stringify(sortObjectKeys(value), null, 2) + "\n";
}

export function sha256Hex(content: string): string {
  return crypto.createHash("sha256").update(content, "utf8").digest("hex");
}

export function deriveRunId8(caseSpec: IOCaseSpec): string {
  return sha256Hex(stableJson(caseSpec)).slice(0, 8);
}

export function resolveGitSha7(override?: string): string {
  if (override) {
    const normalized = override.toLowerCase();
    if (!GITSHA7_PATTERN.test(normalized)) {
      throw new Error(`git sha must match ${GITSHA7_PATTERN.source}`);
    }
    return normalized;
  }

  try {
    const sha = execSync("git rev-parse --short=7 HEAD", {
      stdio: ["ignore", "pipe", "ignore"],
      encoding: "utf8",
    })
      .trim()
      .toLowerCase();

    if (GITSHA7_PATTERN.test(sha)) {
      return sha;
    }
  } catch {
    // Fall through to deterministic placeholder.
  }

  return "0000000";
}

export function validateEvidenceSegments(parts: EvidenceIdParts): void {
  if (!SEGMENT_PATTERN.test(parts.tenant)) {
    throw new Error(`tenant must match ${SEGMENT_PATTERN.source}`);
  }
  if (!SEGMENT_PATTERN.test(parts.domain)) {
    throw new Error(`domain must match ${SEGMENT_PATTERN.source}`);
  }
  if (!SEGMENT_PATTERN.test(parts.artifact)) {
    throw new Error(`artifact must match ${SEGMENT_PATTERN.source}`);
  }
  if (!DATE_PATTERN.test(parts.date)) {
    throw new Error(`date must match ${DATE_PATTERN.source}`);
  }
  if (!GITSHA7_PATTERN.test(parts.gitsha7)) {
    throw new Error(`gitsha7 must match ${GITSHA7_PATTERN.source}`);
  }
  if (!RUNID8_PATTERN.test(parts.runid8)) {
    throw new Error(`runid8 must match ${RUNID8_PATTERN.source}`);
  }
}

export function buildEvidenceId(parts: EvidenceIdParts): string {
  validateEvidenceSegments(parts);
  return `EVID::${parts.tenant}::${parts.domain}::${parts.artifact}::${parts.date}::${parts.gitsha7}::${parts.runid8}`;
}

export function utcDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function buildArtifacts(params: {
  caseSpec: IOCaseSpec;
  casePath: string;
  tenant: string;
  domain: string;
  artifact: string;
  evidenceDate: string;
  gitsha7: string;
  runid8: string;
  evidenceId: string;
}): IOCaseArtifacts {
  const caseHash = sha256Hex(stableJson(params.caseSpec));

  const report = {
    version: 1,
    evidence_id: params.evidenceId,
    case_id: params.caseSpec.case_id,
    hypothesis: params.caseSpec.hypothesis,
    summary: {
      status: "intentionally_constrained",
      message:
        "Case runner skeleton validated case configuration and emitted deterministic evidence artifacts.",
    },
    sources_allowed: params.caseSpec.sources_allowed,
    detectors: params.caseSpec.detectors,
    thresholds: params.caseSpec.thresholds ?? {},
    export_formats: params.caseSpec.export_formats ?? ["report.json", "metrics.json", "stamp.json"],
    artifacts: ["report.json", "metrics.json", "stamp.json"],
  };

  const metrics = {
    version: 1,
    evidence_id: params.evidenceId,
    counts: {
      sources: params.caseSpec.sources_allowed.length,
      detectors: params.caseSpec.detectors.length,
      thresholds: Object.keys(params.caseSpec.thresholds ?? {}).length,
    },
    determinism: {
      case_hash_sha256: caseHash,
      stable_hashing: true,
      replay_ready: true,
    },
  };

  const stamp = {
    version: 1,
    evidence_id: params.evidenceId,
    tenant_id: params.tenant,
    domain: params.domain,
    artifact: params.artifact,
    evidence_date: params.evidenceDate,
    code_hash: params.gitsha7,
    config_hash: caseHash,
    dataset_hash: params.caseSpec.dataset_hash ?? "deferred_pending_dataset_lock",
    model_hash: params.caseSpec.model_hash ?? "deferred_pending_model_lock",
    run_id: params.runid8,
    case_path: path.resolve(params.casePath),
    generator: "intelgraph io run-case",
  };

  return {
    report: sortObjectKeys(report) as Record<string, unknown>,
    metrics: sortObjectKeys(metrics) as Record<string, unknown>,
    stamp: sortObjectKeys(stamp) as Record<string, unknown>,
  };
}

export function writeArtifacts(
  outputDir: string,
  artifacts: IOCaseArtifacts
): {
  reportPath: string;
  metricsPath: string;
  stampPath: string;
} {
  const resolved = path.resolve(outputDir);
  fs.mkdirSync(resolved, { recursive: true });

  const reportPath = path.join(resolved, "report.json");
  const metricsPath = path.join(resolved, "metrics.json");
  const stampPath = path.join(resolved, "stamp.json");

  fs.writeFileSync(reportPath, stableJson(artifacts.report), "utf8");
  fs.writeFileSync(metricsPath, stableJson(artifacts.metrics), "utf8");
  fs.writeFileSync(stampPath, stableJson(artifacts.stamp), "utf8");

  return { reportPath, metricsPath, stampPath };
}
