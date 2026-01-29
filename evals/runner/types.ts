export type TraceEventType =
  | 'run_start'
  | 'run_end'
  | 'case_start'
  | 'case_end'
  | 'command_start'
  | 'command_end'
  | 'file_changes'
  | 'artifact_written'
  | 'metric';

export interface TraceEvent {
  ts: string;
  event_type: TraceEventType;
  run_id: string;
  skill: string;
  prompt_id?: string;
  data: Record<string, unknown>;
}

export interface PromptCase {
  id: string;
  prompt: string;
  expected_trigger: boolean;
  tags: string[];
}

export interface DeterministicCheck {
  id: string;
  pass: boolean;
  notes?: string;
}

export interface DeterministicResult {
  overall_pass: boolean;
  score: number;
  checks: DeterministicCheck[];
}

export interface RubricResult {
  overall_pass: boolean;
  score: number;
  checks: DeterministicCheck[];
}

export interface SkillRunConfig {
  skill: string;
  description: string;
  command: string[];
  timeout_ms: number;
  allowed_tools: string[];
  forbidden_paths: string[];
  deterministic_grader: string;
  rubric: {
    schema: string;
    prompt: string;
    grader: string;
  };
}

export interface CaseResult {
  id: string;
  success: boolean;
  duration_ms: number;
  exit_code: number | null;
  artifact_dir: string;
}

export interface ScoreSummary {
  skill: string;
  run_id: string;
  deterministic: DeterministicResult;
  rubric: RubricResult;
  combined_score: number;
  overall_pass: boolean;
  regression: {
    baseline_score: number | null;
    delta: number | null;
    drop_threshold: number;
    pass: boolean;
  };
}
