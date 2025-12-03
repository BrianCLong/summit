import { applyRedactions, DEFAULT_REDACTION_POLICY } from './redaction.js';
import { digestOf, previewOf, signPayload } from './signer.js';
import type {
  FinalizeOptions,
  GuardDecisionInput,
  GuardDecisionTraceEvent,
  MsqeEvent,
  MsqeRecorder,
  MsqeSummary,
  MsqeConfig,
  OutputContractInput,
  OutputContractTraceEvent,
  RedactionPolicy,
  RetrievalCandidateTrace,
  RetrievalEventInput,
  RetrievalTraceEvent,
  ToolCallEventInput,
  ToolCallTraceEvent,
  TraceBundle,
  TracePayload,
} from './types.js';

const DEFAULT_MAX_EVENTS = 200;

function nowIso(clock: () => Date): string {
  return clock().toISOString();
}

function buildSummary(events: readonly MsqeEvent[]): MsqeSummary {
  let retrievals = 0;
  let totalCandidates = 0;
  let filtersApplied = 0;
  let toolCalls = 0;
  let allow = 0;
  let deny = 0;
  let flag = 0;
  let outputValid = true;

  for (const event of events) {
    switch (event.kind) {
      case 'retrieval':
        retrievals += 1;
        totalCandidates += event.candidates.length;
        filtersApplied += event.filters.length;
        break;
      case 'tool-call':
        toolCalls += 1;
        break;
      case 'guard':
        if (event.decision === 'allow') {
          allow += 1;
        } else if (event.decision === 'deny') {
          deny += 1;
        } else {
          flag += 1;
        }
        break;
      case 'output-check':
        outputValid = event.valid;
        break;
      default:
        break;
    }
  }

  return {
    retrievals,
    totalCandidates,
    filtersApplied,
    toolCalls,
    guardDecisions: {
      allow,
      deny,
      flag,
      total: allow + deny + flag,
    },
    outputValid,
  };
}

function cloneEvents(events: readonly MsqeEvent[]): readonly MsqeEvent[] {
  return [...events]
    .sort((a, b) => a.ordinal - b.ordinal)
    .map((event) => ({ ...event }) as MsqeEvent);
}

export function createMsqe(config: MsqeConfig): MsqeRecorder {
  const clock = config.clock ?? (() => new Date());
  const createdAt = nowIso(clock);
  const maxEvents = config.maxEvents ?? DEFAULT_MAX_EVENTS;
  const events: MsqeEvent[] = [];
  let ordinal = 0;
  let truncated = false;

  function pushEvent(event: Omit<MsqeEvent, 'ordinal' | 'at'>): void {
    if (events.length >= maxEvents) {
      if (!truncated) {
        truncated = true;
        const truncationEvent: GuardDecisionTraceEvent = Object.freeze({
          kind: 'guard',
          guard: 'msqe:max-events',
          decision: 'flag',
          appliesTo: 'trace',
          rationale: `Trace truncated after ${maxEvents} events`,
          ordinal: ++ordinal,
          at: nowIso(clock),
        });
        events.push(truncationEvent);
      }
      return;
    }

    const record = Object.freeze({
      ...event,
      ordinal: ++ordinal,
      at: nowIso(clock),
    }) as MsqeEvent;
    events.push(record);
  }

  function recordRetrieval(input: RetrievalEventInput): void {
    const candidates: RetrievalCandidateTrace[] = input.candidates.map((candidate, index) => ({
      id: candidate.id,
      score: candidate.score,
      ranking: index + 1,
      reason: candidate.reason,
      contentDigest: candidate.content ? digestOf(candidate.content) : undefined,
      metadataKeys: candidate.metadata ? Object.keys(candidate.metadata) : undefined,
    }));

    const filters = (input.filters ?? []).map((filter) => ({
      name: filter.name,
      before: filter.before,
      after: filter.after,
      dropped: [...(filter.dropped ?? [])],
      rationale: filter.rationale,
    }));

    const event: RetrievalTraceEvent = {
      kind: 'retrieval',
      stage: input.stage,
      queryDigest: digestOf(input.query),
      queryPreview: previewOf(input.query),
      candidates,
      filters,
      ordinal: 0,
      at: createdAt,
    };

    pushEvent(event);
  }

  function recordToolCall(input: ToolCallEventInput): void {
    const event: ToolCallTraceEvent = {
      kind: 'tool-call',
      callId: input.callId,
      tool: input.tool,
      argsDigest: digestOf(input.args),
      resultDigest: input.result === undefined ? undefined : digestOf(input.result),
      argsPreview: previewOf(input.args),
      resultPreview: input.result === undefined ? undefined : previewOf(input.result),
      latencyMs: input.latencyMs,
      error: input.error,
      ordinal: 0,
      at: createdAt,
    };

    pushEvent(event);
  }

  function recordGuardDecision(input: GuardDecisionInput): void {
    const event: GuardDecisionTraceEvent = {
      kind: 'guard',
      guard: input.guard,
      decision: input.decision,
      appliesTo: input.appliesTo,
      rationale: input.rationale,
      ordinal: 0,
      at: createdAt,
    };

    pushEvent(event);
  }

  function recordOutputCheck(input: OutputContractInput): void {
    const event: OutputContractTraceEvent = {
      kind: 'output-check',
      contract: input.contract,
      valid: input.valid,
      issues: input.issues,
      outputDigest: digestOf(input.output),
      ordinal: 0,
      at: createdAt,
    };

    pushEvent(event);
  }

  function buildPayload(options?: FinalizeOptions): TracePayload {
    const snapshot = cloneEvents(events);
    const payload: TracePayload = {
      version: 'msqe/1.0',
      requestId: config.requestId,
      createdAt,
      summary: buildSummary(snapshot),
      events: snapshot,
    };

    if (!options?.redactionPolicy) {
      return payload;
    }

    return applyRedactions(payload, options.redactionPolicy);
  }

  function finalize(options?: FinalizeOptions): TraceBundle {
    const payload = buildPayload(options);
    const { hash, signature } = signPayload(payload, config.signingSecret);

    return {
      ...payload,
      hash,
      signature,
      keyId: config.keyId,
    };
  }

  function finalizeForSharing(policy: RedactionPolicy = DEFAULT_REDACTION_POLICY): TraceBundle {
    return finalize({ redactionPolicy: policy });
  }

  function eventsSnapshot(): readonly MsqeEvent[] {
    return cloneEvents(events);
  }

  return {
    recordRetrieval,
    recordToolCall,
    recordGuardDecision,
    recordOutputCheck,
    finalize,
    finalizeForSharing,
    events: eventsSnapshot,
  };
}
