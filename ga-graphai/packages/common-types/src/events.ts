import type { ExecutionOutcome, ExplainablePlan } from "./index";

type EventVersion = `${number}.${number}`;

export interface EventActor {
  id: string;
  type?: "system" | "user" | "service" | string;
  source?: string;
}

export interface EventContext {
  service?: string;
  environment?: string;
  region?: string;
  component?: string;
}

export interface EventMetadata {
  actor?: EventActor;
  correlationId?: string;
  traceId?: string;
  runId?: string;
  context?: EventContext;
}

interface EventSchema<TPayload extends Record<string, unknown>> {
  name: EventName;
  version: EventVersion;
  description: string;
  required: (keyof TPayload)[];
  example: TPayload;
}

export interface EventEnvelope<TPayload extends Record<string, unknown>> {
  name: EventName;
  version: EventVersion;
  timestamp: string;
  correlationId?: string;
  traceId?: string;
  runId?: string;
  actor?: EventActor;
  context?: EventContext;
  payload: TPayload;
}

export interface EventPayloads {
  "summit.maestro.run.created": {
    runId: string;
    pipelineId: string;
    stageIds: string[];
    metadata?: Record<string, unknown>;
  };
  "summit.maestro.run.started": {
    runId: string;
    pipelineId: string;
    stageCount: number;
    planScore: number;
  };
  "summit.maestro.run.completed": {
    runId: string;
    pipelineId: string;
    status: "success" | "degraded";
    traceLength: number;
    successCount: number;
    recoveredCount: number;
    durationMs: number;
  };
  "summit.maestro.run.failed": {
    runId: string;
    pipelineId: string;
    reason: string;
    failedStageId?: string;
    fatal?: boolean;
  };
  "summit.intelgraph.query.executed": {
    queryType: string;
    subjectId: string;
    durationMs: number;
    resultCount: number;
    riskScore?: number;
    incidentCount?: number;
  };
  "summit.incident.detected": {
    incidentId: string;
    assetId: string;
    severity: string;
    metric: string;
    timestamp: string;
    plans?: string[];
  };
  "summit.ai.eval.run": {
    evalId: string;
    targetModel: string;
    dataset: string;
    status: "started" | "completed" | "failed";
    owner?: string;
  };
  "summit.intelgraph.graph.updated": {
    source: string;
    ingress: string;
    namespace?: string;
    trigger: "refresh" | "stream";
    version: number;
    nodeCount: number;
    edgeCount: number;
    durationMs?: number;
    topic?: string;
    correlationId?: string;
  };
  "summit.intelgraph.agent.triggered": {
    agent: string;
    reason: string;
    priority?: "low" | "normal" | "high";
    namespace?: string;
    graphVersion?: number;
    correlationId?: string;
    payload?: Record<string, unknown>;
  };
}

export type EventName = keyof EventPayloads;

const SENSITIVE_KEYS = ["secret", "token", "password", "apiKey", "credential"];

export const EVENT_SCHEMAS: Record<EventName, EventSchema<EventPayloads[EventName]>> = {
  "summit.maestro.run.created": {
    name: "summit.maestro.run.created",
    version: "1.0",
    description: "Run initialized with pipeline and stage metadata",
    required: ["runId", "pipelineId", "stageIds"],
    example: {
      runId: "pipeline-123:1713811200",
      pipelineId: "pipeline-123",
      stageIds: ["stage-a", "stage-b"],
      metadata: { tenant: "blue" },
    },
  },
  "summit.maestro.run.started": {
    name: "summit.maestro.run.started",
    version: "1.0",
    description: "Plan generated; orchestration entering execution",
    required: ["runId", "pipelineId", "stageCount", "planScore"],
    example: {
      runId: "pipeline-123:1713811200",
      pipelineId: "pipeline-123",
      stageCount: 4,
      planScore: 0.82,
    },
  },
  "summit.maestro.run.completed": {
    name: "summit.maestro.run.completed",
    version: "1.0",
    description: "Execution finished successfully or in a degraded state",
    required: [
      "runId",
      "pipelineId",
      "status",
      "traceLength",
      "successCount",
      "recoveredCount",
      "durationMs",
    ],
    example: {
      runId: "pipeline-123:1713811200",
      pipelineId: "pipeline-123",
      status: "success",
      traceLength: 5,
      successCount: 5,
      recoveredCount: 1,
      durationMs: 1200,
    },
  },
  "summit.maestro.run.failed": {
    name: "summit.maestro.run.failed",
    version: "1.0",
    description: "Execution aborted due to an unhandled failure",
    required: ["runId", "pipelineId", "reason"],
    example: {
      runId: "pipeline-123:1713811200",
      pipelineId: "pipeline-123",
      reason: "fallbacks exhausted",
      failedStageId: "stage-b",
      fatal: true,
    },
  },
  "summit.intelgraph.query.executed": {
    name: "summit.intelgraph.query.executed",
    version: "1.0",
    description: "IntelGraph snapshot/query executed",
    required: ["queryType", "subjectId", "durationMs", "resultCount"],
    example: {
      queryType: "service",
      subjectId: "svc-api",
      durationMs: 42,
      resultCount: 3,
      riskScore: 0.71,
      incidentCount: 2,
    },
  },
  "summit.incident.detected": {
    name: "summit.incident.detected",
    version: "1.0",
    description: "Maestro detected an incident and generated a response plan",
    required: ["incidentId", "assetId", "severity", "metric", "timestamp"],
    example: {
      incidentId: "svc-alpha:latency.p95:1713811200",
      assetId: "svc-alpha",
      severity: "high",
      metric: "latency.p95",
      timestamp: new Date().toISOString(),
      plans: ["failover"],
    },
  },
  "summit.ai.eval.run": {
    name: "summit.ai.eval.run",
    version: "1.0",
    description: "AI eval lifecycle event",
    required: ["evalId", "targetModel", "dataset", "status"],
    example: {
      evalId: "eval-123",
      targetModel: "gpt-4.1",
      dataset: "alignment-suite",
      status: "started",
      owner: "ml-bench",
    },
  },
  "summit.intelgraph.graph.updated": {
    name: "summit.intelgraph.graph.updated",
    version: "1.0",
    description: "Knowledge graph snapshot updated from refresh or streaming source",
    required: ["source", "ingress", "trigger", "version", "nodeCount", "edgeCount"],
    example: {
      source: "confluent",
      ingress: "message-broker",
      namespace: "intelgraph",
      trigger: "stream",
      version: 12,
      nodeCount: 420,
      edgeCount: 880,
      durationMs: 135,
      topic: "intelgraph.updates",
      correlationId: "trace-1234",
    },
  },
  "summit.intelgraph.agent.triggered": {
    name: "summit.intelgraph.agent.triggered",
    version: "1.0",
    description: "Agent reaction requested due to graph change",
    required: ["agent", "reason"],
    example: {
      agent: "incident-first-responder",
      reason: "critical incident ingested from kafka topic incidents.high",
      priority: "high",
      namespace: "intelgraph",
      graphVersion: 12,
      correlationId: "trace-1234",
      payload: { incidentId: "inc-123", serviceId: "svc-api" },
    },
  },
};

