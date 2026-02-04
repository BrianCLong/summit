export interface SkillMetadata {
  name: string;
  version: string;
  description: string;
  author?: string;
  license?: string;
}

export interface SkillTriggers {
  intents?: string[];
  keywords?: string[];
  file_patterns?: string[];
}

export interface SkillInputs {
  properties?: Record<string, any>;
  required?: string[];
}

export interface ExecStep {
  id?: string;
  type: 'exec';
  command: string;
  cwd?: string;
  env?: Record<string, string>;
}

export interface EditStep {
  id?: string;
  type: 'edit';
  file: string;
  merge_diff?: string;
  content?: string;
}

export interface VerifyStep {
  id?: string;
  type: 'verify';
  check: string;
  name?: string;
  on_fail?: 'abort' | 'warn';
}

export interface CiteStep {
  id?: string;
  type: 'cite';
  source: string;
  excerpt?: string;
}

export interface AskUserStep {
  id?: string;
  type: 'ask_user';
  prompt: string;
  schema?: Record<string, any>;
}

export type SkillStep = ExecStep | EditStep | VerifyStep | CiteStep | AskUserStep;

export interface SkillGovernance {
  risk_level?: 'low' | 'medium' | 'high' | 'critical';
  evidence_requirements?: string[];
}

export interface SkillManifest {
  schema_version: 'v2';
  metadata: SkillMetadata;
  triggers?: SkillTriggers;
  inputs?: SkillInputs;
  required_env?: string[];
  steps: SkillStep[];
  outputs?: {
    properties?: Record<string, any>;
  };
  governance?: SkillGovernance;
}
