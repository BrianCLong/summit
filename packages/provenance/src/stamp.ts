import { createHash } from "crypto";

export interface LegacyEvidenceStampInput {
  family: string;
  slug: string;
  gitSha: string;
  generatedAt?: Date;
  dependencyFingerprint?: string;
}

export interface StructuredEvidenceStampInput {
  tenant: string;
  domain?: string;
  artifact: string;
  gitSha: string;
  runId?: string;
  evidenceDate?: string;
  generatedAt?: Date;
  dependencyFingerprint?: string;
}

export type EvidenceStampInput = LegacyEvidenceStampInput | StructuredEvidenceStampInput;

export interface EvidenceStamp {
  evidence_id: string;
  generated_at: string;
  git_sha: string;
  family?: string;
  slug?: string;
  tenant?: string;
  domain?: string;
  artifact?: string;
  run_id?: string;
  evidence_date?: string;
  dependency_fingerprint?: string;
}

export interface StructuredEvidenceIdParts {
  tenant: string;
  domain: string;
  artifact: string;
  date: string;
  gitSha7: string;
  runId8: string;
}

function toDateToken(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

function toIsoDateToken(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(
    date.getUTCDate()
  ).padStart(2, "0")}`;
}

function normalizeFamily(family: string): string {
  const normalized = family
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "");
  return normalized.length > 0 ? normalized : "GEN";
}

function normalizeSlug(slug: string): string {
  const normalized = slug
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized.length > 0 ? normalized : "artifact";
}

function normalizeGitSha(gitSha: string): string {
  const normalized = gitSha
    .trim()
    .toLowerCase()
    .replace(/[^a-f0-9]/g, "");
  if (normalized.length === 0) {
    return "0000000";
  }
  return normalized.slice(0, 7).padEnd(7, "0");
}

function normalizeEvidenceSegment(input: string, fallback: string): string {
  const normalized = input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized.length > 0 ? normalized : fallback;
}

function normalizeEvidenceDate(input: string | undefined, generatedAt: Date): string {
  if (!input) {
    return toIsoDateToken(generatedAt);
  }

  const normalized = input.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return normalized;
  }

  const parsed = new Date(normalized);
  if (!Number.isNaN(parsed.getTime())) {
    return toIsoDateToken(parsed);
  }

  return toIsoDateToken(generatedAt);
}

function normalizeRunId(input: string | undefined, seed: string): string {
  if (input && /^[a-f0-9]{8}$/i.test(input.trim())) {
    return input.trim().toLowerCase();
  }

  return createHash("sha256").update(seed).digest("hex").slice(0, 8);
}

function isStructuredInput(input: EvidenceStampInput): input is StructuredEvidenceStampInput {
  return (
    Object.prototype.hasOwnProperty.call(input, "tenant") &&
    Object.prototype.hasOwnProperty.call(input, "artifact")
  );
}

function resolveStructuredParts(input: StructuredEvidenceStampInput): StructuredEvidenceIdParts {
  const generatedAt = input.generatedAt ?? new Date();
  const gitSha7 = normalizeGitSha(input.gitSha);
  const tenant = normalizeEvidenceSegment(input.tenant, "tenant");
  const domain = normalizeEvidenceSegment(input.domain ?? "io", "io");
  const artifact = normalizeEvidenceSegment(input.artifact, "artifact");
  const date = normalizeEvidenceDate(input.evidenceDate, generatedAt);
  const runSeed = `${tenant}|${domain}|${artifact}|${date}|${gitSha7}`;
  const runId8 = normalizeRunId(input.runId, runSeed);

  return {
    tenant,
    domain,
    artifact,
    date,
    gitSha7,
    runId8,
  };
}

function buildLegacyEvidenceId(input: LegacyEvidenceStampInput): string {
  const createdAt = input.generatedAt ?? new Date();
  const family = normalizeFamily(input.family);
  const slug = normalizeSlug(input.slug);
  const sha7 = normalizeGitSha(input.gitSha);
  return `EVID-${family}-${toDateToken(createdAt)}-${slug}-${sha7}`;
}

export function buildEvidenceId(input: EvidenceStampInput): string {
  if (isStructuredInput(input)) {
    const parts = resolveStructuredParts(input);
    return `EVID::${parts.tenant}::${parts.domain}::${parts.artifact}::${parts.date}::${parts.gitSha7}::${parts.runId8}`;
  }

  return buildLegacyEvidenceId(input);
}

export function buildEvidenceStamp(input: EvidenceStampInput): EvidenceStamp {
  const createdAt = input.generatedAt ?? new Date();

  if (isStructuredInput(input)) {
    const parts = resolveStructuredParts({
      ...input,
      generatedAt: createdAt,
    });
    return {
      evidence_id: buildEvidenceId({
        ...input,
        generatedAt: createdAt,
      }),
      generated_at: createdAt.toISOString(),
      git_sha: parts.gitSha7,
      tenant: parts.tenant,
      domain: parts.domain,
      artifact: parts.artifact,
      run_id: parts.runId8,
      evidence_date: parts.date,
      dependency_fingerprint: input.dependencyFingerprint,
    };
  }

  return {
    evidence_id: buildLegacyEvidenceId({
      ...input,
      generatedAt: createdAt,
    }),
    generated_at: createdAt.toISOString(),
    git_sha: normalizeGitSha(input.gitSha),
    family: normalizeFamily(input.family),
    slug: normalizeSlug(input.slug),
    dependency_fingerprint: input.dependencyFingerprint,
  };
}

export function parseStructuredEvidenceId(
  evidenceId: string
): StructuredEvidenceIdParts | undefined {
  const match =
    /^EVID::([a-z0-9][a-z0-9_-]*)::([a-z0-9][a-z0-9_-]*)::([a-z0-9][a-z0-9_-]*)::(\d{4}-\d{2}-\d{2})::([a-f0-9]{7})::([a-f0-9]{8})$/.exec(
      evidenceId
    );

  if (!match) {
    return undefined;
  }

  return {
    tenant: match[1],
    domain: match[2],
    artifact: match[3],
    date: match[4],
    gitSha7: match[5],
    runId8: match[6],
  };
}

export function fingerprintDeterminismInputs(
  inputs: Record<string, string | number | boolean>
): string {
  const canonical = Object.keys(inputs)
    .sort((a, b) => a.localeCompare(b))
    .map((key) => `${key}=${String(inputs[key])}`)
    .join("\n");

  return createHash("sha256").update(canonical).digest("hex");
}
