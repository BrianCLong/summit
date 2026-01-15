export type ContextShellToolName =
  | 'ctx.bash'
  | 'ctx.readFile'
  | 'ctx.writeFile';

export type FileSystemMode = 'native' | 'overlay' | 'memory';

export interface ContextShellResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  filesRead: string[];
  filesWritten: string[];
  durationMs: number;
  redactionsApplied: string[];
}

export interface RedactionRule {
  id: string;
  pattern: RegExp;
  replacement?: string;
}

export interface ContextShellLimits {
  maxOutputBytes: number;
  maxExecMs: number;
  maxSteps: number;
  maxFileBytes: number;
}

export interface ContextShellCache {
  get(key: string): ContextShellResult | undefined;
  set(key: string, value: ContextShellResult): void;
}

export interface ToolCall {
  tool: ContextShellToolName;
  command?: string;
  args?: string[];
  path?: string;
  content?: string;
  metadata?: Record<string, unknown>;
}

export interface ContextShellHooks {
  onBeforeCall?: (call: ToolCall) => Promise<ToolCall> | ToolCall;
  onAfterCall?: (
    call: ToolCall,
    result: ContextShellResult
  ) => Promise<ContextShellResult> | ContextShellResult;
}

export interface EvidenceOptions {
  enabled: boolean;
  dir: string;
}

export interface ContextShellOptions {
  root: string;
  fsMode?: FileSystemMode;
  policy?: ContextShellPolicy;
  limits?: Partial<ContextShellLimits>;
  redactions?: RedactionRule[];
  cache?: ContextShellCache;
  hooks?: ContextShellHooks;
  evidence?: Partial<EvidenceOptions>;
  repoSha?: string;
  traceId?: string;
  now?: () => number;
}

export interface PolicyDecision {
  allowed: boolean;
  decisionId: string;
  reason?: string;
}

export interface PolicyInput {
  tool: ContextShellToolName;
  command?: string;
  args?: string[];
  path?: string;
  justification?: string;
  format?: string;
}

export interface ContextShellPolicy {
  id: string;
  version: string;
  evaluate: (input: PolicyInput) => PolicyDecision;
}

export interface ContextShell {
  bash: (command: string) => Promise<ContextShellResult>;
  readFile: (path: string) => Promise<ContextShellResult>;
  writeFile: (
    path: string,
    content: string,
    options?: { justification?: string; format?: string }
  ) => Promise<ContextShellResult>;
}
