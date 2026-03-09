export type GuardKind = 'regex' | 'classifier' | 'tool-scope' | 'redactor';

export type GuardEffect = 'allow' | 'block' | 'redact' | 'limit-tools';

export type GuardStage = 'prompt' | 'response' | 'tools';

export interface PPCContext {
  prompt: string;
  response?: string;
  tools?: string[];
  metadata?: Record<string, unknown>;
}

export interface GuardRuntimeState {
  prompt: string;
  response?: string;
  tools: string[];
  metadata: Record<string, unknown>;
}

export interface GuardEvaluation {
  triggered: boolean;
  effect: GuardEffect;
  description?: string;
  modifications?: Partial<GuardRuntimeState>;
  score?: number;
  label?: string;
}

export interface GuardTrace extends GuardEvaluation {
  name: string;
  kind: GuardKind;
  order: number;
  stage: GuardStage;
}

export interface Guard {
  readonly name: string;
  readonly kind: GuardKind;
  readonly stage: GuardStage;
  evaluate(state: GuardRuntimeState): Promise<GuardEvaluation> | GuardEvaluation;
}

export interface GuardViolation {
  name: string;
  kind: GuardKind;
  stage: GuardStage;
  effect: Exclude<GuardEffect, 'allow'>;
  description?: string;
  score?: number;
  label?: string;
}

export interface PolicyExecution {
  name: string;
  allowed: boolean;
  prompt: string;
  response?: string;
  tools: string[];
  metadata: Record<string, unknown>;
  trace: GuardTrace[];
  blockedBy?: string;
  violations: GuardViolation[];
}

export interface PolicyExecutionOptions {
  dryRun?: boolean;
}

export interface Policy {
  readonly name: string;
  execute(
    context: PPCContext,
    options?: PolicyExecutionOptions
  ): Promise<PolicyExecution>;
  dryRun(context: PPCContext): Promise<PolicyExecution>;
}

export interface ClassifierResult {
  score: number;
  label?: string;
  explanation?: string;
}

export type ClassifierFn = (
  input: string,
  state: GuardRuntimeState
) => Promise<ClassifierResult> | ClassifierResult;

export interface RegexGuardOptions {
  name: string;
  pattern: RegExp;
  description?: string;
  effect?: Extract<GuardEffect, 'block' | 'redact'>;
  redaction?: string;
  target: 'prompt' | 'response';
}

export interface ClassifierGuardOptions {
  name: string;
  classifier: ClassifierFn;
  threshold: number;
  description?: string;
  target: 'prompt' | 'response';
  effect?: Extract<GuardEffect, 'block' | 'allow'>;
}

export interface ToolScopeGuardOptions {
  name: string;
  allowedTools: string[];
  description?: string;
  mode?: 'filter' | 'block';
}

export interface RedactorRule {
  pattern: RegExp;
  replacement: string;
  description?: string;
}

export interface RedactorGuardOptions {
  name: string;
  target: 'prompt' | 'response';
  rules: RedactorRule[];
  description?: string;
}

export interface GuardDefinition {
  kind: GuardKind;
  options:
    | RegexGuardOptions
    | ClassifierGuardOptions
    | ToolScopeGuardOptions
    | RedactorGuardOptions;
}
