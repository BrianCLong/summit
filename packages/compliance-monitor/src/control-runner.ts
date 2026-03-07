import { ControlDefinition } from "./control-registry.js";
import { AlertBroker } from "./alerting.js";
import { EvidenceRecord, EvidenceStore } from "./evidence-store.js";

export type ControlRunStatus = "pass" | "fail" | "manual-required";

export interface ControlRunResult {
  status: ControlRunStatus;
  notes?: string;
  evidencePayload?: Buffer | string;
  metadata?: Record<string, unknown>;
}

export interface ControlHealthRecord {
  controlId: string;
  status: ControlRunStatus;
  lastRunAt: Date;
  nextRunAt: Date;
  evidence?: EvidenceRecord;
  failureReason?: string;
  driftMinutes: number;
}

export type ControlHandler = (control: ControlDefinition) => Promise<ControlRunResult>;

export class ControlRunner {
  private readonly evidenceStore: EvidenceStore;
  private readonly alertBroker: AlertBroker;
  private readonly health: Map<string, ControlHealthRecord> = new Map();
  private readonly handlerLookup: Map<string, ControlHandler>;

  constructor(options: {
    evidenceStore: EvidenceStore;
    alertBroker: AlertBroker;
    handlers: Record<string, ControlHandler>;
  }) {
    this.evidenceStore = options.evidenceStore;
    this.alertBroker = options.alertBroker;
    this.handlerLookup = new Map(Object.entries(options.handlers));
  }

  async run(control: ControlDefinition, now: Date = new Date()): Promise<ControlHealthRecord> {
    const handler = this.handlerLookup.get(control.id);
    if (!handler && control.check.type === "automated") {
      throw new Error(`No handler registered for automated control ${control.id}`);
    }

    const result = handler
      ? await handler(control)
      : { status: "manual-required" as ControlRunStatus };
    let evidence: EvidenceRecord | undefined;
    let failureReason: string | undefined;

    if (result.evidencePayload) {
      evidence = await this.evidenceStore.storeEvidence(control.id, result.evidencePayload, {
        signer: control.evidence.signer,
        ttlDays: control.evidence.ttlDays,
        retentionDays: control.evidence.retentionDays,
        metadata: result.metadata,
      });
    }

    if (result.status === "fail") {
      failureReason = result.notes || "Control check failed";
      this.alertBroker.publish({
        controlId: control.id,
        type: "failure",
        message: failureReason,
        metadata: { category: control.category, owner: control.owner.primary },
        createdAt: now,
      });
    }

    const nextRunAt = new Date(now.getTime() + control.schedule.frequencyMinutes * 60 * 1000);
    const record: ControlHealthRecord = {
      controlId: control.id,
      status: result.status,
      lastRunAt: now,
      nextRunAt,
      evidence,
      failureReason,
      driftMinutes: 0,
    };

    this.health.set(control.id, record);
    return record;
  }

  evaluateDrift(
    control: ControlDefinition,
    now: Date = new Date()
  ): ControlHealthRecord | undefined {
    const record = this.health.get(control.id);
    if (!record) return undefined;
    const tolerance = control.schedule.toleranceMinutes;
    const driftMinutes = Math.max(
      0,
      (now.getTime() - record.lastRunAt.getTime()) / 60000 - control.schedule.frequencyMinutes
    );
    const updated: ControlHealthRecord = { ...record, driftMinutes };
    this.health.set(control.id, updated);
    if (driftMinutes > tolerance) {
      this.alertBroker.publish({
        controlId: control.id,
        type: "stale-evidence",
        message: `Evidence stale by ${driftMinutes.toFixed(1)} minutes`,
        metadata: { toleranceMinutes: tolerance },
        createdAt: now,
      });
    }
    return updated;
  }

  getHealth(): ControlHealthRecord[] {
    return Array.from(this.health.values());
  }
}

export class ControlScheduler {
  private readonly runner: ControlRunner;
  private readonly controls: ControlDefinition[];

  constructor(controls: ControlDefinition[], runner: ControlRunner) {
    this.controls = controls;
    this.runner = runner;
  }

  async tick(now: Date = new Date()): Promise<ControlHealthRecord[]> {
    const executions: ControlHealthRecord[] = [];
    for (const control of this.controls) {
      const existing = this.runner.getHealth().find((h) => h.controlId === control.id);
      if (!existing || existing.nextRunAt <= now) {
        executions.push(await this.runner.run(control, now));
      } else {
        const updated = this.runner.evaluateDrift(control, now);
        if (updated) {
          executions.push(updated);
        }
      }
    }
    return executions;
  }
}
