export interface ReviewFinding {
  type: "style" | "risk" | "test" | "docs" | "error" | "secret";
  severity: "info" | "warning" | "error" | "critical";
  file?: string;
  line?: number;
  message: string;
  ruleId: string;
}

export interface ReviewOutput {
  summary: string;
  findings: ReviewFinding[];
  passed: boolean;
}

export interface DiffFile {
  to?: string;
  from?: string;
  chunks: {
    content: string;
    changes: {
      type: "add" | "del" | "normal";
      content: string;
      ln1?: number; // line number in old file
      ln2?: number; // line number in new file
    }[];
  }[];
}
