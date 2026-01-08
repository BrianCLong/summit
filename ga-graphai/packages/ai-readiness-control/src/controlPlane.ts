import { DataQualityGate, DataQualityReport } from "./dataQuality.js";
import { FeatureStore } from "./featureStore.js";
import { ModelRegistry } from "./modelRegistry.js";
import { PiiGuard } from "./pii.js";
import { ProvenanceTracker } from "./provenance.js";
import { RetrievalIndex } from "./retrievalIndex.js";
import { InMemoryEventBus, IntentTelemetry } from "./telemetry.js";
import {
  AlertSink,
  CanonicalEntityName,
  DataQualityOptions,
  DataQualityRecord,
  FeatureEntry,
  IntentEvent,
  PiiRule,
  ProvenanceRecord,
  SchemaDefinition,
} from "./types.js";
import { SchemaRegistry } from "./schemaRegistry.js";

export interface ControlPlaneConfig {
  piiRules: PiiRule[];
  alertSink?: AlertSink;
}

export class AIReadinessControlPlane {
  private readonly schemas = new SchemaRegistry();
  private readonly telemetry: IntentTelemetry;
  private readonly gate: DataQualityGate;
  private readonly retrieval = new RetrievalIndex();
  private readonly features = new FeatureStore();
  private readonly piiGuard: PiiGuard;
  private readonly provenance = new ProvenanceTracker();
  private readonly models = new ModelRegistry();

  constructor(
    config: ControlPlaneConfig,
    bus: InMemoryEventBus<IntentEvent> = new InMemoryEventBus()
  ) {
    this.telemetry = new IntentTelemetry(bus);
    this.gate = new DataQualityGate(config.alertSink);
    this.piiGuard = new PiiGuard(config.piiRules);
  }

  registerSchema(definition: SchemaDefinition): void {
    this.schemas.register(definition);
  }

  logIntent(event: IntentEvent): void {
    this.telemetry.log(event);
  }

  validateAndSanitize(
    entity: CanonicalEntityName,
    record: Record<string, unknown>
  ): {
    validated: boolean;
    redacted: Record<string, unknown>;
    errors: string[];
    piiTags: string[];
  } {
    const validation = this.schemas.validate(entity, record);
    const piiTags = this.piiGuard.tag(record);
    const redacted = this.piiGuard.redact(record);
    return { validated: validation.valid, redacted, errors: validation.errors, piiTags };
  }

  enforceDataQuality(
    table: string,
    records: DataQualityRecord[],
    options: DataQualityOptions
  ): DataQualityReport {
    return this.gate.evaluate(table, records, options);
  }

  indexDocument(doc: {
    id: string;
    title: string;
    owner: string;
    tags: string[];
    refreshIntervalMinutes: number;
    link: string;
  }): void {
    this.retrieval.add({ ...doc });
  }

  documentsNeedingRefresh(now?: string) {
    return this.retrieval.dueForRefresh(now);
  }

  recordFeature(entry: FeatureEntry): void {
    this.features.upsert(entry);
  }

  fetchFeature(key: string) {
    return this.features.get(key);
  }

  scheduleBackfill(job: {
    id: string;
    inputs: DataQualityRecord[];
    allowOverwrite?: boolean;
    compute: (input: DataQualityRecord) => Promise<FeatureEntry>;
  }) {
    return this.features.backfill(job);
  }

  trackProvenance(record: ProvenanceRecord): void {
    this.provenance.record(record);
  }

  attachFeedback(outputId: string, feedback: ProvenanceRecord["feedback"]): void {
    this.provenance.attachFeedback(outputId, feedback);
  }

  recordModel(model: {
    modelId: string;
    version: string;
    release: string;
    metrics: Record<string, number>;
  }): void {
    this.models.register(model);
  }

  rollbackModel(modelId: string, version: string, reason: string): void {
    this.models.rollback(modelId, version, reason);
  }

  snapshot(): {
    models: ReturnType<ModelRegistry["list"]>;
    provenance: ReturnType<ProvenanceTracker["list"]>;
    pendingFeatures: ReturnType<FeatureStore["pendingExpiry"]>;
  } {
    return {
      models: this.models.list(),
      provenance: this.provenance.list(),
      pendingFeatures: this.features.pendingExpiry(30),
    };
  }
}
