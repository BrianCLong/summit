import {
  AccountMetrics,
  EnterpriseSalesAccount,
  EnterpriseSalesActivity,
  EnterpriseSalesRepository,
  MapMilestone,
  MapMilestoneStatus,
  PostgresEnterpriseSalesRepository,
  ProcurementReadiness,
  RiskEntry,
} from './enterpriseSalesRepository.js';
import { getPostgresPool } from '../db/postgres.js';

interface PredictiveInput {
  coverageScore: number;
  championStrength: number;
  execTouches: number;
  procurement: ProcurementReadiness;
  pocStatus: EnterpriseSalesAccount['poc']['status'];
  riskCount: number;
}

export interface TimelineSimulation {
  onTimeProbability: number;
  projectedP90Days: number;
  averageDurationDays: number;
}

export class EnterpriseSalesService {
  constructor(private readonly repository: EnterpriseSalesRepository = new PostgresEnterpriseSalesRepository(getPostgresPool())) {}

  async upsertAccount(input: EnterpriseSalesAccount): Promise<EnterpriseSalesAccount> {
    this.validateGuardrails(input);

    const coverageScore = this.calculateCoverageScore(input);
    const predictiveScore = this.calculatePredictiveScore({
      coverageScore,
      championStrength: input.metrics.championStrength,
      execTouches: input.metrics.execTouches,
      procurement: input.procurement,
      pocStatus: input.poc.status,
      riskCount: input.riskRegister.length,
    });

    const overallScore = this.calculateOverallScore(
      input.icpFit,
      input.arrPotential,
      input.strategicValue,
      predictiveScore,
    );

    return this.repository.upsertAccount({
      ...input,
      coverageScore,
      predictiveScore,
      overallScore,
    });
  }

  async listTopTargets(limit = 50): Promise<EnterpriseSalesAccount[]> {
    const accounts = await this.repository.listAccounts(limit);
    return this.rankAccounts(accounts);
  }

  async getAccount(id: string): Promise<EnterpriseSalesAccount | null> {
    const account = await this.repository.getAccountById(id);
    return account ? this.rankAccounts([account])[0] : null;
  }

  async recordActivity(activity: EnterpriseSalesActivity): Promise<EnterpriseSalesAccount | null> {
    const account = await this.repository.getAccountById(activity.accountId);
    if (!account) return null;

    const updated = this.applyActivity(account, activity);
    await this.repository.recordActivity(activity);
    return this.upsertAccount(updated);
  }

  async dashboard(): Promise<{
    coverage: number;
    championStrengthAvg: number;
    stopLossTriggered: number;
    pocHealth: Record<string, number>;
  }> {
    const accounts = await this.listTopTargets(200);
    if (accounts.length === 0) {
      return { coverage: 0, championStrengthAvg: 0, stopLossTriggered: 0, pocHealth: {} };
    }

    const coverage =
      accounts.filter((a) => a.coverageScore >= 70).length / accounts.length;
    const championStrengthAvg =
      accounts.reduce((sum, a) => sum + a.metrics.championStrength, 0) /
      accounts.length;
    const stopLossTriggered = accounts.filter((a) => this.isStopLossBreached(a)).length;
    const pocHealth: Record<string, number> = {};
    accounts.forEach((account) => {
      pocHealth[account.poc.status] = (pocHealth[account.poc.status] ?? 0) + 1;
    });

    return {
      coverage: Number((coverage * 100).toFixed(2)),
      championStrengthAvg: Number(championStrengthAvg.toFixed(2)),
      stopLossTriggered,
      pocHealth,
    };
  }

  simulateTimeline(account: EnterpriseSalesAccount, iterations = 200): TimelineSimulation {
    const procurementMean = account.procurement.avgCycleTimeDays || 10;
    const pocMean = account.metrics.pocCycleDays ?? account.poc.targetDays;
    const procurementStd = Math.max(procurementMean * 0.25, 1);
    const pocStd = Math.max(pocMean * 0.2, 1);

    const samples: number[] = [];
    for (let i = 0; i < iterations; i++) {
      const procurementDuration = this.sampleNormal(procurementMean, procurementStd);
      const pocDuration = this.sampleNormal(pocMean, pocStd);
      samples.push(Math.max(procurementDuration, 0) + Math.max(pocDuration, 0));
    }

    samples.sort((a, b) => a - b);
    const projectedP90Days = samples[Math.min(samples.length - 1, Math.floor(samples.length * 0.9))];
    const onTimeProbability =
      samples.filter((s) => s <= procurementMean + pocMean).length / samples.length;

    return {
      onTimeProbability: Number((onTimeProbability * 100).toFixed(2)),
      projectedP90Days: Number(projectedP90Days.toFixed(1)),
      averageDurationDays: Number(
        (samples.reduce((sum, val) => sum + val, 0) / samples.length).toFixed(1),
      ),
    };
  }

  private validateGuardrails(input: EnterpriseSalesAccount) {
    if (!input.map?.nextStep) {
      throw new Error('Mutual action plan must have a next step');
    }
    if (!input.exitCriteria) {
      throw new Error('Exit criteria must be defined');
    }
    if (input.metrics.championStrength < 0 || input.metrics.championStrength > 5) {
      throw new Error('Champion strength must be between 0 and 5');
    }
  }

