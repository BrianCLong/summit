import { createHash } from 'crypto';

export type CompensatingTaskType = 'unlearning' | 'kproPurge' | 'csdbExportUpdate';

export interface RevocationTrigger {
  id: string;
  reason: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface DatasetObligation {
  datasetId: string;
  name: string;
  provider: string;
  payeeAccount: string;
  currency: string;
  royaltyRate: number;
  attribution: string[];
  revocationTriggers: RevocationTrigger[];
  refreshCadenceDays: number;
  policyVersion: string;
  effectiveDate: string; // ISO string
}

interface DatasetObligationVersion extends DatasetObligation {
  revision: number;
}

export interface ModelVersionTraining {
  modelId: string;
  version: string;
  datasetId: string;
  trainingDate: string; // ISO
  amortizationPeriodMonths: number;
  licenseCost: number;
}

export interface AmortizationEntry {
  modelId: string;
  version: string;
  datasetId: string;
  periodIndex: number;
  periodStart: string;
  periodEnd: string;
  amount: number;
  currency: string;
  attribution: string[];
  policyVersion: string;
  obligationRevision: number;
  refreshDue: string;
}

export interface PayableReport {
  periodStart: string;
  periodEnd: string;
  datasetSummaries: Array<{
    datasetId: string;
    datasetName: string;
    provider: string;
    currency: string;
    totalDue: number;
    entries: Array<{
      modelId: string;
      version: string;
      amount: number;
      periodStart: string;
      periodEnd: string;
      attribution: string[];
      policyVersion: string;
    }>;
  }>;
}

export interface ReceivableReport {
  periodStart: string;
  periodEnd: string;
  payeeSummaries: Array<{
    provider: string;
    payeeAccount: string;
    currency: string;
    totalReceivable: number;
    datasetBreakdown: Array<{
      datasetId: string;
      datasetName: string;
      amount: number;
      attribution: string[];
    }>;
  }>;
}

export interface CompensatingTask {
  id: string;
  datasetId: string;
  datasetName: string;
  triggerId: string;
  triggerReason: string;
  type: CompensatingTaskType;
  modelId: string;
  modelVersion: string;
  dueDate: string;
}

interface LedgerEvent {
  type: 'OBLIGATION_REGISTERED' | 'OBLIGATION_UPDATED' | 'MODEL_REGISTERED' | 'REVOCATION_TRIGGERED';
  timestamp: string;
  payload: Record<string, unknown>;
}

export interface IntegrityProof {
  algorithm: 'sha256';
  eventCount: number;
  digest: string;
}

interface ModelVersionRecord extends ModelVersionTraining {}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }

  const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
    a.localeCompare(b),
  );
  const inner = entries
    .map(([key, val]) => `${JSON.stringify(key)}:${stableStringify(val)}`)
    .join(',');
  return `{${inner}}`;
}

