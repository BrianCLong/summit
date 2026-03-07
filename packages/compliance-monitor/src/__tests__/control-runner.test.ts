import fs from "fs/promises";
import os from "os";
import path from "path";
import { AlertBroker } from "../alerting.js";
import { ControlRegistry } from "../control-registry.js";
import { ControlRunner, ControlScheduler } from "../control-runner.js";
import { EvidenceStore } from "../evidence-store.js";

const control = {
  id: "control.evidence.logs",
  title: "Collect API Gateway Logs",
  category: "availability" as const,
  objective: "Capture gateway audit logs with immutable hashes",
  owner: { primary: "observability@example.com" },
  check: { type: "automated", script: "./scripts/logs.sh" },
  schedule: { frequencyMinutes: 30, toleranceMinutes: 10 },
  rtoMinutes: 120,
  evidence: { path: "/tmp", retentionDays: 30, ttlDays: 7, signer: "obs-bot" },
  tags: ["soc2", "logging"],
};

describe("ControlRunner and Scheduler", () => {
  it("runs controls, stores evidence, and alerts on failure or staleness", async () => {
    const baseDir = await fs.mkdtemp(path.join(os.tmpdir(), "evidence-"));
    const registry = ControlRegistry.fromDefinitions([
      { ...control, evidence: { ...control.evidence, path: baseDir } },
    ]);
    const evidenceStore = new EvidenceStore(baseDir);
    const alertBroker = new AlertBroker();
    const alerts: string[] = [];
    alertBroker.subscribe((alert) => alerts.push(`${alert.type}:${alert.controlId}`));

    const runner = new ControlRunner({
      evidenceStore,
      alertBroker,
      handlers: {
        [control.id]: async () => ({
          status: "pass",
          evidencePayload: JSON.stringify({ ok: true }),
        }),
      },
    });

    const scheduler = new ControlScheduler(registry.list(), runner);
    const now = new Date("2024-01-01T00:00:00Z");
    const [firstRun] = await scheduler.tick(now);
    expect(firstRun.evidence).toBeDefined();

    // simulate drift
    const later = new Date(now.getTime() + 60 * 60 * 1000);
    await scheduler.tick(later);
    expect(alerts).toContain(`stale-evidence:${control.id}`);
  });

  it("emits failure alerts when control handler fails", async () => {
    const baseDir = await fs.mkdtemp(path.join(os.tmpdir(), "evidence-"));
    const evidenceStore = new EvidenceStore(baseDir);
    const alertBroker = new AlertBroker();
    const alerts: string[] = [];
    alertBroker.subscribe((alert) => alerts.push(alert.type));

    const runner = new ControlRunner({
      evidenceStore,
      alertBroker,
      handlers: {
        [control.id]: async () => ({ status: "fail", notes: "Gateway unreachable" }),
      },
    });

    await runner.run(control);
    expect(alerts).toContain("failure");
  });
});
