import { randomUUID, createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const SENSITIVE_KEYS = [
  "authorization",
  "cookie",
  "set-cookie",
  "token",
  "secret",
  "password",
  "apiKey",
];

export type ReplayOutcomeStatus = "error" | "success";

export interface ReplayOutcome {
  status: ReplayOutcomeStatus;
  message?: string;
  classification?: string;
  originalStatusCode?: number;
}

export interface ReplayEnvironmentSnapshot {
  commit?: string;
  buildId?: string;
  runtime?: string;
  env?: Record<string, string | undefined>;
}

export interface ReplayContextSnapshot {
  tenantId?: string;
  userIdHash?: string;
  caseId?: string;
  purpose?: string;
  traceId?: string;
  requestId?: string;
  featureFlags?: Record<string, boolean | string>;
}

export interface ReplayRequestSnapshot {
  path?: string;
  method?: string;
  payload?: unknown;
  headers?: Record<string, string | undefined>;
  meta?: Record<string, unknown>;
}

export interface ReplayDescriptor {
  id: string;
  service: string;
  flow: string;
  capturedAt: string;
  request: ReplayRequestSnapshot;
  context: ReplayContextSnapshot;
  environment: ReplayEnvironmentSnapshot;
  outcome: ReplayOutcome;
  originalResponse?: unknown;
  privacy: { piiScrubbed: boolean; notes?: string[] };
  tags?: string[];
}

function redactValue(value: unknown): unknown {
  if (typeof value === "string") {
    return value.length > 1024 ? `${value.slice(0, 1024)}…[truncated]` : value;
  }
  if (Array.isArray(value)) {
    return value.map((entry) => redactValue(entry));
  }
  if (value && typeof value === "object") {
    return sanitizePayload(value);
  }
  return value;
}

export function sanitizePayload<T>(payload: T): T {
  if (!payload || typeof payload !== "object") {
    return payload;
  }
  const sanitized: Record<string, unknown> = Array.isArray(payload) ? [] : {};
  for (const [key, value] of Object.entries(payload as Record<string, unknown>)) {
    if (SENSITIVE_KEYS.includes(key.toLowerCase())) {
      continue;
    }
    sanitized[key] = redactValue(value);
  }
  return sanitized as T;
}

export function buildReplayEnvironment(
  overrides: Partial<ReplayEnvironmentSnapshot> = {}
): ReplayEnvironmentSnapshot {
  return {
    commit: process.env.GIT_COMMIT ?? process.env.COMMIT_SHA ?? overrides.commit,
    buildId: overrides.buildId ?? process.env.BUILD_ID,
    runtime: overrides.runtime ?? process.version,
    env: {
      NODE_ENV: process.env.NODE_ENV,
      FEATURE_FLAG_SET: process.env.FEATURE_FLAG_SET,
      ...overrides.env,
    },
  };
}

export function hashIdentifier(value?: string): string | undefined {
  if (!value) {
    return undefined;
  }
  return createHash("sha256").update(value).digest("hex");
}

export function createReplayDescriptor(
  input: Omit<ReplayDescriptor, "id" | "capturedAt" | "privacy"> & {
    privacy?: Partial<ReplayDescriptor["privacy"]>;
  }
): ReplayDescriptor {
  return {
    ...input,
    id: `${input.service}-${randomUUID()}`,
    capturedAt: new Date().toISOString(),
    privacy: { piiScrubbed: true, notes: [], ...input.privacy },
  };
}

export function persistReplayDescriptor(
  descriptor: ReplayDescriptor,
  rootDir = process.cwd()
): string {
  const replayDir = path.join(rootDir, "replays", descriptor.service);
  const replayPath = path.join(replayDir, `${descriptor.id}.json`);
  fs.mkdirSync(replayDir, { recursive: true });
  fs.writeFileSync(replayPath, `${JSON.stringify(descriptor, null, 2)}\n`);
  return replayPath;
}
