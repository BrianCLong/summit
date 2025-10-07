export interface CheckResult {
  name: string;
  pass: boolean;
  status?: unknown;
  result?: unknown;
  error?: unknown;
  reason?: string;
  metadata?: Record<string, string>;
  details?: unknown;
}

export interface RunnerOutput {
  summary: {
    passed: number;
    failed: number;
  };
  checks: CheckResult[];
}

export interface BadgeOptions {
  server: string;
  version?: string;
  metrics?: {
    coldStartP95?: number | null;
    replaySuccess?: number | null;
  };
  sandboxMetadata?: Record<string, string>;
}
