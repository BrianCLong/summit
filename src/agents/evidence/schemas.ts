// Minimal “schemas” as runtime validators (no heavy deps).
// TODO: replace with zod/ajv if already used in repo (keep PR blast radius minimal).

export const REQUIRED_EVIDENCE_FILES = [
  "evidence/report.json",
  "evidence/metrics.json",
  "evidence/stamp.json",
  "evidence/index.json",
] as const;

export const MUST_NOT_CONTAIN_FIELDS = ["secret", "token", "password", "apiKey"] as const;
