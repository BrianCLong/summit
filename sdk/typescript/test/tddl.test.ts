import {
  TrainingDataDebtLedger,
  DatasetObligation,
  ModelVersionTraining,
} from '../src/tddl';

describe('TrainingDataDebtLedger', () => {
  const dataset: DatasetObligation = {
    datasetId: 'ds-borealis',
    name: 'Borealis News Corpus',
    provider: 'Borealis Cooperative',
    payeeAccount: 'BOREALIS-LEDGER-001',
    currency: 'USD',
    royaltyRate: 0.08,
    attribution: ['Borealis Cooperative', 'Public Domain Matching'],
    revocationTriggers: [
      { id: 'breach', reason: 'Data breach notification', severity: 'critical' },
      { id: 'license-expired', reason: 'License expiration', severity: 'high' },
    ],
    refreshCadenceDays: 30,
    policyVersion: '2025.01',
    effectiveDate: '2025-01-01T00:00:00.000Z',
  };

  const training: ModelVersionTraining = {
    modelId: 'atlas-foundation',
    version: '1.0.0',
    datasetId: dataset.datasetId,
    trainingDate: '2025-01-05T00:00:00.000Z',
    amortizationPeriodMonths: 6,
    licenseCost: 120_000,
  };

  let ledger: TrainingDataDebtLedger;

  beforeEach(() => {
    ledger = new TrainingDataDebtLedger();
    ledger.registerDatasetObligation(dataset);
    ledger.registerModelUsage(training);
  });

  it('computes amortization schedules with obligation metadata', () => {
    const schedule = ledger.getAmortizationSchedule(training.modelId, training.version);
    expect(schedule).toHaveLength(training.amortizationPeriodMonths);

    const firstPeriod = schedule[0];
    expect(firstPeriod.amount).toBeCloseTo(1600, 2);
    expect(firstPeriod.attribution).toEqual(dataset.attribution);
    expect(firstPeriod.policyVersion).toBe(dataset.policyVersion);

    const thirdPeriod = schedule[2];
    expect(new Date(thirdPeriod.refreshDue).getTime()).toBeGreaterThan(
      new Date(thirdPeriod.periodStart).getTime(),
    );
  });

  it('recomputes schedules deterministically when policies change', () => {
    ledger.updateDatasetObligation(
      dataset.datasetId,
      { royaltyRate: 0.1, policyVersion: '2025.03' },
      '2025-03-01T00:00:00.000Z',
    );

    const schedule = ledger.getAmortizationSchedule(training.modelId, training.version);
    const earlyAmounts = schedule.slice(0, 2).map((entry) => entry.amount);
    const lateAmounts = schedule.slice(2).map((entry) => entry.amount);

    expect(new Set(earlyAmounts)).toEqual(new Set([1600]));
    expect(new Set(lateAmounts)).toEqual(new Set([2000]));

    const secondCall = ledger.getAmortizationSchedule(training.modelId, training.version);
    expect(secondCall).toEqual(schedule);
  });

  it('produces payable and receivable reports aligned to reporting windows', () => {
    const report = ledger.generatePayableReport(
      '2025-02-05T00:00:00.000Z',
      '2025-03-05T00:00:00.000Z',
    );

    expect(report.datasetSummaries).toHaveLength(1);
    const summary = report.datasetSummaries[0];
    expect(summary.datasetId).toBe(dataset.datasetId);
    expect(summary.totalDue).toBeCloseTo(1600, 2);
    expect(summary.entries[0].modelId).toBe(training.modelId);

    const receivable = ledger.generateReceivableReport(
      '2025-02-05T00:00:00.000Z',
      '2025-03-05T00:00:00.000Z',
    );

    expect(receivable.payeeSummaries[0].provider).toBe(dataset.provider);
    expect(receivable.payeeSummaries[0].totalReceivable).toBeCloseTo(summary.totalDue, 2);
  });

  it('raises compensating tasks for revocation triggers without omissions', () => {
    const tasks = ledger.triggerRevocation(dataset.datasetId, 'breach', '2025-04-10T00:00:00.000Z');
    expect(tasks).toHaveLength(3);

    const types = tasks.map((task) => task.type).sort();
    expect(types).toEqual(['csdbExportUpdate', 'kproPurge', 'unlearning']);

    const dueDate = tasks[0].dueDate;
    expect(new Date(dueDate).toISOString()).toBe('2025-04-17T00:00:00.000Z');

    const outstanding = ledger.getCompensatingTasks();
    const outstandingTypes = outstanding.map((task) => task.type).sort();
    expect(outstandingTypes).toEqual(types);
  });

  it('emits deterministic integrity proofs', () => {
    const proof = ledger.getIntegrityProof();
    expect(proof.algorithm).toBe('sha256');
    expect(proof.eventCount).toBeGreaterThan(0);
    expect(ledger.verifyIntegrityProof(proof)).toBe(true);

    const tampered = { ...proof, digest: `${proof.digest}00` };
    expect(ledger.verifyIntegrityProof(tampered)).toBe(false);
  });
});
