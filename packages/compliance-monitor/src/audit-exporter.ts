import fs from "fs/promises";
import path from "path";
import { ControlRegistry } from "./control-registry.js";
import { ControlRunner } from "./control-runner.js";
import { NarrativeGenerator } from "./narrative-generator.js";
import { EvidenceStore } from "./evidence-store.js";
import { ExceptionRegistry } from "./exception-registry.js";

export interface AuditBundleManifest {
  generatedAt: Date;
  controlsCount: number;
  evidenceCount: number;
  exceptions: number;
  artifacts: string[];
}

export class AuditExporter {
  private readonly registry: ControlRegistry;
  private readonly runner: ControlRunner;
  private readonly evidenceStore: EvidenceStore;
  private readonly exceptions: ExceptionRegistry;
  private readonly narratives: NarrativeGenerator;

  constructor(options: {
    registry: ControlRegistry;
    runner: ControlRunner;
    evidenceStore: EvidenceStore;
    exceptions: ExceptionRegistry;
    narratives?: NarrativeGenerator;
  }) {
    this.registry = options.registry;
    this.runner = options.runner;
    this.evidenceStore = options.evidenceStore;
    this.exceptions = options.exceptions;
    this.narratives = options.narratives || new NarrativeGenerator();
  }

  async exportBundle(outputDir: string): Promise<AuditBundleManifest> {
    await fs.mkdir(outputDir, { recursive: true });
    const controls = this.registry.list();
    const controlsPath = path.join(outputDir, "controls.json");
    await fs.writeFile(controlsPath, JSON.stringify(controls, null, 2));

    const evidencePath = path.join(outputDir, "evidence.json");
    const allEvidence = await Promise.all(
      controls.map((control) => this.evidenceStore.listEvidence(control.id))
    );
    const flatEvidence = allEvidence.flat();
    await fs.writeFile(
      evidencePath,
      JSON.stringify(
        flatEvidence.map((record) => ({ ...record, createdAt: record.createdAt.toISOString() })),
        null,
        2
      )
    );

    const narrativesPath = path.join(outputDir, "narratives.md");
    const narrativeDocs = await Promise.all(
      controls.map(async (control) => {
        const evidence = await this.evidenceStore.latest(control.id);
        return this.narratives.build(control, evidence);
      })
    );
    await fs.writeFile(narrativesPath, narrativeDocs.join("\n\n---\n\n"));

    const exceptionsPath = path.join(outputDir, "exceptions.json");
    await fs.writeFile(exceptionsPath, JSON.stringify(this.exceptions.list(), null, 2));

    const manifest: AuditBundleManifest = {
      generatedAt: new Date(),
      controlsCount: controls.length,
      evidenceCount: flatEvidence.length,
      exceptions: this.exceptions.list().length,
      artifacts: [controlsPath, evidencePath, narrativesPath, exceptionsPath],
    };

    await fs.writeFile(path.join(outputDir, "manifest.json"), JSON.stringify(manifest, null, 2));
    return manifest;
  }
}
