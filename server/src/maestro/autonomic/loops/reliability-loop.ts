
import { ControlLoop, AdaptationPlan } from './types';
import { HealthSnapshot, SignalType, HealthStatus } from '../signals/types';
import { SLOAlert, SLOAlertLevel } from '../policy/types';

export class ReliabilityLoop implements ControlLoop {
  public name = 'ReliabilityLoop';
  private currentHealth: HealthSnapshot | null = null;
  private currentAlerts: SLOAlert[] = [];

  public async monitor(health: HealthSnapshot, alerts: SLOAlert[]): Promise<void> {
    this.currentHealth = health;
    this.currentAlerts = alerts;
  }

  public async analyze(): Promise<boolean> {
    if (!this.currentHealth) return false;

    // Check for critical system health
    if (this.currentHealth.system.status === HealthStatus.CRITICAL) return true;

    // Check for specific alerts
    const hasBreach = this.currentAlerts.some(a => a.level === SLOAlertLevel.BREACH || a.level === SLOAlertLevel.BUDGET_EXHAUSTED);
    if (hasBreach) return true;

    return false;
  }

  public async plan(): Promise<AdaptationPlan | null> {
    const actions: AdaptationPlan['actions'] = [];
    const reasons: string[] = [];

    // Strategy 1: If budget exhausted, throttle
    const exhausted = this.currentAlerts.filter(a => a.level === SLOAlertLevel.BUDGET_EXHAUSTED);
    if (exhausted.length > 0) {
      actions.push({ type: 'THROTTLE_QUEUE', payload: { factor: 0.5 } });
      reasons.push('Error budget exhausted, throttling intake.');
    }

    // Strategy 2: If system critical due to latency, scale up or shed load
    if (this.currentHealth?.system.status === HealthStatus.CRITICAL) {
      actions.push({ type: 'ENABLE_DEGRADED_MODE', payload: { features: ['heavy-computation'] } });
      reasons.push('System critical, disabling heavy features.');
    }

    if (actions.length === 0) return null;

    return {
      id: `plan-${Date.now()}`,
      loopName: this.name,
      timestamp: new Date(),
      actions,
      justification: reasons.join('; '),
    };
  }

  public async execute(plan: AdaptationPlan): Promise<void> {
    // In a real implementation, this would call Orchestrator APIs
    console.log(`[ReliabilityLoop] Executing plan ${plan.id}: ${plan.justification}`);
    for (const action of plan.actions) {
        console.log(`  -> ${action.type} ${JSON.stringify(action.payload)}`);
    }
  }
}
