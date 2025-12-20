export type LintFinding = {
  file: string;
  message: string;
  rule: string;
  remediation: string;
};

export type LintOptions = {
  patterns: string[];
};
