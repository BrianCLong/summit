export type MsqeStage = 'retrieval' | 'reasoning' | 'guard' | 'output';

export interface TraceEventBase {
  readonly kind: MsqeStage | 'tool-call' | 'output-check';
  readonly ordinal: number;
  readonly at: string;
}

export interface RetrievalCandidateTrace {
  readonly id: string;
  readonly score: number;
  readonly ranking: number;
  readonly reason?: string;
  readonly contentDigest?: string;
  readonly metadataKeys?: readonly string[];
}

export interface FilterApplicationTrace {
  readonly name: string;
  readonly before: number;
  readonly after: number;
  readonly dropped: readonly string[];
  readonly rationale?: string;
}

export interface RetrievalTraceEvent extends TraceEventBase {
  readonly kind: 'retrieval';
  readonly stage: string;
  readonly queryDigest: string;
  readonly queryPreview?: string;
  readonly candidates: readonly RetrievalCandidateTrace[];
  readonly filters: readonly FilterApplicationTrace[];
}

export interface ToolCallTraceEvent extends TraceEventBase {
  readonly kind: 'tool-call';
  readonly callId: string;
  readonly tool: string;
  readonly argsDigest: string;
  readonly resultDigest?: string;
  readonly argsPreview?: string;
  readonly resultPreview?: string;
  readonly latencyMs?: number;
  readonly error?: string;
}

export interface GuardDecisionTraceEvent extends TraceEventBase {
  readonly kind: 'guard';
  readonly guard: string;
  readonly decision: 'allow' | 'deny' | 'flag';
  readonly appliesTo: string;
  readonly rationale?: string;
}

export interface OutputContractTraceEvent extends TraceEventBase {
  readonly kind: 'output-check';
  readonly contract: string;
  readonly valid: boolean;
  readonly issues?: readonly string[];
  readonly outputDigest: string;
}

export type MsqeEvent =
  | RetrievalTraceEvent
  | ToolCallTraceEvent
  | GuardDecisionTraceEvent
  | OutputContractTraceEvent;

export interface MsqeSummary {
  readonly retrievals: number;
  readonly totalCandidates: number;
  readonly filtersApplied: number;
  readonly toolCalls: number;
  readonly guardDecisions: {
    readonly allow: number;
    readonly deny: number;
    readonly flag: number;
    readonly total: number;
  };
  readonly outputValid: boolean;
}

export interface TracePayload {
  readonly version: 'msqe/1.0';
  readonly requestId: string;
  readonly createdAt: string;
  readonly summary: MsqeSummary;
  readonly events: readonly MsqeEvent[];
}

export interface TraceBundle extends TracePayload {
  readonly hash: string;
  readonly signature: string;
  readonly keyId?: string;
}

export interface MsqeConfig {
  readonly requestId: string;
  readonly signingSecret: string | Buffer;
  readonly keyId?: string;
  readonly clock?: () => Date;
  readonly maxEvents?: number;
}

export interface RetrievalCandidateInput {
  readonly id: string;
  readonly score: number;
  readonly reason?: string;
  readonly content?: string | Record<string, unknown>;
  readonly metadata?: Record<string, unknown>;
}

export interface FilterApplicationInput {
  readonly name: string;
  readonly before: number;
  readonly after: number;
  readonly dropped?: readonly string[];
  readonly rationale?: string;
}

export interface RetrievalEventInput {
  readonly stage: string;
  readonly query: string;
  readonly candidates: readonly RetrievalCandidateInput[];
  readonly filters?: readonly FilterApplicationInput[];
}

export interface ToolCallEventInput {
  readonly callId: string;
  readonly tool: string;
  readonly args: unknown;
  readonly result?: unknown;
  readonly latencyMs?: number;
  readonly error?: string;
}

export interface GuardDecisionInput {
  readonly guard: string;
  readonly decision: 'allow' | 'deny' | 'flag';
  readonly appliesTo: string;
  readonly rationale?: string;
}

export interface OutputContractInput {
  readonly contract: string;
  readonly valid: boolean;
  readonly issues?: readonly string[];
  readonly output: unknown;
}

export interface RedactionPolicy {
  readonly maskValue?: string;
  readonly redactKeys?: readonly string[];
  readonly redactPaths?: readonly string[];
  readonly redactMetadataKeys?: readonly string[];
  readonly truncateStringsAbove?: number;
  readonly custom?: (context: {
    readonly path: readonly (string | number)[];
    readonly value: unknown;
  }) => boolean;
}

export interface FinalizeOptions {
  readonly redactionPolicy?: RedactionPolicy;
}

export interface MsqeRecorder {
  readonly recordRetrieval: (input: RetrievalEventInput) => void;
  readonly recordToolCall: (input: ToolCallEventInput) => void;
  readonly recordGuardDecision: (input: GuardDecisionInput) => void;
  readonly recordOutputCheck: (input: OutputContractInput) => void;
  readonly finalize: (options?: FinalizeOptions) => TraceBundle;
  readonly finalizeForSharing: (policy?: RedactionPolicy) => TraceBundle;
  readonly events: () => readonly MsqeEvent[];
}
