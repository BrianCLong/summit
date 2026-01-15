export type FsMode = 'readonly' | 'overlay';

export interface ContextShellLimits {
  maxOutputBytes: number;
  maxExecMs: number;
  maxSteps: number;
  maxFiles: number;
}

export interface RedactionRule {
  name: string;
  pattern: RegExp;
  replacement?: string;
}

export interface PolicyDecision {
  allow: boolean;
  decisionId: string;
  reason?: string;
}

export interface PolicyContext {
  command?: string;
  args?: string[];
  path?: string;
  justification?: string;
  operation: 'command' | 'read' | 'write';
}

export interface ContextShellPolicy {
  version: string;
  evaluate(context: PolicyContext): PolicyDecision;
  normalizeCommand(command: string, args: string[]): string;
}

export interface ToolCallContext {
  tool: 'bash' | 'readFile' | 'writeFile';
  input: Record<string, unknown>;
}

export interface ToolCallHooks {
  onBeforeCall?: (
    context: ToolCallContext,
  ) => ToolCallContext | Promise<ToolCallContext> | undefined | void;
  onAfterCall?: (
    context: ToolCallContext,
    output: ContextShellOutput,
  ) => ContextShellOutput | Promise<ContextShellOutput> | undefined | void;
}

export interface EvidenceEvent {
  type: 'tool_call_start' | 'tool_call_end';
  ts: string;
  tool: string;
  normalized?: string;
  policyDecisionId?: string;
  inputsHash?: string;
  outputsHash?: string;
  durationMs?: number;
  exitCode?: number;
  filesRead?: string[];
  filesWritten?: string[];
  redactionsApplied?: string[];
}

export interface EvidenceWriter {
  write(event: EvidenceEvent): Promise<void>;
}

export interface ContextShellCache {
  get(key: string): ContextShellOutput | undefined;
  set(key: string, value: ContextShellOutput): void;
}

export interface ContextShellOutput {
  stdout: string;
  stderr: string;
  exitCode: number;
  filesRead: string[];
  filesWritten: string[];
  durationMs: number;
  redactionsApplied: string[];
}

export interface WriteFileOptions {
  justification?: string;
  format?: 'text' | 'patch';
}

export interface CreateContextShellOptions {
  root: string;
  fsMode?: FsMode;
  policy?: ContextShellPolicy;
  limits?: Partial<ContextShellLimits>;
  redactions?: RedactionRule[];
  cache?: ContextShellCache;
  hooks?: ToolCallHooks;
  evidence?: EvidenceWriter;
  now?: () => number;
}

export interface ContextShell {
  bash(command: string): Promise<ContextShellOutput>;
  readFile(path: string): Promise<ContextShellOutput>;
  writeFile(
    path: string,
    content: string,
    options?: WriteFileOptions,
  ): Promise<ContextShellOutput>;
}

export interface ParsedCommand {
  name: string;
  args: string[];
}

export interface CommandPipeline {
  commands: ParsedCommand[];
}

export interface InterpreterResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  filesRead: string[];
}

export interface InterpreterContext {
  root: string;
  limits: ContextShellLimits;
  policy: ContextShellPolicy;
  redactions: RedactionRule[];
  now: () => number;
  readFile: (path: string) => Promise<string>;
  listDir: (path: string) => Promise<string[]>;
  listFilesRecursive: (path: string) => Promise<string[]>;
}
