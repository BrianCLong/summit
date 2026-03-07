import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  PolicyEngine,
  denyByDefaultBundle,
  InMemoryIngestStore,
  buildProvenance,
  runRetentionSweeper,
  runCanary,
  createMetrics,
  createHttpMetricsMiddleware,
  createTraceMiddleware,
  generateSbom,
  buildDisclosurePack,
  type PolicyBundle,
} from "../src/index.js";
import type { IngestRequest } from "../src/types.js";

function createIngestPayload(now: string): IngestRequest {
  const provenance = buildProvenance("unit-test", "1.0.0");
  return {
    entity: {
      id: "entity-1",
      type: "person",
      attributes: { name: "Ada" },
      tags: {
        classification: "internal",
        residencyRegion: "us-east",
        retentionDays: 1,
        piiFields: ["name"],
      },
      provenance,
    },
    events: [
      {
        id: "event-1",
        entityId: "entity-1",
        type: "created",
        occurredAt: now,
        source: "api",
        confidence: 0.9,
        payload: { status: "new" },
        provenance: { ...provenance },
        tags: {
          classification: "internal",
          residencyRegion: "us-east",
          retentionDays: 1,
          piiFields: ["name"],
        },
      },
    ],
  };
}

describe("policy engine", () => {
  it("enforces deny by default and logs decisions", () => {
    const bundle: PolicyBundle = {
      ...denyByDefaultBundle,
      rules: [
        {
          id: "allow-read",
          role: "analyst",
          resource: "entity",
          action: "read",
          effect: "allow",
        },
      ],
    };
    const engine = new PolicyEngine(bundle);
    const allow = engine.evaluate(
      {
        role: "analyst",
        resource: "entity",
        action: "read",
        tenant: "a",
        region: "us-east",
        classification: "internal",
      },
      "trace-1"
    );
    const deny = engine.evaluate(
      {
        role: "analyst",
        resource: "entity",
        action: "delete",
        tenant: "a",
        region: "us-east",
        classification: "internal",
      },
      "trace-2"
    );

    expect(allow).toBe(true);
    expect(deny).toBe(false);
    const logs = engine.getDecisionLog();
    expect(logs).toHaveLength(2);
    expect(logs[0]).toMatchObject({ traceId: "trace-1", decision: "allow" });
    expect(logs[1]).toMatchObject({ traceId: "trace-2", decision: "deny" });
  });
});

describe("ingest store and governance", () => {
  it("deduplicates ingest and respects residency guard", () => {
    const store = new InMemoryIngestStore();
    const payload = createIngestPayload(new Date().toISOString());
    store.ingest(payload, ["us-east"]);
    store.ingest(payload, ["us-east"]);
    const audit = store.getAuditTrail();
    expect(audit.filter((a) => a.message === "Ingest succeeded")).toHaveLength(1);
    expect(audit.filter((a) => a.message === "Duplicate ingest blocked")).toHaveLength(1);
  });

  it("blocks residency violations", () => {
    const store = new InMemoryIngestStore();
    const payload = createIngestPayload(new Date().toISOString());
    expect(() => store.ingest(payload, ["eu-west"])).toThrow("Residency us-east is not permitted");
  });

  it("builds timeline ordered with provenance", () => {
    const store = new InMemoryIngestStore();
    const now = new Date();
    const earlier = new Date(now.getTime() - 1000).toISOString();
    const later = new Date(now.getTime() + 1000).toISOString();
    const payload = createIngestPayload(earlier);
    payload.events?.push({
      id: "event-2",
      entityId: "entity-1",
      type: "updated",
      occurredAt: later,
      source: "api",
      confidence: 0.95,
      payload: { status: "updated" },
      provenance: { ...payload.events![0].provenance },
      tags: payload.events![0].tags,
    });
    store.ingest(payload, ["us-east"]);
    const timeline = store.getTimeline({ entityId: "entity-1" });
    expect(timeline.map((t) => t.id)).toEqual(["event-1", "event-2"]);
  });
});

