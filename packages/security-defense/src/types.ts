export type CheckStatus = "pass" | "fail";

export interface CheckResult {
  epic: string;
  requirement: string;
  status: CheckStatus;
  message: string;
  remediation?: string;
  details?: Record<string, unknown>;
}

export interface RunnerOptions {
  rootDir?: string;
  now?: Date;
  sbomBaselinePath?: string;
  sbomTargetPath?: string;
  rotationThresholdDays?: number;
}
