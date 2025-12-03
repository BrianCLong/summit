
import { SLODefinition, SLAContract, ErrorBudget, SLOAlert, SLOAlertLevel } from './types';
import { SignalsService } from '../signals/signals-service';
import { HealthSnapshot } from '../signals/types';
import { randomUUID } from 'crypto';

export class SLOPolicyEngine {
  private contracts: Map<string, SLAContract> = new Map();
  private budgets: Map<string, ErrorBudget> = new Map();
  private signalsService: SignalsService;

  constructor(signalsService: SignalsService) {
    this.signalsService = signalsService;
  }

  public registerContract(contract: SLAContract): void {
    this.contracts.set(contract.tenantId, contract);
    // Initialize budgets
    contract.slos.forEach(slo => {
      this.budgets.set(slo.id, {
        sloId: slo.id,
        remainingPoints: slo.errorBudgetStartingPoints,
        totalPoints: slo.errorBudgetStartingPoints,
        status: 'HEALTHY'
      });
    });
  }

  public evaluate(tenantId: string): SLOAlert[] {
    const contract = this.contracts.get(tenantId);
    if (!contract) return [];

    const alerts: SLOAlert[] = [];
    const health = this.signalsService.generateHealthSnapshot(tenantId);

    for (const slo of contract.slos) {
      // Find relevant metrics in health snapshot
      // This is a simplification. In reality we'd query SignalService for the specific window.
      // We will re-query signals for exact window logic.

      const series = this.signalsService.aggregateSignals(
        slo.targetType,
        this.getSourceIdForSlo(slo, health),
        slo.window
      );

      if (series.datapoints.length === 0) continue;

      // Calculate current value (e.g., avg latency, or success rate)
      const currentValue = this.calculateMetricValue(series.datapoints, slo.targetType);

      const violation = this.checkViolation(currentValue, slo);

      if (violation) {
        const budget = this.budgets.get(slo.id);
        if (budget) {
          budget.remainingPoints -= slo.burnRatePerViolation;
          budget.lastBurnTimestamp = new Date();

          if (budget.remainingPoints <= 0) {
            budget.status = 'EXHAUSTED';
            alerts.push(this.createAlert(slo, SLOAlertLevel.BUDGET_EXHAUSTED, `Error budget exhausted. Value: ${currentValue}`));
          } else if (budget.remainingPoints < budget.totalPoints * 0.2) {
            budget.status = 'WARNING';
            alerts.push(this.createAlert(slo, SLOAlertLevel.WARNING, `Error budget low. Remaining: ${budget.remainingPoints}`));
          } else {
             // Just a breach but budget handles it
             alerts.push(this.createAlert(slo, SLOAlertLevel.BREACH, `SLO Breach. Value: ${currentValue} ${slo.comparator} ${slo.targetValue}`));
          }
        }
      }
    }

    return alerts;
  }

  private getSourceIdForSlo(slo: SLODefinition, health: HealthSnapshot): string {
      // Naive mapping for demo.
      // Ideally SLO definition says "target: system" or "target: agent-x"
      return 'system-core'; // Defaulting to system level for this slice
  }

  private calculateMetricValue(datapoints: { value: number }[], type: string): number {
    if (datapoints.length === 0) return 0;
    const sum = datapoints.reduce((a, b) => a + b.value, 0);
    return sum / datapoints.length;
  }

  private checkViolation(value: number, slo: SLODefinition): boolean {
    switch (slo.comparator) {
      case '<': return !(value < slo.targetValue);
      case '>': return !(value > slo.targetValue);
      case '<=': return !(value <= slo.targetValue);
      case '>=': return !(value >= slo.targetValue);
      default: return false;
    }
  }

  private createAlert(slo: SLODefinition, level: SLOAlertLevel, message: string): SLOAlert {
    return {
      id: randomUUID(),
      sloId: slo.id,
      level,
      message,
      timestamp: new Date(),
      metadata: { target: slo.targetValue }
    };
  }

  public getBudgetStatus(sloId: string): ErrorBudget | undefined {
    return this.budgets.get(sloId);
  }
}