  private rankAccounts(accounts: EnterpriseSalesAccount[]): EnterpriseSalesAccount[] {
    return accounts
      .map((account) => ({
        ...account,
        overallScore: this.calculateOverallScore(
          account.icpFit,
          account.arrPotential,
          account.strategicValue,
          account.predictiveScore,
        ),
      }))
      .sort((a, b) => b.overallScore - a.overallScore)
      .map((account) => ({ ...account, coverageScore: this.calculateCoverageScore(account) }));
  }

  private calculateCoverageScore(account: EnterpriseSalesAccount): number {
    const milestoneCompletion = this.milestoneCompletion(account.map.milestones);
    const championFactor = account.metrics.championStrength / 5;
    const execFactor = Math.min(account.metrics.execTouches / 3, 1);
    const procurementFactor = account.procurement.fastLane
      ? 1
      : Math.max(0.4, 1 - Math.max(account.procurement.slaHours - 48, 0) / 96);
    const pocFactor = account.poc.status === 'healthy'
      ? 1
      : account.poc.status === 'active'
        ? 0.8
        : account.poc.status === 'complete'
          ? 0.9
          : 0.55;

    const raw =
      0.28 * milestoneCompletion +
      0.22 * championFactor +
      0.18 * execFactor +
      0.16 * procurementFactor +
      0.16 * pocFactor;

    return Number((raw * 100).toFixed(2));
  }

  private calculatePredictiveScore(input: PredictiveInput): number {
    const coverageComponent = input.coverageScore / 100;
    const execComponent = Math.min(input.execTouches / 5, 1);
    const procurementHealth = input.procurement.fastLane
      ? 1
      : Math.max(0.4, 1 - input.procurement.slaBreaches * 0.1);
    const pocComponent = input.pocStatus === 'healthy' || input.pocStatus === 'complete' ? 1 : 0.7;
    const riskPenalty = Math.min(input.riskCount * 0.05, 0.25);

    const raw =
      0.45 * coverageComponent +
      0.25 * (input.championStrength / 5) +
      0.15 * execComponent +
      0.1 * procurementHealth +
      0.05 * pocComponent -
      riskPenalty;

    const logistic = 1 / (1 + Math.exp(-3 * (raw - 0.5)));
    return Number((logistic * 100).toFixed(2));
  }

  private calculateOverallScore(
    icpFit: number,
    arrPotential: number,
    strategicValue: number,
    predictiveScore: number,
  ): number {
    const normalizedArr = Math.log10(arrPotential + 1);
    const base = icpFit * strategicValue * normalizedArr;
    return Number((base + predictiveScore / 10).toFixed(2));
  }

  private milestoneCompletion(milestones: MapMilestone[]): number {
    if (!milestones.length) return 0.2; // minimal baseline for empty maps
    const completed = milestones.filter((m) => m.status === 'done').length;
    return completed / milestones.length;
  }

  private applyActivity(
    account: EnterpriseSalesAccount,
    activity: EnterpriseSalesActivity,
  ): EnterpriseSalesAccount {
    const nextAccount = { ...account };
    const metrics: AccountMetrics = { ...nextAccount.metrics };
    const riskRegister: RiskEntry[] = [...nextAccount.riskRegister];

    switch (activity.type) {
      case 'EXEC_TOUCH':
        metrics.execTouches += 1;
        break;
      case 'MAP_MILESTONE': {
        const { milestoneName, status } = activity.payload;
        nextAccount.map.milestones = nextAccount.map.milestones.map((milestone) =>
          milestone.name === milestoneName
            ? { ...milestone, status: status as MapMilestoneStatus }
            : milestone,
        );
        break;
      }
      case 'PROCUREMENT_SLA':
        metrics.procurementCycleDays = activity.payload.cycleDays ?? metrics.procurementCycleDays;
        nextAccount.procurement.slaBreaches = Math.max(
          0,
          (nextAccount.procurement.slaBreaches ?? 0) + (activity.payload.slaBreached ? 1 : 0),
        );
        nextAccount.procurement.avgCycleTimeDays =
          activity.payload.cycleDays ?? nextAccount.procurement.avgCycleTimeDays;
        break;
      case 'POC_HEALTH':
        nextAccount.poc.status = activity.payload.status ?? nextAccount.poc.status;
        nextAccount.poc.timeToFirstValueDays =
          activity.payload.timeToFirstValueDays ?? nextAccount.poc.timeToFirstValueDays;
        metrics.pocCycleDays = activity.payload.cycleDays ?? metrics.pocCycleDays;
        break;
      case 'CHAMPION_SESSION':
        metrics.championEngagements += 1;
        metrics.championStrength = Math.min(5, metrics.championStrength + 0.5);
        break;
      case 'RISK':
        riskRegister.push({
          category: activity.payload.category ?? 'unspecified',
          description: activity.payload.description ?? 'risk identified',
          severity: activity.payload.severity ?? 'medium',
          detectedAt: new Date().toISOString(),
        });
        break;
      default:
        break;
    }

    return {
      ...nextAccount,
      metrics,
      riskRegister,
    };
  }

  private isStopLossBreached(account: EnterpriseSalesAccount): boolean {
    const noChampion = account.metrics.championStrength < 2;
    const mapStale = !account.map.nextStep;
    const pocStuck = account.poc.status === 'at-risk';
    return noChampion || mapStale || pocStuck;
  }

  private sampleNormal(mean: number, std: number): number {
    const u = Math.random();
    const v = Math.random();
    const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    return mean + z * std;
  }
}
