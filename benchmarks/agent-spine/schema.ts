export type SpineToolTrace = {
  tool: string;
  input: string;
  output_ref: string;
};

export type SpineTask = {
  suite: string;
  case_id: string;
  prompt: string;
  expected_evidence: string[];
  tool_trace: SpineToolTrace[];
};

export type SpineResultTrace = {
  step: number;
  tool: string;
  output_ref: string;
};

export type SpineResult = {
  schema_version: "1";
  suite: string;
  case_id: string;
  score: number;
  passed: boolean;
  evidence_ids: string[];
  trace: SpineResultTrace[];
};
