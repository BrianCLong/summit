export type SpanRef = {
  handleId: string;
  path?: string;          // file path if applicable
  start: number;          // byte/char offset
  end: number;
  sha256: string;         // hash of extracted content
};

export interface ContextHandle {
  id: string;
  kind: "repo" | "docBundle" | "corpus" | "caseFile";
  metadata: Record<string, any>;
}

export interface InspectEnv {
  listFiles(prefix?: string): Promise<string[]>;
  readFile(path: string, start?: number, end?: number): Promise<{ text: string; span: SpanRef }>;
  searchText(pattern: string, opts?: { paths?: string[]; maxHits?: number }): Promise<Array<{ hit: string; span: SpanRef }>>;
  peek(start: number, len: number): Promise<{ text: string; span: SpanRef }>;
  chunk(strategy: "byTokens" | "byHeadings" | "byAST" | "bySessions", opts?: any): Promise<Array<{ span: SpanRef }>>;
}

export interface RecursionBudget {
  maxDepth: number;
  maxIterations: number;
  maxSubcalls: number;
  maxWallMs: number;
  maxCostUsd: number;
}

export interface RCRResult {
  answer: string;
  citations: SpanRef[];
  traceUrl?: string; // evidence bundle artifact
  metrics: Record<string, number>;
}