function addMonths(date: Date, months: number): Date {
  const result = new Date(date.getTime());
  const d = result.getUTCDate();
  result.setUTCMonth(result.getUTCMonth() + months, 1);
  const month = result.getUTCMonth();
  result.setUTCDate(Math.min(d, daysInMonth(result.getUTCFullYear(), month)));
  return result;
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date.getTime());
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function roundCurrency(amount: number): number {
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

function isOverlap(
  startA: Date,
  endA: Date,
  startB: Date,
  endB: Date,
): boolean {
  return startA < endB && startB < endA;
}

export class TrainingDataDebtLedger {
  private obligations: Map<string, DatasetObligationVersion[]> = new Map();
  private models: Map<string, ModelVersionRecord> = new Map();
  private events: LedgerEvent[] = [];
  private tasks: Map<string, CompensatingTask> = new Map();

  registerDatasetObligation(obligation: DatasetObligation): DatasetObligationVersion {
    const versions = this.obligations.get(obligation.datasetId) ?? [];
    const revision = versions.length + 1;
    const version: DatasetObligationVersion = { ...obligation, revision };
    versions.push(version);
    versions.sort((a, b) =>
      new Date(a.effectiveDate).getTime() - new Date(b.effectiveDate).getTime(),
    );
    this.obligations.set(obligation.datasetId, versions);
    this.recordEvent('OBLIGATION_REGISTERED', {
      datasetId: obligation.datasetId,
      revision,
      policyVersion: obligation.policyVersion,
    });
    this.recomputeSchedulesForDataset(obligation.datasetId);
    return version;
  }

  updateDatasetObligation(
    datasetId: string,
    updates: Partial<Omit<DatasetObligation, 'datasetId' | 'revocationTriggers'>> & {
      revocationTriggers?: RevocationTrigger[];
    },
    effectiveDate: string,
  ): DatasetObligationVersion {
    const history = this.obligations.get(datasetId);
    if (!history || history.length === 0) {
      throw new Error(`Dataset obligation ${datasetId} not registered`);
    }

    const latest = history[history.length - 1];
    const updated: DatasetObligation = {
      ...latest,
      ...updates,
      datasetId,
      effectiveDate,
      revocationTriggers: updates.revocationTriggers ?? latest.revocationTriggers,
    };
    const version = this.registerDatasetObligation(updated);
    this.recordEvent('OBLIGATION_UPDATED', {
      datasetId,
      revision: version.revision,
      effectiveDate,
    });
    return version;
  }

  registerModelUsage(training: ModelVersionTraining): void {
    if (training.amortizationPeriodMonths <= 0) {
      throw new Error('Amortization period must be positive');
    }
    const key = this.modelKey(training.modelId, training.version);
    this.models.set(key, { ...training });
    this.recordEvent('MODEL_REGISTERED', {
      modelId: training.modelId,
      version: training.version,
      datasetId: training.datasetId,
      trainingDate: training.trainingDate,
    });
    this.recomputeSchedulesForDataset(training.datasetId);
  }

  getDatasetObligation(datasetId: string, asOf?: Date): DatasetObligationVersion | undefined {
    const history = this.obligations.get(datasetId);
    if (!history || history.length === 0) {
      return undefined;
    }
    if (!asOf) {
      return history[history.length - 1];
    }
    const timestamp = asOf.getTime();
    const applicable = [...history]
      .filter((entry) => new Date(entry.effectiveDate).getTime() <= timestamp)
      .sort((a, b) => new Date(a.effectiveDate).getTime() - new Date(b.effectiveDate).getTime());
    return applicable.length > 0 ? applicable[applicable.length - 1] : history[0];
  }

  getObligationHistory(datasetId: string): DatasetObligationVersion[] {
    return [...(this.obligations.get(datasetId) ?? [])];
  }

  getAmortizationSchedule(modelId: string, version: string): AmortizationEntry[] {
    const record = this.models.get(this.modelKey(modelId, version));
    if (!record) {
      throw new Error(`Model ${modelId}@${version} not registered`);
    }
    return this.buildSchedule(record);
  }

  generatePayableReport(periodStart: string, periodEnd: string): PayableReport {
    const start = new Date(periodStart);
    const end = new Date(periodEnd);
    if (!(start < end)) {
      throw new Error('Invalid reporting window');
    }
    const datasetSummaries = new Map<
      string,
      {
        datasetId: string;
        datasetName: string;
        provider: string;
        currency: string;
        totalDue: number;
        entries: Array<{
          modelId: string;
          version: string;
          amount: number;
          periodStart: string;
          periodEnd: string;
          attribution: string[];
          policyVersion: string;
        }>;
      }
    >();

    for (const record of this.models.values()) {
      const schedule = this.buildSchedule(record);
      for (const entry of schedule) {
        const entryStart = new Date(entry.periodStart);
        const entryEnd = new Date(entry.periodEnd);
        if (!isOverlap(start, end, entryStart, entryEnd)) {
          continue;
        }
        const overlapStart = entryStart > start ? entryStart : start;
        const overlapEnd = entryEnd < end ? entryEnd : end;
        const proportion =
          (overlapEnd.getTime() - overlapStart.getTime()) /
          (entryEnd.getTime() - entryStart.getTime());
        const amount = roundCurrency(entry.amount * proportion);
        if (amount === 0) {
          continue;
        }
        const obligation = this.getDatasetObligation(record.datasetId, entryStart);
        if (!obligation) {
          continue;
        }
        const summary = datasetSummaries.get(record.datasetId) ?? {
          datasetId: record.datasetId,
          datasetName: obligation.name,
          provider: obligation.provider,
          currency: obligation.currency,
          totalDue: 0,
          entries: [],
        };
        summary.entries.push({
          modelId: record.modelId,
          version: record.version,
          amount,
          periodStart: entry.periodStart,
          periodEnd: entry.periodEnd,
          attribution: obligation.attribution,
          policyVersion: entry.policyVersion,
        });
        summary.totalDue = roundCurrency(summary.totalDue + amount);
        datasetSummaries.set(record.datasetId, summary);
      }
    }

    const summaries = Array.from(datasetSummaries.values()).sort((a, b) =>
      a.datasetId.localeCompare(b.datasetId),
    );
    for (const summary of summaries) {
      summary.entries.sort((a, b) =>
        `${a.modelId}:${a.version}`.localeCompare(`${b.modelId}:${b.version}`),
      );
    }

    return {
      periodStart: start.toISOString(),
      periodEnd: end.toISOString(),
      datasetSummaries: summaries,
    };
  }

  generateReceivableReport(periodStart: string, periodEnd: string): ReceivableReport {
    const payable = this.generatePayableReport(periodStart, periodEnd);
    const payeeSummaries = new Map<
      string,
      {
        provider: string;
        payeeAccount: string;
        currency: string;
        totalReceivable: number;
        datasetBreakdown: Array<{
          datasetId: string;
          datasetName: string;
          amount: number;
          attribution: string[];
        }>;
      }
    >();

    for (const datasetSummary of payable.datasetSummaries) {
      const obligation = this.getDatasetObligation(datasetSummary.datasetId);
      if (!obligation) {
        continue;
      }
      const payeeKey = `${obligation.provider}:${obligation.payeeAccount}:${obligation.currency}`;
      const payee = payeeSummaries.get(payeeKey) ?? {
        provider: obligation.provider,
        payeeAccount: obligation.payeeAccount,
        currency: obligation.currency,
        totalReceivable: 0,
        datasetBreakdown: [],
      };
      payee.datasetBreakdown.push({
        datasetId: datasetSummary.datasetId,
        datasetName: datasetSummary.datasetName,
        amount: datasetSummary.totalDue,
        attribution: obligation.attribution,
      });
      payee.totalReceivable = roundCurrency(payee.totalReceivable + datasetSummary.totalDue);
      payeeSummaries.set(payeeKey, payee);
    }

    const summaries = Array.from(payeeSummaries.values()).sort((a, b) =>
      a.provider.localeCompare(b.provider),
    );
    for (const summary of summaries) {
      summary.datasetBreakdown.sort((a, b) => a.datasetId.localeCompare(b.datasetId));
    }

    return {
      periodStart: payable.periodStart,
      periodEnd: payable.periodEnd,
      payeeSummaries: summaries,
    };
  }

  triggerRevocation(
    datasetId: string,
    triggerId: string,
    occurredAt: string,
  ): CompensatingTask[] {
    const obligation = this.getDatasetObligation(datasetId, new Date(occurredAt));
    if (!obligation) {
      throw new Error(`Dataset obligation ${datasetId} not registered`);
    }
    const trigger = obligation.revocationTriggers.find((candidate) => candidate.id === triggerId);
    if (!trigger) {
      throw new Error(`Revocation trigger ${triggerId} not defined for ${datasetId}`);
    }
    const dueOffset = Math.max(1, Math.min(7, obligation.refreshCadenceDays));
    const dueDate = addDays(new Date(occurredAt), dueOffset).toISOString();
    const generated: CompensatingTask[] = [];
    for (const record of this.models.values()) {
      if (record.datasetId !== datasetId) {
        continue;
      }
      const baseId = `${datasetId}:${triggerId}:${record.modelId}:${record.version}`;
      for (const type of ['unlearning', 'kproPurge', 'csdbExportUpdate'] as const) {
        const id = `${baseId}:${type}`;
        const task: CompensatingTask = {
          id,
          datasetId,
          datasetName: obligation.name,
          triggerId,
          triggerReason: trigger.reason,
          type,
          modelId: record.modelId,
          modelVersion: record.version,
          dueDate,
        };
        this.tasks.set(id, task);
        generated.push(task);
      }
    }
    this.recordEvent('REVOCATION_TRIGGERED', {
      datasetId,
      triggerId,
      occurredAt,
      taskCount: generated.length,
    });
    return generated;
  }

  getCompensatingTasks(): CompensatingTask[] {
    return Array.from(this.tasks.values()).sort((a, b) => a.id.localeCompare(b.id));
  }

  getIntegrityProof(): IntegrityProof {
    const hash = createHash('sha256');
    for (const event of this.events) {
      hash.update(stableStringify(event));
    }
    return {
      algorithm: 'sha256',
      eventCount: this.events.length,
      digest: hash.digest('hex'),
    };
  }

  verifyIntegrityProof(proof: IntegrityProof): boolean {
    const current = this.getIntegrityProof();
    return (
      proof.algorithm === current.algorithm &&
      proof.eventCount === current.eventCount &&
      proof.digest === current.digest
    );
  }

  private recordEvent(type: LedgerEvent['type'], payload: Record<string, unknown>): void {
    this.events.push({
      type,
      timestamp: new Date().toISOString(),
      payload,
    });
  }

  private modelKey(modelId: string, version: string): string {
    return `${modelId}::${version}`;
  }

  private recomputeSchedulesForDataset(datasetId: string): void {
    for (const record of this.models.values()) {
      if (record.datasetId === datasetId) {
        // Trigger schedule rebuild to ensure deterministic recomputation on policy edits
        this.buildSchedule(record);
      }
    }
  }

  private buildSchedule(record: ModelVersionRecord): AmortizationEntry[] {
    const history = this.obligations.get(record.datasetId);
    if (!history || history.length === 0) {
      throw new Error(`No obligations registered for dataset ${record.datasetId}`);
    }
    const sortedHistory = [...history].sort(
      (a, b) => new Date(a.effectiveDate).getTime() - new Date(b.effectiveDate).getTime(),
    );

    const startDate = new Date(record.trainingDate);
    const schedule: AmortizationEntry[] = [];
    const baseAmount = record.licenseCost / record.amortizationPeriodMonths;

    for (let i = 0; i < record.amortizationPeriodMonths; i += 1) {
      const periodStart = addMonths(startDate, i);
      const periodEnd = addMonths(periodStart, 1);
      const obligation = this.resolveObligationForDate(sortedHistory, periodStart);
      const amount = roundCurrency(baseAmount * obligation.royaltyRate);
      const refreshDue = addDays(periodStart, obligation.refreshCadenceDays).toISOString();
      schedule.push({
        modelId: record.modelId,
        version: record.version,
        datasetId: record.datasetId,
        periodIndex: i,
        periodStart: periodStart.toISOString(),
        periodEnd: periodEnd.toISOString(),
        amount,
        currency: obligation.currency,
        attribution: obligation.attribution,
        policyVersion: obligation.policyVersion,
        obligationRevision: obligation.revision,
        refreshDue,
      });
    }
    return schedule;
  }

  private resolveObligationForDate(
    history: DatasetObligationVersion[],
    date: Date,
  ): DatasetObligationVersion {
    const timestamp = date.getTime();
    let candidate: DatasetObligationVersion | undefined;
    for (const version of history) {
      if (new Date(version.effectiveDate).getTime() <= timestamp) {
        candidate = version;
      }
    }
    return candidate ?? history[0];
  }
}
