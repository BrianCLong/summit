"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HealingExecutor = void 0;
class HealingExecutor {
    playbooks = [];
    lastExecuted = new Map(); // playbookId -> timestamp
    registerPlaybook(pb) {
        this.playbooks.push(pb);
    }
    async evaluateAndExecute(signals) {
        for (const pb of this.playbooks) {
            if (this.isOnCooldown(pb))
                continue;
            if (this.checkTriggers(pb, signals)) {
                await this.executePlaybook(pb);
                this.lastExecuted.set(pb.id, Date.now());
            }
        }
    }
    isOnCooldown(pb) {
        const last = this.lastExecuted.get(pb.id) || 0;
        return (Date.now() - last) < pb.cooldownMs;
    }
    checkTriggers(pb, signals) {
        // Simplified: check if ANY signal in the batch matches ALL triggers
        // In reality, triggers might need to match across a time window.
        // For MVP, we check if the LATEST signal matches.
        // We need at least one signal to trigger evaluation?
        // Or we scan recent signals?
        // Let's assume 'signals' is a batch of recent anomalous signals passed by a detector.
        for (const signal of signals) {
            const match = pb.triggers.every(t => {
                if (signal.type !== t.signalType)
                    return false;
                switch (t.operator) {
                    case 'GT': return signal.value > t.value;
                    case 'LT': return signal.value < t.value;
                    case 'EQ': return signal.value === t.value;
                    default: return false;
                }
            });
            if (match)
                return true;
        }
        return false;
    }
    async executePlaybook(pb) {
        console.log(`[Healing] Executing Playbook: ${pb.name}`);
        for (const action of pb.actions) {
            await this.runAction(action);
        }
    }
    async runAction(action) {
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
exports.HealingExecutor = HealingExecutor;
