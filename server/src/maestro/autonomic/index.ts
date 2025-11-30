
import { SignalsService } from './signals/signals-service';
import { SLOPolicyEngine } from './policy/slo-policy-engine';
import { GovernanceEngine } from './governance/governance-engine';
import { HealingExecutor } from './healing/healing-executor';
import { ExperimentationService } from './experiments/experimentation-service';
import { AdaptiveRoutingService } from './optimization/adaptive-routing';
import { FeedbackService } from './feedback/feedback-service';
import { ReliabilityLoop } from './loops/reliability-loop';
import { CostOptimizationLoop } from './loops/cost-loop';
import { SignalType } from './signals/types';
import { SLOAlert } from './policy/types';

export class AutonomicLayer {
  public readonly signals: SignalsService;
  public readonly policy: SLOPolicyEngine;
  public readonly governance: GovernanceEngine;
  public readonly healing: HealingExecutor;
  public readonly experiments: ExperimentationService;
  public readonly routing: AdaptiveRoutingService;
  public readonly feedback: FeedbackService;

  private loops: any[] = [];
  private loopIntervalMs = 60000; // 1 min
  private intervalId: NodeJS.Timeout | null = null;

  constructor() {
    this.signals = new SignalsService();
    this.policy = new SLOPolicyEngine(this.signals);
    this.governance = new GovernanceEngine();
    this.healing = new HealingExecutor();
    this.experiments = new ExperimentationService();
    this.routing = new AdaptiveRoutingService();
    this.feedback = new FeedbackService();

    // Initialize loops
    this.loops = [
      new ReliabilityLoop(),
      new CostOptimizationLoop()
    ];
  }

  public start() {
    if (this.intervalId) return;
    console.log('[AutonomicLayer] Starting control loops...');
    this.intervalId = setInterval(() => this.runControlLoops(), this.loopIntervalMs);
  }

  public stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  public async runControlLoops() {
    try {
        // For MVP, we iterate specific tenants or just a 'system' context
        const tenantId = 'system';

        // 1. Gather Context
        const health = this.signals.generateHealthSnapshot(tenantId);
        const alerts = this.policy.evaluate(tenantId);

        // 2. Healing (reactive, fast)
        // We'd need to fetch recent signals for healing evaluation
        const recentSignals = this.signals.getSignals(SignalType.TASK_LATENCY, 'system-core', new Date(Date.now() - 60000)); // Last min
        await this.healing.evaluateAndExecute(recentSignals);

        // 3. Strategic Loops (deliberative, slower)
        for (const loop of this.loops) {
            await loop.monitor(health, alerts);
            if (await loop.analyze()) {
                const plan = await loop.plan();
                if (plan) {
                    const governedActions = await this.governance.reviewPlan(plan);
                    const approvedActions = governedActions.filter(ga => ga.status === 'APPROVED');

                    if (approvedActions.length > 0) {
                        // Construct approved plan subset
                        const approvedPlan = { ...plan, actions: approvedActions.map(ga => ({ type: ga.actionType, payload: ga.payload })) };
                        await loop.execute(approvedPlan);
                    } else {
                        console.log(`[Autonomic] Plan from ${loop.name} was fully denied by governance.`);
                    }
                }
            }
        }
    } catch (err) {
        console.error('[AutonomicLayer] Error in control loop cycle:', err);
    }
  }
}