export interface ValidationResult {
  valid: boolean;
  missing?: string[];
  reason?: string;
}

export type EventTransport = (
  envelope: EventEnvelope<Record<string, unknown>>
) => void | Promise<void>;

export class StructuredEventEmitter {
  private readonly transport: EventTransport;
  private readonly redactions: string[];

  constructor(options?: { transport?: EventTransport; redactKeys?: string[] }) {
    this.transport = options?.transport ?? ((event) => this.logAsJson(event));
    this.redactions = options?.redactKeys ?? SENSITIVE_KEYS;
  }

  emitEvent<Name extends EventName>(
    name: Name,
    payload: EventPayloads[Name],
    metadata?: EventMetadata
  ): EventEnvelope<EventPayloads[Name]> {
    const schema = EVENT_SCHEMAS[name];
    if (!schema) {
      throw new Error(`No schema registered for event ${name}`);
    }
    const validation = this.validatePayload(schema, payload);
    if (!validation.valid) {
      throw new Error(
        validation.reason ?? `Invalid payload for ${name}: ${validation.missing?.join(", ")}`
      );
    }

    const envelope: EventEnvelope<EventPayloads[Name]> = {
      name: schema.name,
      version: schema.version,
      timestamp: new Date().toISOString(),
      correlationId: metadata?.correlationId,
      traceId: metadata?.traceId,
      runId: metadata?.runId,
      actor: metadata?.actor,
      context: metadata?.context,
      payload,
    };

    void this.transport(envelope);
    return envelope;
  }

  summarizeOutcome(outcome: ExecutionOutcome): {
    planScore: number;
    stageIds: string[];
    successCount: number;
    recoveredCount: number;
  } {
    const stageIds = outcome.plan.steps.map((step) => step.stageId);
    const successCount = outcome.trace.filter((entry) => entry.status === "success").length;
    const recoveredCount = outcome.trace.filter((entry) => entry.status === "recovered").length;
    return {
      planScore: outcome.plan.aggregateScore,
      stageIds,
      successCount,
      recoveredCount,
    };
  }

  private validatePayload<Payload extends Record<string, unknown>>(
    schema: EventSchema<Payload>,
    payload: Payload
  ): ValidationResult {
    const missing = schema.required.filter(
      (key) => payload[key] === undefined || payload[key] === null
    );
    if (missing.length > 0) {
      return { valid: false, missing };
    }
    if (this.containsSensitiveKeys(payload)) {
      return { valid: false, reason: "payload contains sensitive-looking keys" };
    }
    return { valid: true };
  }

  private containsSensitiveKeys(payload: Record<string, unknown>): boolean {
    return Object.keys(payload).some((key) =>
      this.redactions.some((token) => key.toLowerCase().includes(token.toLowerCase()))
    );
  }

  private logAsJson(event: EventEnvelope<Record<string, unknown>>): void {
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(event));
  }
}

export function buildRunId(plan: ExplainablePlan, seed?: string): string {
  const base = `${plan.pipelineId}:${plan.generatedAt}`;
  return seed ? `${base}:${seed}` : base;
}
