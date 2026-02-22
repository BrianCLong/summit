export type CheckStatus = "pass" | "fail";
export type CheckResult = { name: string; status: CheckStatus; details?: unknown };

export type ValidationResult = {
  started_at: string; // ISO, no millis
  checks: CheckResult[];
  hard_failures: number;
  soft_failures: number;
  notes?: string[];
};
