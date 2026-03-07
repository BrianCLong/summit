import { describe, expect, it, vi } from "vitest";
import { EVENT_SCHEMAS, StructuredEventEmitter, type EventEnvelope } from "../src/events.js";

const basePayload = {
  runId: "run-1",
  pipelineId: "pipe-a",
  stageCount: 2,
  planScore: 0.9,
} as const;

describe("StructuredEventEmitter", () => {
  it("emits envelopes with metadata and validation", () => {
    const transport = vi.fn();
    const emitter = new StructuredEventEmitter({ transport });

    const envelope = emitter.emitEvent("summit.maestro.run.started", basePayload, {
      correlationId: "corr-123",
      context: { service: "meta-orchestrator", environment: "test" },
    });

    expect(transport).toHaveBeenCalledOnce();
    const sentEnvelope = transport.mock.calls[0][0] as EventEnvelope<unknown>;
    expect(sentEnvelope.name).toBe("summit.maestro.run.started");
    expect(sentEnvelope.correlationId).toBe("corr-123");
    expect(envelope.payload).toEqual(basePayload);
  });

  it("rejects payloads missing required fields", () => {
    const emitter = new StructuredEventEmitter({ transport: vi.fn() });
    expect(() =>
      emitter.emitEvent(
        "summit.maestro.run.started",
        {
          // @ts-expect-error intentional missing runId
          pipelineId: "pipe-a",
          stageCount: 1,
          planScore: 0.5,
        },
        {}
      )
    ).toThrow(/Invalid payload/);
  });

  it("blocks sensitive-looking payload keys", () => {
    const emitter = new StructuredEventEmitter({ transport: vi.fn() });
    expect(() =>
      emitter.emitEvent("summit.intelgraph.query.executed", {
        queryType: "service",
        subjectId: "svc-api",
        durationMs: 10,
        resultCount: 2,
        apiKey: "should-not-be-logged",
      } as never)
    ).toThrow(/sensitive/);
  });

  it("summarizes outcomes for run lifecycle events", () => {
    const emitter = new StructuredEventEmitter({ transport: vi.fn() });
    const plan = {
      pipelineId: "pipe-a",
      generatedAt: "2024-01-01T00:00:00Z",
      steps: [
        {
          stageId: "s1",
          primary: {
            provider: "aws",
            region: "us-east-1",
            expectedCost: 1,
            expectedThroughput: 100,
            expectedLatency: 100,
          },
          fallbacks: [],
          explanation: {
            stageId: "s1",
            provider: "aws",
            narrative: "n",
            scoreBreakdown: {},
            constraints: [],
          },
        },
      ],
      aggregateScore: 0.76,
      metadata: {},
    };
    const outcome = {
      plan,
      trace: [
        {
          stageId: "s1",
          provider: "aws",
          status: "recovered",
          startedAt: "2024-01-01T00:00:00Z",
          finishedAt: "2024-01-01T00:00:05Z",
          logs: ["ok"],
          fallbackTriggered: "execution-failure",
        },
      ],
      rewards: [],
    };

    const summary = emitter.summarizeOutcome(outcome);
    expect(summary.stageIds).toEqual(["s1"]);
    expect(summary.recoveredCount).toBe(1);
    expect(summary.planScore).toBeCloseTo(0.76);
  });

  it("exposes schema registry entries", () => {
    expect(EVENT_SCHEMAS["summit.maestro.run.completed"].version).toBe("1.0");
  });
});
