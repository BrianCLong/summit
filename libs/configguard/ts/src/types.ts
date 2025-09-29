export type Severity = 'error' | 'warning';

export interface Position {
  line: number;
  column: number;
}

export interface Diagnostic {
  severity: Severity;
  message: string;
  pointer: string;
  line?: number;
  column?: number;
  code?: string;
  hint?: string;
}

export interface LoadResult<T = unknown> {
  config: T | null;
  diagnostics: Diagnostic[];
  pointerMap: Record<string, Position>;
}

export interface ValidateOptions {
  pointerMap?: Record<string, Position>;
}

export interface LoadOptions {
  interpolation?: InterpolationPolicy;
  strict?: boolean;
}

export interface InterpolationPolicy {
  /** Only allow listed environment variables. */
  allowList?: string[];
  /** Blocklisted environment variables. */
  denyList?: string[];
  /** Provide fallback values when env vars are missing. */
  defaults?: Record<string, string>;
  /** How to behave when env vars are missing. */
  onMissing?: 'error' | 'warn' | 'ignore';
  /** Require all variables referenced to be in allowList. */
  requireAllowList?: boolean;
}

export type SchemaInput = object | string;
