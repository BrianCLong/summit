
import { SelfHealingPlaybook, PlaybookAction } from './types';
import { Signal } from '../signals/types';

export class HealingExecutor {
  private playbooks: SelfHealingPlaybook[] = [];
  private lastExecuted: Map<string, number> = new Map(); // playbookId -> timestamp

  public registerPlaybook(pb: SelfHealingPlaybook) {
    this.playbooks.push(pb);
  }

  public async evaluateAndExecute(signals: Signal[]) {
    for (const pb of this.playbooks) {
      if (this.isOnCooldown(pb)) continue;

      if (this.checkTriggers(pb, signals)) {
        await this.executePlaybook(pb);
        this.lastExecuted.set(pb.id, Date.now());
      }
    }
  }

  private isOnCooldown(pb: SelfHealingPlaybook): boolean {
    const last = this.lastExecuted.get(pb.id) || 0;
    return (Date.now() - last) < pb.cooldownMs;
  }

  private checkTriggers(pb: SelfHealingPlaybook, signals: Signal[]): boolean {
    // Simplified: check if ANY signal in the batch matches ALL triggers
    // In reality, triggers might need to match across a time window.
    // For MVP, we check if the LATEST signal matches.

    // We need at least one signal to trigger evaluation?
    // Or we scan recent signals?
    // Let's assume 'signals' is a batch of recent anomalous signals passed by a detector.

    for (const signal of signals) {
      const match = pb.triggers.every(t => {
        if (signal.type !== t.signalType) return false;
        switch (t.operator) {
          case 'GT': return signal.value > t.value;
          case 'LT': return signal.value < t.value;
          case 'EQ': return signal.value === t.value;
          default: return false;
        }
      });
      if (match) return true;
    }
    return false;
  }

  private async executePlaybook(pb: SelfHealingPlaybook) {
    console.log(`[Healing] Executing Playbook: ${pb.name}`);
    for (const action of pb.actions) {
      await this.runAction(action);
    }
  }

  private async runAction(action: PlaybookAction) {
    // Map abstract actions to real system calls
    switch (action.type) {
      case 'RETRY':
        console.log(`  -> Retrying task with backoff ${JSON.stringify(action.params)}`);
        break;
      case 'REROUTE':
        console.log(`  -> Rerouting to ${action.params.targetAgent}`);
        break;
      case 'QUARANTINE':
        console.log(`  -> Quarantining test ${action.params.testId}`);
        break;
      default:
        console.log(`  -> Generic action ${action.type} ${JSON.stringify(action.params)}`);
    }
  }
}
