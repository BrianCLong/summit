export type UiFuzzConfig = {
  baseUrl: string;
  allowlist: string[];
  seed: number;
  maxActions: number;
  maxNavigations: number;
  timeBudgetMs: number;
  idleTimeoutMs: number;
  headless: boolean;
  exitOnViolation: boolean;
  traceEnabled: boolean;
  outputDir: string;
  consoleAllowlist: RegExp[];
  specPath?: string;
};

export type TraceEntry = {
  step: number;
  type: string;
  selector?: string;
  url?: string;
  urlAfter?: string;
  inputLength?: number;
  note?: string;
};

export type Violation = {
  type: string;
  message: string;
  step?: number;
};

export type RunMetrics = {
  actionsExecuted: number;
  navigations: number;
  durationMs: number;
  traceBytes: number;
  violations: number;
  exitCode: number;
};

export type RunReport = {
  schemaVersion: number;
  baseUrl: string;
  seed: number;
  violations: Violation[];
  summary: {
    count: number;
    byType: Record<string, number>;
  };
};

export type RunResult = {
  trace: TraceEntry[];
  report: RunReport;
  metrics: RunMetrics;
  exitCode: number;
};

export type SpecAction = {
  name: string;
  run: (context: SpecContext) => Promise<TraceEntry | null>;
};

export type SpecProperty = {
  name: string;
  evaluate: (context: PropertyContext) => Violation[];
};

export type SpecModule = {
  actions?: SpecAction[];
  properties?: SpecProperty[];
};

export type SpecContext = {
  page: import('@playwright/test').Page;
  rng: import('./rng.js').Rng;
};

export type PropertyContext = {
  consoleErrors: string[];
  pageErrors: string[];
  idleTimeouts: number;
};
