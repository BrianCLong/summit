import fs from "fs/promises";
import os from "os";
import path from "path";
import { AlertBroker } from "../alerting.js";
import { AuditExporter } from "../audit-exporter.js";
import { ControlRegistry } from "../control-registry.js";
import { ControlRunner } from "../control-runner.js";
import { EvidenceStore } from "../evidence-store.js";
import { ExceptionRegistry } from "../exception-registry.js";

const control = {
  id: "control.ledger.proof",
  title: "Provenance Ledger Hash Mirror",
  category: "security" as const,
  objective: "Mirror evidence hashes to provenance ledger",
  owner: { primary: "compliance@example.com" },
  check: { type: "automated", script: "./mirror.sh" },
  schedule: { frequencyMinutes: 15, toleranceMinutes: 5 },
  rtoMinutes: 60,
  evidence: { path: "/tmp", retentionDays: 60, ttlDays: 14, signer: "ledger-bot" },
  tags: ["evidence", "ledger"],
};

describe("AuditExporter", () => {
  it("bundles controls, evidence, narratives, and exceptions", async () => {
    const baseDir = await fs.mkdtemp(path.join(os.tmpdir(), "audit-"));
    const registry = ControlRegistry.fromDefinitions([
      { ...control, evidence: { ...control.evidence, path: baseDir } },
    ]);
    const evidenceStore = new EvidenceStore(baseDir);
    const runner = new ControlRunner({
      evidenceStore,
      alertBroker: new AlertBroker(),
      handlers: {
        [control.id]: async () => ({ status: "pass", evidencePayload: "ledger-ok" }),
      },
    });
    await runner.run(registry.list()[0]);

    const exceptions = new ExceptionRegistry();
    exceptions.add({
      id: "ex-1",
      controlId: control.id,
      owner: "risk@example.com",
      scope: "ledger outage",
      compensatingControls: ["manual checksum"],
      expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    });

    const exporter = new AuditExporter({
      registry,
      runner,
      evidenceStore,
      exceptions,
    });

    const outputDir = path.join(baseDir, "bundle");
    const manifest = await exporter.exportBundle(outputDir);

    expect(manifest.controlsCount).toBe(1);
    expect(manifest.evidenceCount).toBe(1);
    const files = await fs.readdir(outputDir);
    expect(files).toEqual(
      expect.arrayContaining([
        "controls.json",
        "evidence.json",
        "narratives.md",
        "exceptions.json",
        "manifest.json",
      ])
    );
  });
});