describe("retention sweeper", () => {
  it("marks expired events and removes them when not dry-run", () => {
    const now = new Date("2025-01-03T00:00:00Z");
    const eventDate = new Date("2025-01-01T00:00:00Z").toISOString();
    const payload = createIngestPayload(eventDate);
    const result = runRetentionSweeper(payload.events ?? [], now, false, []);
    expect(result.deletedIds).toEqual(["event-1"]);
    expect(result.remaining).toHaveLength(0);
  });
});

describe("canary controller", () => {
  it("rolls back on regression unless override is set", () => {
    const config = {
      steps: [
        { percentage: 1, durationSeconds: 10 },
        { percentage: 10, durationSeconds: 20 },
      ],
      maxErrorRate: 0.05,
      maxP99Latency: 400,
      maxSaturation: 0.8,
      maxCustomMetric: 2,
    } as const;
    const rollback = runCanary(
      [
        { errorRate: 0.01, p99LatencyMs: 200, saturation: 0.5 },
        { errorRate: 0.1, p99LatencyMs: 500, saturation: 0.9 },
      ],
      config
    );
    expect(rollback.state).toBe("rolled_back");

    const override = runCanary(
      [
        { errorRate: 0.01, p99LatencyMs: 200, saturation: 0.5 },
        { errorRate: 0.1, p99LatencyMs: 500, saturation: 0.9 },
      ],
      config,
      true
    );
    expect(override.state).toBe("rolled_forward");
    expect(override.auditTrail.some((entry) => entry.message === "manual_override")).toBe(true);
  });
});

describe("observability middleware", () => {
  it("propagates trace ids and records metrics", () => {
    const bundle = createMetrics();
    const trace = createTraceMiddleware();
    const metrics = createHttpMetricsMiddleware(bundle);
    const req: any = { method: "GET", path: "/healthz", headers: {} };
    const res: any = {
      statusCode: 200,
      locals: {},
      headers: {},
      setHeader(key: string, value: string) {
        this.headers[key] = value;
      },
      on(event: string, handler: () => void) {
        if (event === "finish") handler();
      },
    };
    trace(req, res, () => {});
    metrics(req, res, () => {});
    expect(res.headers["x-trace-id"]).toBeDefined();
    const metricsText = bundle.registry.metrics();
    expect(metricsText).toContain("http_request_duration_seconds");
  });
});

describe("supply chain and compliance pack", () => {
  it("generates deterministic sbom and builds disclosure pack", async () => {
    const dir = mkdtempSync(path.join(tmpdir(), "golden-path-"));
    const manifestPath = path.join(dir, "package.json");
    const manifest = { name: "example", version: "1.0.0", dependencies: { a: "1.0.0" } };
    await import("node:fs/promises").then((fs) =>
      fs.writeFile(manifestPath, JSON.stringify(manifest), "utf-8")
    );
    const sbom = generateSbom(manifestPath);
    expect(sbom.components).toHaveLength(2);

    const packPath = await buildDisclosurePack({
      manifestDir: dir,
      outputDir: path.join(dir, "out"),
      policyBundleVersion: "2025.01",
      deploymentAttestation: { status: "signed" },
    });
    const pack = JSON.parse(readFileSync(packPath, "utf-8"));
    expect(pack.policyBundleVersion).toBe("2025.01");
    expect(pack.sbomPath).toContain("artifacts/sbom.json");
  });
});

describe("scaffold", () => {
  it("copies template with placeholders replaced", async () => {
    const dir = mkdtempSync(path.join(tmpdir(), "golden-path-scaffold-"));
    await import("../src/generator.js").then(({ scaffoldService }) =>
      scaffoldService(dir, "sample-service")
    );
    const readme = readFileSync(path.join(dir, "README.md"), "utf-8");
    expect(readme).toContain("sample-service");
    const slo = readFileSync(path.join(dir, "configs/slo.yaml"), "utf-8");
    expect(slo).toContain("sample-service");
  });
});
