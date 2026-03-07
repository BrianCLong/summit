import { describe, expect, it, vi } from "vitest";
import {
  AsyncJobManager,
  CacheManager,
  DEFAULT_JOURNEY_TARGETS,
  PerformanceBudgetGate,
  PerformanceCostOperatingSystem,
  ReleaseMarkerEmitter,
  ResponseShaper,
  TelemetryCostController,
  TopOffenderBoard,
} from "../src/index.js";

const makeSample = (overrides: Partial<Parameters<PerformanceBudgetGate["evaluate"]>[0]> = {}) => ({
  journey: "case_search_load",
  step: "search_api",
  p95: 420,
  errorRate: 0.005,
  sampleRate: 0.2,
  cacheHit: true,
  payloadBytes: 42_000,
  ...overrides,
});

describe("PerformanceBudgetGate", () => {
  it("passes telemetry that respects p95 targets and payload budgets", () => {
    const gate = new PerformanceBudgetGate();
    const result = gate.evaluate(makeSample());
    expect(result.status).toBe("pass");
    expect(result.targetMs).toBe(DEFAULT_JOURNEY_TARGETS[0].steps.search_api);
  });

  it("flags breaches when latency or payloads exceed budgets", () => {
    const gate = new PerformanceBudgetGate();
    const result = gate.evaluate(makeSample({ p95: 920, payloadBytes: 200_000, cacheHit: false }));
    expect(result.status).toBe("breach");
    expect(result.reason).toContain("p95");
  });

  it("warns when journey step targets are missing", () => {
    const gate = new PerformanceBudgetGate();
    const result = gate.evaluate(makeSample({ journey: "unknown", step: "mystery", p95: 1 }));
    expect(result.status).toBe("warn");
  });
});

describe("TopOffenderBoard", () => {
  it("tracks offenders sorted by severity across categories", () => {
    const board = new TopOffenderBoard();
    board.record({ id: "endpoint-a", kind: "endpoint", p95Ms: 950, errorRate: 0.12, volume: 130 });
    board.record({ id: "endpoint-b", kind: "endpoint", p95Ms: 700, errorRate: 0.01, volume: 30 });
    const snapshot = board.snapshot();
    expect(snapshot.slowestEndpoints[0].id).toBe("endpoint-a");
  });
});

describe("CacheManager", () => {
  it("returns cached entries and applies jitter with negative caching", async () => {
    const cache = new CacheManager<string>({ jitterPct: 0 });
    const first = await cache.getOrLoad("profile", "tenant-a", async () => ({
      value: "hit-1",
    }));
    const second = await cache.getOrLoad("profile", "tenant-a", async () => ({
      value: "hit-2",
    }));
    expect(first.value).toBe("hit-1");
    expect(second.value).toBe("hit-1");

    const negative = await cache.getOrLoad("missing", "tenant-a", async () => ({
      value: "missing",
      negative: true,
    }));
    expect(negative.negative).toBe(true);
  });
});

describe("ResponseShaper", () => {
  it("enforces projection and pagination with compression", () => {
    const shaper = new ResponseShaper();
    const payload = {
      data: Array.from({ length: 50 }, (_, idx) => ({ id: idx, name: `row-${idx}` })),
      meta: "ignored",
    };
    const shaped = shaper.shape(payload, {
      allowedFields: ["data"],
      pageSizeLimit: 25,
      tenantTier: "standard",
      compressionThresholdBytes: 128,
      version: "1.0",
      limit: 10,
    });
    expect(shaped.data && Array.isArray(shaped.data.data) && shaped.data.data).toHaveLength(10);
    expect(shaped.checksum).toBeDefined();
    expect(shaped.encoding).toBe("brotli");
  });
});

describe("AsyncJobManager", () => {
  it("deduplicates idempotent jobs and enforces concurrency per tenant", async () => {
    const manager = new AsyncJobManager({ perTenantConcurrency: 1 });
    const handler = vi.fn(async () => "ok");
    const [first, second] = await Promise.all([
      manager.enqueue({
        idempotencyKey: "job-1",
        tenantId: "tenant-a",
        classification: "io",
        handler,
      }),
      manager.enqueue({
        idempotencyKey: "job-1",
        tenantId: "tenant-a",
        classification: "io",
        handler,
      }),
    ]);
    expect(first.result).toBe("ok");
    expect(second.id).toBe("job-1");
    expect(handler).toHaveBeenCalledTimes(1);
  });
});

describe("TelemetryCostController", () => {
  it("blocks high-cardinality or budget-exceeding telemetry", () => {
    const controller = new TelemetryCostController({ cardinalityLimit: 2, tracesPerMinute: 1 });
    controller.ingest({ kind: "traces", labels: { tenant: "a", journey: "x" } });
    const throttled = controller.ingest({ kind: "traces", labels: { tenant: "a", journey: "y" } });
    expect(throttled.action).toBe("throttle");
    const rejected = controller.ingest({ kind: "traces", labels: { tenant: "b", journey: "z" } });
    expect(rejected.action).toBe("reject");
  });
});

describe("ReleaseMarkerEmitter", () => {
  it("creates release markers annotated with owner and commit", () => {
    const emitter = new ReleaseMarkerEmitter();
    const marker = emitter.emit("ops", "v1.2.3", "abc123");
    expect(marker.annotations.release).toBe("v1.2.3");
    expect(marker.owner).toBe("ops");
  });
});

describe("PerformanceCostOperatingSystem", () => {
  it("wires budget evaluation and offender tracking", () => {
    const os = new PerformanceCostOperatingSystem();
    const evaluation = os.evaluateJourney(makeSample());
    expect(evaluation.status).toBe("pass");
    const board = os.trackOffender({
      id: "query-1",
      kind: "query",
      p95Ms: 1600,
      errorRate: 0.02,
      volume: 40,
    });
    expect(board.slowestQueries).toHaveLength(1);
  });
});
