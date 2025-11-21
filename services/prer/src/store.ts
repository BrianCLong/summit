import { randomUUID } from 'crypto';
import { buildPowerAnalysis } from './power.js';
import type {
  AnalysisPlan,
  AuditEntry,
  Experiment,
  MetricDefinition,
  PowerCalculation,
  StopRule
} from './types.js';

export class ExperimentStore {
  private experiments = new Map<string, Experiment>();

  createExperiment(
    payload: {
      name: string;
      hypothesis: string;
      metrics: MetricDefinition[];
      stopRule: StopRule;
      analysisPlan: AnalysisPlan;
    },
    actor: string
  ): Experiment {
    const id = randomUUID();
    const powerAnalysis = buildPowerAnalysis(payload.metrics, payload.analysisPlan);
    const experiment: Experiment = {
      id,
      name: payload.name,
      hypothesis: payload.hypothesis,
      metrics: payload.metrics,
      stopRule: payload.stopRule,
      analysisPlan: payload.analysisPlan,
      status: 'registered',
      createdAt: new Date().toISOString(),
      powerAnalysis,
      auditLog: [],
      exports: [],
      results: {}
    };
    this.experiments.set(id, experiment);
    this.appendAudit(id, {
      actor,
      action: 'CREATE_EXPERIMENT',
      detail: 'Experiment preregistered with locked plan.',
      status: 'SUCCESS'
    });
    return experiment;
  }

  getExperiment(id: string): Experiment | undefined {
    return this.experiments.get(id);
  }

  listExperiments(): Experiment[] {
    return Array.from(this.experiments.values());
  }

  startExperiment(id: string, actor: string): Experiment {
    const experiment = this.requireExperiment(id);
    if (experiment.status === 'running') {
      return experiment;
    }

    experiment.status = 'running';
    experiment.lockedAt = new Date().toISOString();
    this.appendAudit(id, {
      actor,
      action: 'START_EXPERIMENT',
      detail: 'Experiment marked as running and analysis plan locked.',
      status: 'SUCCESS'
    });
    return experiment;
  }

  attemptHypothesisUpdate(id: string, newHypothesis: string, actor: string): string {
    const experiment = this.requireExperiment(id);
    if (experiment.status === 'running' || experiment.lockedAt) {
      this.appendAudit(id, {
        actor,
        action: 'UPDATE_HYPOTHESIS',
        detail: 'Rejected: hypotheses cannot change once the test is running.',
        status: 'REJECTED'
      });
      throw new Error('Hypothesis changes are locked once the experiment has started.');
    }

    experiment.hypothesis = newHypothesis;
    this.appendAudit(id, {
      actor,
      action: 'UPDATE_HYPOTHESIS',
      detail: 'Hypothesis updated prior to lock.',
      status: 'SUCCESS'
    });
    return newHypothesis;
  }

  appendAudit(
    id: string,
    entry: Omit<AuditEntry, 'at'>
  ): AuditEntry {
    const experiment = this.requireExperiment(id);
    const fullEntry: AuditEntry = {
      ...entry,
      at: new Date().toISOString()
    };
    experiment.auditLog.push(fullEntry);
    return fullEntry;
  }

  recordExport(id: string, record: { digest: string; payload: string }): Experiment {
    const experiment = this.requireExperiment(id);
    const exportEntry = {
      id: randomUUID(),
      createdAt: new Date().toISOString(),
      ...record
    };
    experiment.exports.push(exportEntry);
    return experiment;
  }

  addResult(
    id: string,
    metric: string,
    result: { variant: string; value: number },
    actor: string
  ): Experiment {
    const experiment = this.requireExperiment(id);
    const metricRegistered = experiment.metrics.some((m) => m.name === metric);
    if (!metricRegistered) {
      this.appendAudit(id, {
        actor,
        action: 'INGEST_RESULT',
        detail: `Rejected metric ${metric}: not pre-registered.`,
        status: 'REJECTED'
      });
      throw new Error(`Metric ${metric} is not registered for this experiment.`);
    }

    if (!experiment.results[metric]) {
      experiment.results[metric] = [];
    }
    experiment.results[metric].push(result);
    this.appendAudit(id, {
      actor,
      action: 'INGEST_RESULT',
      detail: `Recorded result for metric ${metric}.`,
      status: 'SUCCESS'
    });
    return experiment;
  }

  getPowerAnalysis(id: string): Record<string, PowerCalculation> {
    return this.requireExperiment(id).powerAnalysis;
  }

  private requireExperiment(id: string): Experiment {
    const experiment = this.experiments.get(id);
    if (!experiment) {
      throw new Error('Experiment not found');
    }
    return experiment;
  }
}
